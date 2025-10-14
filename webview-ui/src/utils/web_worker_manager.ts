/**
 * Web Worker Manager for offloading heavy computation
 * Keeps the main thread responsive by delegating CPU-intensive tasks to worker threads
 *
 * Design Philosophy:
 * - Only use workers for operations >50ms on main thread
 * - Graceful fallback when workers unavailable
 * - Automatic pooling based on CPU cores
 * - Priority queue for task management
 */

import { useCallback, useEffect, useRef } from "react"

/**
 * Task to be executed in a web worker
 */
export interface WorkerTask<T = any> {
	/** Unique identifier for tracking */
	id: string
	/** Task type for worker routing */
	type: string
	/** Task payload data */
	data: T
	/** Priority level for queue ordering */
	priority?: "high" | "normal" | "low"
}

/**
 * Result from a web worker task
 */
export interface WorkerResult<R = any> {
	/** Task identifier */
	id: string
	/** Task type */
	type: string
	/** Success result */
	result?: R
	/** Error message if failed */
	error?: string
	/** Execution time in milliseconds */
	executionTime?: number
}

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
	/**
	 * Maximum number of workers in the pool
	 * @default navigator.hardwareConcurrency || 4
	 */
	maxWorkers?: number
	/**
	 * Minimum number of workers to keep warm (preloaded)
	 * @default 1
	 */
	minWorkers?: number
	/**
	 * Worker script URL or inline function
	 */
	workerScript?: string | (() => void)
	/**
	 * Timeout for tasks in milliseconds
	 * @default 30000 (30 seconds)
	 */
	taskTimeout?: number
	/**
	 * Idle timeout before terminating unused workers (milliseconds)
	 * @default 60000 (1 minute)
	 */
	workerIdleTimeout?: number
	/**
	 * Enable worker preloading (warm start)
	 * @default true
	 */
	enablePreloading?: boolean
	/**
	 * Enable debug logging
	 * @default false
	 */
	debug?: boolean
}

/**
 * Web Worker Pool Manager
 * Manages a pool of workers for efficient task distribution with automatic scaling
 */
export class WebWorkerPool {
	private workers: Worker[] = []
	private availableWorkers: Worker[] = []
	private taskQueue: Array<{
		task: WorkerTask
		resolve: (result: any) => void
		reject: (error: Error) => void
		timeout?: NodeJS.Timeout
	}> = []
	private activeTasksByWorker = new Map<Worker, string>()
	private workerIdleTimers = new Map<Worker, NodeJS.Timeout>()
	private maxWorkers: number
	private minWorkers: number
	private taskTimeout: number
	private workerIdleTimeout: number
	private enablePreloading: boolean
	private workerScript?: string
	private debug: boolean
	private isInitialized = false

	constructor(config: WorkerPoolConfig = {}) {
		this.maxWorkers = config.maxWorkers || (typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4)
		this.minWorkers = config.minWorkers || 1
		this.taskTimeout = config.taskTimeout || 30000
		this.workerIdleTimeout = config.workerIdleTimeout || 60000
		this.enablePreloading = config.enablePreloading !== false // Default true
		this.debug = config.debug || false

		if (config.workerScript) {
			this.workerScript =
				typeof config.workerScript === "string" ? config.workerScript : this.createWorkerFromFunction(config.workerScript)
		}

		if (this.debug) {
			console.log(`[WebWorkerPool] Initialized with max ${this.maxWorkers} workers, min ${this.minWorkers} workers`)
		}

		// Preload workers if enabled
		if (this.enablePreloading && this.workerScript) {
			this.preloadWorkers()
		}
	}

	/**
	 * Create a worker from an inline function
	 */
	private createWorkerFromFunction(fn: () => void): string {
		const blob = new Blob([`(${fn.toString()})()`], { type: "application/javascript" })
		return URL.createObjectURL(blob)
	}

