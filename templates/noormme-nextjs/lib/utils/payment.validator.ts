/**
 * Payment Validation Utilities
 * Handles validation of payment data and business rules
 * Following NOORMME utility patterns with comprehensive validation
 */

import type { CreatePaymentIntentData, CreateSubscriptionData, SubscriptionPlan } from "@/types/payment"

export interface ValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
}

export interface PaymentMethodValidation {
	isValid: boolean
	errors: string[]
	cardType?: string
	isExpired?: boolean
	isSupported?: boolean
}

export interface AmountValidation {
	isValid: boolean
	errors: string[]
	formattedAmount?: string
	currencySupported?: boolean
}

/**
 * Validate payment method data
 */
export function validatePaymentMethod(paymentMethodData: any): PaymentMethodValidation {
	const errors: string[] = []
	let cardType: string | undefined
	let isExpired = false
	let isSupported = true

	// Validate type
	if (!paymentMethodData.type) {
		errors.push("Payment method type is required")
	} else if (!["card", "bank_account", "paypal", "apple_pay", "google_pay"].includes(paymentMethodData.type)) {
		errors.push("Invalid payment method type")
	}

	// Validate provider
	if (!paymentMethodData.provider) {
		errors.push("Payment provider is required")
	} else if (!["stripe", "paypal", "square", "razorpay"].includes(paymentMethodData.provider)) {
		errors.push("Invalid payment provider")
	}

	// Validate card-specific data
	if (paymentMethodData.type === "card") {
		const cardValidation = validateCardData(paymentMethodData)
		errors.push(...cardValidation.errors)
		cardType = cardValidation.cardType
		isExpired = cardValidation.isExpired || false
		isSupported = cardValidation.isSupported || false
	}

	// Validate PayPal-specific data
	if (paymentMethodData.type === "paypal") {
		const paypalValidation = validatePayPalData(paymentMethodData)
		errors.push(...paypalValidation.errors)
	}

	return {
		isValid: errors.length === 0,
		errors,
		cardType,
		isExpired,
		isSupported,
	}
}

/**
 * Validate payment intent data
 */
export function validatePaymentIntent(data: CreatePaymentIntentData): ValidationResult {
	const errors: string[] = []
	const warnings: string[] = []

	// Validate amount
	const amountValidation = validateAmount(data.amount, data.currency)
	if (!amountValidation.isValid) {
		errors.push(...amountValidation.errors)
	}

	// Validate currency
	if (!data.currency) {
		errors.push("Currency is required")
	} else if (!isSupportedCurrency(data.currency)) {
		errors.push("Unsupported currency")
	}

	// Validate customer ID
	if (!data.customerId) {
		errors.push("Customer ID is required")
	} else if (!isValidCustomerId(data.customerId)) {
		errors.push("Invalid customer ID format")
	}

	// Validate description
	if (data.description && data.description.length > 500) {
		errors.push("Description must be less than 500 characters")
	}

	// Validate metadata
	if (data.metadata) {
		const metadataValidation = validateMetadata(data.metadata)
		if (!metadataValidation.isValid) {
			errors.push(...metadataValidation.errors)
		}
	}

	// Check for suspicious patterns
	if (isSuspiciousAmount(data.amount, data.currency)) {
		warnings.push("Amount may be suspicious - additional verification recommended")
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	}
}

/**
 * Validate subscription data
 */
