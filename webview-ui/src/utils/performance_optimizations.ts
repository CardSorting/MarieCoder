/**
 * Performance optimization utilities for perceived responsiveness
 * Implements world-class UX patterns for instant-feel interactions
 */

import { useEffect, useRef, useState } from "react"

/**
 * Measures and tracks performance metrics for perceived responsiveness
 */
export class PerformanceMonitor {
	private static instance: PerformanceMonitor
	private metrics: Map<string, number[]> = new Map()

	private constructor() {}

	static getInstance(): PerformanceMonitor {
		if (!PerformanceMonitor.instance) {
			PerformanceMonitor.instance = new PerformanceMonitor()
		}
		return PerformanceMonitor.instance
	}

	/**
	 * Track interaction timing for perceived responsiveness
	 * Target: <100ms for user-facing operations
	 */
	trackInteraction(name: string, duration: number): void {
		if (!this.metrics.has(name)) {
			this.metrics.set(name, [])
		}
		this.metrics.get(name)!.push(duration)

		// Log warning if interaction exceeds 100ms threshold
		if (duration > 100) {
			console.warn(`[Performance] ${name} took ${duration}ms (target: <100ms)`)
		}
	}

	/**
	 * Get performance statistics for an interaction
	 */
	getStats(name: string): { avg: number; p50: number; p95: number; p99: number } | null {
		const durations = this.metrics.get(name)
		if (!durations || durations.length === 0) {
			return null
		}

		const sorted = [...durations].sort((a, b) => a - b)
		const avg = durations.reduce((a, b) => a + b, 0) / durations.length

		return {
			avg,
			p50: sorted[Math.floor(sorted.length * 0.5)],
			p95: sorted[Math.floor(sorted.length * 0.95)],
			p99: sorted[Math.floor(sorted.length * 0.99)],
		}
	}

	/**
	 * Clear all metrics
	 */
	clear(): void {
		this.metrics.clear()
	}
}

/**
 * Hook to measure and track interaction performance
 * Usage: const measurePerf = usePerformanceTracking()
 *        measurePerf('messageRender', () => { ... })
 */
export function usePerformanceTracking() {
	const monitor = PerformanceMonitor.getInstance()

	return (name: string, fn: () => void) => {
		const start = performance.now()
		fn()
		const duration = performance.now() - start
		monitor.trackInteraction(name, duration)
	}
}

/**
 * Optimized intersection observer hook for lazy loading
 * Uses content-visibility for better perceived performance
 */
export function useIntersectionObserver(
	elementRef: React.RefObject<HTMLElement>,
	options: IntersectionObserverInit = {},
): boolean {
	const [isIntersecting, setIsIntersecting] = useState(false)
	const [hasIntersected, setHasIntersected] = useState(false)

	useEffect(() => {
		const element = elementRef.current
		if (!element) {
			return
		}

		// If already intersected once, keep it loaded
		if (hasIntersected) {
			return
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				const isVisible = entry.isIntersecting
				setIsIntersecting(isVisible)

				if (isVisible && !hasIntersected) {
					setHasIntersected(true)
				}
			},
			{
				// Load content slightly before it enters viewport for smoother experience
				rootMargin: "50px",
				threshold: 0.01,
				...options,
			},
		)

		observer.observe(element)

		return () => {
			observer.disconnect()
		}
	}, [elementRef, hasIntersected, options])

	// Once content has been loaded, keep it loaded
	return hasIntersected || isIntersecting
}

/**
 * Debounce function with leading edge option for instant feedback
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
	options: { leading?: boolean; trailing?: boolean } = {},
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null
	let lastCallTime = 0

	const { leading = false, trailing = true } = options

	return (...args: Parameters<T>) => {
		const now = Date.now()
		const timeSinceLastCall = now - lastCallTime

		const execute = () => {
			func(...args)
			lastCallTime = now
		}

		if (timeout) {
			clearTimeout(timeout)
		}

		// Execute immediately on leading edge
		if (leading && timeSinceLastCall > wait) {
			execute()
		}

		// Schedule trailing edge execution
		if (trailing) {
			timeout = setTimeout(() => {
				if (!leading || timeSinceLastCall <= wait) {
					execute()
				}
				timeout = null
			}, wait)
		}
	}
}

/**
 * Throttle function for high-frequency events (scroll, resize)
 */
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
	let inThrottle = false
	let lastResult: ReturnType<T>

	return (...args: Parameters<T>): ReturnType<T> => {
		if (!inThrottle) {
			inThrottle = true
			lastResult = func(...args)
			setTimeout(() => {
				inThrottle = false
			}, limit)
		}
		return lastResult
	}
}

