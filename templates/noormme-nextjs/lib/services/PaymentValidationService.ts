/**
 * Payment Validation Service
 * Orchestrates payment validation using utility functions
 * Following NOORMME service layer pattern
 */

import type { CreatePaymentIntentData, CreateSubscriptionData, SubscriptionPlan } from "@/types/payment"
import {
	validatePaymentIntent,
	validatePaymentMethod,
	validateSubscription,
	validateSubscriptionPlan,
	validateWebhook,
} from "@/utils/payment.validator"

export class PaymentValidationService {
	/**
	 * Validate payment method data
	 */
	async validatePaymentMethod(paymentMethodData: any): Promise<void> {
		const validation = validatePaymentMethod(paymentMethodData)

		if (!validation.isValid) {
			throw new Error(`Payment method validation failed: ${validation.errors.join(", ")}`)
		}

		if (validation.isExpired) {
			throw new Error("Payment method is expired")
		}

		if (!validation.isSupported) {
			throw new Error("Payment method type is not supported")
		}
	}

	/**
	 * Validate payment intent data
	 */
	async validatePaymentIntent(data: CreatePaymentIntentData): Promise<void> {
		const validation = validatePaymentIntent(data)

		if (!validation.isValid) {
			throw new Error(`Payment intent validation failed: ${validation.errors.join(", ")}`)
		}

		if (validation.warnings.length > 0) {
			console.warn("Payment intent warnings:", validation.warnings)
		}
	}

	/**
	 * Validate subscription data
	 */
	async validateSubscription(data: CreateSubscriptionData): Promise<void> {
		const validation = validateSubscription(data)

		if (!validation.isValid) {
			throw new Error(`Subscription validation failed: ${validation.errors.join(", ")}`)
		}

		if (validation.warnings.length > 0) {
			console.warn("Subscription warnings:", validation.warnings)
		}
	}

	/**
	 * Validate subscription plan data
	 */
	async validateSubscriptionPlan(planData: Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">): Promise<void> {
		const validation = validateSubscriptionPlan(planData)

		if (!validation.isValid) {
			throw new Error(`Subscription plan validation failed: ${validation.errors.join(", ")}`)
		}

		if (validation.warnings.length > 0) {
			console.warn("Subscription plan warnings:", validation.warnings)
		}
	}

	/**
	 * Validate webhook data
	 */
	async validateWebhook(provider: string, payload: any): Promise<void> {
		const validation = validateWebhook(provider, payload)

		if (!validation.isValid) {
			throw new Error(`Webhook validation failed: ${validation.errors.join(", ")}`)
		}
	}
}
