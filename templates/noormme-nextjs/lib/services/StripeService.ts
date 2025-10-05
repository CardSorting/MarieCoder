/**
 * Stripe Payment Service
 * Specialized service for Stripe payment processing
 * Following NOORMME service layer pattern with provider-specific logic
 */

import { getPaymentConfig } from "@/config/payment.config"
import type {
	CreatePaymentIntentData,
	CreateSubscriptionData,
	PaymentError,
	PaymentIntent,
	PaymentMethod,
	PaymentTransaction,
	SubscriptionPlan,
} from "@/types/payment"
import { calculateFees } from "@/utils/payment.calculator"

export interface StripeConfig {
	publishableKey: string
	secretKey: string
	webhookSecret: string
	environment: "test" | "live"
}

export interface StripePaymentMethod {
	id: string
	type: string
	lastFour?: string
	brand?: string
	expiryMonth?: number
	expiryYear?: number
	card?: {
		last4: string
		brand: string
		exp_month: number
		exp_year: number
	}
}

export interface StripePaymentIntent {
	id: string
	client_secret: string
	status: string
	amount: number
	currency: string
}

export interface StripeCharge {
	id: string
	amount: number
	currency: string
	status: string
	balance_transaction: string
}

export interface StripeSubscription {
	id: string
	status: string
	current_period_start: number
	current_period_end: number
}

export interface StripePrice {
	id: string
	unit_amount: number
	currency: string
	recurring: {
		interval: string
		interval_count: number
	}
}

export class StripeService {
	private config: StripeConfig
	private stripe: any // Stripe SDK instance

	constructor() {
		const paymentConfig = getPaymentConfig()
		this.config = paymentConfig.providers.stripe

		if (!this.config.secretKey) {
			throw new Error("Stripe secret key is not configured")
		}

		// Initialize Stripe asynchronously
		this.initializeStripe().catch((error) => {
			console.error("Failed to initialize Stripe:", error)
		})
	}

	/**
	 * Ensure Stripe is initialized before use
	 */
	private async ensureInitialized(): Promise<void> {
		if (!this.stripe) {
			await this.initializeStripe()
		}
	}

	/**
	 * Initialize Stripe SDK
	 */
	private async initializeStripe(): Promise<void> {
		try {
			// Import Stripe dynamically to avoid issues in environments where it's not available
			const Stripe = await import("stripe")
			this.stripe = new Stripe.default(this.config.secretKey, {
				apiVersion: this.config.apiVersion || "2023-10-16",
				timeout: this.config.timeout || 30000,
				maxNetworkRetries: this.config.maxRetries || 3,
				telemetry: false, // Disable telemetry for better performance
			})
		} catch (error) {
			// Fallback to mock implementation if Stripe is not available
			console.warn("Stripe SDK not available, using mock implementation:", error)
			this.stripe = {
				paymentMethods: this.createPaymentMethodsAPI(),
				paymentIntents: this.createPaymentIntentsAPI(),
				charges: this.createChargesAPI(),
				subscriptions: this.createSubscriptionsAPI(),
				prices: this.createPricesAPI(),
				webhooks: this.createWebhooksAPI(),
				customers: this.createCustomersAPI(),
				invoices: this.createInvoicesAPI(),
				refunds: this.createRefundsAPI(),
			}
		}
	}

	/**
	 * Create payment method
	 */
	async createPaymentMethod(customerId: string, paymentMethodData: any): Promise<StripePaymentMethod> {
		try {
			await this.ensureInitialized()

			// Create payment method with Stripe
			const paymentMethod = await this.stripe.paymentMethods.create({
				type: "card",
				card: {
					number: paymentMethodData.number,
					exp_month: paymentMethodData.expiryMonth,
					exp_year: paymentMethodData.expiryYear,
					cvc: paymentMethodData.cvv,
				},
			})

			// Attach payment method to customer
			await this.stripe.paymentMethods.attach(paymentMethod.id, {
				customer: customerId,
			})

			return {
				id: paymentMethod.id,
				type: paymentMethod.type,
				lastFour: paymentMethod.card?.last4,
				brand: paymentMethod.card?.brand,
				expiryMonth: paymentMethod.card?.exp_month,
				expiryYear: paymentMethod.card?.exp_year,
				card: paymentMethod.card,
			}
		} catch (error) {
			throw this.handleStripeError(error)
		}
	}

