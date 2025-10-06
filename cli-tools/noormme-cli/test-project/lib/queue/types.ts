/**
 * Queue System Types and Interfaces
 * Defines the core types for the NOORMME queue system
 */

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled"

export interface JobPayload {
	[key: string]: any
}

export interface JobOptions {
	priority?: number
	maxAttempts?: number
	delay?: number // milliseconds
	scheduledAt?: Date
}

export interface Job<T = JobPayload> {
	id: string
	type: string
	payload: T
	status: JobStatus
	priority: number
	attempts: number
	maxAttempts: number
	errorMessage?: string
	scheduledAt?: Date
	startedAt?: Date
	completedAt?: Date
	createdAt: Date
	updatedAt: Date
}

export interface JobHandler<T = JobPayload> {
	/**
	 * Process a job
	 * @param job The job to process
	 * @returns Promise that resolves when job is complete
	 */
	process(job: Job<T>): Promise<void>

	/**
	 * Handle job failure
	 * @param job The failed job
	 * @param error The error that occurred
	 */
	onFailure?(job: Job<T>, error: Error): Promise<void>

	/**
	 * Handle job completion
	 * @param job The completed job
	 */
	onComplete?(job: Job<T>): Promise<void>
}

export interface QueueConfig {
	/**
	 * Maximum number of concurrent jobs
	 * @default 5
	 */
	concurrency?: number

	/**
	 * Interval between job processing attempts (ms)
	 * @default 1000
	 */
	interval?: number

	/**
	 * Maximum number of jobs to process per interval
	 * @default 10
	 */
	batchSize?: number

	/**
	 * Retry delay multiplier for exponential backoff
	 * @default 2
	 */
	retryDelayMultiplier?: number

	/**
	 * Base retry delay in milliseconds
	 * @default 1000
	 */
	baseRetryDelay?: number

	/**
	 * Maximum retry delay in milliseconds
	 * @default 300000 (5 minutes)
	 */
	maxRetryDelay?: number

	/**
	 * Clean up completed jobs after this many days
	 * @default 7
	 */
	cleanupAfterDays?: number
}

export interface QueueStats {
	total: number
	pending: number
	processing: number
	completed: number
	failed: number
	cancelled: number
}

export interface QueueManager {
	/**
	 * Add a job to the queue
	 * @param type Job type
	 * @param payload Job payload
	 * @param options Job options
	 * @returns Promise with job ID
	 */
	add<T = JobPayload>(type: string, payload: T, options?: JobOptions): Promise<string>

	/**
	 * Get job by ID
	 * @param id Job ID
	 * @returns Promise with job or null
	 */
	getJob(id: string): Promise<Job | null>

	/**
	 * Get jobs by status
	 * @param status Job status
	 * @param limit Maximum number of jobs to return
	 * @returns Promise with array of jobs
	 */
	getJobsByStatus(status: JobStatus, limit?: number): Promise<Job[]>

	/**
	 * Cancel a job
	 * @param id Job ID
	 * @returns Promise with success boolean
	 */
	cancelJob(id: string): Promise<boolean>

	/**
	 * Retry a failed job
	 * @param id Job ID
	 * @returns Promise with success boolean
	 */
	retryJob(id: string): Promise<boolean>

	/**
	 * Get queue statistics
	 * @returns Promise with queue stats
	 */
	getStats(): Promise<QueueStats>

	/**
	 * Start the queue processor
	 */
	start(): Promise<void>

	/**
	 * Stop the queue processor
	 */
	stop(): Promise<void>

	/**
	 * Register a job handler
	 * @param type Job type
	 * @param handler Job handler
	 */
	registerHandler<T = JobPayload>(type: string, handler: JobHandler<T>): void

	/**
	 * Clean up old completed jobs
	 * @returns Promise with number of jobs cleaned up
	 */
	cleanup(): Promise<number>
}

export interface InMemoryQueueConfig {
	/**
	 * Maximum number of concurrent jobs
	 * @default 3
	 */
	concurrency?: number

	/**
	 * Interval between job processing attempts (ms)
	 * @default 100
	 */
	interval?: number

	/**
	 * Timeout for jobs (ms)
	 * @default 30000
	 */
	timeout?: number
}

export interface InMemoryQueue<T = JobPayload> {
	/**
	 * Add a job to the queue
	 * @param payload Job payload
	 * @param priority Job priority (higher = more priority)
	 * @returns Promise that resolves when job completes
	 */
	add(payload: T, priority?: number): Promise<void>

	/**
	 * Get current queue size
	 * @returns Current number of queued jobs
	 */
	size(): number

	/**
	 * Check if queue is paused
	 * @returns True if queue is paused
	 */
	isPaused(): boolean

	/**
	 * Pause the queue
	 */
	pause(): void

	/**
	 * Resume the queue
	 */
	resume(): void

	/**
	 * Clear all pending jobs
	 */
	clear(): void

	/**
	 * Start processing jobs
	 */
	start(): Promise<void>

	/**
	 * Stop processing jobs
	 */
	stop(): Promise<void>
}
