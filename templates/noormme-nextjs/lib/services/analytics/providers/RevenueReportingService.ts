/**
 * Revenue Reporting Service Provider
 * Handles revenue reporting and analytics
 * Following NOORMME service layer pattern with specialized reporting
 */

import {
	CustomerMetrics,
	calculateCustomerMetrics,
	calculateGrowthMetrics,
	calculatePaymentMetrics,
	calculateProviderMetrics,
	calculateRevenueMetrics,
	calculateTimeSeriesData,
	calculateTopPerformers,
	formatCurrency,
	formatPercentage,
	PaymentMetrics,
	ProviderMetrics,
	RevenueMetrics,
	TimeSeriesData,
} from "../utils/PaymentAnalyticsCalculator"

export interface ReportConfig {
	dateRange: {
		start: Date
		end: Date
	}
	groupBy: "day" | "week" | "month" | "year"
	includeBreakdown: boolean
	includeComparisons: boolean
	currency: string
}

export interface RevenueReport {
	summary: {
		totalRevenue: string
		netRevenue: string
		totalTransactions: number
		successRate: string
		growthRate: string
	}
	metrics: PaymentMetrics
	revenue: RevenueMetrics
	timeSeries: TimeSeriesData[]
	providers: ProviderMetrics[]
	customers: CustomerMetrics
	topPerformers: {
		customers: Array<{ customerId: string; revenue: string; transactions: number }>
		products: Array<{ productId: string; revenue: string; transactions: number }>
		countries: Array<{ country: string; revenue: string; transactions: number }>
	}
	generatedAt: Date
}

export interface ComparisonReport {
	current: RevenueReport
	previous: RevenueReport
	growth: {
		revenue: string
		transactions: string
		customers: string
	}
}

export class RevenueReportingService {
	private paymentDatabaseService: any

	constructor(paymentDatabaseService: any) {
		this.paymentDatabaseService = paymentDatabaseService
	}

	/**
	 * Generate comprehensive revenue report
	 */
	async generateRevenueReport(config: ReportConfig): Promise<RevenueReport> {
		try {
			// Get transaction data for the period
			const transactions = await this.getTransactionsForPeriod(config.dateRange.start, config.dateRange.end)

			// Get customer data
			const customers = await this.getCustomersForPeriod(config.dateRange.start, config.dateRange.end)

			// Calculate metrics
			const metrics = calculatePaymentMetrics(transactions)
			const revenue = calculateRevenueMetrics(transactions)
			const timeSeries = calculateTimeSeriesData(transactions, config.dateRange.start, config.dateRange.end, config.groupBy)
			const providers = calculateProviderMetrics(transactions)
			const customerMetrics = calculateCustomerMetrics(
				transactions,
				customers,
				config.dateRange.start,
				config.dateRange.end,
			)
			const topPerformers = calculateTopPerformers(transactions)

			// Format for display
			const summary = {
				totalRevenue: formatCurrency(revenue.grossRevenue, config.currency),
				netRevenue: formatCurrency(revenue.netAmount, config.currency),
				totalTransactions: metrics.totalTransactions,
				successRate: formatPercentage(metrics.successRate),
				growthRate: "0%", // Would need previous period data
			}

			return {
				summary,
				metrics,
				revenue,
				timeSeries,
				providers,
				customers: customerMetrics,
				topPerformers: {
					customers: topPerformers.topCustomers.map((c) => ({
						customerId: c.customerId,
						revenue: formatCurrency(c.revenue, config.currency),
						transactions: c.transactions,
					})),
					products: topPerformers.topProducts.map((p) => ({
						productId: p.productId,
						revenue: formatCurrency(p.revenue, config.currency),
						transactions: p.transactions,
					})),
					countries: topPerformers.topCountries.map((c) => ({
						country: c.country,
						revenue: formatCurrency(c.revenue, config.currency),
						transactions: c.transactions,
					})),
				},
				generatedAt: new Date(),
			}
		} catch (error) {
			console.error("Error generating revenue report:", error)
			throw new Error("Failed to generate revenue report")
		}
	}

	/**
	 * Generate comparison report between two periods
	 */
	async generateComparisonReport(currentConfig: ReportConfig, previousConfig: ReportConfig): Promise<ComparisonReport> {
		try {
			const current = await this.generateRevenueReport(currentConfig)
			const previous = await this.generateRevenueReport(previousConfig)

			// Calculate growth metrics
			const currentTransactions = await this.getTransactionsForPeriod(
				currentConfig.dateRange.start,
				currentConfig.dateRange.end,
			)
			const previousTransactions = await this.getTransactionsForPeriod(
				previousConfig.dateRange.start,
				previousConfig.dateRange.end,
			)

			const growth = calculateGrowthMetrics(currentTransactions, previousTransactions)

			return {
				current,
				previous,
				growth: {
					revenue: formatPercentage(growth.revenueGrowth),
					transactions: formatPercentage(growth.transactionGrowth),
					customers: formatPercentage(growth.customerGrowth),
				},
			}
		} catch (error) {
			console.error("Error generating comparison report:", error)
			throw new Error("Failed to generate comparison report")
		}
	}

