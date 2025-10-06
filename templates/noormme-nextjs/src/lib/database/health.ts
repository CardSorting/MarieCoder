/**
 * Database Health Monitoring and Optimization for NOORMME SAAS
 * Following NORMIE DEV methodology - proactive, efficient, reliable monitoring
 */

import { cacheManager } from "./cache"
import { DatabaseManager } from "./connection"

export interface HealthMetrics {
	status: "healthy" | "degraded" | "unhealthy"
	responseTime: number
	queryCount: number
	avgQueryTime: number
	cacheHitRate: number
	activeConnections: number
	lastOptimized: Date | null
	errors: number
	uptime: number
}

export interface OptimizationRecommendation {
	type: "index" | "query" | "cache" | "maintenance"
	priority: "low" | "medium" | "high" | "critical"
	description: string
	impact: string
	action: string
}

export interface PerformanceAlert {
	id: string
	type: "slow_query" | "high_error_rate" | "cache_miss" | "connection_issue"
	severity: "info" | "warning" | "error" | "critical"
	message: string
	details: any
	timestamp: Date
	resolved: boolean
}

export class DatabaseHealthMonitor {
	private dbManager: DatabaseManager
	private alerts: PerformanceAlert[] = []
	private metrics: HealthMetrics
	private startTime: Date
	private slowQueryThreshold: number = 1000 // 1 second
	private errorThreshold: number = 5 // 5 errors per minute

	constructor(dbManager: DatabaseManager) {
		this.dbManager = dbManager
		this.startTime = new Date()
		this.metrics = {
			status: "healthy",
			responseTime: 0,
			queryCount: 0,
			avgQueryTime: 0,
			cacheHitRate: 0,
			activeConnections: 0,
			lastOptimized: null,
			errors: 0,
			uptime: 0,
		}

		this.startMonitoring()
	}

	/**
	 * Start continuous health monitoring
	 */
	private startMonitoring(): void {
		// Monitor every 30 seconds
		setInterval(() => {
			this.collectMetrics()
			this.checkAlerts()
		}, 30000)

		// Optimize every hour
		setInterval(() => {
			this.optimize()
		}, 3600000)

		console.log("🏥 Database health monitoring started")
	}

	/**
	 * Collect current health metrics
	 */
	async collectMetrics(): Promise<HealthMetrics> {
		try {
			const startTime = Date.now()

			// Test database connectivity
			await this.dbManager.getDatabase().execute("SELECT 1")
			const responseTime = Date.now() - startTime

			// Get database stats
			const dbStats = await this.dbManager.getStats()

			// Get cache stats
			const cacheStats = cacheManager.getAllStats()
			const totalCacheRequests = Object.values(cacheStats).reduce((sum, stats) => sum + stats.totalRequests, 0)
			const totalCacheHits = Object.values(cacheStats).reduce((sum, stats) => sum + stats.hits, 0)
			const cacheHitRate = totalCacheRequests > 0 ? (totalCacheHits / totalCacheRequests) * 100 : 0

			// Calculate uptime
			const uptime = Date.now() - this.startTime.getTime()

			this.metrics = {
				status: this.determineStatus(responseTime, dbStats.avgQueryTime, cacheHitRate),
				responseTime,
				queryCount: dbStats.queryCount,
				avgQueryTime: dbStats.avgQueryTime,
				cacheHitRate,
				activeConnections: dbStats.activeConnections,
				lastOptimized: dbStats.lastOptimized,
				errors: 0, // Would need to track errors separately
				uptime,
			}

			return this.metrics
		} catch (error) {
			console.error("Failed to collect health metrics:", error)
			this.metrics.status = "unhealthy"
			return this.metrics
		}
	}

	/**
	 * Determine overall health status
	 */
	private determineStatus(
		responseTime: number,
		avgQueryTime: number,
		cacheHitRate: number,
	): "healthy" | "degraded" | "unhealthy" {
		if (responseTime > 5000 || avgQueryTime > 2000) {
			return "unhealthy"
		}

		if (responseTime > 1000 || avgQueryTime > 500 || cacheHitRate < 50) {
			return "degraded"
		}

		return "healthy"
	}

