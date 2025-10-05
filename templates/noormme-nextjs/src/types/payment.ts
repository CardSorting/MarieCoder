/**
 * Payment system types and interfaces
 * Following NOORMME architecture patterns with full type safety
 */

export interface PaymentMethod {
	id: string
	type: "card" | "bank_account" | "paypal" | "apple_pay" | "google_pay"
	provider: "stripe" | "paypal" | "square" | "razorpay"
	lastFour?: string
	brand?: string
	expiryMonth?: number
	expiryYear?: number
	isDefault: boolean
	customerId: string
	createdAt: Date
	updatedAt: Date
}

export interface PaymentIntent {
	id: string
	amount: number
	currency: string
	status: "pending" | "processing" | "succeeded" | "failed" | "canceled"
	paymentMethodId?: string
	customerId: string
	description?: string
	metadata?: Record<string, string>
	createdAt: Date
	updatedAt: Date
}

export interface PaymentTransaction {
	id: string
	paymentIntentId: string
	amount: number
	currency: string
	status: "pending" | "completed" | "failed" | "refunded"
	provider: string
	providerTransactionId: string
	fees: number
	netAmount: number
	description?: string
	metadata?: Record<string, string>
	createdAt: Date
	updatedAt: Date
}

export interface Subscription {
	id: string
	customerId: string
	planId: string
	status: "active" | "inactive" | "canceled" | "past_due"
	currentPeriodStart: Date
	currentPeriodEnd: Date
	cancelAtPeriodEnd: boolean
	trialEnd?: Date
	metadata?: Record<string, string>
	createdAt: Date
	updatedAt: Date
}

export interface SubscriptionPlan {
	id: string
	name: string
	description: string
	price: number
	currency: string
	interval: "day" | "week" | "month" | "year"
	intervalCount: number
	trialPeriodDays?: number
	features: string[]
	isActive: boolean
	metadata?: Record<string, string>
	createdAt: Date
	updatedAt: Date
}

export interface SubscriptionPlanData {
	id: string
	name: string
	description: string
	price: number
	currency: string
	interval: "day" | "week" | "month" | "year"
	intervalCount: number
	trialPeriodDays?: number
	features: string[]
	isActive: boolean
	metadata?: Record<string, string>
}

export interface Invoice {
	id: string
	customerId: string
	subscriptionId?: string
	amount: number
	currency: string
	status: "draft" | "open" | "paid" | "void" | "uncollectible"
	description?: string
	dueDate?: Date
	paidAt?: Date
	items: InvoiceItem[]
	metadata?: Record<string, string>
	createdAt: Date
	updatedAt: Date
}

export interface InvoiceItem {
	id: string
	description: string
	amount: number
	quantity: number
	unitPrice: number
	metadata?: Record<string, string>
}

export interface Refund {
	id: string
	transactionId: string
	amount: number
	reason: "duplicate" | "fraudulent" | "requested_by_customer"
	status: "pending" | "succeeded" | "failed" | "canceled"
	description?: string
	metadata?: Record<string, string>
	createdAt: Date
	updatedAt: Date
}

export interface PaymentWebhook {
	id: string
	provider: string
	eventType: string
	payload: Record<string, any>
	processed: boolean
	processedAt?: Date
	createdAt: Date
}

export interface CreatePaymentIntentData {
	amount: number
	currency: string
	customerId: string
	paymentMethodId?: string
	description?: string
	metadata?: Record<string, string>
}

export interface PaymentIntentData {
	id: string
	amount: number
	currency: string
	customerId: string
	paymentMethodId?: string
	description?: string
	metadata?: Record<string, string>
}

export interface CreateSubscriptionData {
	customerId: string
	planId: string
	paymentMethodId?: string
	trialPeriodDays?: number
	metadata?: Record<string, string>
}

export interface SubscriptionData {
	id: string
	customerId: string
	planId: string
	paymentMethodId?: string
	trialPeriodDays?: number
	metadata?: Record<string, string>
}

export interface UpdatePaymentMethodData {
	type?: "card" | "bank_account" | "paypal" | "apple_pay" | "google_pay"
	isDefault?: boolean
	metadata?: Record<string, string>
}

export interface PaymentProviderConfig {
	stripe?: {
		publishableKey: string
		secretKey: string
		webhookSecret: string
	}
	paypal?: {
		clientId: string
		clientSecret: string
		environment: "sandbox" | "production"
	}
	square?: {
		applicationId: string
		accessToken: string
		environment: "sandbox" | "production"
	}
	razorpay?: {
		keyId: string
		keySecret: string
		webhookSecret: string
	}
}

export interface PaymentError extends Error {
	code: string
	type:
		| "card_error"
		| "invalid_request_error"
		| "api_connection_error"
		| "api_error"
		| "authentication_error"
		| "rate_limit_error"
	decline_code?: string
	param?: string
	message: string
}
