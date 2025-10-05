/**
 * Payment Calculator Utilities
 * Handles all payment-related calculations and computations
 * Following NOORMME utility patterns with pure functions
 */

export interface FeeCalculation {
	amount: number
	fee: number
	netAmount: number
	feePercentage: number
	feeFixed: number
}

export interface TaxCalculation {
	amount: number
	taxRate: number
	taxAmount: number
	totalAmount: number
}

export interface CurrencyConversion {
	fromAmount: number
	fromCurrency: string
	toCurrency: string
	exchangeRate: number
	toAmount: number
	fees: number
}

export interface SubscriptionCalculation {
	planPrice: number
	interval: "day" | "week" | "month" | "year"
	intervalCount: number
	trialDays?: number
	prorationAmount: number
	nextBillingDate: Date
	totalAmount: number
}

/**
 * Calculate payment processing fees
 */
export function calculateFees(amount: number, provider: "stripe" | "paypal", currency: string = "USD"): FeeCalculation {
	const feePercentage = getFeePercentage(provider, currency)
	const feeFixed = getFixedFee(provider, currency)

	const fee = Math.round((amount * feePercentage) / 100 + feeFixed)
	const netAmount = amount - fee

	return {
		amount,
		fee,
		netAmount,
		feePercentage,
		feeFixed,
	}
}

/**
 * Calculate tax amount
 */
export function calculateTax(amount: number, taxRate: number): TaxCalculation {
	const taxAmount = Math.round((amount * taxRate) / 100)
	const totalAmount = amount + taxAmount

	return {
		amount,
		taxRate,
		taxAmount,
		totalAmount,
	}
}

/**
 * Convert currency amount
 */
export function convertCurrency(
	fromAmount: number,
	fromCurrency: string,
	toCurrency: string,
	exchangeRate: number,
): CurrencyConversion {
	if (fromCurrency === toCurrency) {
		return {
			fromAmount,
			fromCurrency,
			toCurrency,
			exchangeRate: 1,
			toAmount: fromAmount,
			fees: 0,
		}
	}

	const toAmount = Math.round(fromAmount * exchangeRate)
	const fees = calculateConversionFees(fromAmount, fromCurrency, toCurrency)

	return {
		fromAmount,
		fromCurrency,
		toCurrency,
		exchangeRate,
		toAmount,
		fees,
	}
}

/**
 * Calculate subscription billing
 */
export function calculateSubscription(
	planPrice: number,
	interval: "day" | "week" | "month" | "year",
	intervalCount: number = 1,
	trialDays?: number,
): SubscriptionCalculation {
	const currentDate = new Date()
	const nextBillingDate = calculateNextBillingDate(currentDate, interval, intervalCount)

	let totalAmount = planPrice
	let prorationAmount = 0

	// Calculate proration if trial period is active
	if (trialDays && trialDays > 0) {
		const trialEndDate = new Date(currentDate)
		trialEndDate.setDate(trialEndDate.getDate() + trialDays)

		if (trialEndDate < nextBillingDate) {
			const trialDaysInPeriod = Math.min(trialDays, getDaysInPeriod(interval, intervalCount))
			const totalDaysInPeriod = getDaysInPeriod(interval, intervalCount)
			prorationAmount = Math.round((planPrice * trialDaysInPeriod) / totalDaysInPeriod)
			totalAmount = planPrice - prorationAmount
		}
	}

	return {
		planPrice,
		interval,
		intervalCount,
		trialDays,
		prorationAmount,
		nextBillingDate,
		totalAmount,
	}
}

/**
 * Calculate refund amount
 */
export function calculateRefund(originalAmount: number, refundPercentage?: number, refundAmount?: number): number {
	if (refundAmount !== undefined) {
		return Math.min(refundAmount, originalAmount)
	}

	if (refundPercentage !== undefined) {
		return Math.round((originalAmount * refundPercentage) / 100)
	}

	return originalAmount
}

/**
 * Calculate partial payment
 */
export function calculatePartialPayment(totalAmount: number, paidAmount: number): number {
	return Math.max(0, totalAmount - paidAmount)
}

/**
 * Validate amount ranges
 */
export function validateAmount(amount: number, currency: string, minAmount: number = 50, maxAmount: number = 99999999): boolean {
	const currencyMinAmount = getMinimumAmount(currency)
	const currencyMaxAmount = getMaximumAmount(currency)

	return amount >= Math.max(minAmount, currencyMinAmount) && amount <= Math.min(maxAmount, currencyMaxAmount)
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number, currency: string, locale: string = "en-US"): string {
	const formatter = new Intl.NumberFormat(locale, {
		style: "currency",
		currency: currency.toUpperCase(),
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})

	return formatter.format(amount / 100)
}

/**
 * Parse amount from string
 */
export function parseAmount(amountString: string, _currency: string): number {
	const cleanAmount = amountString.replace(/[^\d.-]/g, "")
	const amount = parseFloat(cleanAmount)

	if (Number.isNaN(amount)) {
		throw new Error("Invalid amount format")
	}

	return Math.round(amount * 100) // Convert to cents
}

// Helper functions

function getFeePercentage(provider: "stripe" | "paypal", currency: string): number {
	const fees = {
		stripe: {
			USD: 2.9,
			EUR: 2.9,
			GBP: 2.9,
			CAD: 2.9,
			AUD: 2.9,
			JPY: 3.6,
		},
		paypal: {
			USD: 2.9,
			EUR: 2.9,
			GBP: 2.9,
			CAD: 2.9,
			AUD: 2.9,
			JPY: 3.6,
		},
	}

	return fees[provider][currency as keyof typeof fees.stripe] || 2.9
}

function getFixedFee(provider: "stripe" | "paypal", currency: string): number {
	const fees = {
		stripe: {
			USD: 30,
			EUR: 30,
			GBP: 30,
			CAD: 30,
			AUD: 30,
			JPY: 0,
		},
		paypal: {
			USD: 30,
			EUR: 30,
			GBP: 30,
			CAD: 30,
			AUD: 30,
			JPY: 0,
		},
	}

	return fees[provider][currency as keyof typeof fees.stripe] || 30
}

function calculateConversionFees(amount: number, _fromCurrency: string, _toCurrency: string): number {
	// Simple conversion fee calculation
	// In production, this would use real exchange rate APIs
	const baseFee = 50 // 0.50 in cents
	const percentageFee = Math.round(amount * 0.01) // 1%
	return Math.max(baseFee, percentageFee)
}

function calculateNextBillingDate(currentDate: Date, interval: "day" | "week" | "month" | "year", intervalCount: number): Date {
	const nextDate = new Date(currentDate)

	switch (interval) {
		case "day":
			nextDate.setDate(nextDate.getDate() + intervalCount)
			break
		case "week":
			nextDate.setDate(nextDate.getDate() + intervalCount * 7)
			break
		case "month":
			nextDate.setMonth(nextDate.getMonth() + intervalCount)
			break
		case "year":
			nextDate.setFullYear(nextDate.getFullYear() + intervalCount)
			break
	}

	return nextDate
}

function getDaysInPeriod(interval: "day" | "week" | "month" | "year", intervalCount: number): number {
	switch (interval) {
		case "day":
			return intervalCount
		case "week":
			return intervalCount * 7
		case "month":
			return intervalCount * 30 // Approximation
		case "year":
			return intervalCount * 365
		default:
			return 30
	}
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
