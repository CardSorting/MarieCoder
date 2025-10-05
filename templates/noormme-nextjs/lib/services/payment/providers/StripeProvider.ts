/**
 * Stripe Payment Provider
 * Unified implementation following IPaymentProvider interface
 * Following NOORMME provider pattern with clean abstraction
 */

// Mock Stripe types for now - replace with actual Stripe import when package is installed
interface Stripe {
	paymentMethods: {
		create(data: any): Promise<any>
		retrieve(id: string): Promise<any>
		update(id: string, data: any): Promise<any>
		detach(id: string): Promise<any>
		attach(id: string, data: any): Promise<any>
		list(params: any): Promise<{ data: any[] }>
	}
	paymentIntents: {
		create(data: any): Promise<any>
		retrieve(id: string): Promise<any>
		update(id: string, data: any): Promise<any>
		cancel(id: string): Promise<any>
		confirm(id: string, data: any): Promise<any>
	}
	subscriptions: {
		create(data: any): Promise<any>
		retrieve(id: string): Promise<any>
		update(id: string, data: any): Promise<any>
		cancel(id: string): Promise<any>
	}
	prices: {
		create(data: any): Promise<any>
		retrieve(id: string): Promise<any>
		update(id: string, data: any): Promise<any>
		list(params: any): Promise<{ data: any[] }>
	}
	refunds: {
		create(data: any): Promise<any>
		retrieve(id: string): Promise<any>
		list(params: any): Promise<{ data: any[] }>
	}
	customers: {
		create(data: any): Promise<any>
		retrieve(id: string): Promise<any>
		update(id: string, data: any): Promise<any>
		del(id: string): Promise<any>
	}
	webhooks: {
		constructEvent(payload: any, signature: string, secret: string): any
	}
}

// Mock Stripe constructor
const Stripe = class {
	constructor(apiKey: string, options: any) {
		// Mock implementation
	}
} as any

import type { IPaymentProvider } from "../../../providers/interfaces/IPaymentProvider"
import {
	ProviderPaymentIntent,
	ProviderPaymentMethod,
	ProviderRefund,
	ProviderSubscription,
	ProviderSubscriptionPlan,
	ProviderTransaction,
} from "../../../providers/interfaces/IPaymentProvider"
import type {
	CreatePaymentIntentData,
	CreateSubscriptionData,
	PaymentError,
	PaymentIntent,
	PaymentMethod,
	PaymentProviderConfig,
	SubscriptionPlan,
} from "../../../types/payment"

export class StripeProvider implements IPaymentProvider {
	readonly name = "stripe"
	config: PaymentProviderConfig
	private stripe: Stripe

	constructor() {
		this.config = {} as PaymentProviderConfig
		this.stripe = {} as Stripe
	}

	async initialize(config: PaymentProviderConfig): Promise<void> {
		this.config = config
		this.stripe = new Stripe(config.apiKey, {
			apiVersion: config.apiVersion as any,
			maxNetworkRetries: config.maxRetries,
			timeout: config.timeout,
		})
	}

