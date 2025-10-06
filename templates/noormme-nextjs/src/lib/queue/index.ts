/**
 * Unified queue system following NORMIE DEV methodology
 * Simple, efficient job processing
 */

export interface Job {
	id: string
	type: string
	data: any
	status: "pending" | "processing" | "completed" | "failed"
	attempts: number
	maxAttempts: number
	createdAt: Date
	updatedAt: Date
	error?: string
}

export interface JobHandler {
	handle(job: Job): Promise<void>
}

/**
 * Simple in-memory queue for development
 * In production, this would be replaced with Redis or similar
 */
export class Queue {
	private jobs: Job[] = []
	private handlers: Map<string, JobHandler> = new Map()
	private isProcessing = false

	/**
	 * Register a job handler
	 */
	register(type: string, handler: JobHandler): void {
		this.handlers.set(type, handler)
	}

	/**
	 * Add a job to the queue
	 */
	async add(type: string, data: any, options: { maxAttempts?: number } = {}): Promise<Job> {
		const job: Job = {
			id: Math.random().toString(36).substr(2, 9),
			type,
			data,
			status: "pending",
			attempts: 0,
			maxAttempts: options.maxAttempts || 3,
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		this.jobs.push(job)
		this.processJobs()

		return job
	}

	/**
	 * Process jobs in the queue
	 */
	private async processJobs(): Promise<void> {
		if (this.isProcessing) {
			return
		}

		this.isProcessing = true

		while (true) {
			const pendingJob = this.jobs.find((job) => job.status === "pending")
			if (!pendingJob) {
				break
			}

			await this.processJob(pendingJob)
		}

		this.isProcessing = false
	}

	/**
	 * Process a single job
	 */
	private async processJob(job: Job): Promise<void> {
		const handler = this.handlers.get(job.type)
		if (!handler) {
			job.status = "failed"
			job.error = `No handler found for job type: ${job.type}`
			job.updatedAt = new Date()
			return
		}

		job.status = "processing"
		job.attempts++
		job.updatedAt = new Date()

		try {
			await handler.handle(job)
			job.status = "completed"
			job.updatedAt = new Date()
		} catch (error) {
			job.error = error instanceof Error ? error.message : String(error)

			if (job.attempts >= job.maxAttempts) {
				job.status = "failed"
			} else {
				job.status = "pending"
				// Add delay before retry
				setTimeout(() => this.processJobs(), 1000 * job.attempts)
			}

			job.updatedAt = new Date()
		}
	}

	/**
	 * Get job by ID
	 */
	getJob(id: string): Job | undefined {
		return this.jobs.find((job) => job.id === id)
	}

	/**
	 * Get all jobs
	 */
	getJobs(): Job[] {
		return [...this.jobs]
	}

	/**
	 * Get jobs by status
	 */
	getJobsByStatus(status: Job["status"]): Job[] {
		return this.jobs.filter((job) => job.status === status)
	}

	/**
	 * Clear completed jobs
	 */
	clearCompleted(): void {
		this.jobs = this.jobs.filter((job) => job.status !== "completed")
	}
}

// Global queue instance
export const queue = new Queue()
