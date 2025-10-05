/**
 * Payment Analytics Calculator
 * Handles calculation of payment metrics and statistics
 * Following NOORMME utility patterns with pure functions
 */

export interface PaymentMetrics {
	totalRevenue: number
	totalTransactions: number
	averageTransactionValue: number
	successRate: number
	refundRate: number
	chargebackRate: number
	conversionRate: number
}

export interface RevenueMetrics {
	grossRevenue: number
	netRevenue: number
	fees: number
	refunds: number
	chargebacks: number
	netAmount: number
}

export interface TransactionMetrics {
	total: number
	successful: number
	failed: number
	pending: number
	refunded: number
	chargeback: number
}

export interface TimeSeriesData {
	date: string
	revenue: number
	transactions: number
	successRate: number
}

export interface ProviderMetrics {
	provider: string
	revenue: number
	transactions: number
	successRate: number
	fees: number
	refundRate: number
}

export interface CustomerMetrics {
	totalCustomers: number
	newCustomers: number
	returningCustomers: number
	averageCustomerValue: number
	customerRetentionRate: number
}

/**
 * Calculate payment metrics from transaction data
 */
export function calculatePaymentMetrics(transactions: any[]): PaymentMetrics {
	const totalRevenue = transactions.filter((t) => t.status === "completed").reduce((sum, t) => sum + t.amount, 0)

	const totalTransactions = transactions.length
	const successfulTransactions = transactions.filter((t) => t.status === "completed").length
	const refundedTransactions = transactions.filter((t) => t.status === "refunded").length
	const chargebackTransactions = transactions.filter((t) => t.status === "chargeback").length

	return {
		totalRevenue,
		totalTransactions,
		averageTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
		successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
		refundRate: totalTransactions > 0 ? (refundedTransactions / totalTransactions) * 100 : 0,
		chargebackRate: totalTransactions > 0 ? (chargebackTransactions / totalTransactions) * 100 : 0,
		conversionRate: 0, // This would need additional data to calculate
	}
}

/**
 * Calculate revenue metrics
 */
export function calculateRevenueMetrics(transactions: any[]): RevenueMetrics {
	const completedTransactions = transactions.filter((t) => t.status === "completed")

	const grossRevenue = completedTransactions.reduce((sum, t) => sum + t.amount, 0)
	const fees = completedTransactions.reduce((sum, t) => sum + (t.fees || 0), 0)
	const refunds = transactions.filter((t) => t.status === "refunded").reduce((sum, t) => sum + t.amount, 0)
	const chargebacks = transactions.filter((t) => t.status === "chargeback").reduce((sum, t) => sum + t.amount, 0)

	const netRevenue = grossRevenue - fees - refunds - chargebacks

	return {
		grossRevenue,
		netRevenue,
		fees,
		refunds,
		chargebacks,
		netAmount: netRevenue,
	}
}

/**
 * Calculate transaction metrics
 */
export function calculateTransactionMetrics(transactions: any[]): TransactionMetrics {
	const total = transactions.length
	const successful = transactions.filter((t) => t.status === "completed").length
	const failed = transactions.filter((t) => t.status === "failed").length
	const pending = transactions.filter((t) => t.status === "pending").length
	const refunded = transactions.filter((t) => t.status === "refunded").length
	const chargeback = transactions.filter((t) => t.status === "chargeback").length

	return {
		total,
		successful,
		failed,
		pending,
		refunded,
		chargeback,
	}
}

/**
 * Calculate time series data for charts
 */
export function calculateTimeSeriesData(
	transactions: any[],
	startDate: Date,
	endDate: Date,
	interval: "day" | "week" | "month" = "day",
): TimeSeriesData[] {
	const data: TimeSeriesData[] = []
	const currentDate = new Date(startDate)

	while (currentDate <= endDate) {
		const nextDate = new Date(currentDate)

		// Set next interval
		switch (interval) {
			case "day":
				nextDate.setDate(nextDate.getDate() + 1)
				break
			case "week":
				nextDate.setDate(nextDate.getDate() + 7)
				break
			case "month":
				nextDate.setMonth(nextDate.getMonth() + 1)
				break
		}

		// Filter transactions for this period
		const periodTransactions = transactions.filter((t) => {
			const transactionDate = new Date(t.createdAt)
			return transactionDate >= currentDate && transactionDate < nextDate
		})

		const revenue = periodTransactions.filter((t) => t.status === "completed").reduce((sum, t) => sum + t.amount, 0)

		const totalTransactions = periodTransactions.length
		const successfulTransactions = periodTransactions.filter((t) => t.status === "completed").length
		const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0

		data.push({
			date: currentDate.toISOString().split("T")[0],
			revenue,
			transactions: totalTransactions,
			successRate,
		})

		currentDate.setTime(nextDate.getTime())
	}

	return data
}

/**
 * Calculate provider-specific metrics
 */
