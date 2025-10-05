/**
 * Payment Webhook Service
 * Handles webhook processing for payment providers
 * Following NOORMME service layer pattern with comprehensive webhook handling
 */

import { getPaymentConfig } from "@/config/payment.config"
import { DatabaseServiceFactory } from "./database/ServiceFactory"
import { PayPalService } from "./PayPalService"
import { StripeService } from "./StripeService"
import { PayPalWebhookProcessor } from "./webhooks/processors/PayPalWebhookProcessor"
import { StripeWebhookProcessor } from "./webhooks/processors/StripeWebhookProcessor"
import { WebhookRetryService } from "./webhooks/retry/WebhookRetryService"
import { validatePayPalWebhook, validateStripeWebhook } from "./webhooks/utils/WebhookValidator"

export interface WebhookEvent {
	id: string
	type: string
	data: any
	created: number
	livemode: boolean
}

export interface WebhookProcessingResult {
	success: boolean
	eventId: string
	processed: boolean
	error?: string
	retryable: boolean
}

export class PaymentWebhookService {
	private static instance: PaymentWebhookService
	private paymentDatabaseService: any
	private stripeService: StripeService
	private paypalService: PayPalService
	private stripeProcessor: StripeWebhookProcessor
	private paypalProcessor: PayPalWebhookProcessor
	private retryService: WebhookRetryService
	private config: any

	static async getInstance(): Promise<PaymentWebhookService> {
		if (!PaymentWebhookService.instance) {
			const serviceFactory = DatabaseServiceFactory.getInstance()
			const services = serviceFactory.getServices()
			const paymentDatabaseService = services.payment
			const stripeService = new StripeService()
			const paypalService = new PayPalService()
			const stripeProcessor = new StripeWebhookProcessor(paymentDatabaseService)
			const paypalProcessor = new PayPalWebhookProcessor(paymentDatabaseService)
			const retryService = new WebhookRetryService(paymentDatabaseService)
			const config = getPaymentConfig()

			PaymentWebhookService.instance = new PaymentWebhookService(
				paymentDatabaseService,
				stripeService,
				paypalService,
				stripeProcessor,
				paypalProcessor,
				retryService,
				config,
			)
		}
		return PaymentWebhookService.instance
	}

	constructor(
		paymentDatabaseService: any,
		stripeService: StripeService,
		paypalService: PayPalService,
		stripeProcessor: StripeWebhookProcessor,
		paypalProcessor: PayPalWebhookProcessor,
		retryService: WebhookRetryService,
		config: any,
	) {
		this.paymentDatabaseService = paymentDatabaseService
		this.stripeService = stripeService
		this.paypalService = paypalService
		this.stripeProcessor = stripeProcessor
		this.paypalProcessor = paypalProcessor
		this.retryService = retryService
		this.config = config
	}

	/**
	 * Process Stripe webhook
	 */
	async processStripeWebhook(payload: string, signature: string): Promise<WebhookProcessingResult> {
		try {
			// Validate webhook signature using specialized validator
			const validation = validateStripeWebhook(payload, signature, this.config.providers.stripe.webhookSecret)
			if (!validation.isValid) {
				return {
					success: false,
					eventId: "unknown",
					processed: false,
					error: validation.error || "Invalid webhook signature",
					retryable: false,
				}
			}

			const event = validation.event!

			// Save webhook to database
			const webhook = await this.paymentDatabaseService.createPaymentWebhook({
				provider: "stripe",
				eventType: event.type,
				payload: event,
				processed: false,
			})

			// Process the webhook event using specialized processor
			const result = await this.stripeProcessor.processEvent(event.type, event)

			if (result.success) {
				// Mark webhook as processed
				await this.paymentDatabaseService.markWebhookProcessed(webhook.id)
			} else {
				// Schedule for retry if retryable
				if (result.retryable) {
					await this.retryService.scheduleRetry(webhook.id, result.error || "Processing failed")
				}
			}

			return result
		} catch (error) {
			console.error("Stripe webhook processing error:", error)
			return {
				success: false,
				eventId: "unknown",
				processed: false,
				error: error instanceof Error ? error.message : "Unknown error",
				retryable: this.isRetryableError(error),
			}
		}
	}

