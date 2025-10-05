/**
 * Stripe Webhook Event Processor
 * Handles processing of Stripe webhook events
 * Following NOORMME service layer pattern with specialized event handling
 */

export interface WebhookProcessingResult {
	success: boolean
	eventId: string
	processed: boolean
	error?: string
	retryable: boolean
}

export class StripeWebhookProcessor {
	private paymentDatabaseService: any

	constructor(paymentDatabaseService: any) {
		this.paymentDatabaseService = paymentDatabaseService
	}

	/**
	 * Process Stripe webhook event
	 */
	async processEvent(eventType: string, event: any): Promise<WebhookProcessingResult> {
		try {
			switch (eventType) {
				case "payment_intent.succeeded":
					return await this.handlePaymentIntentSucceeded(event)
				case "payment_intent.payment_failed":
					return await this.handlePaymentIntentFailed(event)
				case "payment_intent.canceled":
					return await this.handlePaymentIntentCanceled(event)
				case "invoice.payment_succeeded":
					return await this.handleInvoicePaymentSucceeded(event)
				case "invoice.payment_failed":
					return await this.handleInvoicePaymentFailed(event)
				case "customer.subscription.created":
					return await this.handleSubscriptionCreated(event)
				case "customer.subscription.updated":
					return await this.handleSubscriptionUpdated(event)
				case "customer.subscription.deleted":
					return await this.handleSubscriptionDeleted(event)
				case "charge.dispute.created":
					return await this.handleChargeDisputeCreated(event)
				case "payment_method.attached":
					return await this.handlePaymentMethodAttached(event)
				case "payment_method.detached":
					return await this.handlePaymentMethodDetached(event)
				default:
					return await this.handleUnknownEvent(eventType, event)
			}
		} catch (error) {
			console.error(`Error processing Stripe webhook ${eventType}:`, error)
			return {
				success: false,
				eventId: event.id,
				processed: false,
				error: error instanceof Error ? error.message : "Unknown error",
				retryable: this.isRetryableError(error),
			}
		}
	}

	// Payment Intent Event Handlers

	private async handlePaymentIntentSucceeded(event: any): Promise<WebhookProcessingResult> {
		try {
			const paymentIntent = event.data.object

			// Update payment intent status in database
			await this.paymentDatabaseService.updatePaymentIntentStatus(paymentIntent.id, "succeeded")

			// Create payment transaction record
			if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
				const charge = paymentIntent.charges.data[0]
				await this.paymentDatabaseService.createPaymentTransaction({
					paymentIntentId: paymentIntent.id,
					amount: paymentIntent.amount,
					currency: paymentIntent.currency,
					status: "completed",
					provider: "stripe",
					providerTransactionId: charge.id,
					fees: charge.balance_transaction?.fee || 0,
					netAmount: paymentIntent.amount - (charge.balance_transaction?.fee || 0),
					description: paymentIntent.description,
					metadata: paymentIntent.metadata,
				})
			}

			console.log(`Payment intent succeeded: ${paymentIntent.id}`)
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

	private async handlePaymentIntentFailed(event: any): Promise<WebhookProcessingResult> {
		try {
			const paymentIntent = event.data.object

			// Update payment intent status in database
			await this.paymentDatabaseService.updatePaymentIntentStatus(paymentIntent.id, "failed")

			console.log(`Payment intent failed: ${paymentIntent.id}`)
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

	private async handlePaymentIntentCanceled(event: any): Promise<WebhookProcessingResult> {
		try {
			const paymentIntent = event.data.object

			// Update payment intent status in database
			await this.paymentDatabaseService.updatePaymentIntentStatus(paymentIntent.id, "canceled")

			console.log(`Payment intent canceled: ${paymentIntent.id}`)
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

	// Invoice Event Handlers

	private async handleInvoicePaymentSucceeded(event: any): Promise<WebhookProcessingResult> {
		try {
			const invoice = event.data.object

			// Handle subscription invoice payment
			if (invoice.subscription) {
				// Update subscription status if needed
				console.log(`Invoice payment succeeded for subscription: ${invoice.subscription}`)
			}

			console.log(`Invoice payment succeeded: ${invoice.id}`)
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

	private async handleInvoicePaymentFailed(event: any): Promise<WebhookProcessingResult> {
		try {
			const invoice = event.data.object

			// Handle failed subscription payment
			if (invoice.subscription) {
				// Update subscription status to past_due
				await this.paymentDatabaseService.updateSubscriptionStatus(invoice.subscription, "past_due")
			}

			console.log(`Invoice payment failed: ${invoice.id}`)
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
			const subscription = event.data.object

			// Create subscription record in database
			await this.paymentDatabaseService.createSubscription({
				id: subscription.id,
				customerId: subscription.customer,
				planId: subscription.items.data[0]?.price?.id || "unknown",
				paymentMethodId: subscription.default_payment_method,
				trialPeriodDays: subscription.trial_period_days,
				metadata: subscription.metadata,
			})

			console.log(`Subscription created: ${subscription.id}`)
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

	private async handleSubscriptionUpdated(event: any): Promise<WebhookProcessingResult> {
		try {
			const subscription = event.data.object

			// Update subscription status
			const status = this.mapStripeSubscriptionStatus(subscription.status)
			await this.paymentDatabaseService.updateSubscriptionStatus(subscription.id, status)

			console.log(`Subscription updated: ${subscription.id}`)
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

	private async handleSubscriptionDeleted(event: any): Promise<WebhookProcessingResult> {
		try {
			const subscription = event.data.object

			// Update subscription status to canceled
			await this.paymentDatabaseService.updateSubscriptionStatus(subscription.id, "canceled")

			console.log(`Subscription deleted: ${subscription.id}`)
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

	// Dispute Event Handlers

	private async handleChargeDisputeCreated(event: any): Promise<WebhookProcessingResult> {
		try {
			const dispute = event.data.object

			// Handle chargeback/dispute
			console.log(`Charge dispute created: ${dispute.id} for charge: ${dispute.charge}`)

			// You might want to:
			// 1. Notify the merchant
			// 2. Update transaction status
			// 3. Create a dispute record

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

	// Payment Method Event Handlers

	private async handlePaymentMethodAttached(event: any): Promise<WebhookProcessingResult> {
		try {
			const paymentMethod = event.data.object

			console.log(`Payment method attached: ${paymentMethod.id}`)
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

	private async handlePaymentMethodDetached(event: any): Promise<WebhookProcessingResult> {
		try {
			const paymentMethod = event.data.object

			console.log(`Payment method detached: ${paymentMethod.id}`)
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
		console.log(`Unhandled Stripe webhook event type: ${eventType}`)
		return {
			success: true,
			eventId: event.id,
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
			const retryableCodes = ["rate_limit_error", "api_connection_error", "api_error", "timeout_error"]
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

	private mapStripeSubscriptionStatus(stripeStatus: string): "active" | "inactive" | "canceled" | "past_due" {
		switch (stripeStatus) {
			case "active":
				return "active"
			case "canceled":
				return "canceled"
			case "past_due":
				return "past_due"
			case "unpaid":
			case "incomplete":
			case "incomplete_expired":
			case "trialing":
			default:
				return "inactive"
		}
	}
}
