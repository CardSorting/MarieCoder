/**
 * Path Cache Utility
 *
 * Provides caching for expensive path operations to improve performance
 * when the same paths are accessed repeatedly.
 */

import * as path from "path"

/**
 * LRU cache implementation for path operations
 */
class PathCache {
	private normalizedCache = new Map<string, string>()
	private resolvedCache = new Map<string, string>()
	private relativeCache = new Map<string, string>()
	private maxSize: number

	constructor(maxSize = 1000) {
		this.maxSize = maxSize
	}

	/**
	 * Get cached normalized path or compute and cache it
	 */
	getNormalized(inputPath: string): string {
		if (this.normalizedCache.has(inputPath)) {
			return this.normalizedCache.get(inputPath)!
		}

		const normalized = path.normalize(inputPath)
		this.setWithEviction(this.normalizedCache, inputPath, normalized)
		return normalized
	}

	/**
	 * Get cached resolved path or compute and cache it
	 */
	getResolved(...pathSegments: string[]): string {
		const key = pathSegments.join("|")
		if (this.resolvedCache.has(key)) {
			return this.resolvedCache.get(key)!
		}

		const resolved = path.resolve(...pathSegments)
		this.setWithEviction(this.resolvedCache, key, resolved)
		return resolved
	}

	/**
	 * Get cached relative path or compute and cache it
	 */
	getRelative(from: string, to: string): string {
		const key = `${from}|${to}`
		if (this.relativeCache.has(key)) {
			return this.relativeCache.get(key)!
		}

		const relative = path.relative(from, to)
		this.setWithEviction(this.relativeCache, key, relative)
		return relative
	}

	/**
	 * Clear all caches
	 */
	clear(): void {
		this.normalizedCache.clear()
		this.resolvedCache.clear()
		this.relativeCache.clear()
	}

	/**
	 * Get cache statistics
	 */
	getStats() {
		return {
			normalized: this.normalizedCache.size,
			resolved: this.resolvedCache.size,
			relative: this.relativeCache.size,
			total: this.normalizedCache.size + this.resolvedCache.size + this.relativeCache.size,
			maxSize: this.maxSize,
		}
	}

	/**
	 * Set value with LRU eviction if cache is full
	 */
	private setWithEviction(cache: Map<string, string>, key: string, value: string): void {
		// If cache is full, remove oldest entry (first entry in Map)
		if (cache.size >= this.maxSize) {
			const firstKey = cache.keys().next().value
			cache.delete(firstKey)
		}
		cache.set(key, value)
	}
}

/**
 * Global path cache instance
 */
export const pathCache = new PathCache()

/**
 * Cached path operations for common use cases
 */
export const cachedPath = {
	normalize: (inputPath: string) => pathCache.getNormalized(inputPath),
	resolve: (...pathSegments: string[]) => pathCache.getResolved(...pathSegments),
	relative: (from: string, to: string) => pathCache.getRelative(from, to),

	// Pass-through for operations that don't benefit from caching
	join: path.join,
	basename: path.basename,
	dirname: path.dirname,
	extname: path.extname,
	sep: path.sep,
}
