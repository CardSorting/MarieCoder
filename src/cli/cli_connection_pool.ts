/**
 * Connection pooling and rate limiting for API calls
 * Manages concurrent requests and prevents rate limit issues
 */

import type { CancellationToken } from "./cli_cancellation"
import { CancellationError } from "./cli_cancellation"
import { getLogger } from "./cli_logger"
import { getDeduplicationManager } from "./cli_request_deduplicator"

const logger = getLogger()
const deduplicationManager = getDeduplicationManager()

export interface ConnectionPoolOptions {
	maxConnections: number
	requestsPerMinute?: number
	requestsPerSecond?: number
	queueTimeout?: number
	enableDeduplication?: boolean
	deduplicationTtl?: number
}

export interface RateLimitConfig {
	requestsPerMinute?: number
	requestsPerSecond?: number
}

/**
 * Rate limiter for API calls
 */
class RateLimiter {
	private requestTimestamps: number[] = []
	private requestsPerMinute: number
	private requestsPerSecond: number

	constructor(config: RateLimitConfig) {
		this.requestsPerMinute = config.requestsPerMinute || Number.POSITIVE_INFINITY
		this.requestsPerSecond = config.requestsPerSecond || Number.POSITIVE_INFINITY
	}

	/**
	 * Wait until request is allowed
	 */
	async waitForSlot(token?: CancellationToken): Promise<void> {
		while (true) {
			token?.throwIfCancellationRequested()

			const now = Date.now()
			this.cleanOldTimestamps(now)

			// Check per-second limit
			const recentRequests = this.requestTimestamps.filter((ts) => now - ts < 1000)
			if (recentRequests.length >= this.requestsPerSecond) {
				const oldestRecent = Math.min(...recentRequests)
				const waitTime = 1000 - (now - oldestRecent)
				logger.debug(`Rate limit: waiting ${waitTime}ms (per-second limit)`)
				await this.sleep(waitTime, token)
				continue
			}

			// Check per-minute limit
			const recentMinuteRequests = this.requestTimestamps.filter((ts) => now - ts < 60000)
			if (recentMinuteRequests.length >= this.requestsPerMinute) {
				const oldestMinute = Math.min(...recentMinuteRequests)
				const waitTime = 60000 - (now - oldestMinute)
				logger.debug(`Rate limit: waiting ${waitTime}ms (per-minute limit)`)
				await this.sleep(waitTime, token)
				continue
			}

			// Request allowed
			this.requestTimestamps.push(now)
			return
		}
	}

	/**
	 * Remove timestamps older than 1 minute
	 */
	private cleanOldTimestamps(now: number): void {
		this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < 60000)
	}

	/**
	 * Sleep with cancellation support
	 */
	private sleep(ms: number, token?: CancellationToken): Promise<void> {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => resolve(), ms)

			token?.onCancellationRequested(() => {
				clearTimeout(timeout)
				reject(new CancellationError("Sleep was cancelled"))
			})
		})
	}

	/**
	 * Get current rate limit status
	 */
	getStatus(): {
		requestsLastSecond: number
		requestsLastMinute: number
		remainingPerSecond: number
		remainingPerMinute: number
	} {
		const now = Date.now()
		this.cleanOldTimestamps(now)

		const requestsLastSecond = this.requestTimestamps.filter((ts) => now - ts < 1000).length
		const requestsLastMinute = this.requestTimestamps.length

		return {
			requestsLastSecond,
			requestsLastMinute,
			remainingPerSecond: Math.max(0, this.requestsPerSecond - requestsLastSecond),
			remainingPerMinute: Math.max(0, this.requestsPerMinute - requestsLastMinute),
		}
	}
}

/**
 * Connection pool for managing concurrent API requests
 */
export class ConnectionPool {
	private maxConnections: number
	private activeConnections: number = 0
	private queue: Array<{
		execute: () => Promise<any>
		resolve: (value: any) => void
		reject: (error: any) => void
		timeout?: NodeJS.Timeout
	}> = []
	private rateLimiter: RateLimiter
	private queueTimeout: number
	private enableDeduplication: boolean
	private deduplicatorName: string

