/**
 * Persistent SQLite Queue Implementation
 * Reliable queue that survives server restarts
 */

import { Kysely } from "kysely"
import { DatabaseSchema, Job } from "../db"
import { JobHandler, JobOptions, JobPayload, JobStatus, QueueConfig, QueueManager, QueueStats } from "./types"

export class NoormmePersistentQueue implements QueueManager {
	private db: Kysely<DatabaseSchema>
	private config: Required<QueueConfig>
	private handlers: Map<string, JobHandler> = new Map()
	private isProcessing: boolean = false
	private processingInterval?: NodeJS.Timeout
	private processingJobs: Set<string> = new Set()

	constructor(db: Kysely<DatabaseSchema>, config: QueueConfig = {}) {
		this.db = db
		this.config = {
			concurrency: config.concurrency || 5,
			interval: config.interval || 1000,
			batchSize: config.batchSize || 10,
			retryDelayMultiplier: config.retryDelayMultiplier || 2,
			baseRetryDelay: config.baseRetryDelay || 1000,
			maxRetryDelay: config.maxRetryDelay || 300000,
			cleanupAfterDays: config.cleanupAfterDays || 7,
		}
	}

	/**
	 * Add a job to the queue
	 * @param type Job type
	 * @param payload Job payload
	 * @param options Job options
	 * @returns Promise with job ID
	 */
	async add<T = JobPayload>(type: string, payload: T, options: JobOptions = {}): Promise<string> {
		const jobId = this.generateJobId()
		const now = new Date()
		const scheduledAt = options.scheduledAt || (options.delay ? new Date(now.getTime() + options.delay) : now)

		const jobData = {
			id: jobId,
			type,
			payload: JSON.stringify(payload),
			status: "pending" as const,
			priority: options.priority || 0,
			attempts: 0,
			max_attempts: options.maxAttempts || 3,
			scheduled_at: scheduledAt.toISOString(),
			created_at: now.toISOString(),
			updated_at: now.toISOString(),
		}

		await this.db.insertInto("jobs").values(jobData).execute()

		return jobId
	}

	/**
	 * Get job by ID
	 * @param id Job ID
	 * @returns Promise with job or null
	 */
	async getJob(id: string): Promise<Job | null> {
		const result = await this.db.selectFrom("jobs").selectAll().where("id", "=", id).executeTakeFirst()

		if (!result) {
			return null
		}

		return this.mapDbJobToJob(result)
	}

	/**
	 * Get jobs by status
	 * @param status Job status
	 * @param limit Maximum number of jobs to return
	 * @returns Promise with array of jobs
	 */
	async getJobsByStatus(status: JobStatus, limit: number = 100): Promise<Job[]> {
		const results = await this.db
			.selectFrom("jobs")
			.selectAll()
			.where("status", "=", status)
			.orderBy("priority", "desc")
			.orderBy("created_at", "asc")
			.limit(limit)
			.execute()

		return results.map((result) => this.mapDbJobToJob(result))
	}

