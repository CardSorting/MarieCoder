/**
 * PayPal Webhook Event Processor
 * Handles processing of PayPal webhook events
 * Following NOORMME service layer pattern with specialized event handling
 */

export interface WebhookProcessingResult {
	success: boolean
	eventId: string
	processed: boolean
	error?: string
	retryable: boolean
}

export class PayPalWebhookProcessor {
	private paymentDatabaseService: any

	constructor(paymentDatabaseService: any) {
		this.paymentDatabaseService = paymentDatabaseService
	}

	/**
	 * Process PayPal webhook event
	 */
	async processEvent(eventType: string, event: any): Promise<WebhookProcessingResult> {
		try {
			switch (eventType) {
				case "CHECKOUT.ORDER.APPROVED":
					return await this.handleOrderApproved(event)
				case "CHECKOUT.ORDER.COMPLETED":
					return await this.handleOrderCompleted(event)
				case "PAYMENT.CAPTURE.COMPLETED":
					return await this.handleCaptureCompleted(event)
				case "PAYMENT.CAPTURE.DENIED":
					return await this.handleCaptureDenied(event)
				case "PAYMENT.CAPTURE.REFUNDED":
					return await this.handleCaptureRefunded(event)
				case "BILLING.SUBSCRIPTION.CREATED":
					return await this.handleSubscriptionCreated(event)
				case "BILLING.SUBSCRIPTION.ACTIVATED":
					return await this.handleSubscriptionActivated(event)
				case "BILLING.SUBSCRIPTION.CANCELLED":
					return await this.handleSubscriptionCancelled(event)
				case "BILLING.SUBSCRIPTION.SUSPENDED":
					return await this.handleSubscriptionSuspended(event)
				case "BILLING.SUBSCRIPTION.PAYMENT.COMPLETED":
					return await this.handleSubscriptionPaymentCompleted(event)
				case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
					return await this.handleSubscriptionPaymentFailed(event)
				default:
					return await this.handleUnknownEvent(eventType, event)
			}
		} catch (error) {
			console.error(`Error processing PayPal webhook ${eventType}:`, error)
			return {
				success: false,
				eventId: event.id || event.event_id,
				processed: false,
				error: error instanceof Error ? error.message : "Unknown error",
				retryable: this.isRetryableError(error),
			}
		}
	}

	// Order Event Handlers

	private async handleOrderApproved(event: any): Promise<WebhookProcessingResult> {
		try {
			const order = event.resource

			console.log(`PayPal order approved: ${order.id}`)

			// You might want to update order status in your database
			// or trigger additional business logic

			return {
				success: true,
				eventId: event.id,
				processed: true,
				retryable: false,
			}
		} catch (error) {
			return this.createErrorResult(event.id, error)
		}
	}

	private async handleOrderCompleted(event: any): Promise<WebhookProcessingResult> {
		try {
			const order = event.resource

			console.log(`PayPal order completed: ${order.id}`)

			// Update order status and create payment transaction
			if (order.purchase_units && order.purchase_units.length > 0) {
				const purchaseUnit = order.purchase_units[0]
				if (purchaseUnit.payments && purchaseUnit.payments.captures) {
					const capture = purchaseUnit.payments.captures[0]

					// Create payment transaction record
					await this.paymentDatabaseService.createPaymentTransaction({
						paymentIntentId: order.id,
						amount: Math.round(parseFloat(capture.amount.value) * 100), // Convert to cents
						currency: capture.amount.currency_code,
						status: "completed",
						provider: "paypal",
						providerTransactionId: capture.id,
						fees: capture.seller_receivable_breakdown?.paypal_fee?.value
							? Math.round(parseFloat(capture.seller_receivable_breakdown.paypal_fee.value) * 100)
							: 0,
						netAmount: capture.seller_receivable_breakdown?.net_amount?.value
							? Math.round(parseFloat(capture.seller_receivable_breakdown.net_amount.value) * 100)
							: 0,
						description: purchaseUnit.description,
						metadata: { orderId: order.id },
					})
				}
			}

			return {
				success: true,
				eventId: event.id,
				processed: true,
				retryable: false,
			}
		} catch (error) {
			return this.createErrorResult(event.id, error)
		}
	}

	// Payment Capture Event Handlers

	private async handleCaptureCompleted(event: any): Promise<WebhookProcessingResult> {
		try {
			const capture = event.resource

			console.log(`PayPal capture completed: ${capture.id}`)

			// Update payment transaction status
			// You might want to find the existing transaction and update it

			return {
				success: true,
				eventId: event.id,
				processed: true,
				retryable: false,
			}
		} catch (error) {
			return this.createErrorResult(event.id, error)
		}
	}

	private async handleCaptureDenied(event: any): Promise<WebhookProcessingResult> {
		try {
			const capture = event.resource

			console.log(`PayPal capture denied: ${capture.id}`)

			// Update payment transaction status to failed
			// You might want to find the existing transaction and update it

			return {
				success: true,
				eventId: event.id,
				processed: true,
				retryable: false,
			}
		} catch (error) {
			return this.createErrorResult(event.id, error)
		}
	}

