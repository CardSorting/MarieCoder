/**
 * Query Caching Layer for NOORMME SAAS
 * Following NORMIE DEV methodology - simple, efficient, performant caching
 */

export interface CacheConfig {
	enabled: boolean
	ttl: number // Time to live in seconds
	maxSize: number // Maximum number of cached items
	prefix: string
}

export interface CacheItem<T = any> {
	value: T
	expiresAt: number
	createdAt: number
	accessCount: number
	lastAccessed: number
}

export class QueryCache {
	private cache: Map<string, CacheItem> = new Map()
	private config: CacheConfig
	private stats = {
		hits: 0,
		misses: 0,
		evictions: 0,
		totalRequests: 0,
	}

	constructor(config: Partial<CacheConfig> = {}) {
		this.config = {
			enabled: true,
			ttl: 300, // 5 minutes
			maxSize: 1000,
			prefix: "query:",
			...config,
		}

		// Start cleanup interval
		this.startCleanup()
	}

	/**
	 * Get value from cache
	 */
	get<T>(key: string): T | null {
		if (!this.config.enabled) {
			return null
		}

		this.stats.totalRequests++

		const fullKey = this.getFullKey(key)
		const item = this.cache.get(fullKey)

		if (!item) {
			this.stats.misses++
			return null
		}

		// Check if expired
		if (Date.now() > item.expiresAt) {
			this.cache.delete(fullKey)
			this.stats.misses++
			return null
		}

		// Update access statistics
		item.accessCount++
		item.lastAccessed = Date.now()

		this.stats.hits++
		return item.value as T
	}

	/**
	 * Set value in cache
	 */
	set<T>(key: string, value: T, ttl?: number): void {
		if (!this.config.enabled) {
			return
		}

		const fullKey = this.getFullKey(key)
		const now = Date.now()
		const expiresAt = now + (ttl || this.config.ttl) * 1000

		// Check if we need to evict items
		if (this.cache.size >= this.config.maxSize) {
			this.evictLeastRecentlyUsed()
		}

		this.cache.set(fullKey, {
			value,
			expiresAt,
			createdAt: now,
			accessCount: 0,
			lastAccessed: now,
		})
	}

	/**
	 * Delete value from cache
	 */
	delete(key: string): boolean {
		const fullKey = this.getFullKey(key)
		return this.cache.delete(fullKey)
	}

	/**
	 * Clear all cache
	 */
	clear(): void {
		this.cache.clear()
	}

	/**
	 * Check if key exists in cache
	 */
	has(key: string): boolean {
		if (!this.config.enabled) {
			return false
		}

		const fullKey = this.getFullKey(key)
		const item = this.cache.get(fullKey)

		if (!item) {
			return false
		}

		// Check if expired
		if (Date.now() > item.expiresAt) {
			this.cache.delete(fullKey)
			return false
		}

		return true
	}

	/**
	 * Get cache statistics
	 */
	getStats() {
		const hitRate = this.stats.totalRequests > 0 ? (this.stats.hits / this.stats.totalRequests) * 100 : 0

		return {
			...this.stats,
			hitRate: Math.round(hitRate * 100) / 100,
			size: this.cache.size,
			maxSize: this.config.maxSize,
			enabled: this.config.enabled,
		}
	}

	/**
	 * Get cache keys
	 */
	keys(): string[] {
		return Array.from(this.cache.keys()).map((key) => key.replace(this.config.prefix, ""))
	}

	/**
	 * Get cache size
	 */
	size(): number {
		return this.cache.size
	}

	/**
	 * Invalidate cache by pattern
	 */
	invalidatePattern(pattern: string): number {
		const regex = new RegExp(pattern)
		let invalidated = 0

		for (const key of Array.from(this.cache.keys())) {
			if (regex.test(key)) {
				this.cache.delete(key)
				invalidated++
			}
		}

		return invalidated
	}

	/**
	 * Warm up cache with common queries
	 */
	async warmup(queries: Array<{ key: string; queryFn: () => Promise<any> }>): Promise<void> {
		console.log("🔥 Warming up cache...")

		const promises = queries.map(async ({ key, queryFn }) => {
			try {
				const result = await queryFn()
				this.set(key, result)
			} catch (error) {
				console.error(`Failed to warm up cache for key ${key}:`, error)
			}
		})

		await Promise.all(promises)
		console.log(`✅ Cache warmed up with ${queries.length} queries`)
	}

