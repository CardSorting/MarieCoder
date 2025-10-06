/**
 * Payment Notification Service
 * Handles all payment-related notifications and communications
 * Following NOORMME service layer pattern
 */

import type {
	PaymentIntent,
	PaymentMethod,
	PaymentTransaction,
	PaymentWebhook,
	Refund,
	Subscription,
	SubscriptionPlan,
} from "@/types/payment"

export interface NotificationChannel {
	email: boolean
	sms: boolean
	push: boolean
	webhook: boolean
}

export interface NotificationTemplate {
	subject: string
	body: string
	variables: Record<string, string>
}

export class PaymentNotificationService {
	private emailService: any
	private smsService: any
	private pushService: any
	private webhookService: any

	constructor() {
		// Initialize notification services
		// In a real implementation, these would be actual service instances
		this.emailService = null
		this.smsService = null
		this.pushService = null
		this.webhookService = null
	}

	/**
	 * Notify when payment method is created
	 */
	async notifyPaymentMethodCreated(paymentMethod: PaymentMethod): Promise<void> {
		const template = this.getTemplate("payment_method_created")
		const variables = {
			paymentMethodType: paymentMethod.type,
			lastFour: paymentMethod.lastFour || "****",
			brand: paymentMethod.brand || "Unknown",
		}

		await this.sendNotification("payment_method_created", template, variables)
	}

	/**
	 * Notify when payment method is deleted
	 */
	async notifyPaymentMethodDeleted(paymentMethod: PaymentMethod): Promise<void> {
		const template = this.getTemplate("payment_method_deleted")
		const variables = {
			paymentMethodType: paymentMethod.type,
			lastFour: paymentMethod.lastFour || "****",
		}

		await this.sendNotification("payment_method_deleted", template, variables)
	}

	/**
	 * Notify when payment intent is created
	 */
	async notifyPaymentIntentCreated(paymentIntent: PaymentIntent): Promise<void> {
		const template = this.getTemplate("payment_intent_created")
		const variables = {
			amount: this.formatAmount(paymentIntent.amount, paymentIntent.currency),
			currency: paymentIntent.currency,
			description: paymentIntent.description || "Payment",
		}

		await this.sendNotification("payment_intent_created", template, variables)
	}

	/**
	 * Notify when payment is completed
	 */
	async notifyPaymentCompleted(transaction: PaymentTransaction): Promise<void> {
		const template = this.getTemplate("payment_completed")
		const variables = {
			amount: this.formatAmount(transaction.amount, transaction.currency),
			currency: transaction.currency,
			transactionId: transaction.id,
			netAmount: this.formatAmount(transaction.netAmount, transaction.currency),
		}

		await this.sendNotification("payment_completed", template, variables)
	}

	/**
	 * Notify when payment fails
	 */
	async notifyPaymentFailed(paymentIntent: PaymentIntent, error: string): Promise<void> {
		const template = this.getTemplate("payment_failed")
		const variables = {
			amount: this.formatAmount(paymentIntent.amount, paymentIntent.currency),
			currency: paymentIntent.currency,
			error: error,
			paymentIntentId: paymentIntent.id,
		}

		await this.sendNotification("payment_failed", template, variables)
	}

	/**
	 * Notify when subscription is created
	 */
	async notifySubscriptionCreated(subscription: Subscription): Promise<void> {
		const template = this.getTemplate("subscription_created")
		const variables = {
			subscriptionId: subscription.id,
			planId: subscription.planId,
			currentPeriodEnd: subscription.currentPeriodEnd.toLocaleDateString(),
		}

		await this.sendNotification("subscription_created", template, variables)
	}

	/**
	 * Notify when subscription is canceled
	 */
	async notifySubscriptionCanceled(subscription: Subscription): Promise<void> {
		const template = this.getTemplate("subscription_canceled")
		const variables = {
			subscriptionId: subscription.id,
			planId: subscription.planId,
			cancelAtPeriodEnd: subscription.cancelAtPeriodEnd.toString(),
		}

		await this.sendNotification("subscription_canceled", template, variables)
	}

	/**
	 * Notify when subscription plan is created
	 */
	async notifySubscriptionPlanCreated(plan: SubscriptionPlan): Promise<void> {
		const template = this.getTemplate("subscription_plan_created")
		const variables = {
			planName: plan.name,
			planPrice: this.formatAmount(plan.price, plan.currency),
			currency: plan.currency,
			interval: plan.interval,
		}

		await this.sendNotification("subscription_plan_created", template, variables)
	}

	/**
	 * Notify when refund is created
	 */
	async notifyRefundCreated(refund: Refund): Promise<void> {
		const template = this.getTemplate("refund_created")
		const variables = {
			refundId: refund.id,
			amount: this.formatAmount(refund.amount, "USD"), // Assuming USD for refunds
			reason: refund.reason,
			transactionId: refund.transactionId,
		}

		await this.sendNotification("refund_created", template, variables)
	}

	/**
	 * Notify when webhook is processed
	 */
	async notifyWebhookProcessed(webhook: PaymentWebhook): Promise<void> {
		const template = this.getTemplate("webhook_processed")
		const variables = {
			webhookId: webhook.id,
			provider: webhook.provider,
			eventType: webhook.eventType,
		}

		await this.sendNotification("webhook_processed", template, variables)
	}

	/**
	 * Send payment receipt
	 */
	async sendPaymentReceipt(transaction: PaymentTransaction): Promise<void> {
		const template = this.getTemplate("payment_receipt")
		const variables = {
			amount: this.formatAmount(transaction.amount, transaction.currency),
			currency: transaction.currency,
			transactionId: transaction.id,
			date: transaction.createdAt.toLocaleDateString(),
			description: transaction.description || "Payment",
		}

		await this.sendNotification("payment_receipt", template, variables)
	}