	/**
	 * Process PayPal webhook
	 */
	async processPayPalWebhook(payload: any, headers: Record<string, string>): Promise<WebhookProcessingResult> {
		try {
			// Validate webhook signature using specialized validator
			const validation = validatePayPalWebhook(payload, headers, this.config.providers.paypal.webhookId)
			if (!validation.isValid) {
				return {
					success: false,
					eventId: "unknown",
					processed: false,
					error: validation.error || "Invalid webhook signature",
					retryable: false,
				}
			}

			const event = validation.event!

			// Save webhook to database
			const webhook = await this.paymentDatabaseService.createPaymentWebhook({
				provider: "paypal",
				eventType: event.event_type,
				payload: event,
				processed: false,
			})

			// Process the webhook event using specialized processor
			const result = await this.paypalProcessor.processEvent(event.event_type, event)

			if (result.success) {
				// Mark webhook as processed
				await this.paymentDatabaseService.markWebhookProcessed(webhook.id)
			} else {
				// Schedule for retry if retryable
				if (result.retryable) {
					await this.retryService.scheduleRetry(webhook.id, result.error || "Processing failed")
				}
			}

			return result
		} catch (error) {
			console.error("PayPal webhook processing error:", error)
			return {
				success: false,
				eventId: "unknown",
				processed: false,
				error: error instanceof Error ? error.message : "Unknown error",
				retryable: this.isRetryableError(error),
			}
		}
	}

	/**
	 * Process unprocessed webhooks
	 */
	async processUnprocessedWebhooks(): Promise<void> {
		try {
			const unprocessedWebhooks = await this.paymentDatabaseService.getUnprocessedWebhooks()

			for (const webhook of unprocessedWebhooks) {
				try {
					let result: WebhookProcessingResult

					if (webhook.provider === "stripe") {
						result = await this.stripeProcessor.processEvent(webhook.eventType, webhook.payload)
					} else if (webhook.provider === "paypal") {
						result = await this.paypalProcessor.processEvent(webhook.eventType, webhook.payload)
					} else {
						console.error(`Unknown webhook provider: ${webhook.provider}`)
						continue
					}

					if (result.success) {
						// Mark as processed
						await this.paymentDatabaseService.markWebhookProcessed(webhook.id)
					} else if (result.retryable) {
						// Schedule for retry
						await this.retryService.scheduleRetry(webhook.id, result.error || "Processing failed")
					}
				} catch (error) {
					console.error(`Failed to process webhook ${webhook.id}:`, error)
					// Continue processing other webhooks
				}
			}
		} catch (error) {
			console.error("Error processing unprocessed webhooks:", error)
		}
	}

	/**
	 * Get webhook processing statistics
	 */
	async getWebhookStats(): Promise<{
		total: number
		processed: number
		unprocessed: number
		byProvider: Record<string, { total: number; processed: number; unprocessed: number }>
	}> {
		try {
			const allWebhooks = await this.paymentDatabaseService.getUnprocessedWebhooks()
			const processedWebhooks = await this.paymentDatabaseService.getUnprocessedWebhooks() // This should be a different method

			// This is a simplified version - in reality, you'd have proper database queries
			const stats = {
				total: allWebhooks.length,
				processed: 0, // Would be calculated from database
				unprocessed: allWebhooks.length,
				byProvider: {} as Record<string, { total: number; processed: number; unprocessed: number }>,
			}

			// Group by provider
			for (const webhook of allWebhooks) {
				if (!stats.byProvider[webhook.provider]) {
					stats.byProvider[webhook.provider] = { total: 0, processed: 0, unprocessed: 0 }
				}
				stats.byProvider[webhook.provider].total++
				stats.byProvider[webhook.provider].unprocessed++
			}

			return stats
		} catch (error) {
			console.error("Error getting webhook stats:", error)
			return {
				total: 0,
				processed: 0,
				unprocessed: 0,
				byProvider: {},
			}
		}
	}

	/**
	 * Retry failed webhook processing
	 */
	async retryFailedWebhooks(maxRetries: number = 3): Promise<void> {
		try {
			// Use the specialized retry service
			await this.retryService.retryFailedWebhooks()
		} catch (error) {
			console.error("Error retrying failed webhooks:", error)
		}
	}

	/**
	 * Clean up old webhooks
	 */
	async cleanupOldWebhooks(daysOld: number = 30): Promise<void> {
		try {
			// This would implement cleanup logic for old webhooks
			// For now, it's a placeholder
			console.log(`Cleaning up webhooks older than ${daysOld} days`)
		} catch (error) {
			console.error("Error cleaning up old webhooks:", error)
		}
	}

	// Private helper methods

	private isRetryableError(error: any): boolean {
		// Determine if an error is retryable based on error type
		if (error.code) {
			const retryableCodes = ["rate_limit_error", "api_connection_error", "api_error"]
			return retryableCodes.includes(error.code)
		}

		// Network errors are generally retryable
		if (error.message && error.message.includes("network")) {
			return true
		}

		return false
	}

	// Removed getDB method as we now use the unified database service
}
