/**
 * Request deduplication system for CLI
 * Prevents duplicate identical requests from being processed concurrently
 */

import type { CancellationToken } from "../infrastructure/cancellation"
import { getLogger } from "../infrastructure/logger"

const logger = getLogger()

/**
 * Request key generator function type
 */
export type RequestKeyGenerator<TArgs extends any[]> = (...args: TArgs) => string

/**
 * Deduplication options
 */
export interface DeduplicationOptions {
	/**
	 * Time to live for cached results in milliseconds
	 * After this time, cached results are removed
	 * Default: 60000 (1 minute)
	 */
	ttl?: number

	/**
	 * Whether to cache results
	 * If true, successful results are cached for the TTL duration
	 * Default: true
	 */
	cacheResults?: boolean

	/**
	 * Custom key generator
	 * If not provided, uses JSON.stringify on arguments
	 */
	keyGenerator?: RequestKeyGenerator<any[]>
}

/**
 * Pending request entry
 */
interface PendingRequest<T> {
	promise: Promise<T>
	timestamp: number
	subscribers: number
}

/**
 * Cached result entry
 */
interface CachedResult<T> {
	value: T
	timestamp: number
	expiresAt: number
}

/**
 * Request deduplicator
 * Ensures that identical concurrent requests share the same promise
 * and optionally caches results for a specified TTL
 */
export class RequestDeduplicator {
	private pendingRequests: Map<string, PendingRequest<any>> = new Map()
	private cachedResults: Map<string, CachedResult<any>> = new Map()
	private cleanupInterval: NodeJS.Timeout | null = null
	private defaultTtl: number
	private cacheResults: boolean

	constructor(options: DeduplicationOptions = {}) {
		this.defaultTtl = options.ttl ?? 60000 // 1 minute default
		this.cacheResults = options.cacheResults ?? true

		// Start cleanup interval to remove expired entries
		this.startCleanup()
	}

	/**
	 * Execute a request with deduplication
	 * If an identical request is already in progress, returns the same promise
	 * If a cached result exists and is not expired, returns the cached result
	 */
	async execute<T, TArgs extends any[]>(
		key: string,
		fn: (...args: TArgs) => Promise<T>,
		args: TArgs,
		token?: CancellationToken,
	): Promise<T> {
		token?.throwIfCancellationRequested()

		// Check for cached result first
		if (this.cacheResults) {
			const cached = this.cachedResults.get(key)
			if (cached && cached.expiresAt > Date.now()) {
				logger.debug(`Request deduplication: returning cached result for key: ${key}`)
				return cached.value as T
			}
		}

		// Check for pending request
		const pending = this.pendingRequests.get(key)
		if (pending) {
			logger.debug(`Request deduplication: reusing pending request for key: ${key}`)
			pending.subscribers++

			// Add cancellation listener
			if (token) {
				token.onCancellationRequested(() => {
					pending.subscribers--
					if (pending.subscribers <= 0) {
						this.pendingRequests.delete(key)
					}
				})
			}

			return pending.promise as Promise<T>
		}

		// Create new request
		logger.debug(`Request deduplication: creating new request for key: ${key}`)
		const promise = this.executeNewRequest(key, fn, args)

		// Store as pending
		this.pendingRequests.set(key, {
			promise,
			timestamp: Date.now(),
			subscribers: 1,
		})

		try {
			const result = await promise

			// Cache result if enabled
			if (this.cacheResults) {
				this.cachedResults.set(key, {
					value: result,
					timestamp: Date.now(),
					expiresAt: Date.now() + this.defaultTtl,
				})
			}

			return result
		} finally {
			// Remove from pending
			this.pendingRequests.delete(key)
		}
	}

	/**
	 * Execute a new request
	 */
	private async executeNewRequest<T, TArgs extends any[]>(
		key: string,
		fn: (...args: TArgs) => Promise<T>,
		args: TArgs,
	): Promise<T> {
		try {
			return await fn(...args)
		} catch (error) {
			// Remove from pending on error
			this.pendingRequests.delete(key)
			// Clear cached result on error
			this.cachedResults.delete(key)
			throw error
		}
	}

	/**
	 * Generate a key from arguments
	 */
	static generateKey(...args: any[]): string {
		try {
			return JSON.stringify(args)
		} catch (_error) {
			// Fallback to simple string concatenation if JSON.stringify fails
			return args.map(String).join(":")
		}
	}

	/**
	 * Clear a specific cached result
	 */
	clearCache(key: string): void {
		this.cachedResults.delete(key)
	}

	/**
	 * Clear all cached results
	 */
	clearAllCache(): void {
		this.cachedResults.clear()
	}

	/**
	 * Get statistics
	 */
	getStats(): {
		pendingRequests: number
		cachedResults: number
		cacheHitRate: number
	} {
		const total = this.pendingRequests.size + this.cachedResults.size
		const hits = this.cachedResults.size

		return {
			pendingRequests: this.pendingRequests.size,
			cachedResults: this.cachedResults.size,
			cacheHitRate: total > 0 ? (hits / total) * 100 : 0,
		}
	}