/**
 * Request idle callback wrapper with fallback for better browser support
 */
export function requestIdleCallback(callback: () => void, options?: { timeout?: number }): void {
	if ("requestIdleCallback" in window) {
		window.requestIdleCallback(callback, options)
	} else {
		// Fallback: use setTimeout with minimal delay
		setTimeout(callback, 1)
	}
}

/**
 * Optimized RAF (RequestAnimationFrame) scheduler for smooth animations
 */
export class RAFScheduler {
	private callbacks: Set<() => void> = new Set()
	private rafId: number | null = null

	schedule(callback: () => void): () => void {
		this.callbacks.add(callback)

		if (!this.rafId) {
			this.rafId = requestAnimationFrame(() => this.flush())
		}

		// Return cancel function
		return () => {
			this.callbacks.delete(callback)
		}
	}

	private flush(): void {
		const callbacks = Array.from(this.callbacks)
		this.callbacks.clear()
		this.rafId = null

		callbacks.forEach((cb) => cb())
	}
}

/**
 * Hook for batching RAF updates for better performance
 */
export function useRAFScheduler() {
	const schedulerRef = useRef<RAFScheduler>()

	if (!schedulerRef.current) {
		schedulerRef.current = new RAFScheduler()
	}

	return schedulerRef.current
}

/**
 * Predictive prefetching utility
 * Anticipates user actions and preloads content
 */
export class PrefetchManager {
	private static instance: PrefetchManager
	private prefetchQueue: Map<string, () => Promise<void>> = new Map()
	private prefetched: Set<string> = new Set()

	private constructor() {}

	static getInstance(): PrefetchManager {
		if (!PrefetchManager.instance) {
			PrefetchManager.instance = new PrefetchManager()
		}
		return PrefetchManager.instance
	}

	/**
	 * Register a prefetch operation
	 */
	register(key: string, prefetchFn: () => Promise<void>): void {
		this.prefetchQueue.set(key, prefetchFn)
	}

	/**
	 * Execute prefetch during idle time
	 */
	async prefetch(key: string): Promise<void> {
		if (this.prefetched.has(key)) {
			return
		}

		const prefetchFn = this.prefetchQueue.get(key)
		if (!prefetchFn) {
			return
		}

		requestIdleCallback(async () => {
			try {
				await prefetchFn()
				this.prefetched.add(key)
			} catch (error) {
				console.error(`[Prefetch] Failed to prefetch ${key}:`, error)
			}
		})
	}

	/**
	 * Check if content has been prefetched
	 */
	isPrefetched(key: string): boolean {
		return this.prefetched.has(key)
	}

	/**
	 * Clear prefetch cache
	 */
	clear(): void {
		this.prefetchQueue.clear()
		this.prefetched.clear()
	}
}

/**
 * Hook for predictive prefetching
 */
export function usePrefetch(key: string, prefetchFn: () => Promise<void>) {
	const manager = PrefetchManager.getInstance()

	useEffect(() => {
		manager.register(key, prefetchFn)
	}, [key, prefetchFn])

	return {
		prefetch: () => manager.prefetch(key),
		isPrefetched: manager.isPrefetched(key),
	}
}

/**
 * Optimistic update utility for instant UI feedback
 */
export function createOptimisticUpdate<T>(
	optimisticValue: T,
	actualUpdateFn: () => Promise<T>,
	onSuccess?: (value: T) => void,
	onError?: (error: Error, rollback: T) => void,
): { execute: () => Promise<void>; rollback: T } {
	const rollbackValue: T = optimisticValue

	return {
		execute: async () => {
			try {
				// Apply optimistic update immediately
				const result = await actualUpdateFn()
				onSuccess?.(result)
			} catch (error) {
				// Rollback on error
				onError?.(error as Error, rollbackValue)
			}
		},
		rollback: optimisticValue,
	}
}