	constructor(options: ConnectionPoolOptions, name: string = "default") {
		this.maxConnections = options.maxConnections
		this.queueTimeout = options.queueTimeout || 30000
		this.enableDeduplication = options.enableDeduplication ?? true
		this.deduplicatorName = `pool-${name}`
		this.rateLimiter = new RateLimiter({
			requestsPerMinute: options.requestsPerMinute,
			requestsPerSecond: options.requestsPerSecond,
		})

		// Initialize deduplicator if enabled
		if (this.enableDeduplication) {
			deduplicationManager.getDeduplicator(this.deduplicatorName, {
				ttl: options.deduplicationTtl || 60000,
				cacheResults: true,
			})
		}
	}

	/**
	 * Execute a function with connection pooling and rate limiting
	 */
	async execute<T>(fn: () => Promise<T>, token?: CancellationToken, requestKey?: string): Promise<T> {
		token?.throwIfCancellationRequested()

		// Use deduplication if enabled and key is provided
		if (this.enableDeduplication && requestKey) {
			return deduplicationManager.execute(
				requestKey,
				async () => {
					return this.executeWithPool(fn, token)
				},
				[],
				this.deduplicatorName,
				token,
			)
		}

		return this.executeWithPool(fn, token)
	}

	/**
	 * Execute with connection pool (internal)
	 */
	private async executeWithPool<T>(fn: () => Promise<T>, token?: CancellationToken): Promise<T> {
		token?.throwIfCancellationRequested()

		// Wait for rate limiter
		await this.rateLimiter.waitForSlot(token)

		// Wait for available connection slot
		if (this.activeConnections >= this.maxConnections) {
			await this.waitForConnection(token)
		} else {
			// Immediately claim the connection slot
			this.activeConnections++
			logger.debug(`Connection pool: ${this.activeConnections}/${this.maxConnections} active`)
		}

		try {
			const result = await fn()
			return result
		} finally {
			this.activeConnections--
			this.processQueue()
		}
	}

	/**
	 * Wait for a connection to become available
	 * When a slot becomes available, this promise resolves AND the connection is already claimed
	 */
	private async waitForConnection(token?: CancellationToken): Promise<void> {
		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const index = this.queue.findIndex((item) => item.resolve === resolve)
				if (index !== -1) {
					this.queue.splice(index, 1)
				}
				reject(new Error(`Connection pool timeout after ${this.queueTimeout}ms`))
			}, this.queueTimeout)

			token?.onCancellationRequested(() => {
				clearTimeout(timeoutId)
				const index = this.queue.findIndex((item) => item.resolve === resolve)
				if (index !== -1) {
					this.queue.splice(index, 1)
				}
				reject(new CancellationError("Connection pool wait was cancelled"))
			})

			this.queue.push({
				execute: async () => {
					// Claim the connection slot BEFORE resolving the promise
					// This prevents race conditions where multiple queued items try to start simultaneously
					this.activeConnections++
					logger.debug(`Connection pool: ${this.activeConnections}/${this.maxConnections} active (from queue)`)
					resolve()
				},
				resolve,
				reject,
				timeout: timeoutId,
			})
		})
	}

	/**
	 * Process queued requests
	 * Only dequeue items when there are actually available connection slots
	 */
	private processQueue(): void {
		while (this.queue.length > 0 && this.activeConnections < this.maxConnections) {
			const item = this.queue.shift()
			if (item) {
				if (item.timeout) {
					clearTimeout(item.timeout)
				}
				// Execute will increment activeConnections before resolving
				item.execute().catch((error) => item.reject(error))
			}
		}
	}

	/**
	 * Get pool statistics
	 */
	getStats(): {
		activeConnections: number
		maxConnections: number
		queuedRequests: number
		utilization: number
		rateLimitStatus: ReturnType<RateLimiter["getStatus"]>
		deduplicationStats?: ReturnType<typeof deduplicationManager.getAllStats>[string]
	} {
		const stats: any = {
			activeConnections: this.activeConnections,
			maxConnections: this.maxConnections,
			queuedRequests: this.queue.length,
			utilization: (this.activeConnections / this.maxConnections) * 100,
			rateLimitStatus: this.rateLimiter.getStatus(),
		}

		if (this.enableDeduplication) {
			const allDeduplicationStats = deduplicationManager.getAllStats()
			stats.deduplicationStats = allDeduplicationStats[this.deduplicatorName]
		}

		return stats
	}

	/**
	 * Clear the queue and reject all pending requests
	 */
	clearQueue(reason?: string): void {
		const queueCopy = this.queue.splice(0)
		for (const item of queueCopy) {
			if (item.timeout) {
				clearTimeout(item.timeout)
			}
			item.reject(new Error(reason || "Connection pool queue cleared"))
		}
	}

	/**
	 * Shutdown the pool
	 */
	async shutdown(): Promise<void> {
		logger.debug("Shutting down connection pool")
		this.clearQueue("Connection pool is shutting down")

		// Wait for active connections to complete
		while (this.activeConnections > 0) {
			await new Promise((resolve) => setTimeout(resolve, 100))
		}

		logger.debug("Connection pool shutdown complete")
	}
}