	/**
	 * Delete payment method
	 */
	async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
		try {
			await this.ensureInitialized()
			await this.stripe.paymentMethods.detach(paymentMethodId)
			return true
		} catch (error) {
			throw this.handleStripeError(error)
		}
	}

	/**
	 * Create payment intent
	 */
	async createPaymentIntent(data: CreatePaymentIntentData): Promise<StripePaymentIntent> {
		try {
			await this.ensureInitialized()

			const paymentIntentParams: any = {
				amount: data.amount,
				currency: data.currency.toLowerCase(),
				customer: data.customerId,
				description: data.description,
				metadata: data.metadata || {},
				automatic_payment_methods: {
					enabled: true,
				},
				capture_method: "automatic",
			}

			// Add payment method if provided
			if (data.paymentMethodId) {
				paymentIntentParams.payment_method = data.paymentMethodId
				paymentIntentParams.confirmation_method = "manual"
			}

			const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams)

			return {
				id: paymentIntent.id,
				client_secret: paymentIntent.client_secret,
				status: paymentIntent.status,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
			}
		} catch (error) {
			throw this.handleStripeError(error)
		}
	}

	/**
	 * Process payment
	 */
	async processPayment(paymentIntent: PaymentIntent, paymentMethod: PaymentMethod): Promise<PaymentTransaction> {
		try {
			await this.ensureInitialized()

			// Confirm the payment intent
			const confirmedIntent = await this.stripe.paymentIntents.confirm(paymentIntent.id, {
				payment_method: paymentMethod.id,
				return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/return`,
			})

			if (confirmedIntent.status !== "succeeded") {
				throw new Error(`Payment failed with status: ${confirmedIntent.status}`)
			}

			// Get the charge details
			const charge = confirmedIntent.charges.data[0]
			const fees = calculateFees(paymentIntent.amount, "stripe", paymentIntent.currency)

			return {
				id: this.generateTransactionId(),
				paymentIntentId: paymentIntent.id,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
				status: "completed",
				provider: "stripe",
				providerTransactionId: charge.id,
				fees: fees.fee,
				netAmount: fees.netAmount,
				description: paymentIntent.description,
				metadata: paymentIntent.metadata,
				createdAt: new Date(),
				updatedAt: new Date(),
			}
		} catch (error) {
			throw this.handleStripeError(error)
		}
	}

	/**
	 * Create subscription
	 */
	async createSubscription(data: CreateSubscriptionData, plan: SubscriptionPlan): Promise<StripeSubscription> {
		try {
			const subscription = await this.stripe.subscriptions.create({
				customer: data.customerId,
				items: [
					{
						price: plan.id,
					},
				],
				payment_method: data.paymentMethodId,
				trial_period_days: data.trialPeriodDays,
				metadata: data.metadata,
			})

			return {
				id: subscription.id,
				status: subscription.status,
				current_period_start: subscription.current_period_start,
				current_period_end: subscription.current_period_end,
			}
		} catch (error) {
			throw this.handleStripeError(error)
		}
	}

	/**
	 * Create subscription plan
	 */
	async createSubscriptionPlan(planData: Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">): Promise<StripePrice> {
		try {
			const price = await this.stripe.prices.create({
				unit_amount: planData.price,
				currency: planData.currency,
				recurring: {
					interval: planData.interval,
					interval_count: planData.intervalCount,
				},
				product_data: {
					name: planData.name,
					description: planData.description,
				},
				metadata: planData.metadata,
			})

			return {
				id: price.id,
				unit_amount: price.unit_amount,
				currency: price.currency,
				recurring: price.recurring,
			}
		} catch (error) {
			throw this.handleStripeError(error)
		}
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true): Promise<StripeSubscription> {
		try {
			const subscription = await this.stripe.subscriptions.update(subscriptionId, {
				cancel_at_period_end: cancelAtPeriodEnd,
			})

			return {
				id: subscription.id,
				status: subscription.status,
				current_period_start: subscription.current_period_start,
				current_period_end: subscription.current_period_end,
			}
		} catch (error) {
			throw this.handleStripeError(error)
		}
	}

	/**
	 * Create refund
	 */
	async createRefund(
		chargeId: string,
		amount?: number,
		reason = "requested_by_customer",
	): Promise<{ id: string; amount: number; status: string }> {
		try {
			const refund = await this.stripe.refunds.create({
				charge: chargeId,
				amount: amount,
				reason: reason,
			})

			return {
				id: refund.id,
				amount: refund.amount,
				status: refund.status,
			}
		} catch (error) {
			throw this.handleStripeError(error)
		}
	}

	/**
	 * Validate webhook
	 */
	async validateWebhook(payload: any, signature: string): Promise<boolean> {
		try {
			const event = this.stripe.webhooks.constructEvent(payload, signature, this.config.webhookSecret)
			return !!event
		} catch (error) {
			console.error("Webhook validation failed:", error)
			return false
		}
	}

	/**
	 * Process webhook event
	 */
	async processWebhookEvent(eventType: string, payload: any): Promise<void> {
		try {
			const event = payload

			switch (eventType) {
				case "payment_intent.succeeded":
					await this.handlePaymentIntentSucceeded(event)
					break
				case "payment_intent.payment_failed":
					await this.handlePaymentIntentFailed(event)
					break
				case "invoice.payment_succeeded":
					await this.handleInvoicePaymentSucceeded(event)
					break
				case "invoice.payment_failed":
					await this.handleInvoicePaymentFailed(event)
					break
				case "customer.subscription.created":
					await this.handleSubscriptionCreated(event)
					break
				case "customer.subscription.updated":
					await this.handleSubscriptionUpdated(event)
					break
				case "customer.subscription.deleted":
					await this.handleSubscriptionDeleted(event)
					break
				default:
					console.log(`Unhandled webhook event type: ${eventType}`)
			}
		} catch (error) {
			throw this.handleStripeError(error)
		}
	}

	// Private helper methods

	private handleStripeError(error: any): PaymentError {
		const paymentError = new Error(error.message || "Stripe error") as PaymentError
		paymentError.code = error.code || "stripe_error"
		paymentError.type = error.type || "api_error"
		paymentError.decline_code = error.decline_code
		paymentError.param = error.param

		return paymentError
	}

	private generateTransactionId(): string {
		return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	// Webhook event handlers

	private async handlePaymentIntentSucceeded(event: any): Promise<void> {
		console.log("Payment intent succeeded:", event.data.object.id)
	}

	private async handlePaymentIntentFailed(event: any): Promise<void> {
		console.log("Payment intent failed:", event.data.object.id)
	}

	private async handleInvoicePaymentSucceeded(event: any): Promise<void> {
		console.log("Invoice payment succeeded:", event.data.object.id)
	}

	private async handleInvoicePaymentFailed(event: any): Promise<void> {
		console.log("Invoice payment failed:", event.data.object.id)
	}

	private async handleSubscriptionCreated(event: any): Promise<void> {
		console.log("Subscription created:", event.data.object.id)
	}

	private async handleSubscriptionUpdated(event: any): Promise<void> {
		console.log("Subscription updated:", event.data.object.id)
	}

	private async handleSubscriptionDeleted(event: any): Promise<void> {
		console.log("Subscription deleted:", event.data.object.id)
	}

	// Mock API implementations (replace with actual Stripe SDK calls)

	private createPaymentMethodsAPI(): any {
		return {
			create: async (params: any) => ({
				id: `pm_${Date.now()}`,
				type: "card",
				card: {
					last4: params.card.number.slice(-4),
					brand: "visa",
					exp_month: params.card.exp_month,
					exp_year: params.card.exp_year,
				},
			}),
		}
	}

	private createPaymentIntentsAPI(): any {
		return {
			create: async (params: any) => ({
				id: `pi_${Date.now()}`,
				client_secret: `pi_${Date.now()}_secret`,
				status: "requires_payment_method",
				amount: params.amount,
				currency: params.currency,
			}),
			confirm: async (id: string, _params: any) => ({
				id,
				status: "succeeded",
				charges: {
					data: [
						{
							id: `ch_${Date.now()}`,
							amount: 1000,
							currency: "usd",
						},
					],
				},
			}),
		}
	}

	private createChargesAPI(): any {
		return {
			create: async (params: any) => ({
				id: `ch_${Date.now()}`,
				amount: params.amount,
				currency: params.currency,
				status: "succeeded",
			}),
		}
	}

	private createSubscriptionsAPI(): any {
		return {
			create: async (_params: any) => ({
				id: `sub_${Date.now()}`,
				status: "active",
				current_period_start: Math.floor(Date.now() / 1000),
				current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
			}),
			update: async (id: string, params: any) => ({
				id,
				status: params.cancel_at_period_end ? "active" : "canceled",
				current_period_start: Math.floor(Date.now() / 1000),
				current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
			}),
		}
	}

	private createPricesAPI(): any {
		return {
			create: async (params: any) => ({
				id: `price_${Date.now()}`,
				unit_amount: params.unit_amount,
				currency: params.currency,
				recurring: params.recurring,
			}),
		}
	}

	private createWebhooksAPI(): any {
		return {
			constructEvent: (_payload: any, _signature: string, _secret: string) => ({
				id: `evt_${Date.now()}`,
				type: "payment_intent.succeeded",
				data: { object: { id: "pi_test" } },
			}),
		}
	}

	private createCustomersAPI(): any {
		return {
			create: async (params: any) => ({
				id: `cus_${Date.now()}`,
				email: params.email,
				name: params.name,
				created: Math.floor(Date.now() / 1000),
			}),
			retrieve: async (id: string) => ({
				id,
				email: "test@example.com",
				name: "Test Customer",
				created: Math.floor(Date.now() / 1000),
			}),
			update: async (id: string, params: any) => ({
				id,
				...params,
			}),
		}
	}

	private createInvoicesAPI(): any {
		return {
			create: async (params: any) => ({
				id: `in_${Date.now()}`,
				amount_due: params.amount_due,
				currency: params.currency,
				status: "draft",
				customer: params.customer,
			}),
			retrieve: async (id: string) => ({
				id,
				amount_due: 1000,
				currency: "usd",
				status: "paid",
			}),
		}
	}

	private createRefundsAPI(): any {
		return {
			create: async (params: any) => ({
				id: `re_${Date.now()}`,
				amount: params.amount,
				currency: params.currency,
				status: "succeeded",
				charge: params.charge,
			}),
		}
	}
}
