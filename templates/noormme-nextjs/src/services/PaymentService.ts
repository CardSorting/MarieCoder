import { getPaymentConfig } from "@/config/payment.config"
import { PaymentRepository } from "@/repositories/PaymentRepository"
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
} from "@/types/payment"
import { BaseService } from "./BaseService"
import { PaymentNotificationService } from "./PaymentNotificationService"
import { PaymentValidationService } from "./PaymentValidationService"
import { PayPalService } from "./PayPalService"
import { StripeService } from "./StripeService"

/**
 * Payment Service - Main business logic for payment operations
 * Following NOORMME service layer pattern with comprehensive functionality
 */
export class PaymentService extends BaseService<any> {
	private static instance: PaymentService
	private paymentRepository: PaymentRepository
	private stripeService: StripeService
	private paypalService: PayPalService
	private validationService: PaymentValidationService
	private notificationService: PaymentNotificationService
	private config: any

	static async getInstance(): Promise<PaymentService> {
		if (!PaymentService.instance) {
			const db = await PaymentService.getDB()
			const paymentRepo = new PaymentRepository(db)
			const stripeService = new StripeService()
			const paypalService = new PayPalService()
			const validationService = new PaymentValidationService()
			const notificationService = new PaymentNotificationService()
			const config = getPaymentConfig()

			PaymentService.instance = new PaymentService(
				paymentRepo,
				db,
				stripeService,
				paypalService,
				validationService,
				notificationService,
				config,
			)
		}
		return PaymentService.instance
	}

	constructor(
		repository: PaymentRepository,
		db: any,
		stripeService: StripeService,
		paypalService: PayPalService,
		validationService: PaymentValidationService,
		notificationService: PaymentNotificationService,
		config: any,
	) {
		super(repository, db)
		this.paymentRepository = repository
		this.stripeService = stripeService
		this.paypalService = paypalService
		this.validationService = validationService
		this.notificationService = notificationService
		this.config = config
	}

	// Payment Methods
	async createPaymentMethod(customerId: string, paymentMethodData: any): Promise<PaymentMethod> {
		try {
			// Validate payment method data
			await this.validationService.validatePaymentMethod(paymentMethodData)

			// Create payment method with provider
			const providerService = this.getProviderService(paymentMethodData.provider)
			const providerMethod = await providerService.createPaymentMethod(customerId, paymentMethodData)

			// Save to database
			const paymentMethod = await this.paymentRepository.createPaymentMethod({
				type: paymentMethodData.type,
				provider: paymentMethodData.provider,
				lastFour: providerMethod.lastFour,
				brand: providerMethod.brand,
				expiryMonth: providerMethod.expiryMonth,
				expiryYear: providerMethod.expiryYear,
				isDefault: false,
				customerId: customerId,
			})

			// Set as default if it's the first payment method
			const existingMethods = await this.paymentRepository.getPaymentMethodsByCustomer(customerId)
			if (existingMethods.length === 0) {
				await this.setDefaultPaymentMethod(paymentMethod.id)
			}

			await this.notificationService.notifyPaymentMethodCreated(paymentMethod)

			return paymentMethod
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to create payment method")
		}
	}

