/**
 * Payment Analytics Service
 * Main service for payment analytics and reporting
 * Following NOORMME service layer pattern with specialized analytics providers
 */

import type { ComparisonReport, ReportConfig, RevenueReport } from "./providers/RevenueReportingService"
import { RevenueReportingService } from "./providers/RevenueReportingService"

export interface AnalyticsDashboard {
	revenue: {
		today: string
		thisMonth: string
		growth: string
		transactions: number
		successRate: string
	}
	providers: Array<{
		provider: string
		revenue: string
		transactions: number
		successRate: string
		percentage: string
	}>
	topCustomers: Array<{
		customerId: string
		revenue: string
		transactions: number
	}>
	alerts: Array<{
		type: "revenue" | "system"
		level: "info" | "warning" | "error"
		message: string
		timestamp: Date
	}>
}

export interface AnalyticsConfig {
	dateRange: {
		start: Date
		end: Date
	}
	includeRevenueBreakdown: boolean
	includeCustomerInsights: boolean
	currency: string
}

export class PaymentAnalyticsService {
	private static instance: PaymentAnalyticsService
	private paymentDatabaseService: any
	private revenueService: RevenueReportingService

	static async getInstance(): Promise<PaymentAnalyticsService> {
		if (!PaymentAnalyticsService.instance) {
			const { PaymentServiceFactory } = await import("../payment/PaymentServiceFactory")
			const paymentServiceFactory = PaymentServiceFactory.getInstance()
			await paymentServiceFactory.initialize()
			const services = paymentServiceFactory.getServices()
			const paymentDatabaseService = services.unified.databaseService
			const revenueService = new RevenueReportingService(paymentDatabaseService)

			PaymentAnalyticsService.instance = new PaymentAnalyticsService(paymentDatabaseService, revenueService)
		}
		return PaymentAnalyticsService.instance
	}

	constructor(paymentDatabaseService: any, revenueService: RevenueReportingService) {
		this.paymentDatabaseService = paymentDatabaseService
		this.revenueService = revenueService
	}

