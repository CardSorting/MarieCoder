/**
 * PayPal Payment Service
 * Specialized service for PayPal payment processing
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

export interface PayPalConfig {
	clientId: string
	clientSecret: string
	webhookId: string
	environment: "sandbox" | "production"
}

export interface PayPalPaymentMethod {
	id: string
	type: string
	lastFour?: string
	brand?: string
	expiryMonth?: number
	expiryYear?: number
	payer_id: string
	email?: string
}

export interface PayPalOrder {
	id: string
	status: string
	amount: {
		total: string
		currency: string
	}
	links: Array<{
		href: string
		rel: string
		method: string
	}>
}

export interface PayPalCapture {
	id: string
	status: string
	amount: {
		total: string
		currency: string
	}
	seller_receivable_breakdown: {
		gross_amount: {
			value: string
			currency_code: string
		}
		paypal_fee: {
			value: string
			currency_code: string
		}
		net_amount: {
			value: string
			currency_code: string
		}
	}
}

export interface PayPalSubscription {
	id: string
	status: string
	billing_info: {
		next_billing_time: string
		last_payment: {
			amount: {
				value: string
				currency_code: string
			}
		}
	}
}

export interface PayPalProduct {
	id: string
	name: string
	description: string
	type: string
}

export interface PayPalPlan {
	id: string
	product_id: string
	name: string
	status: string
	billing_cycles: Array<{
		frequency: {
			interval_unit: string
			interval_count: number
		}
		pricing_scheme: {
			fixed_price: {
				value: string
				currency_code: string
			}
		}
	}>
}

export class PayPalService {
	private config: PayPalConfig
	private paypal: any // PayPal SDK instance
	private accessToken: string | null = null
	private tokenExpiry: number = 0

	constructor() {
		const paymentConfig = getPaymentConfig()
		this.config = paymentConfig.providers.paypal

		if (!this.config.clientId) {
			throw new Error("PayPal client ID is not configured")
		}

		// Initialize PayPal asynchronously
		this.initializePayPal().catch((error) => {
			console.error("Failed to initialize PayPal:", error)
		})
	}

	/**
	 * Initialize PayPal SDK
	 */
	private async initializePayPal(): Promise<void> {
		try {
			// Import PayPal SDK dynamically
			const paypal = await import("@paypal/checkout-server-sdk")

			const environment =
				this.config.environment === "production"
					? new paypal.core.LiveEnvironment(this.config.clientId, this.config.clientSecret)
					: new paypal.core.SandboxEnvironment(this.config.clientId, this.config.clientSecret)

			this.paypal = new paypal.core.PayPalHttpClient(environment)
		} catch (error) {
			// Fallback to mock implementation if PayPal SDK is not available
			console.warn("PayPal SDK not available, using mock implementation:", error)
			this.paypal = {
				orders: this.createOrdersAPI(),
				subscriptions: this.createSubscriptionsAPI(),
				products: this.createProductsAPI(),
				plans: this.createPlansAPI(),
				webhooks: this.createWebhooksAPI(),
			}
		}
	}

	/**
	 * Ensure PayPal is initialized before use
	 */
	private async ensureInitialized(): Promise<void> {
		if (!this.paypal) {
			await this.initializePayPal()
		}
	}

	/**
	 * Get access token for API calls
	 */
	private async getAccessToken(): Promise<string> {
		if (this.accessToken && Date.now() < this.tokenExpiry) {
			return this.accessToken
		}

		try {
			// In a real implementation, this would make an OAuth request to PayPal
			const response = await this.makePayPalRequest(
				"/v1/oauth2/token",
				"POST",
				{
					grant_type: "client_credentials",
				},
				{
					Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`,
					"Content-Type": "application/x-www-form-urlencoded",
				},
			)

			this.accessToken = response.access_token || ""
			this.tokenExpiry = Date.now() + (response.expires_in || 3600) * 1000 - 60000 // 1 minute buffer

			return this.accessToken || ""
		} catch (error) {
			throw this.handlePayPalError(error)
		}
	}

	/**
	 * Create payment method (PayPal account)
	 */
	async createPaymentMethod(_customerId: string, paymentMethodData: any): Promise<PayPalPaymentMethod> {
		try {
			// PayPal doesn't have traditional payment methods like cards
			// Instead, we store the PayPal account information
			return {
				id: `pm_paypal_${Date.now()}`,
				type: "paypal",
				lastFour: undefined,
				brand: "paypal",
				expiryMonth: undefined,
				expiryYear: undefined,
				payer_id: paymentMethodData.payerId,
				email: paymentMethodData.email,
			}
		} catch (error) {
			throw this.handlePayPalError(error)
		}
	}

	/**
	 * Create payment intent (PayPal order)
	 */
	async createPaymentIntent(data: CreatePaymentIntentData): Promise<PayPalOrder> {
		try {
			await this.ensureInitialized()

			// Create order request
			const orderRequest = {
				intent: "CAPTURE",
				purchase_units: [
					{
						amount: {
							currency_code: data.currency.toUpperCase(),
							value: (data.amount / 100).toFixed(2),
						},
						description: data.description,
						custom_id: data.customerId,
					},
				],
				application_context: {
					return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
					cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
					brand_name: process.env.NEXT_PUBLIC_APP_NAME || "Your App",
					landing_page: "BILLING",
					user_action: "PAY_NOW",
				},
			}

			// Create order using PayPal SDK
			const request = new (await import("@paypal/checkout-server-sdk")).orders.OrdersCreateRequest()
			request.prefer("return=representation")
			request.requestBody(orderRequest)

			const order = await this.paypal.execute(request)

			return {
				id: order.result.id,
				status: order.result.status,
				amount: {
					total: (data.amount / 100).toFixed(2),
					currency: data.currency,
				},
				links: order.result.links,
			}
		} catch (error) {
			throw this.handlePayPalError(error)
		}
	}

	/**
	 * Process payment (capture PayPal order)
	 */
	async processPayment(paymentIntent: PaymentIntent, _paymentMethod: PaymentMethod): Promise<PaymentTransaction> {
		try {
			await this.ensureInitialized()

			// Capture the PayPal order
			const captureRequest = new (await import("@paypal/checkout-server-sdk")).orders.OrdersCaptureRequest(paymentIntent.id)
			captureRequest.prefer("return=representation")
			captureRequest.requestBody({})

			const capture = await this.paypal.execute(captureRequest)

			if (capture.result.status !== "COMPLETED") {
				throw new Error(`Payment failed with status: ${capture.result.status}`)
			}

			const fees = calculateFees(paymentIntent.amount, "paypal", paymentIntent.currency)

			return {
				id: this.generateTransactionId(),
				paymentIntentId: paymentIntent.id,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
				status: "completed",
				provider: "paypal",
				providerTransactionId: capture.result.id,
				fees: fees.fee,
				netAmount: fees.netAmount,
				description: paymentIntent.description,
				metadata: paymentIntent.metadata,
				createdAt: new Date(),
				updatedAt: new Date(),
			}
		} catch (error) {
			throw this.handlePayPalError(error)
		}
	}

	/**
	 * Create subscription
	 */
	async createSubscription(data: CreateSubscriptionData, plan: SubscriptionPlan): Promise<PayPalSubscription> {
		try {
			const _accessToken = await this.getAccessToken()

			const subscription = await this.paypal.subscriptions.create({
				plan_id: plan.id,
				subscriber: {
					payer_id: data.customerId,
				},
				application_context: {
					return_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`,
					cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/cancel`,
				},
			})

			return {
				id: subscription.id,
				status: subscription.status,
				billing_info: {
					next_billing_time: subscription.billing_info.next_billing_time,
					last_payment: subscription.billing_info.last_payment,
				},
			}
		} catch (error) {
			throw this.handlePayPalError(error)
		}
	}

	/**
	 * Create subscription plan
	 */
	async createSubscriptionPlan(planData: Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">): Promise<PayPalPlan> {
		try {
			const _accessToken = await this.getAccessToken()

			// First create a product
			const product = await this.paypal.products.create({
				name: planData.name,
				description: planData.description,
				type: "SERVICE",
			})

			// Then create a plan
			const plan = await this.paypal.plans.create({
				product_id: product.id,
				name: planData.name,
				status: "ACTIVE",
				billing_cycles: [
					{
						frequency: {
							interval_unit: planData.interval.toUpperCase(),
							interval_count: planData.intervalCount,
						},
						tenure_type: "REGULAR",
						sequence: 1,
						total_cycles: 0, // 0 means infinite
						pricing_scheme: {
							fixed_price: {
								value: (planData.price / 100).toFixed(2),
								currency_code: planData.currency,
							},
						},
					},
				],
			})

			return {
				id: plan.id,
				product_id: product.id,
				name: plan.name,
				status: plan.status,
				billing_cycles: plan.billing_cycles,
			}
		} catch (error) {
			throw this.handlePayPalError(error)
		}
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true): Promise<PayPalSubscription> {
		try {
			const _accessToken = await this.getAccessToken()

			if (cancelAtPeriodEnd) {
				// PayPal doesn't have a direct "cancel at period end" option
				// We would need to implement this logic in our system
				const subscription = await this.paypal.subscriptions.get(subscriptionId)
				return subscription
			} else {
				// Cancel immediately
				await this.paypal.subscriptions.cancel(subscriptionId, {
					reason: "Cancelled by user",
				})

				const subscription = await this.paypal.subscriptions.get(subscriptionId)
				return subscription
			}
		} catch (error) {
			throw this.handlePayPalError(error)
		}
	}

	/**
	 * Create refund
	 */
	async createRefund(
		captureId: string,
		amount?: number,
		reason = "requested_by_customer",
	): Promise<{ id: string; amount: number; status: string }> {
		try {
			const _accessToken = await this.getAccessToken()

			const refund = await this.paypal.captures.refund(captureId, {
				amount: {
					value: amount ? (amount / 100).toFixed(2) : undefined,
					currency_code: "USD",
				},
				note_to_payer: reason,
			})

			return {
				id: refund.id,
				amount: Math.round(parseFloat(refund.amount.value) * 100),
				status: refund.status,
			}
		} catch (error) {
			throw this.handlePayPalError(error)
		}
	}

	/**
	 * Validate webhook
	 */
	async validateWebhook(payload: any, _signature: string): Promise<boolean> {
		try {
			const _accessToken = await this.getAccessToken()

			// In a real implementation, this would verify the webhook signature
			// For now, we'll do a simple validation
			return payload && payload.event_type && payload.resource
		} catch (error) {
			console.error("Webhook validation failed:", error)
			return false
		}
	}

	/**
	 * Delete payment method
	 */
	async deletePaymentMethod(_paymentMethodId: string): Promise<boolean> {
		try {
			// PayPal doesn't have a direct delete method for payment methods
			// In a real implementation, this would remove the stored payment method
			return true
		} catch (error) {
			throw this.handlePayPalError(error)
		}
	}

	/**
	 * Process webhook event
	 */
	async processWebhookEvent(eventType: string, payload: any): Promise<void> {
		try {
			switch (eventType) {
				case "CHECKOUT.ORDER.APPROVED":
					await this.handleOrderApproved(payload)
					break
				case "CHECKOUT.ORDER.COMPLETED":
					await this.handleOrderCompleted(payload)
					break
				case "PAYMENT.CAPTURE.COMPLETED":
					await this.handleCaptureCompleted(payload)
					break
				case "PAYMENT.CAPTURE.DENIED":
					await this.handleCaptureDenied(payload)
					break
				case "BILLING.SUBSCRIPTION.CREATED":
					await this.handleSubscriptionCreated(payload)
					break
				case "BILLING.SUBSCRIPTION.ACTIVATED":
					await this.handleSubscriptionActivated(payload)
					break
				case "BILLING.SUBSCRIPTION.CANCELLED":
					await this.handleSubscriptionCancelled(payload)
					break
				default:
					console.log(`Unhandled webhook event type: ${eventType}`)
			}
		} catch (error) {
			throw this.handlePayPalError(error)
		}
	}

	// Private helper methods

	private async makePayPalRequest(
		endpoint: string,
		_method: string,
		_data?: any,
		_headers?: Record<string, string>,
	): Promise<any> {
		const baseUrl = this.config.environment === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"

		const _url = `${baseUrl}${endpoint}`

		// In a real implementation, this would make an actual HTTP request
		// For now, we'll return mock data
		return {
			access_token: "mock_access_token",
			expires_in: 3600,
		}
	}

	private handlePayPalError(error: any): PaymentError {
		const paymentError = new Error(error.message || "PayPal error") as PaymentError
		paymentError.code = error.code || "paypal_error"
		paymentError.type = error.type || "api_error"
		paymentError.message = error.message || "PayPal API error"

		return paymentError
	}

	private generateTransactionId(): string {
		return `txn_paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	// Webhook event handlers

	private async handleOrderApproved(event: any): Promise<void> {
		console.log("PayPal order approved:", event.resource.id)
	}

	private async handleOrderCompleted(event: any): Promise<void> {
		console.log("PayPal order completed:", event.resource.id)
	}

	private async handleCaptureCompleted(event: any): Promise<void> {
		console.log("PayPal capture completed:", event.resource.id)
	}

	private async handleCaptureDenied(event: any): Promise<void> {
		console.log("PayPal capture denied:", event.resource.id)
	}

	private async handleSubscriptionCreated(event: any): Promise<void> {
		console.log("PayPal subscription created:", event.resource.id)
	}

	private async handleSubscriptionActivated(event: any): Promise<void> {
		console.log("PayPal subscription activated:", event.resource.id)
	}

	private async handleSubscriptionCancelled(event: any): Promise<void> {
		console.log("PayPal subscription cancelled:", event.resource.id)
	}

	// Mock API implementations (replace with actual PayPal SDK calls)

	private createOrdersAPI(): any {
		return {
			create: async (_params: any) => ({
				id: `order_${Date.now()}`,
				status: "CREATED",
				links: [
					{
						href: `https://www.sandbox.paypal.com/checkoutnow?token=${Date.now()}`,
						rel: "approve",
						method: "GET",
					},
				],
			}),
			capture: async (_id: string) => ({
				id: `capture_${Date.now()}`,
				status: "COMPLETED",
				amount: {
					total: "10.00",
					currency: "USD",
				},
				seller_receivable_breakdown: {
					gross_amount: { value: "10.00", currency_code: "USD" },
					paypal_fee: { value: "0.59", currency_code: "USD" },
					net_amount: { value: "9.41", currency_code: "USD" },
				},
			}),
		}
	}

	private createSubscriptionsAPI(): any {
		return {
			create: async (_params: any) => ({
				id: `sub_${Date.now()}`,
				status: "APPROVAL_PENDING",
				links: [
					{
						href: `https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=${Date.now()}`,
						rel: "approve",
						method: "GET",
					},
				],
			}),
			get: async (id: string) => ({
				id,
				status: "ACTIVE",
				billing_info: {
					next_billing_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
					last_payment: {
						amount: { value: "10.00", currency_code: "USD" },
					},
				},
			}),
			cancel: async (id: string, _params: any) => ({
				id,
				status: "CANCELLED",
			}),
		}
	}

	private createProductsAPI(): any {
		return {
			create: async (params: any) => ({
				id: `prod_${Date.now()}`,
				name: params.name,
				description: params.description,
				type: params.type,
			}),
		}
	}

	private createPlansAPI(): any {
		return {
			create: async (params: any) => ({
				id: `plan_${Date.now()}`,
				product_id: params.product_id,
				name: params.name,
				status: params.status,
				billing_cycles: params.billing_cycles,
			}),
		}
	}

	private createWebhooksAPI(): any {
		return {
			verify: async (_payload: any, _signature: string, _webhookId: string) => {
				return true // Mock validation
			},
		}
	}
}