	/**
	 * Preload minimum number of workers for warm start
	 */
	private async preloadWorkers(): Promise<void> {
		if (this.isInitialized) {
			return
		}

		if (this.debug) {
			console.log(`[WebWorkerPool] Preloading ${this.minWorkers} workers for warm start...`)
		}

		const preloadStart = performance.now()
		const promises: Promise<void>[] = []

		for (let i = 0; i < this.minWorkers; i++) {
			promises.push(
				new Promise<void>((resolve) => {
					const worker = this.initializeWorker()

					// Send warmup task to ensure worker is fully ready
					const warmupTask: WorkerTask = {
						id: `warmup-${i}`,
						type: "warmup",
						data: {},
					}

					const warmupHandler = (event: MessageEvent<WorkerResult>) => {
						if (event.data.type === "worker-ready" || event.data.type === "warmup") {
							worker.removeEventListener("message", warmupHandler)
							resolve()
						}
					}

					worker.addEventListener("message", warmupHandler)
					worker.postMessage(warmupTask)
				}),
			)
		}

		await Promise.all(promises)
		this.isInitialized = true

		const preloadTime = performance.now() - preloadStart
		if (this.debug) {
			console.log(`[WebWorkerPool] Preloaded ${this.minWorkers} workers in ${preloadTime.toFixed(2)}ms`)
		}
	}

	/**
	 * Start idle timeout for a worker
	 * Worker will be terminated after timeout unless it's part of minimum pool
	 */
	private startIdleTimeout(worker: Worker): void {
		// Clear any existing timeout
		this.clearIdleTimeout(worker)

		// Don't start timeout if we're at or below minimum workers
		if (this.workers.length <= this.minWorkers) {
			return
		}

		const timeout = setTimeout(() => {
			// Double check we're still above minimum
			if (this.workers.length > this.minWorkers && this.availableWorkers.includes(worker)) {
				if (this.debug) {
					console.log(`[WebWorkerPool] Terminating idle worker (${this.workers.length} -> ${this.workers.length - 1})`)
				}
				this.terminateWorker(worker)
			}
		}, this.workerIdleTimeout)

		this.workerIdleTimers.set(worker, timeout)
	}

	/**
	 * Clear idle timeout for a worker
	 */
	private clearIdleTimeout(worker: Worker): void {
		const timeout = this.workerIdleTimers.get(worker)
		if (timeout) {
			clearTimeout(timeout)
			this.workerIdleTimers.delete(worker)
		}
	}

	/**
	 * Terminate a specific worker
	 */
	private terminateWorker(worker: Worker): void {
		// Clear timeout
		this.clearIdleTimeout(worker)

		// Remove from pools
		const workerIndex = this.workers.indexOf(worker)
		if (workerIndex > -1) {
			this.workers.splice(workerIndex, 1)
		}

		const availableIndex = this.availableWorkers.indexOf(worker)
		if (availableIndex > -1) {
			this.availableWorkers.splice(availableIndex, 1)
		}

		// Terminate
		worker.terminate()
	}

	/**
	 * Initialize a new worker
	 */
	private initializeWorker(): Worker {
		if (!this.workerScript) {
			throw new Error("Worker script not provided. Please provide workerScript in configuration or use setWorkerScript()")
		}

		const worker = new Worker(this.workerScript)

		worker.onmessage = (event: MessageEvent<WorkerResult>) => {
			this.handleWorkerMessage(worker, event.data)
		}

		worker.onerror = (error: ErrorEvent) => {
			this.handleWorkerError(worker, error)
		}

		this.workers.push(worker)
		this.availableWorkers.push(worker)

		if (this.debug) {
			console.log(`[WebWorkerPool] Created worker (total: ${this.workers.length})`)
		}

		return worker
	}

	/**
	 * Set worker script dynamically
	 */
	setWorkerScript(script: string | (() => void)): void {
		this.workerScript = typeof script === "string" ? script : this.createWorkerFromFunction(script)
	}