	/**
	 * Send subscription invoice
	 */
	async sendSubscriptionInvoice(subscription: Subscription, amount: number, currency: string): Promise<void> {
		const template = this.getTemplate("subscription_invoice")
		const variables = {
			subscriptionId: subscription.id,
			amount: this.formatAmount(amount, currency),
			currency: currency,
			billingDate: subscription.currentPeriodEnd.toLocaleDateString(),
		}

		await this.sendNotification("subscription_invoice", template, variables)
	}

	/**
	 * Send payment reminder
	 */
	async sendPaymentReminder(paymentIntent: PaymentIntent, daysUntilDue: number): Promise<void> {
		const template = this.getTemplate("payment_reminder")
		const variables = {
			amount: this.formatAmount(paymentIntent.amount, paymentIntent.currency),
			currency: paymentIntent.currency,
			daysUntilDue: daysUntilDue.toString(),
			paymentIntentId: paymentIntent.id,
		}

		await this.sendNotification("payment_reminder", template, variables)
	}

	// Private helper methods

	private async sendNotification(
		eventType: string,
		template: NotificationTemplate,
		variables: Record<string, string>,
	): Promise<void> {
		try {
			// In a real implementation, this would send actual notifications
			console.log(`Sending ${eventType} notification:`, {
				template: template.subject,
				variables,
			})

			// Send email notification
			if (this.emailService) {
				await this.sendEmailNotification(template, variables)
			}

			// Send SMS notification
			if (this.smsService) {
				await this.sendSMSNotification(template, variables)
			}

			// Send push notification
			if (this.pushService) {
				await this.sendPushNotification(template, variables)
			}

			// Send webhook notification
			if (this.webhookService) {
				await this.sendWebhookNotification(eventType, variables)
			}
		} catch (error) {
			console.error("Failed to send notification:", error)
			// Don't throw - notifications are not critical for payment processing
		}
	}

	private async sendEmailNotification(template: NotificationTemplate, _variables: Record<string, string>): Promise<void> {
		// Email notification implementation
		console.log("Email notification sent:", template.subject)
	}

	private async sendSMSNotification(template: NotificationTemplate, _variables: Record<string, string>): Promise<void> {
		// SMS notification implementation
		console.log("SMS notification sent:", template.body)
	}

	private async sendPushNotification(template: NotificationTemplate, _variables: Record<string, string>): Promise<void> {
		// Push notification implementation
		console.log("Push notification sent:", template.subject)
	}

	private async sendWebhookNotification(eventType: string, _variables: Record<string, string>): Promise<void> {
		// Webhook notification implementation
		console.log("Webhook notification sent:", eventType)
	}

	private getTemplate(eventType: string): NotificationTemplate {
		const templates = {
			payment_method_created: {
				subject: "Payment Method Added",
				body: "A new {paymentMethodType} ending in {lastFour} has been added to your account.",
				variables: {},
			},
			payment_method_deleted: {
				subject: "Payment Method Removed",
				body: "Your {paymentMethodType} ending in {lastFour} has been removed from your account.",
				variables: {},
			},
			payment_intent_created: {
				subject: "Payment Request Created",
				body: "A payment request for {amount} {currency} has been created: {description}",
				variables: {},
			},
			payment_completed: {
				subject: "Payment Successful",
				body: "Your payment of {amount} {currency} has been processed successfully. Transaction ID: {transactionId}",
				variables: {},
			},
			payment_failed: {
				subject: "Payment Failed",
				body: "Your payment of {amount} {currency} has failed. Error: {error}",
				variables: {},
			},
			subscription_created: {
				subject: "Subscription Created",
				body: "Your subscription has been created successfully. Next billing date: {currentPeriodEnd}",
				variables: {},
			},
			subscription_canceled: {
				subject: "Subscription Canceled",
				body: 'Your subscription has been canceled. {cancelAtPeriodEnd ? "It will remain active until the end of the current period." : "It has been canceled immediately."}',
				variables: {},
			},
			subscription_plan_created: {
				subject: "New Subscription Plan Available",
				body: 'A new subscription plan "{planName}" is now available for {planPrice} {currency} per {interval}.',
				variables: {},
			},
			refund_created: {
				subject: "Refund Processed",
				body: "A refund of {amount} has been processed for transaction {transactionId}. Reason: {reason}",
				variables: {},
			},
			webhook_processed: {
				subject: "Webhook Processed",
				body: "Webhook {webhookId} from {provider} has been processed successfully. Event: {eventType}",
				variables: {},
			},
			payment_receipt: {
				subject: "Payment Receipt",
				body: "Thank you for your payment of {amount} {currency} on {date}. Transaction ID: {transactionId}",
				variables: {},
			},
			subscription_invoice: {
				subject: "Subscription Invoice",
				body: "Your subscription invoice for {amount} {currency} is due on {billingDate}.",
				variables: {},
			},
			payment_reminder: {
				subject: "Payment Reminder",
				body: "This is a reminder that your payment of {amount} {currency} is due in {daysUntilDue} days.",
				variables: {},
			},
		}

		return (
			templates[eventType as keyof typeof templates] || {
				subject: "Payment Notification",
				body: "A payment event has occurred.",
				variables: {},
			}
		)
	}

	private formatAmount(amount: number, currency: string): string {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency.toUpperCase(),
		}).format(amount / 100)
	}
}