	/**
	 * Generate comprehensive analytics dashboard
	 */
	async generateDashboard(config: AnalyticsConfig): Promise<AnalyticsDashboard> {
		try {
			// Get today's date for daily metrics
			const today = new Date()
			const startOfDay = new Date(today)
			startOfDay.setHours(0, 0, 0, 0)
			const endOfDay = new Date(today)
			endOfDay.setHours(23, 59, 59, 999)

			// Get this month's date range
			const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
			const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)

			// Generate reports
			const [todayReport, monthlyReport, alerts] = await Promise.all([
				this.revenueService.generateDailyRevenueSummary(today),
				this.revenueService.generateMonthlyRevenueSummary(today.getFullYear(), today.getMonth() + 1),
				this.generateAlerts(config),
			])

			// Get provider breakdown
			const providerConfig: ReportConfig = {
				dateRange: config.dateRange,
				groupBy: "day",
				includeBreakdown: true,
				includeComparisons: false,
				currency: config.currency,
			}
			const providerReport = await this.revenueService.generateRevenueReport(providerConfig)

			// Get top customers
			const topCustomers = providerReport.topPerformers.customers.slice(0, 5)

			return {
				revenue: {
					today: todayReport.revenue,
					thisMonth: monthlyReport.revenue,
					growth: monthlyReport.growthRate,
					transactions: todayReport.transactions,
					successRate: todayReport.successRate,
				},
				providers: providerReport.providers.map((p) => ({
					provider: p.provider,
					revenue: p.revenue.toString(),
					transactions: p.transactions,
					successRate: `${p.successRate.toFixed(1)}%`,
					percentage: `${((p.revenue / providerReport.revenue.grossRevenue) * 100).toFixed(1)}%`,
				})),
				topCustomers,
				alerts,
			}
		} catch (error) {
			console.error("Error generating analytics dashboard:", error)
			throw new Error("Failed to generate analytics dashboard")
		}
	}

	/**
	 * Generate detailed revenue report
	 */
	async generateRevenueReport(config: ReportConfig): Promise<RevenueReport> {
		return await this.revenueService.generateRevenueReport(config)
	}

	/**
	 * Generate comparison report
	 */
	async generateComparisonReport(currentConfig: ReportConfig, previousConfig: ReportConfig): Promise<ComparisonReport> {
		return await this.revenueService.generateComparisonReport(currentConfig, previousConfig)
	}

	/**
	 * Export analytics data
	 */
	async exportAnalyticsData(config: ReportConfig, format: "csv" | "json" = "csv"): Promise<string> {
		try {
			if (format === "csv") {
				return await this.revenueService.exportRevenueData(config)
			} else {
				const report = await this.revenueService.generateRevenueReport(config)
				return JSON.stringify(report, null, 2)
			}
		} catch (error) {
			console.error("Error exporting analytics data:", error)
			throw new Error("Failed to export analytics data")
		}
	}

	/**
	 * Get real-time metrics
	 */
	async getRealTimeMetrics(): Promise<{
		revenueToday: string
		transactionsToday: number
		successRateToday: string
		activeCustomers: number
	}> {
		try {
			const today = new Date()

			const todayReport = await this.revenueService.generateDailyRevenueSummary(today)

			return {
				revenueToday: todayReport.revenue,
				transactionsToday: todayReport.transactions,
				successRateToday: todayReport.successRate,
				activeCustomers: 0, // Would need to calculate from customer data
			}
		} catch (error) {
			console.error("Error getting real-time metrics:", error)
			throw new Error("Failed to get real-time metrics")
		}
	}

	/**
	 * Generate performance insights
	 */
	async generatePerformanceInsights(config: AnalyticsConfig): Promise<{
		insights: Array<{
			type: "revenue" | "customer" | "provider"
			title: string
			description: string
			impact: "positive" | "negative" | "neutral"
			recommendation?: string
		}>
		trends: Array<{
			metric: string
			direction: "up" | "down" | "stable"
			percentage: number
			period: string
		}>
	}> {
		try {
			// This would analyze data and generate insights
			// For now, we'll return mock insights
			const insights = [
				{
					type: "revenue" as const,
					title: "Revenue Growth",
					description: "Revenue has increased by 15% compared to last month",
					impact: "positive" as const,
					recommendation: "Consider expanding successful payment methods",
				},
				{
					type: "provider" as const,
					title: "Provider Performance",
					description: "Stripe is performing better than PayPal with 98% success rate",
					impact: "positive" as const,
				},
			]

			const trends = [
				{
					metric: "Revenue",
					direction: "up" as const,
					percentage: 15.2,
					period: "vs last month",
				},
				{
					metric: "Transaction Success Rate",
					direction: "up" as const,
					percentage: 2.1,
					period: "vs last week",
				},
			]

			return { insights, trends }
		} catch (error) {
			console.error("Error generating performance insights:", error)
			throw new Error("Failed to generate performance insights")
		}
	}

	// Private helper methods

	private async generateAlerts(config: AnalyticsConfig): Promise<
		Array<{
			type: "revenue" | "system"
			level: "info" | "warning" | "error"
			message: string
			timestamp: Date
		}>
	> {
		try {
			const alerts = []

			// Check for revenue alerts
			const todayReport = await this.revenueService.generateDailyRevenueSummary(new Date())
			if (parseFloat(todayReport.successRate) < 90) {
				alerts.push({
					type: "revenue" as const,
					level: "warning" as const,
					message: `Low success rate: ${todayReport.successRate}`,
					timestamp: new Date(),
				})
			}

			return alerts
		} catch (error) {
			console.error("Error generating alerts:", error)
			return []
		}
	}

	private static async getDB() {
		const { db } = await import("@/lib/db")
		return db
	}
}
