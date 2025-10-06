/**
 * Unified Payment Service
 * Centralized payment processing with provider abstraction
 * Following NOORMME Marie Kondo methodology - keeping what sparks joy
 */

import { getPaymentConfig } from "../../config/payment.config"
import type {
	CreatePaymentIntentData,
	CreateSubscriptionData,
	PaymentError,
	PaymentIntent,
	PaymentMethod,
	PaymentTransaction,
	Refund,
	Subscription,
	SubscriptionPlan,
} from "../../types/payment"
import { DatabaseServiceFactory } from "../database/ServiceFactory"
import { PaymentNotificationService } from "../PaymentNotificationService"
import { PaymentValidationService } from "../PaymentValidationService"
import { PaymentProviderFactory } from "./PaymentProviderFactory"

export interface UnifiedPaymentConfig {
	providers: {
		stripe: {
			enabled: boolean
			priority: number
		}
		paypal: {
			enabled: boolean
			priority: number
		}
	}
	defaultProvider: "stripe" | "paypal"
	fallbackEnabled: boolean
	retryConfig: {
		maxRetries: number
		baseDelay: number
		maxDelay: number
		backoffMultiplier: number
	}
	monitoring: {
		enabled: boolean
		slowTransactionThreshold: number
		errorThreshold: number
	}
}

export interface PaymentMetrics {
	transactions: {
		total: number
		successful: number
		failed: number
		pending: number
	}
	providers: {
		stripe: {
			transactions: number
			successRate: number
			averageResponseTime: number
		}
		paypal: {
			transactions: number
			successRate: number
			averageResponseTime: number
		}
	}
	performance: {
		averageResponseTime: number
		slowTransactions: number
		errorRate: number
	}
}

export class UnifiedPaymentService {
	private static instance: UnifiedPaymentService
	private config: UnifiedPaymentConfig
	private providerFactory: PaymentProviderFactory
	private validationService: PaymentValidationService
	private notificationService: PaymentNotificationService
	public databaseService: any
	private metrics: PaymentMetrics

	constructor(config: UnifiedPaymentConfig) {
		this.config = config
		this.providerFactory = PaymentProviderFactory.getInstance()
		this.validationService = new PaymentValidationService()
		this.notificationService = new PaymentNotificationService()

		// Initialize database service
		const serviceFactory = DatabaseServiceFactory.getInstance()
		this.databaseService = serviceFactory.getServices().payment

		this.metrics = {
			transactions: { total: 0, successful: 0, failed: 0, pending: 0 },
			providers: {
				stripe: { transactions: 0, successRate: 0, averageResponseTime: 0 },
				paypal: { transactions: 0, successRate: 0, averageResponseTime: 0 },
			},
			performance: { averageResponseTime: 0, slowTransactions: 0, errorRate: 0 },
		}
	}

	static getInstance(config?: UnifiedPaymentConfig): UnifiedPaymentService {
		if (!UnifiedPaymentService.instance) {
			if (!config) {
				const paymentConfig = getPaymentConfig()
				config = {
					providers: {
						stripe: { enabled: paymentConfig.providers.stripe.enabled, priority: 1 },
						paypal: { enabled: paymentConfig.providers.paypal.enabled, priority: 2 },
					},
					defaultProvider: paymentConfig.defaultProvider,
					fallbackEnabled: true,
					retryConfig: {
						maxRetries: 3,
						baseDelay: 1000,
						maxDelay: 30000,
						backoffMultiplier: 2,
					},
					monitoring: {
						enabled: true,
						slowTransactionThreshold: 5000,
						errorThreshold: 10,
					},
				}
			}
			UnifiedPaymentService.instance = new UnifiedPaymentService(config)
		}
		return UnifiedPaymentService.instance
	}

	/**
	 * Initialize the unified payment service
	 */
	async initialize(): Promise<void> {
		await this.providerFactory.initialize()
		console.log("Unified Payment Service initialized successfully")
	}

	/**
	 * Create payment intent with automatic provider selection
	 */
	async createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent> {
		const startTime = Date.now()

		try {
			// Validate payment data
			await this.validationService.validatePaymentIntent(data)

			// Select best provider
			const provider = await this.selectProvider(data)

			// Create payment intent
			const paymentIntent = await provider.createPaymentIntent(data)

			// Save to database
			const savedIntent = await this.databaseService.createPaymentIntent({
				...paymentIntent,
				provider: provider.name,
			})

			// Update metrics
			this.updateMetrics(provider.name, Date.now() - startTime, true)

			// Send notification
			await this.notificationService.notifyPaymentIntentCreated(savedIntent)

			return savedIntent
		} catch (error) {
			this.updateMetrics("unknown", Date.now() - startTime, false)
			throw this.handlePaymentError(error, "Failed to create payment intent")
		}
	}

