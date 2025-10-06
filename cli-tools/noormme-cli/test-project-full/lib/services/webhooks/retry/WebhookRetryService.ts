/**
 * Webhook Retry Service
 * Handles retry logic for failed webhook processing
 * Following NOORMME service layer pattern with exponential backoff
 */

import type { PaymentWebhook } from "@/types/payment"

export interface RetryConfig {
	maxRetries: number
	baseDelay: number
	maxDelay: number
	backoffMultiplier: number
	jitter: boolean
}

export interface RetryResult {
	success: boolean
	attempts: number
	lastError?: string
	nextRetryAt?: Date
}

export interface RetryableWebhook extends PaymentWebhook {
	retryCount: number
	lastRetryAt?: Date
	nextRetryAt?: Date
	errors: string[]
}

export class WebhookRetryService {
	private paymentDatabaseService: any
	private config: RetryConfig

	constructor(paymentDatabaseService: any, config?: Partial<RetryConfig>) {
		this.paymentDatabaseService = paymentDatabaseService
		this.config = {
			maxRetries: 5,
			baseDelay: 1000, // 1 second
			maxDelay: 300000, // 5 minutes
			backoffMultiplier: 2,
			jitter: true,
			...config,
		}
	}

	/**
	 * Retry failed webhook processing
	 */
	async retryFailedWebhooks(): Promise<{
		processed: number
		successful: number
		failed: number
		results: RetryResult[]
	}> {
		try {
			const failedWebhooks = await this.getRetryableWebhooks()
			const results: RetryResult[] = []
			let successful = 0
			let failed = 0

			for (const webhook of failedWebhooks) {
				const result = await this.retryWebhook(webhook)
				results.push(result)

				if (result.success) {
					successful++
					// Mark webhook as processed
					await this.paymentDatabaseService.markWebhookProcessed(webhook.id)
				} else {
					failed++
					// Update retry information
					await this.updateWebhookRetryInfo(webhook, result)
				}
			}

			return {
				processed: failedWebhooks.length,
				successful,
				failed,
				results,
			}
		} catch (error) {
			console.error("Error retrying failed webhooks:", error)
			return {
				processed: 0,
				successful: 0,
				failed: 0,
				results: [],
			}
		}
	}

	/**
	 * Retry a specific webhook
	 */
	async retryWebhook(webhook: RetryableWebhook): Promise<RetryResult> {
		try {
			// Check if webhook should be retried
			if (!this.shouldRetry(webhook)) {
				return {
					success: false,
					attempts: webhook.retryCount,
					lastError: "Max retries exceeded",
				}
			}

			// Calculate delay for this retry
			const delay = this.calculateRetryDelay(webhook.retryCount)
			const nextRetryAt = new Date(Date.now() + delay)

			// Check if it's time to retry
			if (webhook.nextRetryAt && new Date() < webhook.nextRetryAt) {
				return {
					success: false,
					attempts: webhook.retryCount,
					lastError: "Not yet time to retry",
					nextRetryAt: webhook.nextRetryAt,
				}
			}

			// Attempt to process the webhook
			const success = await this.processWebhook(webhook)

			if (success) {
				return {
					success: true,
					attempts: webhook.retryCount + 1,
				}
			} else {
				return {
					success: false,
					attempts: webhook.retryCount + 1,
					lastError: "Processing failed",
					nextRetryAt,
				}
			}
		} catch (error) {
			return {
				success: false,
				attempts: webhook.retryCount + 1,
				lastError: error instanceof Error ? error.message : "Unknown error",
			}
		}
	}

	/**
	 * Schedule webhook for retry
	 */
	async scheduleRetry(webhookId: string, error: string): Promise<void> {
		try {
			// This would update the webhook record with retry information
			// For now, we'll just log it
			console.log(`Scheduling retry for webhook ${webhookId}: ${error}`)
		} catch (error) {
			console.error("Error scheduling webhook retry:", error)
		}
	}

	/**
	 * Get webhooks that are ready for retry
	 */
	async getRetryableWebhooks(): Promise<RetryableWebhook[]> {
		try {
			// This would query the database for webhooks that need retrying
			// For now, we'll return an empty array
			return []
		} catch (error) {
			console.error("Error getting retryable webhooks:", error)
			return []
		}
	}

	/**
	 * Clean up old failed webhooks
	 */
	async cleanupOldFailedWebhooks(daysOld: number = 7): Promise<number> {
		try {
			// This would delete webhooks that have been failing for too long
			// For now, we'll just log it
			console.log(`Cleaning up webhooks older than ${daysOld} days`)
			return 0
		} catch (error) {
			console.error("Error cleaning up old failed webhooks:", error)
			return 0
		}
	}

	/**
	 * Get retry statistics
	 */
	async getRetryStats(): Promise<{
		totalFailed: number
		retryable: number
		maxRetriesExceeded: number
		byProvider: Record<string, { failed: number; retryable: number }>
	}> {
		try {
			// This would calculate retry statistics from the database
			// For now, we'll return mock data
			return {
				totalFailed: 0,
				retryable: 0,
				maxRetriesExceeded: 0,
				byProvider: {},
			}
		} catch (error) {
			console.error("Error getting retry stats:", error)
			return {
				totalFailed: 0,
				retryable: 0,
				maxRetriesExceeded: 0,
				byProvider: {},
			}
		}
	}

	// Private helper methods

	private shouldRetry(webhook: RetryableWebhook): boolean {
		return webhook.retryCount < this.config.maxRetries
	}

	private calculateRetryDelay(retryCount: number): number {
		let delay = this.config.baseDelay * this.config.backoffMultiplier ** retryCount

		// Apply jitter to prevent thundering herd
		if (this.config.jitter) {
			delay = delay * (0.5 + Math.random() * 0.5)
		}

		// Cap at maximum delay
		return Math.min(delay, this.config.maxDelay)
	}

	private async processWebhook(webhook: RetryableWebhook): Promise<boolean> {
		try {
			// This would actually process the webhook
			// For now, we'll simulate processing
			console.log(`Processing webhook ${webhook.id} (attempt ${webhook.retryCount + 1})`)

			// Simulate processing time
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Simulate success/failure (90% success rate)
			return Math.random() > 0.1
		} catch (error) {
			console.error(`Error processing webhook ${webhook.id}:`, error)
			return false
		}
	}

	private async updateWebhookRetryInfo(webhook: RetryableWebhook, result: RetryResult): Promise<void> {
		try {
			// This would update the webhook record with retry information
			console.log(`Updating retry info for webhook ${webhook.id}:`, result)
		} catch (error) {
			console.error("Error updating webhook retry info:", error)
		}
	}
}
