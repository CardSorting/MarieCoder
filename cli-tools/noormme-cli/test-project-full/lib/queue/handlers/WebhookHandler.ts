/**
 * Webhook Handler for Queue System
 * Handles delivering webhooks to external services
 */

import { Job, JobHandler } from "../types"

export interface WebhookPayload {
	url: string
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
	headers?: Record<string, string>
	body?: any
	timeout?: number
	retryPolicy?: {
		maxRetries: number
		baseDelay: number
		maxDelay: number
		backoffMultiplier: number
	}
	secret?: string
	event?: string
	webhookId?: string
}

export interface WebhookConfig {
	defaultTimeout: number
	maxRetries: number
	baseDelay: number
	maxDelay: number
	backoffMultiplier: number
	userAgent: string
	validateSSL: boolean
}

export class WebhookHandler implements JobHandler<WebhookPayload> {
	private config: WebhookConfig

	constructor(config: Partial<WebhookConfig> = {}) {
		this.config = {
			defaultTimeout: config.defaultTimeout || 30000,
			maxRetries: config.maxRetries || 3,
			baseDelay: config.baseDelay || 1000,
			maxDelay: config.maxDelay || 30000,
			backoffMultiplier: config.backoffMultiplier || 2,
			userAgent: config.userAgent || "NOORMME-Webhook/1.0",
			validateSSL: config.validateSSL !== false,
		}
	}

	/**
	 * Process webhook job
	 * @param job Webhook job
	 */
	async process(job: Job<WebhookPayload>): Promise<void> {
		const { payload } = job

		// Validate webhook payload
		this.validateWebhookPayload(payload)

		// Deliver webhook
		await this.deliverWebhook(payload)

		console.log(`🔗 Webhook delivered successfully to: ${payload.url}`)
	}

	/**
	 * Handle webhook delivery failure
	 * @param job Failed webhook job
	 * @param error Error that occurred
	 */
	async onFailure(job: Job<WebhookPayload>, error: Error): Promise<void> {
		console.error(`🔗 Webhook delivery failed for job ${job.id}:`, error.message)

		// Log webhook failure for monitoring
		// In a real implementation, you might want to:
		// - Store failed webhooks for manual review
		// - Send alerts to administrators
		// - Update webhook endpoint health status
	}

	/**
	 * Handle webhook delivery completion
	 * @param job Completed webhook job
	 */
	async onComplete(_job: Job<WebhookPayload>): Promise<void> {
		// Log successful webhook delivery
		// In a real implementation, you might want to:
		// - Update webhook delivery statistics
		// - Track response times
		// - Update endpoint health status
	}

	/**
	 * Deliver webhook to external service
	 * @param payload Webhook payload
	 */
	private async deliverWebhook(payload: WebhookPayload): Promise<void> {
		const _url = new URL(payload.url)

		// Prepare headers
		const headers: Record<string, string> = {
			"User-Agent": this.config.userAgent,
			"Content-Type": "application/json",
			...payload.headers,
		}

		// Add signature if secret is provided
		if (payload.secret) {
			const signature = await this.generateSignature(payload, payload.secret)
			headers["X-Webhook-Signature"] = signature
		}

		// Add event type if provided
		if (payload.event) {
			headers["X-Webhook-Event"] = payload.event
		}

		// Add webhook ID if provided
		if (payload.webhookId) {
			headers["X-Webhook-ID"] = payload.webhookId
		}

		// Prepare request options
		const requestOptions: RequestInit = {
			method: payload.method,
			headers,
			timeout: payload.timeout || this.config.defaultTimeout,
		}

		// Add body for methods that support it
		if (payload.body && ["POST", "PUT", "PATCH"].includes(payload.method)) {
			requestOptions.body = JSON.stringify(payload.body)
		}

		// Make the request
		console.log(`🔗 [Webhook] ${payload.method} ${payload.url}`)

		// Simulate HTTP request
		await this.simulateHttpRequest(payload.method, payload.url)

		// In a real implementation, this would use fetch or axios:
		// const response = await fetch(payload.url, requestOptions)
		// if (!response.ok) {
		//   throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`)
		// }
	}

	/**
	 * Simulate HTTP request for demo purposes
	 * @param method HTTP method
	 * @param url Target URL
	 */
	private async simulateHttpRequest(_method: string, url: string): Promise<void> {
		// Simulate network delay
		const delay = Math.random() * 1000 + 500 // 500-1500ms
		await new Promise((resolve) => setTimeout(resolve, delay))

		// Simulate occasional failures (5% failure rate)
		if (Math.random() < 0.05) {
			throw new Error(`HTTP 500 Internal Server Error`)
		}

		// Simulate different response times based on URL domain
		const domain = new URL(url).hostname
		if (domain.includes("slow-service")) {
			await new Promise((resolve) => setTimeout(resolve, 2000))
		}
	}