	/**
	 * Start cleanup interval to remove expired entries
	 */
	private startCleanup(): void {
		// Run cleanup every minute
		this.cleanupInterval = setInterval(() => {
			this.cleanup()
		}, 60000)

		// Don't prevent process exit
		this.cleanupInterval.unref()
	}

	/**
	 * Clean up expired entries
	 */
	private cleanup(): void {
		const now = Date.now()
		let expiredCount = 0

		// Remove expired cached results
		for (const [key, cached] of this.cachedResults.entries()) {
			if (cached.expiresAt <= now) {
				this.cachedResults.delete(key)
				expiredCount++
			}
		}

		// Remove stale pending requests (older than 5 minutes)
		for (const [key, pending] of this.pendingRequests.entries()) {
			if (now - pending.timestamp > 5 * 60 * 1000) {
				this.pendingRequests.delete(key)
				expiredCount++
			}
		}

		if (expiredCount > 0) {
			logger.debug(`Request deduplication: cleaned up ${expiredCount} expired entries`)
		}
	}

	/**
	 * Stop cleanup and clear all data
	 */
	dispose(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval)
			this.cleanupInterval = null
		}
		this.pendingRequests.clear()
		this.cachedResults.clear()
	}
}

/**
 * Deduplicating function wrapper
 * Creates a deduplicating version of a function
 */
export function deduplicateFunction<T, TArgs extends any[]>(
	fn: (...args: TArgs) => Promise<T>,
	options: DeduplicationOptions = {},
): (...args: TArgs) => Promise<T> {
	const deduplicator = new RequestDeduplicator(options)
	const keyGenerator = options.keyGenerator ?? RequestDeduplicator.generateKey

	return async (...args: TArgs): Promise<T> => {
		const key = keyGenerator(...args)
		return deduplicator.execute(key, fn, args)
	}
}

/**
 * Decorator for deduplicating class methods
 */
export function Deduplicate(options: DeduplicationOptions = {}) {
	return (_target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value
		const deduplicator = new RequestDeduplicator(options)
		const keyGenerator = options.keyGenerator ?? RequestDeduplicator.generateKey

		descriptor.value = async function (...args: any[]) {
			const key = `${propertyKey}:${keyGenerator(...args)}`
			return deduplicator.execute(key, originalMethod.bind(this), args)
		}

		return descriptor
	}
}

/**
 * Global request deduplicator manager
 */
export class DeduplicationManager {
	private deduplicators: Map<string, RequestDeduplicator> = new Map()
	private defaultDeduplicator: RequestDeduplicator

	constructor() {
		this.defaultDeduplicator = new RequestDeduplicator()
	}

	/**
	 * Get or create a named deduplicator
	 */
	getDeduplicator(name?: string, options?: DeduplicationOptions): RequestDeduplicator {
		if (!name) {
			return this.defaultDeduplicator
		}

		let deduplicator = this.deduplicators.get(name)
		if (!deduplicator) {
			deduplicator = new RequestDeduplicator(options)
			this.deduplicators.set(name, deduplicator)
		}

		return deduplicator
	}

	/**
	 * Execute a deduplicated request
	 */
	async execute<T, TArgs extends any[]>(
		key: string,
		fn: (...args: TArgs) => Promise<T>,
		args: TArgs,
		deduplicatorName?: string,
		token?: CancellationToken,
	): Promise<T> {
		const deduplicator = this.getDeduplicator(deduplicatorName)
		return deduplicator.execute(key, fn, args, token)
	}

	/**
	 * Clear cache for a specific deduplicator
	 */
	clearCache(name?: string, key?: string): void {
		const deduplicator = this.getDeduplicator(name)
		if (key) {
			deduplicator.clearCache(key)
		} else {
			deduplicator.clearAllCache()
		}
	}

	/**
	 * Get statistics for all deduplicators
	 */
	getAllStats(): Record<string, ReturnType<RequestDeduplicator["getStats"]>> {
		const stats: Record<string, ReturnType<RequestDeduplicator["getStats"]>> = {
			default: this.defaultDeduplicator.getStats(),
		}

		for (const [name, deduplicator] of this.deduplicators.entries()) {
			stats[name] = deduplicator.getStats()
		}

		return stats
	}

	/**
	 * Dispose all deduplicators
	 */
	dispose(): void {
		this.defaultDeduplicator.dispose()
		for (const deduplicator of this.deduplicators.values()) {
			deduplicator.dispose()
		}
		this.deduplicators.clear()
	}
}

/**
 * Get global deduplication manager instance
 */
let deduplicationManagerInstance: DeduplicationManager | null = null

export function getDeduplicationManager(): DeduplicationManager {
	if (!deduplicationManagerInstance) {
		deduplicationManagerInstance = new DeduplicationManager()
	}
	return deduplicationManagerInstance
}