	/**
	 * Process payment with automatic retry and fallback
	 */
	async processPayment(
		paymentIntentId: string,
		paymentMethodId: string,
		provider?: "stripe" | "paypal",
	): Promise<PaymentTransaction> {
		const startTime = Date.now()

		try {
			// Get payment intent
			const paymentIntent = await this.databaseService.getPaymentIntentById(paymentIntentId)
			if (!paymentIntent) {
				throw new Error("Payment intent not found")
			}

			// Get payment method
			const paymentMethod = await this.databaseService.getPaymentMethodById(paymentMethodId)
			if (!paymentMethod) {
				throw new Error("Payment method not found")
			}

			// Select provider
			const selectedProvider = provider
				? this.providerFactory.getProvider(provider)
				: await this.selectProvider(paymentIntent)

			// Process payment with retry logic
			const transaction = await this.executeWithRetry(
				() => selectedProvider.processPayment(paymentIntent, paymentMethod),
				selectedProvider.name,
			)

			// Save transaction
			const savedTransaction = await this.databaseService.createPaymentTransaction({
				...(transaction as any),
				paymentIntentId,
				provider: selectedProvider.name,
			})

			// Update payment intent status
			await this.databaseService.updatePaymentIntentStatus(
				paymentIntentId,
				(transaction as any).status === "completed" ? "succeeded" : "failed",
			)

			// Update metrics
			this.updateMetrics(selectedProvider.name, Date.now() - startTime, true)

			// Send notifications
			await this.notificationService.notifyPaymentCompleted(savedTransaction)

			return savedTransaction
		} catch (error) {
			this.updateMetrics("unknown", Date.now() - startTime, false)
			throw this.handlePaymentError(error, "Failed to process payment")
		}
	}

	/**
	 * Create subscription with provider selection
	 */
	async createSubscription(data: CreateSubscriptionData, plan: SubscriptionPlan): Promise<Subscription> {
		const startTime = Date.now()

		try {
			// Validate subscription data
			await this.validationService.validateSubscription(data)

			// Select provider
			const provider = await this.selectProvider(data)

			// Create subscription
			const subscription = await provider.createSubscription(data, plan)

			// Save to database
			const savedSubscription = await this.databaseService.createSubscription({
				...subscription,
				provider: provider.name,
			})

			// Update metrics
			this.updateMetrics(provider.name, Date.now() - startTime, true)

			// Send notification
			await this.notificationService.notifySubscriptionCreated(savedSubscription)

			return savedSubscription
		} catch (error) {
			this.updateMetrics("unknown", Date.now() - startTime, false)
			throw this.handlePaymentError(error, "Failed to create subscription")
		}
	}

	/**
	 * Create refund with automatic provider selection
	 */
	async createRefund(transactionId: string, amount?: number, reason?: string): Promise<Refund> {
		const startTime = Date.now()

		try {
			// Get transaction
			const transaction = await this.databaseService.getPaymentTransactionById(transactionId)
			if (!transaction) {
				throw new Error("Transaction not found")
			}

			// Get provider
			const provider = this.providerFactory.getProvider(transaction.provider as "stripe" | "paypal")

			// Create refund
			const refund = await provider.createRefund(transactionId, amount, reason)

			// Save to database
			const savedRefund = await this.databaseService.createRefund({
				...(refund as any),
				transactionId,
				provider: provider.name,
			})

			// Update metrics
			this.updateMetrics(provider.name, Date.now() - startTime, true)

			// Send notification
			await this.notificationService.notifyRefundCreated(savedRefund)

			return savedRefund
		} catch (error) {
			this.updateMetrics("unknown", Date.now() - startTime, false)
			throw this.handlePaymentError(error, "Failed to create refund")
		}
	}