	/**
	 * Get full cache key with prefix
	 */
	private getFullKey(key: string): string {
		return `${this.config.prefix}${key}`
	}

	/**
	 * Evict least recently used items
	 */
	private evictLeastRecentlyUsed(): void {
		let oldestKey = ""
		let oldestTime = Date.now()

		for (const [key, item] of Array.from(this.cache.entries())) {
			if (item.lastAccessed < oldestTime) {
				oldestTime = item.lastAccessed
				oldestKey = key
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey)
			this.stats.evictions++
		}
	}

	/**
	 * Start periodic cleanup of expired items
	 */
	private startCleanup(): void {
		setInterval(() => {
			this.cleanup()
		}, 60000) // Clean up every minute
	}

	/**
	 * Clean up expired items
	 */
	private cleanup(): void {
		const now = Date.now()
		let cleaned = 0

		for (const [key, item] of Array.from(this.cache.entries())) {
			if (now > item.expiresAt) {
				this.cache.delete(key)
				cleaned++
			}
		}

		if (cleaned > 0) {
			console.log(`🧹 Cleaned up ${cleaned} expired cache items`)
		}
	}
}

/**
 * Cache decorator for methods
 */
export function Cacheable(ttl?: number, keyGenerator?: (...args: any[]) => string) {
	return (_target: any, propertyName: string, descriptor: PropertyDescriptor) => {
		const method = descriptor.value

		descriptor.value = async function (...args: any[]) {
			const cache = (this as any).cache || globalCache
			if (!cache) {
				return method.apply(this, args)
			}

			const key = keyGenerator ? keyGenerator(...args) : `${propertyName}:${JSON.stringify(args)}`

			// Try to get from cache
			const cached = cache.get(key)
			if (cached !== null) {
				return cached
			}

			// Execute method and cache result
			const result = await method.apply(this, args)
			cache.set(key, result, ttl)

			return result
		}
	}
}

/**
 * Global cache instance
 */
export const globalCache = new QueryCache({
	enabled: process.env.NODE_ENV === "production",
	ttl: 300, // 5 minutes
	maxSize: 1000,
	prefix: "global:",
})

/**
 * Cache manager for different cache types
 */
export class CacheManager {
	private caches: Map<string, QueryCache> = new Map()

	/**
	 * Get or create cache instance
	 */
	getCache(name: string, config?: Partial<CacheConfig>): QueryCache {
		if (!this.caches.has(name)) {
			this.caches.set(
				name,
				new QueryCache({
					prefix: `${name}:`,
					...config,
				}),
			)
		}
		return this.caches.get(name)!
	}

	/**
	 * Get all cache statistics
	 */
	getAllStats() {
		const stats: Record<string, any> = {}

		for (const [name, cache] of Array.from(this.caches.entries())) {
			stats[name] = cache.getStats()
		}

		return stats
	}

	/**
	 * Clear all caches
	 */
	clearAll(): void {
		for (const cache of Array.from(this.caches.values())) {
			cache.clear()
		}
	}

	/**
	 * Warm up all caches
	 */
	async warmupAll(warmupQueries: Record<string, Array<{ key: string; queryFn: () => Promise<any> }>>): Promise<void> {
		const promises = Object.entries(warmupQueries).map(([cacheName, queries]) => {
			const cache = this.getCache(cacheName)
			return cache.warmup(queries)
		})

		await Promise.all(promises)
	}
}

/**
 * Global cache manager instance
 */
export const cacheManager = new CacheManager()

/**
 * Predefined cache instances for common use cases
 */
export const userCache = cacheManager.getCache("users", { ttl: 600 }) // 10 minutes
export const subscriptionCache = cacheManager.getCache("subscriptions", { ttl: 300 }) // 5 minutes
export const paymentCache = cacheManager.getCache("payments", { ttl: 180 }) // 3 minutes
export const planCache = cacheManager.getCache("plans", { ttl: 1800 }) // 30 minutes
export const settingsCache = cacheManager.getCache("settings", { ttl: 3600 }) // 1 hour