	/**
	 * Execute a task in a worker with automatic timeout and error handling
	 *
	 * @example
	 * ```typescript
	 * const result = await pool.executeTask({
	 *   id: 'parse-1',
	 *   type: 'parse-markdown',
	 *   data: { markdown: largeText },
	 *   priority: 'high'
	 * })
	 * ```
	 */
	async executeTask<T>(task: WorkerTask<T>): Promise<any> {
		return new Promise((resolve, reject) => {
			// Add timeout protection
			const timeout = setTimeout(() => {
				const error = new Error(`Task ${task.id} timed out after ${this.taskTimeout}ms`)
				if (this.debug) {
					console.error(`[WebWorkerPool] ${error.message}`)
				}
				reject(error)
			}, this.taskTimeout)

			this.taskQueue.push({
				task,
				resolve: (result: any) => {
					clearTimeout(timeout)
					resolve(result)
				},
				reject: (error: Error) => {
					clearTimeout(timeout)
					reject(error)
				},
				timeout,
			})

			this.processQueue()
		})
	}

	/**
	 * Process task queue with priority ordering
	 */
	private processQueue(): void {
		// If no tasks or no available workers, return
		if (this.taskQueue.length === 0) {
			return
		}

		// Get or create available worker
		let worker = this.availableWorkers.pop()

		if (!worker && this.workers.length < this.maxWorkers) {
			worker = this.initializeWorker()
		}

		if (!worker) {
			// All workers busy, task will wait in queue
			if (this.debug) {
				console.log(`[WebWorkerPool] All ${this.maxWorkers} workers busy, queued: ${this.taskQueue.length}`)
			}
			return
		}

		// Clear idle timeout since worker is being used
		this.clearIdleTimeout(worker)

		// Sort queue by priority (high > normal > low)
		this.taskQueue.sort((a, b) => {
			const priorityMap = { high: 3, normal: 2, low: 1 }
			const aPriority = priorityMap[a.task.priority || "normal"]
			const bPriority = priorityMap[b.task.priority || "normal"]
			return bPriority - aPriority
		})

		const { task, resolve, reject } = this.taskQueue.shift()!

		// Track active task
		this.activeTasksByWorker.set(worker, task.id)

		// Store resolve/reject for this worker
		;(worker as any).__currentResolve = resolve
		;(worker as any).__currentReject = reject
		;(worker as any).__taskStartTime = performance.now()

		// Send task to worker
		worker.postMessage(task)

		if (this.debug) {
			console.log(`[WebWorkerPool] Dispatched task ${task.id} (${task.type}) with priority ${task.priority || "normal"}`)
		}
	}

	/**
	 * Handle message from worker (success case)
	 */
	private handleWorkerMessage(worker: Worker, result: WorkerResult): void {
		const resolve = (worker as any).__currentResolve
		const taskStartTime = (worker as any).__taskStartTime

		if (resolve) {
			if (result.error) {
				const reject = (worker as any).__currentReject
				const error = new Error(result.error)
				if (this.debug) {
					console.error(`[WebWorkerPool] Task ${result.id} failed:`, result.error)
				}
				reject(error)
			} else {
				if (this.debug && taskStartTime) {
					const executionTime = performance.now() - taskStartTime
					console.log(`[WebWorkerPool] Task ${result.id} completed in ${executionTime.toFixed(2)}ms`)
				}
				resolve(result.result)
			}
		}

		// Clean up
		delete (worker as any).__currentResolve
		delete (worker as any).__currentReject
		delete (worker as any).__taskStartTime
		this.activeTasksByWorker.delete(worker)

		// Return worker to available pool
		this.availableWorkers.push(worker)

		// Start idle timeout for recycling
		this.startIdleTimeout(worker)

		// Process next task
		this.processQueue()
	}

	/**
	 * Handle worker error (failure case)
	 */
	private handleWorkerError(worker: Worker, error: ErrorEvent): void {
		const reject = (worker as any).__currentReject

		if (reject) {
			const errorMessage = `Worker error: ${error.message}`
			if (this.debug) {
				console.error(`[WebWorkerPool] ${errorMessage}`)
			}
			reject(new Error(errorMessage))
		}

		// Clean up
		delete (worker as any).__currentResolve
		delete (worker as any).__currentReject
		delete (worker as any).__taskStartTime
		this.activeTasksByWorker.delete(worker)

		// Return worker to available pool
		this.availableWorkers.push(worker)

		// Process next task
		this.processQueue()
	}