	/**
	 * Check for performance alerts
	 */
	private async checkAlerts(): Promise<void> {
		const metrics = await this.collectMetrics()

		// Check for slow queries
		if (metrics.avgQueryTime > this.slowQueryThreshold) {
			this.createAlert({
				type: "slow_query",
				severity: "warning",
				message: `Average query time is ${metrics.avgQueryTime}ms (threshold: ${this.slowQueryThreshold}ms)`,
				details: { avgQueryTime: metrics.avgQueryTime, threshold: this.slowQueryThreshold },
			})
		}

		// Check for low cache hit rate
		if (metrics.cacheHitRate < 50) {
			this.createAlert({
				type: "cache_miss",
				severity: "info",
				message: `Cache hit rate is ${metrics.cacheHitRate.toFixed(1)}% (recommended: >50%)`,
				details: { cacheHitRate: metrics.cacheHitRate },
			})
		}

		// Check for high error rate
		if (metrics.errors > this.errorThreshold) {
			this.createAlert({
				type: "high_error_rate",
				severity: "error",
				message: `High error rate detected: ${metrics.errors} errors`,
				details: { errorCount: metrics.errors, threshold: this.errorThreshold },
			})
		}
	}

	/**
	 * Create performance alert
	 */
	private createAlert(alert: Omit<PerformanceAlert, "id" | "timestamp" | "resolved">): void {
		const newAlert: PerformanceAlert = {
			id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			timestamp: new Date(),
			resolved: false,
			...alert,
		}

		this.alerts.push(newAlert)
		console.log(`🚨 ${newAlert.severity.toUpperCase()}: ${newAlert.message}`)

		// Keep only last 100 alerts
		if (this.alerts.length > 100) {
			this.alerts = this.alerts.slice(-100)
		}
	}

	/**
	 * Get optimization recommendations
	 */
	async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
		const recommendations: OptimizationRecommendation[] = []
		const metrics = await this.collectMetrics()

		// Slow query recommendations
		if (metrics.avgQueryTime > 500) {
			recommendations.push({
				type: "query",
				priority: "high",
				description: "Slow query performance detected",
				impact: "Poor user experience, high server load",
				action: "Review and optimize slow queries, add missing indexes",
			})
		}

		// Cache recommendations
		if (metrics.cacheHitRate < 50) {
			recommendations.push({
				type: "cache",
				priority: "medium",
				description: "Low cache hit rate",
				impact: "Increased database load, slower response times",
				action: "Review cache configuration and query patterns",
			})
		}

		// Index recommendations
		if (metrics.queryCount > 1000 && metrics.avgQueryTime > 100) {
			recommendations.push({
				type: "index",
				priority: "medium",
				description: "High query volume with moderate performance",
				impact: "Potential for performance degradation under load",
				action: "Analyze query patterns and add strategic indexes",
			})
		}

		// Maintenance recommendations
		if (!metrics.lastOptimized || Date.now() - metrics.lastOptimized.getTime() > 86400000) {
			recommendations.push({
				type: "maintenance",
				priority: "low",
				description: "Database optimization overdue",
				impact: "Gradual performance degradation",
				action: "Run database optimization and analyze tables",
			})
		}