	private async handleCaptureRefunded(event: any): Promise<WebhookProcessingResult> {
		try {
			const refund = event.resource

			console.log(`PayPal capture refunded: ${refund.id}`)

			// Create refund record
			await this.paymentDatabaseService.createRefund({
				transactionId: refund.capture_id,
				amount: Math.round(parseFloat(refund.amount.value) * 100),
				reason: "requested_by_customer",
				status: "succeeded",
				description: refund.note_to_payer,
				metadata: { refundId: refund.id },
			})

			return {
				success: true,
				eventId: event.id,
				processed: true,
				retryable: false,
			}
		} catch (error) {
			return this.createErrorResult(event.id, error)
		}
	}

	// Subscription Event Handlers

	private async handleSubscriptionCreated(event: any): Promise<WebhookProcessingResult> {
		try {
			const subscription = event.resource

			console.log(`PayPal subscription created: ${subscription.id}`)

			// Create subscription record in database
			await this.paymentDatabaseService.createSubscription({
				id: subscription.id,
				customerId: subscription.subscriber?.payer_id || "unknown",
				planId: subscription.plan_id,
				paymentMethodId: subscription.payment_source?.paypal?.email_address,
				trialPeriodDays: subscription.billing_info?.cycle_executions?.[0]?.cycles_completed === 0 ? 30 : undefined,
				metadata: {
					subscriberEmail: subscription.subscriber?.email_address,
					planId: subscription.plan_id,
				},
			})

			return {
				success: true,
				eventId: event.id,
				processed: true,
				retryable: false,
			}
		} catch (error) {
			return this.createErrorResult(event.id, error)
		}
	}

	private async handleSubscriptionActivated(event: any): Promise<WebhookProcessingResult> {
		try {
			const subscription = event.resource

			console.log(`PayPal subscription activated: ${subscription.id}`)

			// Update subscription status to active
			await this.paymentDatabaseService.updateSubscriptionStatus(subscription.id, "active")

			return {
				success: true,
				eventId: event.id,
				processed: true,
				retryable: false,
			}
		} catch (error) {
			return this.createErrorResult(event.id, error)
		}
	}

	private async handleSubscriptionCancelled(event: any): Promise<WebhookProcessingResult> {
		try {
			const subscription = event.resource

			console.log(`PayPal subscription cancelled: ${subscription.id}`)

			// Update subscription status to canceled
			await this.paymentDatabaseService.updateSubscriptionStatus(subscription.id, "canceled")

			return {
				success: true,
				eventId: event.id,
				processed: true,
				retryable: false,
			}
		} catch (error) {
			return this.createErrorResult(event.id, error)
		}
	}

	private async handleSubscriptionSuspended(event: any): Promise<WebhookProcessingResult> {
		try {
			const subscription = event.resource

			console.log(`PayPal subscription suspended: ${subscription.id}`)

			// Update subscription status to inactive
			await this.paymentDatabaseService.updateSubscriptionStatus(subscription.id, "inactive")

			return {
				success: true,
				eventId: event.id,
				processed: true,
				retryable: false,
			}
		} catch (error) {
			return this.createErrorResult(event.id, error)
		}
	}

	private async handleSubscriptionPaymentCompleted(event: any): Promise<WebhookProcessingResult> {
		try {
			const subscription = event.resource

			console.log(`PayPal subscription payment completed: ${subscription.id}`)

			// Handle successful subscription payment
			// You might want to create an invoice record or update subscription status

			return {
				success: true,
				eventId: event.id,
				processed: true,
				retryable: false,
			}
		} catch (error) {
			return this.createErrorResult(event.id, error)
		}
	}

	private async handleSubscriptionPaymentFailed(event: any): Promise<WebhookProcessingResult> {
		try {
			const subscription = event.resource

			console.log(`PayPal subscription payment failed: ${subscription.id}`)

			// Handle failed subscription payment
			// You might want to update subscription status to past_due

			return {
				success: true,
				eventId: event.id,
				processed: true,
				retryable: false,
			}
		} catch (error) {
			return this.createErrorResult(event.id, error)
		}
	}

	// Unknown Event Handler

	private async handleUnknownEvent(eventType: string, event: any): Promise<WebhookProcessingResult> {
		console.log(`Unhandled PayPal webhook event type: ${eventType}`)
		return {
			success: true,
			eventId: event.id || event.event_id,
			processed: true,
			retryable: false,
		}
	}

	// Helper Methods

	private createErrorResult(eventId: string, error: any): WebhookProcessingResult {
		return {
			success: false,
			eventId,
			processed: false,
			error: error instanceof Error ? error.message : "Unknown error",
			retryable: this.isRetryableError(error),
		}
	}

	private isRetryableError(error: any): boolean {
		if (error.code) {
			const retryableCodes = ["RATE_LIMIT_EXCEEDED", "INTERNAL_SERVER_ERROR", "TIMEOUT_ERROR"]
			return retryableCodes.includes(error.code)
		}

		// Network errors are generally retryable
		if (
			error.message &&
			(error.message.includes("network") || error.message.includes("timeout") || error.message.includes("connection"))
		) {
			return true
		}

		return false
	}
}