	/**
	 * Get pool statistics for monitoring
	 */
	getStats(): {
		totalWorkers: number
		availableWorkers: number
		queuedTasks: number
		activeTasks: number
	} {
		return {
			totalWorkers: this.workers.length,
			availableWorkers: this.availableWorkers.length,
			queuedTasks: this.taskQueue.length,
			activeTasks: this.activeTasksByWorker.size,
		}
	}

	/**
	 * Terminate all workers and clear queue
	 * Should be called when pool is no longer needed
	 */
	terminate(): void {
		// Clear all idle timers
		this.workerIdleTimers.forEach((timeout) => clearTimeout(timeout))
		this.workerIdleTimers.clear()

		// Terminate all workers
		this.workers.forEach((worker) => worker.terminate())
		this.workers = []
		this.availableWorkers = []
		this.activeTasksByWorker.clear()
		this.taskQueue = []
		this.isInitialized = false

		if (this.debug) {
			console.log("[WebWorkerPool] Terminated all workers")
		}
	}
}

/**
 * Singleton instance for global worker pool
 */
let globalWorkerPool: WebWorkerPool | null = null

/**
 * Get or create global worker pool
 * Recommended for most use cases to share workers across components
 */
export function getWorkerPool(config?: WorkerPoolConfig): WebWorkerPool {
	if (!globalWorkerPool) {
		globalWorkerPool = new WebWorkerPool(config)
	}
	return globalWorkerPool
}

/**
 * React hook for using web workers with automatic cleanup
 *
 * @example
 * ```tsx
 * const { executeTask, getStats } = useWebWorker({
 *   workerScript: '/markdown-worker.js',
 *   debug: true
 * })
 *
 * const result = await executeTask({
 *   id: 'task-1',
 *   type: 'parse-markdown',
 *   data: { markdown: content },
 *   priority: 'high'
 * })
 * ```
 */
export function useWebWorker(config?: WorkerPoolConfig) {
	const poolRef = useRef<WebWorkerPool>()

	useEffect(() => {
		poolRef.current = getWorkerPool(config)

		return () => {
			// Note: Don't terminate global pool on unmount
			// It's shared across components
		}
	}, [])

	const executeTask = useCallback(async <T>(task: WorkerTask<T>): Promise<any> => {
		if (!poolRef.current) {
			throw new Error("Worker pool not initialized")
		}
		return poolRef.current.executeTask(task)
	}, [])

	const getStats = useCallback(() => {
		return poolRef.current?.getStats()
	}, [])

	return {
		executeTask,
		getStats,
	}
}

/**
 * Common worker tasks for MarieCoder
 * Pre-configured task creators for common operations
 */
export const WorkerTasks = {
	/**
	 * Parse large markdown content
	 * Use when markdown >5KB for best performance
	 */
	parseMarkdown: (
		id: string,
		markdown: string,
		options?: { inline?: boolean; processFilePaths?: boolean },
		priority?: "high" | "normal" | "low",
	): WorkerTask<{ markdown: string; options?: any }> => ({
		id,
		type: "parse-markdown",
		data: { markdown, options },
		priority: priority || "high",
	}),

	/**
	 * Process message array (combine, filter, transform)
	 * Use when message count >50 for best performance
	 */
	processMessages: (id: string, messages: any[], priority?: "high" | "normal" | "low"): WorkerTask<{ messages: any[] }> => ({
		id,
		type: "process-messages",
		data: { messages },
		priority: priority || "normal",
	}),

	/**
	 * Fuzzy search through large datasets
	 * Use when searching >50 items
	 */
	fuzzySearch: (
		id: string,
		query: string,
		items: any[],
		keys: string[],
		options?: {
			threshold?: number
			shouldSort?: boolean
			isCaseSensitive?: boolean
		},
		priority?: "high" | "normal" | "low",
	): WorkerTask<{ query: string; items: any[]; keys: string[]; options?: any }> => ({
		id,
		type: "fuzzy-search",
		data: { query, items, keys, options },
		priority: priority || "high",
	}),
}