	/**
	 * Cancel a job
	 * @param id Job ID
	 * @returns Promise with success boolean
	 */
	async cancelJob(id: string): Promise<boolean> {
		const result = await this.db
			.updateTable("jobs")
			.set({
				status: "cancelled",
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", id)
			.where("status", "in", ["pending", "processing"])
			.execute()

		return result.length > 0
	}

	/**
	 * Retry a failed job
	 * @param id Job ID
	 * @returns Promise with success boolean
	 */
	async retryJob(id: string): Promise<boolean> {
		const result = await this.db
			.updateTable("jobs")
			.set({
				status: "pending",
				attempts: 0,
				error_message: null,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", id)
			.where("status", "=", "failed")
			.execute()

		return result.length > 0
	}

	/**
	 * Get queue statistics
	 * @returns Promise with queue stats
	 */
	async getStats(): Promise<QueueStats> {
		const stats = await this.db
			.selectFrom("jobs")
			.select(["status", this.db.fn.count("id").as("count")])
			.groupBy("status")
			.execute()

		const result: QueueStats = {
			total: 0,
			pending: 0,
			processing: 0,
			completed: 0,
			failed: 0,
			cancelled: 0,
		}

		for (const stat of stats) {
			const count = Number(stat.count)
			result.total += count
			result[stat.status as keyof QueueStats] = count
		}

		return result
	}

	/**
	 * Start the queue processor
	 */
	async start(): Promise<void> {
		if (this.isProcessing) return

		this.isProcessing = true
		console.log("🚀 Starting NOORMME Persistent Queue processor")

		// Process jobs immediately, then on interval
		await this.processJobs()

		this.processingInterval = setInterval(async () => {
			try {
				await this.processJobs()
			} catch (error) {
				console.error("Error processing jobs:", error)
			}
		}, this.config.interval)
	}

	/**
	 * Stop the queue processor
	 */
	async stop(): Promise<void> {
		if (!this.isProcessing) return

		this.isProcessing = false
		console.log("🛑 Stopping NOORMME Persistent Queue processor")

		if (this.processingInterval) {
			clearInterval(this.processingInterval)
			this.processingInterval = undefined
		}

		// Wait for current jobs to complete
		await this.waitForProcessingJobs()
	}

	/**
	 * Register a job handler
	 * @param type Job type
	 * @param handler Job handler
	 */
	registerHandler<T = JobPayload>(type: string, handler: JobHandler<T>): void {
		this.handlers.set(type, handler as JobHandler)
		console.log(`📝 Registered handler for job type: ${type}`)
	}

	/**
	 * Clean up old completed jobs
	 * @returns Promise with number of jobs cleaned up
	 */
	async cleanup(): Promise<number> {
		const cutoffDate = new Date()
		cutoffDate.setDate(cutoffDate.getDate() - this.config.cleanupAfterDays)

		const result = await this.db
			.deleteFrom("jobs")
			.where("status", "in", ["completed", "cancelled"])
			.where("updated_at", "<", cutoffDate.toISOString())
			.execute()

		const cleanedUp = result.length
		if (cleanedUp > 0) {
			console.log(`🧹 Cleaned up ${cleanedUp} old jobs`)
		}

		return cleanedUp
	}

	/**
	 * Process pending jobs
	 */
	private async processJobs(): Promise<void> {
		// Don't process if we're already at concurrency limit
		if (this.processingJobs.size >= this.config.concurrency) {
			return
		}

		// Get available slots
		const availableSlots = this.config.concurrency - this.processingJobs.size
		const batchSize = Math.min(this.config.batchSize, availableSlots)

		// Get pending jobs that are ready to be processed
		const now = new Date().toISOString()
		const jobs = await this.db
			.selectFrom("jobs")
			.selectAll()
			.where("status", "=", "pending")
			.where("scheduled_at", "<=", now)
			.orderBy("priority", "desc")
			.orderBy("created_at", "asc")
			.limit(batchSize)
			.execute()

		// Process each job
		for (const jobData of jobs) {
			if (this.processingJobs.has(jobData.id)) continue

			this.processingJobs.add(jobData.id)
			this.processJob(jobData).finally(() => {
				this.processingJobs.delete(jobData.id)
			})
		}
	}

	/**
	 * Process a single job
	 */
	private async processJob(jobData: any): Promise<void> {
		const job = this.mapDbJobToJob(jobData)
		const handler = this.handlers.get(job.type)

		if (!handler) {
			console.error(`❌ No handler registered for job type: ${job.type}`)
			await this.markJobFailed(job.id, `No handler registered for job type: ${job.type}`)
			return
		}

		try {
			// Mark job as processing
			await this.markJobProcessing(job.id)

			// Process the job
			await handler.process(job)

			// Mark job as completed
			await this.markJobCompleted(job.id)

			// Call completion handler if available
			if (handler.onComplete) {
				await handler.onComplete(job)
			}

			console.log(`✅ Job ${job.id} (${job.type}) completed successfully`)
		} catch (error) {
			console.error(`❌ Job ${job.id} (${job.type}) failed:`, error)

			const errorMessage = error instanceof Error ? error.message : String(error)

			// Increment attempts
			const newAttempts = job.attempts + 1

			if (newAttempts >= job.maxAttempts) {
				// Max attempts reached, mark as failed
				await this.markJobFailed(job.id, errorMessage)
			} else {
				// Schedule retry with exponential backoff
				const delay = this.calculateRetryDelay(newAttempts)
				const retryAt = new Date(Date.now() + delay)

				await this.db
					.updateTable("jobs")
					.set({
						status: "pending",
						attempts: newAttempts,
						error_message: errorMessage,
						scheduled_at: retryAt.toISOString(),
						updated_at: new Date().toISOString(),
					})
					.where("id", "=", job.id)
					.execute()

				console.log(`🔄 Job ${job.id} scheduled for retry in ${delay}ms (attempt ${newAttempts}/${job.maxAttempts})`)
			}

			// Call failure handler if available
			if (handler.onFailure) {
				await handler.onFailure(job, error instanceof Error ? error : new Error(errorMessage))
			}
		}
	}

	/**
	 * Mark job as processing
	 */
	private async markJobProcessing(jobId: string): Promise<void> {
		await this.db
			.updateTable("jobs")
			.set({
				status: "processing",
				started_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", jobId)
			.execute()
	}

	/**
	 * Mark job as completed
	 */
	private async markJobCompleted(jobId: string): Promise<void> {
		await this.db
			.updateTable("jobs")
			.set({
				status: "completed",
				completed_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", jobId)
			.execute()
	}

	/**
	 * Mark job as failed
	 */
	private async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
		await this.db
			.updateTable("jobs")
			.set({
				status: "failed",
				error_message: errorMessage,
				completed_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", jobId)
			.execute()
	}

	/**
	 * Calculate retry delay with exponential backoff
	 */
	private calculateRetryDelay(attempt: number): number {
		const delay = this.config.baseRetryDelay * this.config.retryDelayMultiplier ** (attempt - 1)
		return Math.min(delay, this.config.maxRetryDelay)
	}

	/**
	 * Wait for all processing jobs to complete
	 */
	private async waitForProcessingJobs(): Promise<void> {
		while (this.processingJobs.size > 0) {
			await new Promise((resolve) => setTimeout(resolve, 100))
		}
	}

	/**
	 * Generate unique job ID
	 */
	private generateJobId(): string {
		return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Map database job to Job interface
	 */
	private mapDbJobToJob(dbJob: any): Job {
		return {
			id: dbJob.id,
			type: dbJob.type,
			payload: JSON.parse(dbJob.payload),
			status: dbJob.status,
			priority: dbJob.priority,
			attempts: dbJob.attempts,
			maxAttempts: dbJob.max_attempts,
			errorMessage: dbJob.error_message,
			scheduledAt: dbJob.scheduled_at ? new Date(dbJob.scheduled_at) : undefined,
			startedAt: dbJob.started_at ? new Date(dbJob.started_at) : undefined,
			completedAt: dbJob.completed_at ? new Date(dbJob.completed_at) : undefined,
			createdAt: new Date(dbJob.created_at),
			updatedAt: new Date(dbJob.updated_at),
		}
	}
}