	/**
	 * Get payment methods for customer
	 */
	async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
		try {
			return await this.databaseService.getPaymentMethodsByCustomer(customerId)
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to get payment methods")
		}
	}

	/**
	 * Get payment metrics
	 */
	getMetrics(): PaymentMetrics {
		return { ...this.metrics }
	}

	/**
	 * Get provider health status
	 */
	async getProviderHealth(): Promise<{
		stripe: { status: "healthy" | "degraded" | "down"; responseTime: number }
		paypal: { status: "healthy" | "degraded" | "down"; responseTime: number }
	}> {
		const health = {
			stripe: { status: "healthy" as "healthy" | "degraded" | "down", responseTime: 0 },
			paypal: { status: "healthy" as "healthy" | "degraded" | "down", responseTime: 0 },
		}

		// Check Stripe health
		if (this.config.providers.stripe.enabled) {
			try {
				const startTime = Date.now()
				const stripeProvider = this.providerFactory.getProvider("stripe")
				await stripeProvider.getCustomer("health_check")
				health.stripe.responseTime = Date.now() - startTime
				health.stripe.status = health.stripe.responseTime > 2000 ? "degraded" : "healthy"
			} catch (error) {
				health.stripe.status = "down"
			}
		}

		// Check PayPal health
		if (this.config.providers.paypal.enabled) {
			try {
				const startTime = Date.now()
				const paypalProvider = this.providerFactory.getProvider("paypal")
				await paypalProvider.getCustomer("health_check")
				health.paypal.responseTime = Date.now() - startTime
				health.paypal.status = health.paypal.responseTime > 2000 ? "degraded" : "healthy"
			} catch (error) {
				health.paypal.status = "down"
			}
		}

		return health
	}

	// Private methods

	private async selectProvider(data: any): Promise<any> {
		// Simple provider selection logic - can be enhanced with ML
		const enabledProviders = Object.entries(this.config.providers)
			.filter(([_, config]) => config.enabled)
			.sort(([_, a], [__, b]) => a.priority - b.priority)

		if (enabledProviders.length === 0) {
			throw new Error("No payment providers available")
		}

		// For now, return the highest priority provider
		const [providerName] = enabledProviders[0]
		return this.providerFactory.getProvider(providerName as "stripe" | "paypal")
	}

	private async executeWithRetry<T>(operation: () => Promise<T>, providerName: string): Promise<T> {
		let lastError: any

		for (let attempt = 1; attempt <= this.config.retryConfig.maxRetries; attempt++) {
			try {
				return await operation()
			} catch (error) {
				lastError = error

				// Check if error is retryable
				const provider = this.providerFactory.getProvider(providerName as "stripe" | "paypal")
				if (!provider.isRetryableError(error) || attempt === this.config.retryConfig.maxRetries) {
					throw error
				}

				// Calculate delay with exponential backoff
				const delay = Math.min(
					this.config.retryConfig.baseDelay * this.config.retryConfig.backoffMultiplier ** (attempt - 1),
					this.config.retryConfig.maxDelay,
				)

				await new Promise((resolve) => setTimeout(resolve, delay))
			}
		}

		throw lastError
	}

	private updateMetrics(providerName: string, responseTime: number, success: boolean): void {
		this.metrics.transactions.total++

		if (success) {
			this.metrics.transactions.successful++
		} else {
			this.metrics.transactions.failed++
		}

		// Update provider-specific metrics
		if (providerName === "stripe" || providerName === "paypal") {
			const providerMetrics = this.metrics.providers[providerName]
			providerMetrics.transactions++
			providerMetrics.averageResponseTime = (providerMetrics.averageResponseTime + responseTime) / 2
			providerMetrics.successRate = (this.metrics.transactions.successful / this.metrics.transactions.total) * 100
		}

		// Update performance metrics
		this.metrics.performance.averageResponseTime = (this.metrics.performance.averageResponseTime + responseTime) / 2

		if (responseTime > this.config.monitoring.slowTransactionThreshold) {
			this.metrics.performance.slowTransactions++
		}

		this.metrics.performance.errorRate = (this.metrics.transactions.failed / this.metrics.transactions.total) * 100
	}

	private handlePaymentError(error: any, context: string): PaymentError {
		const paymentError = new Error(`${context}: ${error.message}`) as PaymentError
		paymentError.code = error.code || "PAYMENT_ERROR"
		paymentError.type = "api_error"
		paymentError.name = "PaymentError"
		paymentError.details = error.details || {}
		paymentError.timestamp = new Date()
		paymentError.retryable = error.retryable || false
		return paymentError
	}
}
