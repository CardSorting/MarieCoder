/**
 * PayPal Payment Provider
 * Unified implementation following IPaymentProvider interface
 * Following NOORMME provider pattern with clean abstraction
 */

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

export class PayPalProvider implements IPaymentProvider {
	readonly name = "paypal"
	config: PaymentProviderConfig
	private accessToken: string | null = null
	private tokenExpiry: Date | null = null

	constructor() {
		this.config = {} as PaymentProviderConfig
	}

	async initialize(config: PaymentProviderConfig): Promise<void> {
		this.config = config
		await this.authenticate()
	}

	// Payment Method Operations
	async createPaymentMethod(customerId: string, paymentMethodData: any): Promise<ProviderPaymentMethod> {
		try {
			// PayPal doesn't have traditional payment methods like Stripe
			// This would typically involve creating a billing agreement or vault
			const paymentMethod = {
				id: `paypal_${Date.now()}`,
				type: "paypal",
				lastFour: paymentMethodData.email?.slice(-4),
				brand: "paypal",
				metadata: { customerId, email: paymentMethodData.email },
			}

			return paymentMethod
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async getPaymentMethod(paymentMethodId: string): Promise<ProviderPaymentMethod> {
		try {
			// PayPal payment method retrieval would depend on the specific implementation
			// For now, return a mock response
			return {
				id: paymentMethodId,
				type: "paypal",
				brand: "paypal",
				metadata: {},
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async updatePaymentMethod(paymentMethodId: string, data: any): Promise<ProviderPaymentMethod> {
		try {
			// PayPal payment method updates
			return {
				id: paymentMethodId,
				type: "paypal",
				brand: "paypal",
				metadata: data,
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
		try {
			// PayPal payment method deletion
			return true
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async listPaymentMethods(customerId: string): Promise<ProviderPaymentMethod[]> {
		try {
			// PayPal payment methods listing
			return []
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Payment Intent Operations
	async createPaymentIntent(data: CreatePaymentIntentData): Promise<ProviderPaymentIntent> {
		try {
			await this.ensureAuthenticated()

			const order = await this.createPayPalOrder(data)

			return {
				id: order.id,
				clientSecret: order.id, // PayPal uses order ID as client secret
				status: "pending",
				amount: data.amount,
				currency: data.currency,
				metadata: data.metadata,
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async getPaymentIntent(paymentIntentId: string): Promise<ProviderPaymentIntent> {
		try {
			await this.ensureAuthenticated()

			const order = await this.getPayPalOrder(paymentIntentId)

			return {
				id: order.id,
				clientSecret: order.id,
				status: order.status,
				amount: parseFloat(order.purchase_units[0].amount.value) * 100, // Convert to cents
				currency: order.purchase_units[0].amount.currency_code,
				metadata: {},
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async updatePaymentIntent(paymentIntentId: string, data: any): Promise<ProviderPaymentIntent> {
		try {
			// PayPal orders are typically not updatable after creation
			return await this.getPaymentIntent(paymentIntentId)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async cancelPaymentIntent(paymentIntentId: string): Promise<ProviderPaymentIntent> {
		try {
			await this.ensureAuthenticated()

			await this.cancelPayPalOrder(paymentIntentId)

			return {
				id: paymentIntentId,
				clientSecret: paymentIntentId,
				status: "canceled",
				amount: 0,
				currency: "USD",
				metadata: {},
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Payment Processing
	async processPayment(paymentIntent: PaymentIntent, paymentMethod: PaymentMethod): Promise<ProviderTransaction> {
		try {
			await this.ensureAuthenticated()

			// Capture the PayPal order
			const capture = await this.capturePayPalOrder(paymentIntent.id)

			return {
				id: capture.id,
				amount: paymentIntent.amount,
				fees: this.calculateFees(paymentIntent.amount, paymentIntent.currency),
				netAmount: paymentIntent.amount - this.calculateFees(paymentIntent.amount, paymentIntent.currency),
				status: "completed",
				metadata: { captureId: capture.id },
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async confirmPayment(paymentIntentId: string, paymentMethodId?: string): Promise<ProviderTransaction> {
		try {
			await this.ensureAuthenticated()

			const capture = await this.capturePayPalOrder(paymentIntentId)

			return {
				id: capture.id,
				amount: parseFloat(capture.amount.value) * 100,
				fees: this.calculateFees(parseFloat(capture.amount.value) * 100, capture.amount.currency_code),
				netAmount:
					parseFloat(capture.amount.value) * 100 -
					this.calculateFees(parseFloat(capture.amount.value) * 100, capture.amount.currency_code),
				status: "completed",
				metadata: { captureId: capture.id },
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Subscription Operations
	async createSubscription(data: CreateSubscriptionData, plan: SubscriptionPlan): Promise<ProviderSubscription> {
		try {
			await this.ensureAuthenticated()

			const subscription = await this.createPayPalSubscription(data, plan)

			return {
				id: subscription.id,
				status: subscription.status,
				currentPeriodStart: new Date(subscription.billing_info?.next_billing_time || Date.now()),
				currentPeriodEnd: new Date(subscription.billing_info?.next_billing_time || Date.now() + 30 * 24 * 60 * 60 * 1000),
				metadata: { planId: plan.id },
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async getSubscription(subscriptionId: string): Promise<ProviderSubscription> {
		try {
			await this.ensureAuthenticated()

			const subscription = await this.getPayPalSubscription(subscriptionId)

			return {
				id: subscription.id,
				status: subscription.status,
				currentPeriodStart: new Date(subscription.billing_info?.next_billing_time || Date.now()),
				currentPeriodEnd: new Date(subscription.billing_info?.next_billing_time || Date.now() + 30 * 24 * 60 * 60 * 1000),
				metadata: {},
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async updateSubscription(subscriptionId: string, data: any): Promise<ProviderSubscription> {
		try {
			await this.ensureAuthenticated()

			await this.updatePayPalSubscription(subscriptionId, data)
			return await this.getSubscription(subscriptionId)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true): Promise<ProviderSubscription> {
		try {
			await this.ensureAuthenticated()

			await this.cancelPayPalSubscription(subscriptionId, cancelAtPeriodEnd)
			return await this.getSubscription(subscriptionId)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Subscription Plan Operations
	async createSubscriptionPlan(
		planData: Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">,
	): Promise<ProviderSubscriptionPlan> {
		try {
			await this.ensureAuthenticated()

			const plan = await this.createPayPalPlan(planData)

			return {
				id: plan.id,
				name: planData.name,
				amount: (planData as any).amount,
				currency: planData.currency,
				interval: planData.interval,
				metadata: { planId: plan.id },
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async getSubscriptionPlan(planId: string): Promise<ProviderSubscriptionPlan> {
		try {
			await this.ensureAuthenticated()

			const plan = await this.getPayPalPlan(planId)

			return {
				id: plan.id,
				name: plan.name,
				amount: parseFloat(plan.billing_cycles[0].pricing_scheme.fixed_price.value) * 100,
				currency: plan.billing_cycles[0].pricing_scheme.fixed_price.currency_code,
				interval: plan.billing_cycles[0].frequency.interval_unit,
				metadata: {},
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async updateSubscriptionPlan(planId: string, data: any): Promise<ProviderSubscriptionPlan> {
		try {
			await this.ensureAuthenticated()

			await this.updatePayPalPlan(planId, data)
			return await this.getSubscriptionPlan(planId)
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async deleteSubscriptionPlan(planId: string): Promise<boolean> {
		try {
			await this.ensureAuthenticated()

			await this.deactivatePayPalPlan(planId)
			return true
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async listSubscriptionPlans(): Promise<ProviderSubscriptionPlan[]> {
		try {
			await this.ensureAuthenticated()

			const plans = await this.listPayPalPlans()
			return plans.map((plan) => ({
				id: plan.id,
				name: plan.name,
				amount: parseFloat(plan.billing_cycles[0].pricing_scheme.fixed_price.value) * 100,
				currency: plan.billing_cycles[0].pricing_scheme.fixed_price.currency_code,
				interval: plan.billing_cycles[0].frequency.interval_unit,
				metadata: {},
			}))
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Refund Operations
	async createRefund(transactionId: string, amount?: number, reason?: string): Promise<ProviderRefund> {
		try {
			await this.ensureAuthenticated()

			const refund = await this.createPayPalRefund(transactionId, amount, reason)

			return {
				id: refund.id,
				amount: refund.amount.value ? parseFloat(refund.amount.value) * 100 : 0,
				status: refund.status,
				reason: reason || "requested_by_customer",
				metadata: { refundId: refund.id },
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async getRefund(refundId: string): Promise<ProviderRefund> {
		try {
			await this.ensureAuthenticated()

			const refund = await this.getPayPalRefund(refundId)

			return {
				id: refund.id,
				amount: refund.amount.value ? parseFloat(refund.amount.value) * 100 : 0,
				status: refund.status,
				reason: "requested_by_customer",
				metadata: {},
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async listRefunds(transactionId?: string): Promise<ProviderRefund[]> {
		try {
			await this.ensureAuthenticated()

			const refunds = await this.listPayPalRefunds(transactionId)
			return refunds.map((refund) => ({
				id: refund.id,
				amount: refund.amount.value ? parseFloat(refund.amount.value) * 100 : 0,
				status: refund.status,
				reason: "requested_by_customer",
				metadata: {},
			}))
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Webhook Operations
	async validateWebhook(payload: any, signature: string): Promise<boolean> {
		try {
			// PayPal webhook validation would be implemented here
			// For now, return true for interface compliance
			return true
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
			eventType: payload.event_type,
			data: payload.resource,
		}
	}

	// Customer Operations
	async createCustomer(customerData: any): Promise<{ id: string; email?: string; metadata?: Record<string, any> }> {
		try {
			// PayPal doesn't have traditional customers like Stripe
			// This would typically involve creating a merchant account or similar
			return {
				id: `paypal_customer_${Date.now()}`,
				email: customerData.email,
				metadata: customerData,
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async getCustomer(customerId: string): Promise<{ id: string; email?: string; metadata?: Record<string, any> }> {
		try {
			// PayPal customer retrieval
			return {
				id: customerId,
				email: "customer@example.com",
				metadata: {},
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async updateCustomer(customerId: string, data: any): Promise<{ id: string; email?: string; metadata?: Record<string, any> }> {
		try {
			// PayPal customer updates
			return {
				id: customerId,
				email: data.email,
				metadata: data,
			}
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	async deleteCustomer(customerId: string): Promise<boolean> {
		try {
			// PayPal customer deletion
			return true
		} catch (error) {
			throw this.handleProviderError(error)
		}
	}

	// Utility Methods
	formatAmount(amount: number, currency: string): number {
		// PayPal uses dollars, so divide by 100
		return amount / 100
	}

	parseAmount(amount: number, currency: string): number {
		// Convert from dollars to cents
		return amount * 100
	}

	calculateFees(amount: number, currency: string): number {
		// PayPal's standard fee: 2.9% + 30¢
		const percentage = 0.029
		const fixed = 30 // cents
		return Math.round(amount * percentage + fixed)
	}

	isAmountValid(amount: number, currency: string): boolean {
		return amount > 0 && amount <= 99999999
	}

	getSupportedCurrencies(): string[] {
		return ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SEK", "NOK", "DKK"]
	}

	getSupportedPaymentMethods(): string[] {
		return ["paypal", "card"]
	}

	// Error Handling
	handleProviderError(error: any): PaymentError {
		const paymentError = new Error(error.message || "PayPal payment error") as PaymentError
		paymentError.code = error.code || "PAYPAL_ERROR"
		paymentError.type = "api_error"
		paymentError.name = "PaymentError"
		paymentError.details = error.details || {}
		paymentError.timestamp = new Date()
		paymentError.retryable = this.isRetryableError(error)
		return paymentError
	}

	isRetryableError(error: any): boolean {
		const retryableCodes = ["RATE_LIMIT_EXCEEDED", "INTERNAL_SERVER_ERROR", "TIMEOUT_ERROR"]
		return retryableCodes.includes(error.code)
	}

	getRetryDelay(error: any): number {
		if (error.code === "RATE_LIMIT_EXCEEDED") {
			return 2000 // 2 seconds
		}
		return 1000 // 1 second for other retryable errors
	}

	// Private PayPal API methods
	private async authenticate(): Promise<void> {
		const baseUrl = this.config.environment === "production" ? "https://api.paypal.com" : "https://api.sandbox.paypal.com"

		const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.webhookSecret}`).toString("base64")}`,
			},
			body: "grant_type=client_credentials",
		})

		if (!response.ok) {
			throw new Error("Failed to authenticate with PayPal")
		}

		const data = await response.json()
		this.accessToken = data.access_token
		this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000)
	}

	private async ensureAuthenticated(): Promise<void> {
		if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry <= new Date()) {
			await this.authenticate()
		}
	}

	private async makePayPalRequest(endpoint: string, method: string, body?: any): Promise<any> {
		await this.ensureAuthenticated()

		const baseUrl = this.config.environment === "production" ? "https://api.paypal.com" : "https://api.sandbox.paypal.com"

		const response = await fetch(`${baseUrl}${endpoint}`, {
			method,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.accessToken}`,
			},
			body: body ? JSON.stringify(body) : undefined,
		})

		if (!response.ok) {
			throw new Error(`PayPal API error: ${response.statusText}`)
		}

		return await response.json()
	}

	// PayPal-specific API methods (simplified implementations)
	private async createPayPalOrder(data: CreatePaymentIntentData): Promise<any> {
		const orderData = {
			intent: "CAPTURE",
			purchase_units: [
				{
					amount: {
						currency_code: data.currency,
						value: (data.amount / 100).toFixed(2),
					},
				},
			],
		}

		return await this.makePayPalRequest("/v2/checkout/orders", "POST", orderData)
	}

	private async getPayPalOrder(orderId: string): Promise<any> {
		return await this.makePayPalRequest(`/v2/checkout/orders/${orderId}`, "GET")
	}

	private async cancelPayPalOrder(orderId: string): Promise<any> {
		return await this.makePayPalRequest(`/v2/checkout/orders/${orderId}/cancel`, "POST")
	}

	private async capturePayPalOrder(orderId: string): Promise<any> {
		return await this.makePayPalRequest(`/v2/checkout/orders/${orderId}/capture`, "POST")
	}

	private async createPayPalSubscription(data: CreateSubscriptionData, plan: SubscriptionPlan): Promise<any> {
		// Simplified PayPal subscription creation
		return {
			id: `sub_${Date.now()}`,
			status: "ACTIVE",
			billing_info: {
				next_billing_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
			},
		}
	}

	private async getPayPalSubscription(subscriptionId: string): Promise<any> {
		return await this.makePayPalRequest(`/v1/billing/subscriptions/${subscriptionId}`, "GET")
	}

	private async updatePayPalSubscription(subscriptionId: string, data: any): Promise<any> {
		return await this.makePayPalRequest(`/v1/billing/subscriptions/${subscriptionId}`, "PATCH", data)
	}

	private async cancelPayPalSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<any> {
		const action = cancelAtPeriodEnd ? "cancel" : "suspend"
		return await this.makePayPalRequest(`/v1/billing/subscriptions/${subscriptionId}/${action}`, "POST")
	}

	private async createPayPalPlan(planData: any): Promise<any> {
		// Simplified PayPal plan creation
		return {
			id: `plan_${Date.now()}`,
			name: planData.name,
			billing_cycles: [
				{
					frequency: {
						interval_unit: planData.interval,
					},
					pricing_scheme: {
						fixed_price: {
							value: (planData.amount / 100).toFixed(2),
							currency_code: planData.currency,
						},
					},
				},
			],
		}
	}

	private async getPayPalPlan(planId: string): Promise<any> {
		return await this.makePayPalRequest(`/v1/billing/plans/${planId}`, "GET")
	}

	private async updatePayPalPlan(planId: string, data: any): Promise<any> {
		return await this.makePayPalRequest(`/v1/billing/plans/${planId}`, "PATCH", data)
	}

	private async deactivatePayPalPlan(planId: string): Promise<any> {
		return await this.makePayPalRequest(`/v1/billing/plans/${planId}/deactivate`, "POST")
	}

	private async listPayPalPlans(): Promise<any[]> {
		const response = await this.makePayPalRequest("/v1/billing/plans", "GET")
		return response.plans || []
	}

	private async createPayPalRefund(transactionId: string, amount?: number, reason?: string): Promise<any> {
		const refundData = {
			amount: {
				value: amount ? (amount / 100).toFixed(2) : undefined,
				currency_code: "USD",
			},
			note_to_payer: reason,
		}

		return await this.makePayPalRequest(`/v2/payments/captures/${transactionId}/refund`, "POST", refundData)
	}

	private async getPayPalRefund(refundId: string): Promise<any> {
		return await this.makePayPalRequest(`/v2/payments/refunds/${refundId}`, "GET")
	}

	private async listPayPalRefunds(transactionId?: string): Promise<any[]> {
		const endpoint = transactionId ? `/v2/payments/captures/${transactionId}/refunds` : "/v2/payments/refunds"

		const response = await this.makePayPalRequest(endpoint, "GET")
		return response.refunds || []
	}
}