	/**
	 * Generate daily revenue summary
	 */
	async generateDailyRevenueSummary(date: Date): Promise<{
		date: string
		revenue: string
		transactions: number
		successRate: string
		averageTransactionValue: string
	}> {
		try {
			const startOfDay = new Date(date)
			startOfDay.setHours(0, 0, 0, 0)

			const endOfDay = new Date(date)
			endOfDay.setHours(23, 59, 59, 999)

			const transactions = await this.getTransactionsForPeriod(startOfDay, endOfDay)
			const metrics = calculatePaymentMetrics(transactions)

			return {
				date: date.toISOString().split("T")[0],
				revenue: formatCurrency(metrics.totalRevenue),
				transactions: metrics.totalTransactions,
				successRate: formatPercentage(metrics.successRate),
				averageTransactionValue: formatCurrency(metrics.averageTransactionValue),
			}
		} catch (error) {
			console.error("Error generating daily revenue summary:", error)
			throw new Error("Failed to generate daily revenue summary")
		}
	}

	/**
	 * Generate monthly revenue summary
	 */
	async generateMonthlyRevenueSummary(
		year: number,
		month: number,
	): Promise<{
		month: string
		revenue: string
		transactions: number
		successRate: string
		growthRate: string
		topProviders: Array<{ provider: string; revenue: string; percentage: string }>
	}> {
		try {
			const startOfMonth = new Date(year, month - 1, 1)
			const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

			const transactions = await this.getTransactionsForPeriod(startOfMonth, endOfMonth)
			const metrics = calculatePaymentMetrics(transactions)
			const providers = calculateProviderMetrics(transactions)

			// Get previous month for growth calculation
			const previousMonth = new Date(year, month - 2, 1)
			const previousMonthEnd = new Date(year, month - 1, 0, 23, 59, 59, 999)
			const previousTransactions = await this.getTransactionsForPeriod(previousMonth, previousMonthEnd)
			const previousMetrics = calculatePaymentMetrics(previousTransactions)

			const growthRate =
				previousMetrics.totalRevenue > 0
					? formatPercentage(
							((metrics.totalRevenue - previousMetrics.totalRevenue) / previousMetrics.totalRevenue) * 100,
						)
					: "0%"

			const totalRevenue = metrics.totalRevenue
			const topProviders = providers
				.sort((a, b) => b.revenue - a.revenue)
				.slice(0, 5)
				.map((p) => ({
					provider: p.provider,
					revenue: formatCurrency(p.revenue),
					percentage: formatPercentage((p.revenue / totalRevenue) * 100),
				}))

			return {
				month: `${year}-${month.toString().padStart(2, "0")}`,
				revenue: formatCurrency(metrics.totalRevenue),
				transactions: metrics.totalTransactions,
				successRate: formatPercentage(metrics.successRate),
				growthRate,
				topProviders,
			}
		} catch (error) {
			console.error("Error generating monthly revenue summary:", error)
			throw new Error("Failed to generate monthly revenue summary")
		}
	}

	/**
	 * Export revenue data to CSV
	 */
	async exportRevenueData(config: ReportConfig): Promise<string> {
		try {
			const transactions = await this.getTransactionsForPeriod(config.dateRange.start, config.dateRange.end)

			// Create CSV header
			const headers = [
				"Date",
				"Transaction ID",
				"Customer ID",
				"Amount",
				"Currency",
				"Status",
				"Provider",
				"Fees",
				"Net Amount",
				"Description",
			]

			// Create CSV rows
			const rows = transactions.map((t) => [
				new Date(t.createdAt).toISOString().split("T")[0],
				t.id,
				t.customerId,
				(t.amount / 100).toFixed(2),
				t.currency,
				t.status,
				t.provider,
				((t.fees || 0) / 100).toFixed(2),
				((t.netAmount || t.amount) / 100).toFixed(2),
				t.description || "",
			])

			// Combine headers and rows
			const csvContent = [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

			return csvContent
		} catch (error) {
			console.error("Error exporting revenue data:", error)
			throw new Error("Failed to export revenue data")
		}
	}

	// Private helper methods

	private async getTransactionsForPeriod(startDate: Date, endDate: Date): Promise<any[]> {
		try {
			// This would query the database for transactions in the period
			// For now, we'll return mock data
			return []
		} catch (error) {
			console.error("Error getting transactions for period:", error)
			return []
		}
	}

	private async getCustomersForPeriod(startDate: Date, endDate: Date): Promise<any[]> {
		try {
			// This would query the database for customers in the period
			// For now, we'll return mock data
			return []
		} catch (error) {
			console.error("Error getting customers for period:", error)
			return []
		}
	}
}
