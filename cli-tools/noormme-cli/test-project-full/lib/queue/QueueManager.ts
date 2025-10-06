/**
 * NOORMME Queue Manager
 * Orchestrates both in-memory and persistent queues
 */

import { Kysely } from "kysely"
import { DatabaseSchema } from "../db"
import { BatchQueue, NoormmeInMemoryQueue, RateLimitedQueue } from "./InMemoryQueue"
import { NoormmePersistentQueue } from "./PersistentQueue"
import { InMemoryQueueConfig, Job, JobHandler, JobOptions, JobPayload, JobStatus, QueueConfig, QueueStats } from "./types"

export interface NoormmeQueueConfig {
	persistent: QueueConfig
	inMemory: InMemoryQueueConfig
	autoStart: boolean
	cleanupInterval: number // milliseconds
}

export class NoormmeQueueManager {
	private persistentQueue: NoormmePersistentQueue
	private inMemoryQueues: Map<string, NoormmeInMemoryQueue> = new Map()
	private config: Required<NoormmeQueueConfig>
	private isStarted: boolean = false
	private cleanupTimer?: NodeJS.Timeout

	constructor(db: Kysely<DatabaseSchema>, config: Partial<NoormmeQueueConfig> = {}) {
		this.config = {
			persistent: {
				concurrency: config.persistent?.concurrency || 5,
				interval: config.persistent?.interval || 1000,
				batchSize: config.persistent?.batchSize || 10,
				retryDelayMultiplier: config.persistent?.retryDelayMultiplier || 2,
				baseRetryDelay: config.persistent?.baseRetryDelay || 1000,
				maxRetryDelay: config.persistent?.maxRetryDelay || 300000,
				cleanupAfterDays: config.persistent?.cleanupAfterDays || 7,
			},
			inMemory: {
				concurrency: config.inMemory?.concurrency || 3,
				interval: config.inMemory?.interval || 100,
				timeout: config.inMemory?.timeout || 30000,
			},
			autoStart: config.autoStart !== false,
			cleanupInterval: config.cleanupInterval || 3600000, // 1 hour
		}

		this.persistentQueue = new NoormmePersistentQueue(db, this.config.persistent)

		if (this.config.autoStart) {
			this.start()
		}
	}

	/**
	 * Start the queue manager
	 */
	async start(): Promise<void> {
		if (this.isStarted) {
			return
		}

		console.log("🚀 Starting NOORMME Queue Manager")

		// Start persistent queue
		await this.persistentQueue.start()

		// Start cleanup timer
		this.startCleanupTimer()

		this.isStarted = true
		console.log("✅ NOORMME Queue Manager started successfully")
	}

