/**
 * Database Cache Manager
 * Intelligent caching layer with automatic invalidation
 * Following NOORMME Marie Kondo methodology - keeping only what sparks joy
 */

export interface CacheConfig {
	enabled: boolean
	ttl: number
	maxSize: number
	strategy: "lru" | "lfu" | "fifo"
}

export interface CacheEntry<T> {
	data: T
	expires: number
	accessCount: number
	lastAccessed: number
	createdAt: number
}

export class DatabaseCacheManager {
	private cache: Map<string, CacheEntry<any>> = new Map()
	private config: CacheConfig
	private stats = {
		hits: 0,
		misses: 0,
		evictions: 0,
		size: 0,
	}

	constructor(config: CacheConfig) {
		this.config = config
		this.startCleanupInterval()
	}

	/**
	 * Get cached data
	 */
	async get<T>(key: string): Promise<T | null> {
		if (!this.config.enabled) {
			return null
		}

		const entry = this.cache.get(key)

		if (!entry) {
			this.stats.misses++
			return null
		}

		// Check if expired
		if (Date.now() > entry.expires) {
			this.cache.delete(key)
			this.stats.misses++
			this.stats.size = this.cache.size
			return null
		}

		// Update access statistics
		entry.accessCount++
		entry.lastAccessed = Date.now()
		this.stats.hits++

		return entry.data as T
	}

	/**
	 * Set cached data
	 */
	async set<T>(key: string, data: T, ttl?: number): Promise<void> {
		if (!this.config.enabled) {
			return
		}

		const expires = Date.now() + (ttl || this.config.ttl)
		const entry: CacheEntry<T> = {
			data,
			expires,
			accessCount: 1,
			lastAccessed: Date.now(),
			createdAt: Date.now(),
		}

		// Check if we need to evict entries
		if (this.cache.size >= this.config.maxSize) {
			this.evictEntries()
		}

		this.cache.set(key, entry)
		this.stats.size = this.cache.size
	}

	/**
	 * Delete cached data
	 */
	async delete(key: string): Promise<boolean> {
		const deleted = this.cache.delete(key)
		this.stats.size = this.cache.size
		return deleted
	}

	/**
	 * Clear all cached data
	 */
	async clear(): Promise<void> {
		this.cache.clear()
		this.stats.size = 0
	}

	/**
	 * Invalidate cache by pattern
	 */
	async invalidatePattern(pattern: string): Promise<number> {
		const regex = new RegExp(pattern)
		let invalidated = 0

		for (const key of this.cache.keys()) {
			if (regex.test(key)) {
				this.cache.delete(key)
				invalidated++
			}
		}

		this.stats.size = this.cache.size
		return invalidated
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		size: number
		maxSize: number
		hitRate: number
		hits: number
		misses: number
		evictions: number
	} {
		const total = this.stats.hits + this.stats.misses
		return {
			size: this.stats.size,
			maxSize: this.config.maxSize,
			hitRate: total > 0 ? this.stats.hits / total : 0,
			hits: this.stats.hits,
			misses: this.stats.misses,
			evictions: this.stats.evictions,
		}
	}

	/**
	 * Get cache size
	 */
	getSize(): number {
		return this.cache.size
	}

	/**
	 * Close cache manager
	 */
	async close(): Promise<void> {
		this.cache.clear()
		this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 }
	}

	// Private methods

	private evictEntries(): void {
		const entriesToEvict = Math.ceil(this.config.maxSize * 0.1) // Evict 10%

		switch (this.config.strategy) {
			case "lru":
				this.evictLRU(entriesToEvict)
				break
			case "lfu":
				this.evictLFU(entriesToEvict)
				break
			case "fifo":
				this.evictFIFO(entriesToEvict)
				break
		}
	}

	private evictLRU(count: number): void {
		const entries = Array.from(this.cache.entries())
			.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
			.slice(0, count)

		for (const [key] of entries) {
			this.cache.delete(key)
			this.stats.evictions++
		}
	}

	private evictLFU(count: number): void {
		const entries = Array.from(this.cache.entries())
			.sort((a, b) => a[1].accessCount - b[1].accessCount)
			.slice(0, count)

		for (const [key] of entries) {
			this.cache.delete(key)
			this.stats.evictions++
		}
	}

	private evictFIFO(count: number): void {
		const entries = Array.from(this.cache.entries())
			.sort((a, b) => a[1].createdAt - b[1].createdAt)
			.slice(0, count)

		for (const [key] of entries) {
			this.cache.delete(key)
			this.stats.evictions++
		}
	}

	private startCleanupInterval(): void {
		if (!this.config.enabled) {
			return
		}

		// Clean up expired entries every 5 minutes
		setInterval(
			() => {
				const now = Date.now()
				for (const [key, entry] of this.cache.entries()) {
					if (now > entry.expires) {
						this.cache.delete(key)
					}
				}
				this.stats.size = this.cache.size
			},
			5 * 60 * 1000,
		)
	}
}