	/**
	 * Generate webhook signature
	 * @param payload Webhook payload
	 * @param secret Secret key
	 * @returns Signature
	 */
	private async generateSignature(payload: WebhookPayload, secret: string): Promise<string> {
		// In a real implementation, this would use crypto to generate HMAC signature
		const body = payload.body ? JSON.stringify(payload.body) : ""
		const data = `${payload.method}:${payload.url}:${body}`

		// Simulate signature generation
		const signature = Buffer.from(`${secret}:${data}`).toString("base64")
		return `sha256=${signature}`
	}

	/**
	 * Validate webhook payload
	 * @param payload Webhook payload
	 */
	private validateWebhookPayload(payload: WebhookPayload): void {
		if (!payload.url) {
			throw new Error("Webhook URL is required")
		}

		try {
			new URL(payload.url)
		} catch {
			throw new Error("Invalid webhook URL")
		}

		if (!payload.method) {
			throw new Error("HTTP method is required")
		}

		const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"]
		if (!validMethods.includes(payload.method)) {
			throw new Error(`Invalid HTTP method: ${payload.method}`)
		}

		// Validate timeout
		if (payload.timeout && (payload.timeout < 1000 || payload.timeout > 60000)) {
			throw new Error("Timeout must be between 1000ms and 60000ms")
		}
	}
}

/**
 * Batch Webhook Handler
 * Delivers multiple webhooks efficiently
 */
export class BatchWebhookHandler implements JobHandler<WebhookPayload[]> {
	private webhookHandler: WebhookHandler
	private batchSize: number
	private delayBetweenBatches: number

	constructor(webhookHandler: WebhookHandler, batchSize: number = 10, delayBetweenBatches: number = 100) {
		this.webhookHandler = webhookHandler
		this.batchSize = batchSize
		this.delayBetweenBatches = delayBetweenBatches
	}

	/**
	 * Process batch of webhook jobs
	 * @param job Batch webhook job
	 */
	async process(job: Job<WebhookPayload[]>): Promise<void> {
		const { payload } = job

		console.log(`🔗 [Batch] Delivering ${payload.length} webhooks in batches of ${this.batchSize}`)

		// Process webhooks in batches
		for (let i = 0; i < payload.length; i += this.batchSize) {
			const batch = payload.slice(i, i + this.batchSize)

			// Deliver batch concurrently
			const batchPromises = batch.map((webhookPayload) =>
				this.webhookHandler.process({
					...job,
					payload: webhookPayload,
				}),
			)

			await Promise.all(batchPromises)

			// Delay between batches to avoid overwhelming external services
			if (i + this.batchSize < payload.length) {
				await new Promise((resolve) => setTimeout(resolve, this.delayBetweenBatches))
			}
		}

		console.log(`🔗 [Batch] Delivered all ${payload.length} webhooks successfully`)
	}

	async onFailure(job: Job<WebhookPayload[]>, error: Error): Promise<void> {
		console.error(`🔗 [Batch] Webhook batch delivery failed for job ${job.id}:`, error.message)
	}

	async onComplete(job: Job<WebhookPayload[]>): Promise<void> {
		console.log(`🔗 [Batch] Webhook batch delivery completed for job ${job.id}`)
	}
}

/**
 * Webhook Retry Handler
 * Handles webhook retries with exponential backoff
 */
export class WebhookRetryHandler extends WebhookHandler {
	/**
	 * Process webhook job with retry logic
	 * @param job Webhook job
	 */
	async process(job: Job<WebhookPayload>): Promise<void> {
		const { payload } = job
		const retryPolicy = payload.retryPolicy || {
			maxRetries: this.config.maxRetries,
			baseDelay: this.config.baseDelay,
			maxDelay: this.config.maxDelay,
			backoffMultiplier: this.config.backoffMultiplier,
		}

		let lastError: Error | null = null

		for (let attempt = 1; attempt <= retryPolicy.maxRetries; attempt++) {
			try {
				await this.deliverWebhook(payload)
				return // Success, exit retry loop
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error))

				if (attempt === retryPolicy.maxRetries) {
					throw lastError // Final attempt failed
				}

				// Calculate delay for next attempt
				const delay = Math.min(
					retryPolicy.baseDelay * retryPolicy.backoffMultiplier ** (attempt - 1),
					retryPolicy.maxDelay,
				)

				console.log(`🔗 [Retry] Attempt ${attempt}/${retryPolicy.maxRetries} failed, retrying in ${delay}ms`)
				await new Promise((resolve) => setTimeout(resolve, delay))
			}
		}

		throw lastError
	}

	/**
	 * Deliver webhook (inherited from WebhookHandler)
	 */
	private async deliverWebhook(payload: WebhookPayload): Promise<void> {
		return super.process({ payload } as Job<WebhookPayload>)
	}
}