export function validateSubscription(data: CreateSubscriptionData): ValidationResult {
	const errors: string[] = []
	const warnings: string[] = []

	// Validate customer ID
	if (!data.customerId) {
		errors.push("Customer ID is required")
	} else if (!isValidCustomerId(data.customerId)) {
		errors.push("Invalid customer ID format")
	}

	// Validate plan ID
	if (!data.planId) {
		errors.push("Plan ID is required")
	} else if (!isValidPlanId(data.planId)) {
		errors.push("Invalid plan ID format")
	}

	// Validate trial period
	if (data.trialPeriodDays !== undefined) {
		if (data.trialPeriodDays < 0) {
			errors.push("Trial period cannot be negative")
		} else if (data.trialPeriodDays > 365) {
			errors.push("Trial period cannot exceed 365 days")
		}
	}

	// Validate metadata
	if (data.metadata) {
		const metadataValidation = validateMetadata(data.metadata)
		if (!metadataValidation.isValid) {
			errors.push(...metadataValidation.errors)
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	}
}

/**
 * Validate subscription plan data
 */
export function validateSubscriptionPlan(planData: Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">): ValidationResult {
	const errors: string[] = []
	const warnings: string[] = []

	// Validate name
	if (!planData.name) {
		errors.push("Plan name is required")
	} else if (planData.name.length > 100) {
		errors.push("Plan name must be less than 100 characters")
	}

	// Validate description
	if (planData.description && planData.description.length > 500) {
		errors.push("Description must be less than 500 characters")
	}

	// Validate price
	if (planData.price <= 0) {
		errors.push("Price must be greater than 0")
	}

	// Validate currency
	if (!planData.currency) {
		errors.push("Currency is required")
	} else if (!isSupportedCurrency(planData.currency)) {
		errors.push("Unsupported currency")
	}

	// Validate interval
	if (!planData.interval) {
		errors.push("Interval is required")
	} else if (!["day", "week", "month", "year"].includes(planData.interval)) {
		errors.push("Invalid interval")
	}

	// Validate interval count
	if (planData.intervalCount <= 0) {
		errors.push("Interval count must be greater than 0")
	} else if (planData.intervalCount > 12) {
		warnings.push("Interval count is unusually high")
	}

	// Validate trial period
	if (planData.trialPeriodDays !== undefined) {
		if (planData.trialPeriodDays < 0) {
			errors.push("Trial period cannot be negative")
		} else if (planData.trialPeriodDays > 365) {
			errors.push("Trial period cannot exceed 365 days")
		}
	}

	// Validate features
	if (planData.features && !Array.isArray(planData.features)) {
		errors.push("Features must be an array")
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	}
}

/**
 * Validate webhook data
 */
export function validateWebhook(provider: string, payload: any): ValidationResult {
	const errors: string[] = []

	// Validate provider
	if (!provider) {
		errors.push("Provider is required")
	} else if (!["stripe", "paypal"].includes(provider)) {
		errors.push("Unsupported provider")
	}

	// Validate payload
	if (!payload) {
		errors.push("Payload is required")
	} else if (typeof payload !== "object") {
		errors.push("Payload must be an object")
	}

	// Provider-specific validation
	if (provider === "stripe") {
		const stripeValidation = validateStripeWebhook(payload)
		errors.push(...stripeValidation.errors)
	} else if (provider === "paypal") {
		const paypalValidation = validatePayPalWebhook(payload)
		errors.push(...paypalValidation.errors)
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings: [],
	}
}

// Helper validation functions

function validateCardData(cardData: any): PaymentMethodValidation {
	const errors: string[] = []
	let cardType: string | undefined
	let isExpired = false
	let isSupported = true

	// Validate card number
	if (!cardData.number) {
		errors.push("Card number is required")
	} else {
		const cardValidation = validateCardNumber(cardData.number)
		if (!cardValidation.isValid) {
			errors.push("Invalid card number")
		} else {
			cardType = cardValidation.cardType || undefined
			isSupported = cardValidation.isSupported || false
		}
	}

	// Validate expiry
	if (!cardData.expiryMonth || !cardData.expiryYear) {
		errors.push("Card expiry is required")
	} else {
		const expiryValidation = validateCardExpiry(cardData.expiryMonth, cardData.expiryYear)
		if (!expiryValidation.isValid) {
			errors.push("Invalid card expiry")
		} else {
			isExpired = expiryValidation.isExpired || false
		}
	}

	// Validate CVV
	if (!cardData.cvv) {
		errors.push("CVV is required")
	} else if (!validateCVV(cardData.cvv, cardType)) {
		errors.push("Invalid CVV")
	}

	return {
		isValid: errors.length === 0,
		errors,
		cardType,
		isExpired,
		isSupported,
	}
}

function validatePayPalData(_paypalData: any): ValidationResult {
	const errors: string[] = []

	// PayPal validation would go here
	// This is a simplified version

	return {
		isValid: errors.length === 0,
		errors,
		warnings: [],
	}
}

function validateAmount(amount: number, currency: string): AmountValidation {
	const errors: string[] = []
	let currencySupported = true

	if (!amount || amount <= 0) {
		errors.push("Amount must be greater than 0")
	}

	if (!currency) {
		errors.push("Currency is required")
	} else if (!isSupportedCurrency(currency)) {
		errors.push("Unsupported currency")
		currencySupported = false
	}

	// Check minimum amount for currency
	const minAmount = getMinimumAmount(currency)
	if (amount < minAmount) {
		errors.push(`Amount must be at least ${formatAmount(minAmount, currency)}`)
	}

	// Check maximum amount for currency
	const maxAmount = getMaximumAmount(currency)
	if (amount > maxAmount) {
		errors.push(`Amount cannot exceed ${formatAmount(maxAmount, currency)}`)
	}

	return {
		isValid: errors.length === 0,
		errors,
		formattedAmount: currency ? formatAmount(amount, currency) : undefined,
		currencySupported,
	}
}

function validateMetadata(metadata: Record<string, string>): ValidationResult {
	const errors: string[] = []

	if (Object.keys(metadata).length > 50) {
		errors.push("Metadata cannot have more than 50 keys")
	}

	for (const [key, value] of Object.entries(metadata)) {
		if (key.length > 40) {
			errors.push("Metadata key must be less than 40 characters")
		}
		if (value.length > 500) {
			errors.push("Metadata value must be less than 500 characters")
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings: [],
	}
}

function validateStripeWebhook(payload: any): ValidationResult {
	const errors: string[] = []

	if (!payload.type) {
		errors.push("Event type is required")
	}

	if (!payload.data) {
		errors.push("Event data is required")
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings: [],
	}
}

function validatePayPalWebhook(payload: any): ValidationResult {
	const errors: string[] = []

	if (!payload.event_type) {
		errors.push("Event type is required")
	}

	if (!payload.resource) {
		errors.push("Event resource is required")
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings: [],
	}
}

// Utility functions

function validateCardNumber(cardNumber: string): { isValid: boolean; cardType?: string; isSupported?: boolean } {
	const cleaned = cardNumber.replace(/\D/g, "")

	if (cleaned.length < 13 || cleaned.length > 19) {
		return { isValid: false }
	}

	// Luhn algorithm
	let sum = 0
	let isEven = false

	for (let i = cleaned.length - 1; i >= 0; i--) {
		let digit = parseInt(cleaned[i])

		if (isEven) {
			digit *= 2
			if (digit > 9) {
				digit -= 9
			}
		}

		sum += digit
		isEven = !isEven
	}

	const isValid = sum % 10 === 0
	const cardType = getCardType(cleaned)
	const isSupported = ["visa", "mastercard", "amex", "discover"].includes(cardType)

	return { isValid, cardType, isSupported }
}

function validateCardExpiry(month: number, year: number): { isValid: boolean; isExpired?: boolean } {
	if (month < 1 || month > 12) {
		return { isValid: false }
	}

	const currentDate = new Date()
	const currentYear = currentDate.getFullYear()
	const currentMonth = currentDate.getMonth() + 1

	const isExpired = year < currentYear || (year === currentYear && month < currentMonth)

	return { isValid: true, isExpired }
}

function validateCVV(cvv: string, cardType?: string): boolean {
	const cleaned = cvv.replace(/\D/g, "")

	if (cardType === "amex") {
		return cleaned.length === 4
	}

	return cleaned.length === 3
}

function getCardType(cardNumber: string): string {
	if (/^4/.test(cardNumber)) {
		return "visa"
	}
	if (/^5[1-5]/.test(cardNumber)) {
		return "mastercard"
	}
	if (/^3[47]/.test(cardNumber)) {
		return "amex"
	}
	if (/^6/.test(cardNumber)) {
		return "discover"
	}
	return "unknown"
}

function isSupportedCurrency(currency: string): boolean {
	const supportedCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"]
	return supportedCurrencies.includes(currency.toUpperCase())
}

function isValidCustomerId(customerId: string): boolean {
	return /^[a-zA-Z0-9_-]+$/.test(customerId) && customerId.length >= 3 && customerId.length <= 50
}

function isValidPlanId(planId: string): boolean {
	return /^[a-zA-Z0-9_-]+$/.test(planId) && planId.length >= 3 && planId.length <= 50
}

function isSuspiciousAmount(amount: number, _currency: string): boolean {
	// Simple fraud detection rules
	const suspiciousAmounts = [999999, 1000000, 9999999]
	return suspiciousAmounts.includes(amount)
}

function getMinimumAmount(currency: string): number {
	const minimums = {
		USD: 50,
		EUR: 50,
		GBP: 30,
		CAD: 50,
		AUD: 50,
		JPY: 50,
	}
	return minimums[currency as keyof typeof minimums] || 50
}

function getMaximumAmount(currency: string): number {
	const maximums = {
		USD: 99999999,
		EUR: 99999999,
		GBP: 99999999,
		CAD: 99999999,
		AUD: 99999999,
		JPY: 999999999,
	}
	return maximums[currency as keyof typeof maximums] || 99999999
}

function formatAmount(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency.toUpperCase(),
	}).format(amount / 100)
}