	/**
	 * Stop the queue manager
	 */
	async stop(): Promise<void> {
		if (!this.isStarted) {
			return
		}

		console.log("🛑 Stopping NOORMME Queue Manager")

		// Stop persistent queue
		await this.persistentQueue.stop()

		// Stop all in-memory queues
		for (const [name, queue] of this.inMemoryQueues) {
			await queue.stop()
			console.log(`🛑 Stopped in-memory queue: ${name}`)
		}

		// Stop cleanup timer
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer)
			this.cleanupTimer = undefined
		}

		this.isStarted = false
		console.log("✅ NOORMME Queue Manager stopped successfully")
	}

	/**
	 * Add job to persistent queue
	 * @param type Job type
	 * @param payload Job payload
	 * @param options Job options
	 * @returns Promise with job ID
	 */
	async addJob<T = JobPayload>(type: string, payload: T, options: JobOptions = {}): Promise<string> {
		return await this.persistentQueue.add(type, payload, options)
	}

	/**
	 * Add job to in-memory queue
	 * @param queueName In-memory queue name
	 * @param payload Job payload
	 * @param priority Job priority
	 * @returns Promise that resolves when job completes
	 */
	async addInMemoryJob<T = JobPayload>(queueName: string, payload: T, priority: number = 0): Promise<void> {
		const queue = this.inMemoryQueues.get(queueName)
		if (!queue) {
			throw new Error(`In-memory queue '${queueName}' not found. Create it first with createInMemoryQueue().`)
		}

		return await queue.add(payload, priority)
	}

	/**
	 * Create a new in-memory queue
	 * @param name Queue name
	 * @param config Queue configuration
	 * @returns In-memory queue instance
	 */
	createInMemoryQueue<T = JobPayload>(name: string, config: InMemoryQueueConfig = {}): NoormmeInMemoryQueue<T> {
		if (this.inMemoryQueues.has(name)) {
			throw new Error(`In-memory queue '${name}' already exists`)
		}

		const queueConfig = { ...this.config.inMemory, ...config }
		const queue = new NoormmeInMemoryQueue<T>(queueConfig)

		this.inMemoryQueues.set(name, queue as NoormmeInMemoryQueue)

		console.log(`📝 Created in-memory queue: ${name}`)
		return queue
	}

	/**
	 * Create a rate-limited in-memory queue
	 * @param name Queue name
	 * @param requestsPerMinute Rate limit
	 * @returns Rate-limited queue instance
	 */
	createRateLimitedQueue<T = JobPayload>(name: string, requestsPerMinute: number): RateLimitedQueue<T> {
		if (this.inMemoryQueues.has(name)) {
			throw new Error(`In-memory queue '${name}' already exists`)
		}

		const queue = new RateLimitedQueue<T>(requestsPerMinute)
		this.inMemoryQueues.set(name, queue as NoormmeInMemoryQueue)

		console.log(`📝 Created rate-limited queue: ${name} (${requestsPerMinute} req/min)`)
		return queue
	}

	/**
	 * Create a batch processing in-memory queue
	 * @param name Queue name
	 * @param batchSize Batch size
	 * @param batchTimeout Batch timeout in milliseconds
	 * @returns Batch queue instance
	 */
	createBatchQueue<T = JobPayload>(name: string, batchSize: number = 10, batchTimeout: number = 5000): BatchQueue<T> {
		if (this.inMemoryQueues.has(name)) {
			throw new Error(`In-memory queue '${name}' already exists`)
		}

		const queue = new BatchQueue<T>(batchSize, batchTimeout)
		this.inMemoryQueues.set(name, queue as NoormmeInMemoryQueue)

		console.log(`📝 Created batch queue: ${name} (batch size: ${batchSize}, timeout: ${batchTimeout}ms)`)
		return queue
	}

	/**
	 * Get in-memory queue by name
	 * @param name Queue name
	 * @returns In-memory queue instance or null
	 */
	getInMemoryQueue<T = JobPayload>(name: string): NoormmeInMemoryQueue<T> | null {
		return (this.inMemoryQueues.get(name) as NoormmeInMemoryQueue<T>) || null
	}

	/**
	 * Delete in-memory queue
	 * @param name Queue name
	 * @returns True if queue was deleted
	 */
	deleteInMemoryQueue(name: string): boolean {
		const queue = this.inMemoryQueues.get(name)
		if (!queue) {
			return false
		}

		queue.stop()
		this.inMemoryQueues.delete(name)
		console.log(`🗑️ Deleted in-memory queue: ${name}`)
		return true
	}

	/**
	 * Register handler for persistent queue
	 * @param type Job type
	 * @param handler Job handler
	 */
	registerHandler<T = JobPayload>(type: string, handler: JobHandler<T>): void {
		this.persistentQueue.registerHandler(type, handler as JobHandler)
	}

	/**
	 * Set processor for in-memory queue
	 * @param queueName Queue name
	 * @param processor Processor function
	 */
	setInMemoryProcessor<T = JobPayload>(queueName: string, processor: (payload: T) => Promise<void>): void {
		const queue = this.inMemoryQueues.get(queueName)
		if (!queue) {
			throw new Error(`In-memory queue '${queueName}' not found`)
		}

		queue.setProcessor(processor)
	}

	/**
	 * Get job from persistent queue
	 * @param id Job ID
	 * @returns Job or null
	 */
	async getJob(id: string): Promise<Job | null> {
		return await this.persistentQueue.getJob(id)
	}

	/**
	 * Get jobs by status from persistent queue
	 * @param status Job status
	 * @param limit Maximum number of jobs
	 * @returns Array of jobs
	 */
	async getJobsByStatus(status: JobStatus, limit?: number): Promise<Job[]> {
		return await this.persistentQueue.getJobsByStatus(status, limit)
	}

	/**
	 * Cancel job in persistent queue
	 * @param id Job ID
	 * @returns True if cancelled
	 */
	async cancelJob(id: string): Promise<boolean> {
		return await this.persistentQueue.cancelJob(id)
	}

	/**
	 * Retry failed job in persistent queue
	 * @param id Job ID
	 * @returns True if retry scheduled
	 */
	async retryJob(id: string): Promise<boolean> {
		return await this.persistentQueue.retryJob(id)
	}

	/**
	 * Get persistent queue statistics
	 * @returns Queue statistics
	 */
	async getStats(): Promise<QueueStats> {
		return await this.persistentQueue.getStats()
	}

	/**
	 * Get in-memory queue statistics
	 * @param queueName Queue name
	 * @returns Queue statistics or null
	 */
	getInMemoryStats(queueName: string): any | null {
		const queue = this.inMemoryQueues.get(queueName)
		return queue ? queue.getStats() : null
	}

	/**
	 * Get all in-memory queue statistics
	 * @returns Map of queue statistics
	 */
	getAllInMemoryStats(): Map<string, any> {
		const stats = new Map()
		for (const [name, queue] of this.inMemoryQueues) {
			stats.set(name, queue.getStats())
		}
		return stats
	}

	/**
	 * Clean up old jobs from persistent queue
	 * @returns Number of jobs cleaned up
	 */
	async cleanup(): Promise<number> {
		return await this.persistentQueue.cleanup()
	}

	/**
	 * Start cleanup timer
	 */
	private startCleanupTimer(): void {
		this.cleanupTimer = setInterval(async () => {
			try {
				const cleanedUp = await this.cleanup()
				if (cleanedUp > 0) {
					console.log(`🧹 Cleaned up ${cleanedUp} old jobs`)
				}
			} catch (error) {
				console.error("Error during cleanup:", error)
			}
		}, this.config.cleanupInterval)
	}

	/**
	 * Get manager status
	 * @returns Manager status information
	 */
	getStatus() {
		return {
			isStarted: this.isStarted,
			inMemoryQueues: Array.from(this.inMemoryQueues.keys()),
			config: this.config,
		}
	}
}

/**
 * Global queue manager instance
 */
let globalQueueManager: NoormmeQueueManager | null = null

/**
 * Initialize the global queue manager
 * @param db Database instance
 * @param config Queue configuration
 * @returns Queue manager instance
 */
export function initializeQueueManager(db: Kysely<DatabaseSchema>, config?: Partial<NoormmeQueueConfig>): NoormmeQueueManager {
	if (globalQueueManager) {
		console.warn("Queue manager already initialized. Returning existing instance.")
		return globalQueueManager
	}

	globalQueueManager = new NoormmeQueueManager(db, config)
	return globalQueueManager
}

/**
 * Get the global queue manager
 * @returns Queue manager instance
 */
export function getQueueManager(): NoormmeQueueManager {
	if (!globalQueueManager) {
		throw new Error("Queue manager not initialized. Call initializeQueueManager() first.")
	}

	return globalQueueManager
}

/**
 * Shutdown the global queue manager
 */
export async function shutdownQueueManager(): Promise<void> {
	if (globalQueueManager) {
		await globalQueueManager.stop()
		globalQueueManager = null
	}
}