	async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
		try {
			return await this.paymentRepository.getPaymentMethodsByCustomer(customerId)
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to get payment methods")
		}
	}

	async setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
		try {
			const paymentMethod = await this.paymentRepository.getPaymentMethodById(paymentMethodId)
			if (!paymentMethod) {
				throw new Error("Payment method not found")
			}

			// Remove default flag from other payment methods
			const allMethods = await this.paymentRepository.getPaymentMethodsByCustomer(paymentMethod.customerId)
			for (const method of allMethods) {
				if (method.id !== paymentMethodId && method.isDefault) {
					await this.paymentRepository.updatePaymentMethod(method.id, { isDefault: false })
				}
			}

			// Set this payment method as default
			return await this.paymentRepository.updatePaymentMethod(paymentMethodId, { isDefault: true })
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to set default payment method")
		}
	}

	async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
		try {
			const paymentMethod = await this.paymentRepository.getPaymentMethodById(paymentMethodId)
			if (!paymentMethod) {
				throw new Error("Payment method not found")
			}

			// Delete from provider
			const providerService = this.getProviderService(paymentMethod.provider)
			await providerService.deletePaymentMethod(paymentMethodId)

			// Delete from database
			const deleted = await this.paymentRepository.deletePaymentMethod(paymentMethodId)

			if (deleted) {
				await this.notificationService.notifyPaymentMethodDeleted(paymentMethod)
			}

			return deleted
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to delete payment method")
		}
	}

	// Payment Intents
	async createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent> {
		try {
			// Validate payment intent data
			await this.validationService.validatePaymentIntent(data)

			// Create payment intent with provider
			const providerService = this.getProviderService(this.config.defaultProvider)
			const providerIntent = await providerService.createPaymentIntent(data)

			// Save to database
			const paymentIntent = await this.paymentRepository.createPaymentIntent({
				id: providerIntent.id,
				amount: data.amount,
				currency: data.currency,
				customerId: data.customerId,
				paymentMethodId: data.paymentMethodId,
				description: data.description,
				metadata: data.metadata,
			})

			await this.notificationService.notifyPaymentIntentCreated(paymentIntent)

			return paymentIntent
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to create payment intent")
		}
	}

	async processPayment(paymentIntentId: string, paymentMethodId?: string): Promise<PaymentTransaction> {
		try {
			const paymentIntent = await this.paymentRepository.getPaymentIntentById(paymentIntentId)
			if (!paymentIntent) {
				throw new Error("Payment intent not found")
			}

			if (paymentIntent.status !== "pending") {
				throw new Error("Payment intent is not in pending status")
			}

			// Get payment method
			let paymentMethod: PaymentMethod | null = null
			if (paymentMethodId) {
				paymentMethod = await this.paymentRepository.getPaymentMethodById(paymentMethodId)
			} else {
				// Use default payment method
				const methods = await this.paymentRepository.getPaymentMethodsByCustomer(paymentIntent.customerId)
				paymentMethod = methods.find((m) => m.isDefault) || null
			}

			if (!paymentMethod) {
				throw new Error("No payment method available")
			}

			// Process payment with provider
			const providerService = this.getProviderService(paymentMethod.provider)
			const providerTransaction = await providerService.processPayment(paymentIntent, paymentMethod)

			// Update payment intent status
			await this.paymentRepository.updatePaymentIntentStatus(paymentIntentId, "succeeded")

			// Create payment transaction record
			const transaction = await this.paymentRepository.createPaymentTransaction({
				paymentIntentId,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
				status: "completed",
				provider: paymentMethod.provider,
				providerTransactionId: providerTransaction.id,
				fees: providerTransaction.fees,
				netAmount: providerTransaction.netAmount,
				description: paymentIntent.description,
			})

			await this.notificationService.notifyPaymentCompleted(transaction)

			return transaction
		} catch (error) {
			// Update payment intent status to failed
			await this.paymentRepository.updatePaymentIntentStatus(paymentIntentId, "failed")
			throw this.handlePaymentError(error, "Failed to process payment")
		}
	}

	async getPaymentHistory(customerId: string, limit = 50, offset = 0): Promise<PaymentIntent[]> {
		try {
			return await this.paymentRepository.getPaymentIntentsByCustomer(customerId, limit, offset)
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to get payment history")
		}
	}

	// Subscriptions
	async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
		try {
			// Validate subscription data
			await this.validationService.validateSubscription(data)

			// Get subscription plan
			const plan = await this.paymentRepository.getSubscriptionPlanById(data.planId)
			if (!plan) {
				throw new Error("Subscription plan not found")
			}

			// Create subscription with provider
			const providerService = this.getProviderService(this.config.defaultProvider)
			const providerSubscription = await providerService.createSubscription(data, plan)

			// Save to database
			const subscription = await this.paymentRepository.createSubscription({
				id: providerSubscription.id,
				customerId: data.customerId,
				planId: data.planId,
				paymentMethodId: data.paymentMethodId,
				trialPeriodDays: data.trialPeriodDays,
				metadata: data.metadata,
			})

			await this.notificationService.notifySubscriptionCreated(subscription)

			return subscription
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to create subscription")
		}
	}

	async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true): Promise<Subscription> {
		try {
			const subscription = await this.paymentRepository.getSubscriptionById(subscriptionId)
			if (!subscription) {
				throw new Error("Subscription not found")
			}

			// Cancel with provider
			const providerService = this.getProviderService(this.config.defaultProvider)
			await providerService.cancelSubscription(subscriptionId, cancelAtPeriodEnd)

			// Update subscription status
			const updatedSubscription = await this.paymentRepository.updateSubscriptionStatus(
				subscriptionId,
				cancelAtPeriodEnd ? "active" : "canceled",
			)

			await this.notificationService.notifySubscriptionCanceled(updatedSubscription)

			return updatedSubscription
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to cancel subscription")
		}
	}

	async getActiveSubscriptions(customerId: string): Promise<Subscription[]> {
		try {
			const subscriptions = await this.paymentRepository.getSubscriptionsByCustomer(customerId)
			return subscriptions.filter((sub) => sub.status === "active")
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to get active subscriptions")
		}
	}

	// Subscription Plans
	async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
		try {
			return await this.paymentRepository.getActiveSubscriptionPlans()
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to get subscription plans")
		}
	}

	async createSubscriptionPlan(planData: Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">): Promise<SubscriptionPlan> {
		try {
			// Validate plan data
			await this.validationService.validateSubscriptionPlan(planData)

			// Create plan with provider
			const providerService = this.getProviderService(this.config.defaultProvider)
			const providerPlan = await providerService.createSubscriptionPlan(planData)

			// Save to database
			const plan = await this.paymentRepository.createSubscriptionPlan({
				id: providerPlan.id,
				name: planData.name,
				description: planData.description,
				price: planData.price,
				currency: planData.currency,
				interval: planData.interval,
				intervalCount: planData.intervalCount,
				trialPeriodDays: planData.trialPeriodDays,
				features: planData.features,
				isActive: planData.isActive,
				metadata: planData.metadata,
			})

			await this.notificationService.notifySubscriptionPlanCreated(plan)

			return plan
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to create subscription plan")
		}
	}

	// Refunds
	async createRefund(transactionId: string, amount?: number, reason = "requested_by_customer"): Promise<Refund> {
		try {
			const transaction = await this.paymentRepository.getPaymentTransactionById(transactionId)
			if (!transaction) {
				throw new Error("Payment transaction not found")
			}

			if (transaction.status !== "completed") {
				throw new Error("Can only refund completed transactions")
			}

			const refundAmount = amount || transaction.amount

			// Create refund with provider
			const providerService = this.getProviderService(transaction.provider)
			const _providerRefund = await providerService.createRefund(transaction.providerTransactionId, refundAmount, reason)

			// Save refund to database
			const refund = await this.paymentRepository.createRefund({
				transactionId,
				amount: refundAmount,
				reason: reason as "duplicate" | "fraudulent" | "requested_by_customer",
				status: "succeeded",
			})

			// Update transaction status - we need to add this method to the repository
			// For now, we'll skip this update as it's not implemented

			await this.notificationService.notifyRefundCreated(refund)

			return refund
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to create refund")
		}
	}

	// Webhook Processing
	async processWebhook(provider: string, eventType: string, payload: any): Promise<void> {
		try {
			// Validate webhook
			await this.validationService.validateWebhook(provider, payload)

			// Save webhook to database
			const webhook = await this.paymentRepository.createPaymentWebhook({
				provider,
				eventType,
				payload,
				processed: false,
			})

			// Process webhook event
			const providerService = this.getProviderService(provider)
			await providerService.processWebhookEvent(eventType, payload)

			// Mark webhook as processed
			await this.paymentRepository.markWebhookProcessed(webhook.id)

			await this.notificationService.notifyWebhookProcessed(webhook)
		} catch (error) {
			throw this.handlePaymentError(error, "Failed to process webhook")
		}
	}

	// Helper methods
	private getProviderService(provider: string): StripeService | PayPalService {
		switch (provider) {
			case "stripe":
				return this.stripeService
			case "paypal":
				return this.paypalService
			default:
				throw new Error(`Unsupported payment provider: ${provider}`)
		}
	}

	private handlePaymentError(error: any, message: string): PaymentError {
		const paymentError = new Error(message) as PaymentError
		paymentError.code = error.code || "payment_error"
		paymentError.type = error.type || "api_error"
		paymentError.decline_code = error.decline_code
		paymentError.param = error.param
		paymentError.message = error.message || message

		return paymentError
	}

	private static async getDB() {
		const { getDB } = await import("@/lib/db")
		return await getDB()
	}
}