	// Payment Method Operations
	async createPaymentMethod(customerId: string, paymentMethodData: any): Promise<ProviderPaymentMethod> {
		try {
			const paymentMethod = await this.stripe.paymentMethods.create({
				type: "card",
				card: paymentMethodData.card,
			})

			await this.stripe.paymentMethods.attach(paymentMethod.id, {
				customer: customerId,
			})

			return this.mapPaymentMethod(paymentMethod)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async getPaymentMethod(paymentMethodId: string): Promise<ProviderPaymentMethod> {
		try {
			const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId)
			return this.mapPaymentMethod(paymentMethod)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async updatePaymentMethod(paymentMethodId: string, data: any): Promise<ProviderPaymentMethod> {
		try {
			const paymentMethod = await this.stripe.paymentMethods.update(paymentMethodId, data)
			return this.mapPaymentMethod(paymentMethod)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
		try {
			await this.stripe.paymentMethods.detach(paymentMethodId)
			return true
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async listPaymentMethods(customerId: string): Promise<ProviderPaymentMethod[]> {
		try {
			const paymentMethods = await this.stripe.paymentMethods.list({
				customer: customerId,
				type: "card",
			})
			return paymentMethods.data.map((pm: any) => this.mapPaymentMethod(pm))
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Payment Intent Operations
	async createPaymentIntent(data: CreatePaymentIntentData): Promise<ProviderPaymentIntent> {
		try {
			const paymentIntent = await this.stripe.paymentIntents.create({
				amount: data.amount,
				currency: data.currency,
				customer: data.customerId,
				description: data.description,
				metadata: data.metadata,
			})

			return this.mapPaymentIntent(paymentIntent)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async getPaymentIntent(paymentIntentId: string): Promise<ProviderPaymentIntent> {
		try {
			const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)
			return this.mapPaymentIntent(paymentIntent)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async updatePaymentIntent(paymentIntentId: string, data: any): Promise<ProviderPaymentIntent> {
		try {
			const paymentIntent = await this.stripe.paymentIntents.update(paymentIntentId, data)
			return this.mapPaymentIntent(paymentIntent)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async cancelPaymentIntent(paymentIntentId: string): Promise<ProviderPaymentIntent> {
		try {
			const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId)
			return this.mapPaymentIntent(paymentIntent)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Payment Processing
	async processPayment(paymentIntent: PaymentIntent, paymentMethod: PaymentMethod): Promise<ProviderTransaction> {
		try {
			const confirmedPaymentIntent = await this.stripe.paymentIntents.confirm(paymentIntent.id, {
				payment_method: paymentMethod.id,
			})

			return this.mapTransaction(confirmedPaymentIntent)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async confirmPayment(paymentIntentId: string, paymentMethodId?: string): Promise<ProviderTransaction> {
		try {
			const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
				payment_method: paymentMethodId,
			})

			return this.mapTransaction(paymentIntent)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Subscription Operations
	async createSubscription(data: CreateSubscriptionData, plan: SubscriptionPlan): Promise<ProviderSubscription> {
		try {
			const subscription = await this.stripe.subscriptions.create({
				customer: data.customerId,
				items: [{ price: plan.id }],
				payment_behavior: "default_incomplete",
				payment_settings: { save_default_payment_method: "on_subscription" },
				expand: ["latest_invoice.payment_intent"],
			})

			return this.mapSubscription(subscription)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async getSubscription(subscriptionId: string): Promise<ProviderSubscription> {
		try {
			const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
			return this.mapSubscription(subscription)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async updateSubscription(subscriptionId: string, data: any): Promise<ProviderSubscription> {
		try {
			const subscription = await this.stripe.subscriptions.update(subscriptionId, data)
			return this.mapSubscription(subscription)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true): Promise<ProviderSubscription> {
		try {
			const subscription = await this.stripe.subscriptions.update(subscriptionId, {
				cancel_at_period_end: cancelAtPeriodEnd,
			})

			if (!cancelAtPeriodEnd) {
				await this.stripe.subscriptions.cancel(subscriptionId)
			}

			return this.mapSubscription(subscription)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Subscription Plan Operations
	async createSubscriptionPlan(
		planData: Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">,
	): Promise<ProviderSubscriptionPlan> {
		try {
			const price = await this.stripe.prices.create({
				unit_amount: (planData as any).amount,
				currency: planData.currency,
				recurring: { interval: planData.interval as any },
				product_data: {
					name: planData.name,
					description: planData.description,
				},
			})

			return this.mapSubscriptionPlan(price, planData)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async getSubscriptionPlan(planId: string): Promise<ProviderSubscriptionPlan> {
		try {
			const price = await this.stripe.prices.retrieve(planId)
			return this.mapSubscriptionPlan(price)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async updateSubscriptionPlan(planId: string, data: any): Promise<ProviderSubscriptionPlan> {
		try {
			// Stripe doesn't allow updating prices, so we create a new one
			const price = await this.stripe.prices.retrieve(planId)
			const updatedPrice = await this.stripe.prices.create({
				unit_amount: data.amount || price.unit_amount,
				currency: data.currency || price.currency,
				recurring: price.recurring,
				product: price.product as string,
			})

			return this.mapSubscriptionPlan(updatedPrice)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async deleteSubscriptionPlan(planId: string): Promise<boolean> {
		try {
			await this.stripe.prices.update(planId, { active: false })
			return true
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async listSubscriptionPlans(): Promise<ProviderSubscriptionPlan[]> {
		try {
			const prices = await this.stripe.prices.list({ active: true })
			return prices.data.map((price: any) => this.mapSubscriptionPlan(price))
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Refund Operations
	async createRefund(transactionId: string, amount?: number, reason?: string): Promise<ProviderRefund> {
		try {
			const refund = await this.stripe.refunds.create({
				payment_intent: transactionId,
				amount,
				reason: reason as any,
			})

			return this.mapRefund(refund)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async getRefund(refundId: string): Promise<ProviderRefund> {
		try {
			const refund = await this.stripe.refunds.retrieve(refundId)
			return this.mapRefund(refund)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async listRefunds(transactionId?: string): Promise<ProviderRefund[]> {
		try {
			const refunds = await this.stripe.refunds.list({
				payment_intent: transactionId,
			})
			return refunds.data.map((refund: any) => this.mapRefund(refund))
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Webhook Operations
	async validateWebhook(payload: any, signature: string): Promise<boolean> {
		try {
			const event = this.stripe.webhooks.constructEvent(payload, signature, this.config.webhookSecret)
			return !!event
		} catch (error) {
			return false
		}
	}

	async processWebhookEvent(eventType: string, payload: any): Promise<void> {
		// Webhook processing is handled by the webhook processors
		// This method is here for interface compliance
	}

	parseWebhookEvent(payload: any): { eventType: string; data: any } {
		return {
			eventType: payload.type,
			data: payload.data,
		}
	}

	// Customer Operations
	async createCustomer(customerData: any): Promise<{ id: string; email?: string; metadata?: Record<string, any> }> {
		try {
			const customer = await this.stripe.customers.create(customerData)
			return {
				id: customer.id,
				email: customer.email || undefined,
				metadata: customer.metadata,
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async getCustomer(customerId: string): Promise<{ id: string; email?: string; metadata?: Record<string, any> }> {
		try {
			const customer = await this.stripe.customers.retrieve(customerId)
			if (typeof customer === "string") {
				throw new Error("Customer not found")
			}
			return {
				id: customer.id,
				email: customer.email || undefined,
				metadata: customer.metadata,
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async updateCustomer(customerId: string, data: any): Promise<{ id: string; email?: string; metadata?: Record<string, any> }> {
		try {
			const customer = await this.stripe.customers.update(customerId, data)
			return {
				id: customer.id,
				email: customer.email || undefined,
				metadata: customer.metadata,
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async deleteCustomer(customerId: string): Promise<boolean> {
		try {
			await this.stripe.customers.del(customerId)
			return true
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Utility Methods
	formatAmount(amount: number, currency: string): number {
		// Stripe uses cents, so multiply by 100
		return Math.round(amount * 100)
	}

	parseAmount(amount: number, currency: string): number {
		// Convert from cents to dollars
		return amount / 100
	}

	calculateFees(amount: number, currency: string): number {
		// Stripe's standard fee: 2.9% + 30¢
		const percentage = 0.029
		const fixed = 30 // cents
		return Math.round(amount * percentage + fixed)
	}

	isAmountValid(amount: number, currency: string): boolean {
		return amount > 0 && amount <= 99999999 // Stripe's max amount
	}

	getSupportedCurrencies(): string[] {
		return ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SEK", "NOK", "DKK"]
	}

	getSupportedPaymentMethods(): string[] {
		return ["card", "bank_account", "apple_pay", "google_pay"]
	}

	// Error Handling
	handleProviderError(error: any): PaymentError {
		const paymentError = new Error(error.message || "Stripe payment error") as PaymentError
		paymentError.code = error.code || "STRIPE_ERROR"
		paymentError.type = "api_error"
		paymentError.name = "PaymentError"
		paymentError.details = error.details || {}
		paymentError.timestamp = new Date()
		paymentError.retryable = this.isRetryableError(error)
		return paymentError
	}

	isRetryableError(error: any): boolean {
		const retryableCodes = ["rate_limit_error", "api_connection_error", "api_error", "timeout_error"]
		return retryableCodes.includes(error.code)
	}

	getRetryDelay(error: any): number {
		if (error.code === "rate_limit_error") {
			return 1000 // 1 second
		}
		return 500 // 500ms for other retryable errors
	}

	// Mapping methods
	private mapPaymentMethod(paymentMethod: any): ProviderPaymentMethod {
		return {
			id: paymentMethod.id,
			type: paymentMethod.type,
			lastFour: paymentMethod.card?.last4,
			brand: paymentMethod.card?.brand,
			expiryMonth: paymentMethod.card?.exp_month,
			expiryYear: paymentMethod.card?.exp_year,
			metadata: paymentMethod.metadata,
		}
	}

	private mapPaymentIntent(paymentIntent: any): ProviderPaymentIntent {
		return {
			id: paymentIntent.id,
			clientSecret: paymentIntent.client_secret || "",
			status: paymentIntent.status,
			amount: paymentIntent.amount,
			currency: paymentIntent.currency,
			metadata: paymentIntent.metadata,
		}
	}

	private mapTransaction(paymentIntent: any): ProviderTransaction {
		const charge = paymentIntent.charges?.data[0]
		return {
			id: paymentIntent.id,
			amount: paymentIntent.amount,
			fees: charge?.balance_transaction ? 0 : 0, // Would need to fetch balance transaction for fees
			netAmount: paymentIntent.amount,
			status: paymentIntent.status === "succeeded" ? "completed" : "failed",
			metadata: paymentIntent.metadata,
		}
	}

	private mapSubscription(subscription: any): ProviderSubscription {
		return {
			id: subscription.id,
			status: subscription.status,
			currentPeriodStart: new Date(subscription.current_period_start * 1000),
			currentPeriodEnd: new Date(subscription.current_period_end * 1000),
			metadata: subscription.metadata,
		}
	}

	private mapSubscriptionPlan(price: any, planData?: any): ProviderSubscriptionPlan {
		return {
			id: price.id,
			name: planData?.name || "Subscription Plan",
			amount: price.unit_amount || 0,
			currency: price.currency,
			interval: price.recurring?.interval || "month",
			metadata: price.metadata,
		}
	}

	private mapRefund(refund: any): ProviderRefund {
		return {
			id: refund.id,
			amount: refund.amount,
			status: refund.status,
			reason: refund.reason || "requested_by_customer",
			metadata: refund.metadata,
		}
	}
}
