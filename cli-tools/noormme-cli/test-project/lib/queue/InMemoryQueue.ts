/**
 * In-Memory Queue Implementation
 * Fast, lightweight queue for request-scoped operations
 */

import PQueue from "p-queue"
import { InMemoryQueue, InMemoryQueueConfig, JobPayload } from "./types"

export class NoormmeInMemoryQueue<T = JobPayload> implements InMemoryQueue<T> {
	private queue: PQueue
	private config: Required<InMemoryQueueConfig>
	private processor?: (payload: T) => Promise<void>

	constructor(config: InMemoryQueueConfig = {}) {
		this.config = {
			concurrency: config.concurrency || 3,
			interval: config.interval || 100,
			timeout: config.timeout || 30000,
		}

		this.queue = new PQueue({
			concurrency: this.config.concurrency,
			interval: this.config.interval,
			timeout: this.config.timeout,
		})
	}

	/**
	 * Set the job processor function
	 * @param processor Function to process jobs
	 */
	setProcessor(processor: (payload: T) => Promise<void>): void {
		this.processor = processor
	}

	/**
	 * Add a job to the queue
	 * @param payload Job payload
	 * @param priority Job priority (higher = more priority)
	 * @returns Promise that resolves when job completes
	 */
	async add(payload: T, priority: number = 0): Promise<void> {
		if (!this.processor) {
			throw new Error("No processor set. Call setProcessor() first.")
		}

		const job = async () => {
			await this.processor!(payload)
		}

		// p-queue uses lower numbers for higher priority
		const pqueuePriority = -priority

		await this.queue.add(job, { priority: pqueuePriority })
	}

	/**
	 * Add multiple jobs to the queue
	 * @param jobs Array of job payloads
	 * @param priority Job priority (higher = more priority)
	 * @returns Promise that resolves when all jobs complete
	 */
	async addAll(jobs: T[], priority: number = 0): Promise<void> {
		const promises = jobs.map((payload) => this.add(payload, priority))
		await Promise.all(promises)
	}

	/**
	 * Get current queue size
	 * @returns Current number of queued jobs
	 */
	size(): number {
		return this.queue.size
	}

	/**
	 * Check if queue is paused
	 * @returns True if queue is paused
	 */
	isPaused(): boolean {
		return this.queue.isPaused
	}

	/**
	 * Pause the queue
	 */
	pause(): void {
		this.queue.pause()
	}

	/**
	 * Resume the queue
	 */
	resume(): void {
		this.queue.start()
	}

	/**
	 * Clear all pending jobs
	 */
	clear(): void {
		this.queue.clear()
	}

	/**
	 * Start processing jobs
	 */
	async start(): Promise<void> {
		// p-queue starts automatically when jobs are added
		// This method is here for interface compatibility
	}

	/**
	 * Stop processing jobs and wait for current jobs to complete
	 */
	async stop(): Promise<void> {
		await this.queue.onIdle()
	}

	/**
	 * Wait for all jobs to complete
	 */
	async onIdle(): Promise<void> {
		await this.queue.onIdle()
	}

	/**
	 * Get queue statistics
	 */
	getStats() {
		return {
			size: this.queue.size,
			pending: this.queue.pending,
			isPaused: this.queue.isPaused,
			concurrency: this.config.concurrency,
		}
	}
}

/**
 * Rate-Limited In-Memory Queue
 * Specialized queue for API rate limiting
 */
export class RateLimitedQueue<T = JobPayload> extends NoormmeInMemoryQueue<T> {
	constructor(requestsPerMinute: number) {
		super({
			concurrency: 1,
			interval: (60 * 1000) / requestsPerMinute, // Convert RPM to interval
		})
	}
}

/**
 * Batch Processing In-Memory Queue
 * Processes jobs in batches for efficiency
 */
export class BatchQueue<T = JobPayload> extends NoormmeInMemoryQueue<T[]> {
	private batchSize: number
	private batchTimeout: number
	private currentBatch: T[] = []
	private batchTimer?: NodeJS.Timeout

	constructor(batchSize: number = 10, batchTimeout: number = 5000) {
		super({ concurrency: 1 })
		this.batchSize = batchSize
		this.batchTimeout = batchTimeout
	}

	/**
	 * Add a job to the current batch
	 * @param payload Job payload
	 * @param priority Job priority (ignored for batch processing)
	 */
	async add(payload: T, _priority: number = 0): Promise<void> {
		this.currentBatch.push(payload)

		// Process batch if it reaches the batch size
		if (this.currentBatch.length >= this.batchSize) {
			await this.processBatch()
		} else {
			// Set timeout to process batch after batchTimeout
			this.scheduleBatchProcessing()
		}
	}

	/**
	 * Process the current batch
	 */
	private async processBatch(): Promise<void> {
		if (this.currentBatch.length === 0) {
			return
		}

		const batch = [...this.currentBatch]
		this.currentBatch = []

		// Clear any pending timer
		if (this.batchTimer) {
			clearTimeout(this.batchTimer)
			this.batchTimer = undefined
		}

		// Add the batch to the underlying queue
		await super.add(batch)
	}

	/**
	 * Schedule batch processing after timeout
	 */
	private scheduleBatchProcessing(): void {
		if (this.batchTimer) {
			return
		}

		this.batchTimer = setTimeout(async () => {
			await this.processBatch()
		}, this.batchTimeout)
	}

	/**
	 * Force process current batch
	 */
	async flush(): Promise<void> {
		await this.processBatch()
		await this.onIdle()
	}
}