export function calculateProviderMetrics(transactions: any[]): ProviderMetrics[] {
	const providers = [...new Set(transactions.map((t) => t.provider))]

	return providers.map((provider) => {
		const providerTransactions = transactions.filter((t) => t.provider === provider)
		const successfulTransactions = providerTransactions.filter((t) => t.status === "completed")
		const refundedTransactions = providerTransactions.filter((t) => t.status === "refunded")

		const revenue = successfulTransactions.reduce((sum, t) => sum + t.amount, 0)
		const fees = successfulTransactions.reduce((sum, t) => sum + (t.fees || 0), 0)
		const refunds = refundedTransactions.reduce((sum, t) => sum + t.amount, 0)

		return {
			provider,
			revenue,
			transactions: providerTransactions.length,
			successRate:
				providerTransactions.length > 0 ? (successfulTransactions.length / providerTransactions.length) * 100 : 0,
			fees,
			refundRate: providerTransactions.length > 0 ? (refundedTransactions.length / providerTransactions.length) * 100 : 0,
		}
	})
}

/**
 * Calculate customer metrics
 */
export function calculateCustomerMetrics(
	transactions: any[],
	customers: any[],
	periodStart: Date,
	periodEnd: Date,
): CustomerMetrics {
	const totalCustomers = customers.length

	// Calculate new customers in period
	const newCustomers = customers.filter((c) => {
		const customerDate = new Date(c.createdAt)
		return customerDate >= periodStart && customerDate <= periodEnd
	}).length

	// Calculate returning customers
	const returningCustomers = totalCustomers - newCustomers

	// Calculate average customer value
	const customerRevenue = transactions.filter((t) => t.status === "completed").reduce((sum, t) => sum + t.amount, 0)
	const averageCustomerValue = totalCustomers > 0 ? customerRevenue / totalCustomers : 0

	// Calculate retention rate (simplified)
	const customerRetentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0

	return {
		totalCustomers,
		newCustomers,
		returningCustomers,
		averageCustomerValue,
		customerRetentionRate,
	}
}

/**
 * Calculate growth metrics
 */
export function calculateGrowthMetrics(
	currentPeriod: any[],
	previousPeriod: any[],
): {
	revenueGrowth: number
	transactionGrowth: number
	customerGrowth: number
} {
	const currentRevenue = currentPeriod.filter((t) => t.status === "completed").reduce((sum, t) => sum + t.amount, 0)

	const previousRevenue = previousPeriod.filter((t) => t.status === "completed").reduce((sum, t) => sum + t.amount, 0)

	const currentTransactions = currentPeriod.length
	const previousTransactions = previousPeriod.length

	const currentCustomers = new Set(currentPeriod.map((t) => t.customerId)).size
	const previousCustomers = new Set(previousPeriod.map((t) => t.customerId)).size

	return {
		revenueGrowth: previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0,
		transactionGrowth:
			previousTransactions > 0 ? ((currentTransactions - previousTransactions) / previousTransactions) * 100 : 0,
		customerGrowth: previousCustomers > 0 ? ((currentCustomers - previousCustomers) / previousCustomers) * 100 : 0,
	}
}

/**
 * Calculate top performing metrics
 */
export function calculateTopPerformers(transactions: any[]): {
	topCustomers: Array<{ customerId: string; revenue: number; transactions: number }>
	topProducts: Array<{ productId: string; revenue: number; transactions: number }>
	topCountries: Array<{ country: string; revenue: number; transactions: number }>
} {
	// Top customers
	const customerStats = new Map<string, { revenue: number; transactions: number }>()
	transactions
		.filter((t) => t.status === "completed")
		.forEach((t) => {
			const existing = customerStats.get(t.customerId) || { revenue: 0, transactions: 0 }
			customerStats.set(t.customerId, {
				revenue: existing.revenue + t.amount,
				transactions: existing.transactions + 1,
			})
		})

	const topCustomers = Array.from(customerStats.entries())
		.map(([customerId, stats]) => ({ customerId, ...stats }))
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 10)

	// Top products (if product data is available)
	const productStats = new Map<string, { revenue: number; transactions: number }>()
	transactions
		.filter((t) => t.status === "completed" && t.metadata?.productId)
		.forEach((t) => {
			const productId = t.metadata.productId
			const existing = productStats.get(productId) || { revenue: 0, transactions: 0 }
			productStats.set(productId, {
				revenue: existing.revenue + t.amount,
				transactions: existing.transactions + 1,
			})
		})

	const topProducts = Array.from(productStats.entries())
		.map(([productId, stats]) => ({ productId, ...stats }))
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 10)

	// Top countries (if country data is available)
	const countryStats = new Map<string, { revenue: number; transactions: number }>()
	transactions
		.filter((t) => t.status === "completed" && t.metadata?.country)
		.forEach((t) => {
			const country = t.metadata.country
			const existing = countryStats.get(country) || { revenue: 0, transactions: 0 }
			countryStats.set(country, {
				revenue: existing.revenue + t.amount,
				transactions: existing.transactions + 1,
			})
		})

	const topCountries = Array.from(countryStats.entries())
		.map(([country, stats]) => ({ country, ...stats }))
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 10)

	return {
		topCustomers,
		topProducts,
		topCountries,
	}
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency.toUpperCase(),
	}).format(amount / 100)
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
	return `${value.toFixed(decimals)}%`
}