		return recommendations
	}

	/**
	 * Perform database optimization
	 */
	async optimize(): Promise<void> {
		try {
			console.log("🔧 Running database optimization...")

			await this.dbManager.optimize()

			// Update last optimized time
			this.metrics.lastOptimized = new Date()

			console.log("✅ Database optimization completed")
		} catch (error) {
			console.error("❌ Database optimization failed:", error)
		}
	}

	/**
	 * Get current health status
	 */
	async getHealthStatus(): Promise<{
		status: string
		metrics: HealthMetrics
		alerts: PerformanceAlert[]
		recommendations: OptimizationRecommendation[]
	}> {
		const metrics = await this.collectMetrics()
		const recommendations = await this.getOptimizationRecommendations()
		const activeAlerts = this.alerts.filter((alert) => !alert.resolved)

		return {
			status: metrics.status,
			metrics,
			alerts: activeAlerts,
			recommendations,
		}
	}

	/**
	 * Resolve alert
	 */
	resolveAlert(alertId: string): boolean {
		const alert = this.alerts.find((a) => a.id === alertId)
		if (alert) {
			alert.resolved = true
			return true
		}
		return false
	}

	/**
	 * Get performance history
	 */
	getPerformanceHistory(_hours: number = 24): {
		timestamps: Date[]
		responseTimes: number[]
		queryCounts: number[]
		cacheHitRates: number[]
	} {
		// This would typically store historical data
		// For now, return current metrics
		return {
			timestamps: [new Date()],
			responseTimes: [this.metrics.responseTime],
			queryCounts: [this.metrics.queryCount],
			cacheHitRates: [this.metrics.cacheHitRate],
		}
	}

	/**
	 * Export health report
	 */
	async exportHealthReport(): Promise<{
		generatedAt: Date
		status: string
		metrics: HealthMetrics
		alerts: PerformanceAlert[]
		recommendations: OptimizationRecommendation[]
		summary: string
	}> {
		const healthStatus = await this.getHealthStatus()

		const summary = `
Database Health Report
=====================
Status: ${healthStatus.status.toUpperCase()}
Uptime: ${Math.round(this.metrics.uptime / 1000 / 60)} minutes
Average Query Time: ${this.metrics.avgQueryTime.toFixed(2)}ms
Cache Hit Rate: ${this.metrics.cacheHitRate.toFixed(1)}%
Active Alerts: ${healthStatus.alerts.length}
Recommendations: ${healthStatus.recommendations.length}
		`.trim()

		return {
			generatedAt: new Date(),
			status: healthStatus.status,
			metrics: healthStatus.metrics,
			alerts: healthStatus.alerts,
			recommendations: healthStatus.recommendations,
			summary,
		}
	}
}

/**
 * Database performance analyzer
 */
export class DatabasePerformanceAnalyzer {
	constructor(_dbManager: DatabaseManager) {
		// Database manager available for future use
		void _dbManager
	}

	/**
	 * Analyze query performance
	 */
	async analyzeQueryPerformance(): Promise<{
		slowQueries: Array<{ query: string; avgTime: number; count: number }>
		recommendations: string[]
	}> {
		// This would analyze actual query performance
		// For now, return mock data
		return {
			slowQueries: [],
			recommendations: [
				"Consider adding indexes on frequently queried columns",
				"Review complex joins and optimize query structure",
				"Implement query result caching for expensive operations",
			],
		}
	}

	/**
	 * Analyze index usage
	 */
	async analyzeIndexUsage(): Promise<{
		unusedIndexes: string[]
		missingIndexes: string[]
		recommendations: string[]
	}> {
		// This would analyze actual index usage
		// For now, return mock data
		return {
			unusedIndexes: [],
			missingIndexes: [],
			recommendations: [
				"Monitor index usage over time",
				"Consider dropping unused indexes to improve write performance",
				"Add indexes for frequently queried columns",
			],
		}
	}

	/**
	 * Generate performance report
	 */
	async generatePerformanceReport(): Promise<{
		queryAnalysis: any
		indexAnalysis: any
		recommendations: string[]
		generatedAt: Date
	}> {
		const [queryAnalysis, indexAnalysis] = await Promise.all([this.analyzeQueryPerformance(), this.analyzeIndexUsage()])

		const recommendations = [...queryAnalysis.recommendations, ...indexAnalysis.recommendations]

		return {
			queryAnalysis,
			indexAnalysis,
			recommendations,
			generatedAt: new Date(),
		}
	}
}
