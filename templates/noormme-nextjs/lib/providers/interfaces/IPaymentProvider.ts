/**
 * Payment Provider Interface
 * Defines the contract that all payment providers must implement
 * Following NOORMME factory pattern with separation of concerns
 */

import type {
	CreatePaymentIntentData,
	CreateSubscriptionData,
	PaymentError,
	PaymentIntent,
	PaymentMethod,
	PaymentProviderConfig,
	SubscriptionPlan,
} from "@/types/payment"

export interface ProviderPaymentMethod {
	id: string
	type: string
	lastFour?: string
	brand?: string
	expiryMonth?: number
	expiryYear?: number
	metadata?: Record<string, any>
}

export interface ProviderPaymentIntent {
	id: string
	clientSecret: string
	status: string
	amount: number
	currency: string
	metadata?: Record<string, any>
}

export interface ProviderTransaction {
	id: string
	amount: number
	fees: number
	netAmount: number
	status: string
	metadata?: Record<string, any>
}

export interface ProviderSubscription {
	id: string
	status: string
	currentPeriodStart: Date
	currentPeriodEnd: Date
	metadata?: Record<string, any>
}

export interface ProviderSubscriptionPlan {
	id: string
	name: string
	amount: number
	currency: string
	interval: string
	metadata?: Record<string, any>
}

export interface ProviderRefund {
	id: string
	amount: number
	status: string
	reason: string
	metadata?: Record<string, any>
}

/**
 * Base interface for all payment providers
 * Each provider (Stripe, PayPal) must implement this interface
 */
export interface IPaymentProvider {
	readonly name: string
	readonly config: PaymentProviderConfig

	/**
	 * Initialize the provider with configuration
	 */
	initialize(config: PaymentProviderConfig): Promise<void>

	/**
	 * Payment Method Operations
	 */
	createPaymentMethod(customerId: string, paymentMethodData: any): Promise<ProviderPaymentMethod>
	getPaymentMethod(paymentMethodId: string): Promise<ProviderPaymentMethod>
	updatePaymentMethod(paymentMethodId: string, data: any): Promise<ProviderPaymentMethod>
	deletePaymentMethod(paymentMethodId: string): Promise<boolean>
	listPaymentMethods(customerId: string): Promise<ProviderPaymentMethod[]>

	/**
	 * Payment Intent Operations
	 */
	createPaymentIntent(data: CreatePaymentIntentData): Promise<ProviderPaymentIntent>
	getPaymentIntent(paymentIntentId: string): Promise<ProviderPaymentIntent>
	updatePaymentIntent(paymentIntentId: string, data: any): Promise<ProviderPaymentIntent>
	cancelPaymentIntent(paymentIntentId: string): Promise<ProviderPaymentIntent>

	/**
	 * Payment Processing
	 */
	processPayment(paymentIntent: PaymentIntent, paymentMethod: PaymentMethod): Promise<ProviderTransaction>
	confirmPayment(paymentIntentId: string, paymentMethodId?: string): Promise<ProviderTransaction>

	/**
	 * Subscription Operations
	 */
	createSubscription(data: CreateSubscriptionData, plan: SubscriptionPlan): Promise<ProviderSubscription>
	getSubscription(subscriptionId: string): Promise<ProviderSubscription>
	updateSubscription(subscriptionId: string, data: any): Promise<ProviderSubscription>
	cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<ProviderSubscription>

	/**
	 * Subscription Plan Operations
	 */
	createSubscriptionPlan(planData: Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">): Promise<ProviderSubscriptionPlan>
	getSubscriptionPlan(planId: string): Promise<ProviderSubscriptionPlan>
	updateSubscriptionPlan(planId: string, data: any): Promise<ProviderSubscriptionPlan>
	deleteSubscriptionPlan(planId: string): Promise<boolean>
	listSubscriptionPlans(): Promise<ProviderSubscriptionPlan[]>

	/**
	 * Refund Operations
	 */
	createRefund(transactionId: string, amount?: number, reason?: string): Promise<ProviderRefund>
	getRefund(refundId: string): Promise<ProviderRefund>
	listRefunds(transactionId?: string): Promise<ProviderRefund[]>

	/**
	 * Webhook Operations
	 */
	validateWebhook(payload: any, signature: string): Promise<boolean>
	processWebhookEvent(eventType: string, payload: any): Promise<void>
	parseWebhookEvent(payload: any): { eventType: string; data: any }

	/**
	 * Customer Operations
	 */
	createCustomer(customerData: any): Promise<{ id: string; email?: string; metadata?: Record<string, any> }>
	getCustomer(customerId: string): Promise<{ id: string; email?: string; metadata?: Record<string, any> }>
	updateCustomer(customerId: string, data: any): Promise<{ id: string; email?: string; metadata?: Record<string, any> }>
	deleteCustomer(customerId: string): Promise<boolean>

	/**
	 * Utility Methods
	 */
	formatAmount(amount: number, currency: string): number
	parseAmount(amount: number, currency: string): number
	calculateFees(amount: number, currency: string): number
	isAmountValid(amount: number, currency: string): boolean
	getSupportedCurrencies(): string[]
	getSupportedPaymentMethods(): string[]

	/**
	 * Error Handling
	 */
	handleProviderError(error: any): PaymentError
	isRetryableError(error: any): boolean
	getRetryDelay(error: any): number
}