/**
 * API connection pool manager
 */
export class ApiConnectionPoolManager {
	private pools: Map<string, ConnectionPool> = new Map()
	private defaultPool: ConnectionPool

	constructor(defaultOptions?: ConnectionPoolOptions) {
		this.defaultPool = new ConnectionPool(
			defaultOptions || {
				maxConnections: 10,
				requestsPerMinute: 60,
				requestsPerSecond: 10,
			},
		)
	}

	/**
	 * Create a named connection pool
	 */
	createPool(name: string, options: ConnectionPoolOptions): ConnectionPool {
		const pool = new ConnectionPool(options, name)
		this.pools.set(name, pool)
		logger.debug(`Created connection pool: ${name}`)
		return pool
	}

	/**
	 * Get a named pool or the default pool
	 */
	getPool(name?: string): ConnectionPool {
		if (!name) {
			return this.defaultPool
		}

		const pool = this.pools.get(name)
		if (!pool) {
			logger.warn(`Pool '${name}' not found, using default pool`)
			return this.defaultPool
		}

		return pool
	}

	/**
	 * Execute a request using a named pool
	 */
	async execute<T>(fn: () => Promise<T>, poolName?: string, token?: CancellationToken, requestKey?: string): Promise<T> {
		const pool = this.getPool(poolName)
		return pool.execute(fn, token, requestKey)
	}

	/**
	 * Get statistics for all pools
	 */
	getAllStats(): Record<string, ReturnType<ConnectionPool["getStats"]>> {
		const stats: Record<string, ReturnType<ConnectionPool["getStats"]>> = {
			default: this.defaultPool.getStats(),
		}

		for (const [name, pool] of this.pools.entries()) {
			stats[name] = pool.getStats()
		}

		return stats
	}

	/**
	 * Shutdown all pools
	 */
	async shutdown(): Promise<void> {
		logger.info("Shutting down all connection pools")

		const shutdownPromises = [this.defaultPool.shutdown()]

		for (const pool of this.pools.values()) {
			shutdownPromises.push(pool.shutdown())
		}

		await Promise.all(shutdownPromises)
		this.pools.clear()

		// Dispose deduplication manager
		deduplicationManager.dispose()

		logger.success("All connection pools shut down")
	}
}

/**
 * Get global API connection pool manager
 */
let apiConnectionPoolManagerInstance: ApiConnectionPoolManager | null = null

export function getApiConnectionPoolManager(options?: ConnectionPoolOptions): ApiConnectionPoolManager {
	if (!apiConnectionPoolManagerInstance) {
		apiConnectionPoolManagerInstance = new ApiConnectionPoolManager(options)
	}
	return apiConnectionPoolManagerInstance
}
