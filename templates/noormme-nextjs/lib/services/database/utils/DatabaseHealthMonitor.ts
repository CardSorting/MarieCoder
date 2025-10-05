/**
 * Database Health Monitor
 * Comprehensive health monitoring and alerting system
 * Following NOORMME Marie Kondo methodology - keeping only what sparks joy
 */

import { DatabaseConnectionManager } from "../connection/DatabaseConnectionManager"

export interface MonitoringConfig {
	enabled: boolean
	slowQueryThreshold: number
	healthCheckInterval: number
	alertThresholds: {
		slowQueries: number
		failedQueries: number
		connectionPool: number
		cacheHitRate: number
	}
}

export interface HealthAlert {
	id: string
	type: "performance" | "error" | "warning"
	severity: "low" | "medium" | "high" | "critical"
	message: string
	timestamp: Date
	resolved: boolean
	metadata?: Record<string, any>
}

export interface QueryMetrics {
	queryName: string
	executionTime: number
	timestamp: Date
	success: boolean
	error?: string
}

export class DatabaseHealthMonitor {
	private connectionManager: DatabaseConnectionManager
	private config: MonitoringConfig
	private alerts: Map<string, HealthAlert> = new Map()
	private queryMetrics: QueryMetrics[] = []
	private healthCheckInterval: NodeJS.Timeout | null = null
	private isRunning = false

	constructor(connectionManager: DatabaseConnectionManager, config: MonitoringConfig) {
		this.connectionManager = connectionManager
		this.config = config
	}

	/**
	 * Start health monitoring
	 */
	async start(): Promise<void> {
		if (!this.config.enabled || this.isRunning) {
			return
		}

		this.isRunning = true
		this.healthCheckInterval = setInterval(() => this.performHealthCheck(), this.config.healthCheckInterval)

		console.log("🔍 Database health monitoring started")
	}

	/**
	 * Stop health monitoring
	 */
	async stop(): Promise<void> {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval)
			this.healthCheckInterval = null
		}
		this.isRunning = false
		console.log("🔍 Database health monitoring stopped")
	}

	/**
	 * Execute query with monitoring
	 */
	async executeWithMonitoring<T>(queryFn: () => Promise<T>, queryName: string): Promise<T> {
		const startTime = Date.now()
		let success = true
		let error: string | undefined

		try {
			const result = await queryFn()
			return result
		} catch (err) {
			success = false
			error = err instanceof Error ? err.message : "Unknown error"
			throw err
		} finally {
			const executionTime = Date.now() - startTime

			// Record metrics
			this.recordQueryMetrics({
				queryName,
				executionTime,
				timestamp: new Date(),
				success,
				error,
			})

			// Check for slow queries
			if (executionTime > this.config.slowQueryThreshold) {
				this.createAlert({
					type: "performance",
					severity: executionTime > this.config.slowQueryThreshold * 2 ? "high" : "medium",
					message: `Slow query detected: ${queryName} took ${executionTime}ms`,
					metadata: { queryName, executionTime, threshold: this.config.slowQueryThreshold },
				})
			}
		}
	}

	/**
	 * Get current health status
	 */
	getHealthStatus(): {
		healthy: boolean
		alerts: HealthAlert[]
		metrics: {
			totalQueries: number
			slowQueries: number
			failedQueries: number
			averageExecutionTime: number
			activeAlerts: number
		}
	} {
		const now = Date.now()
		const recentMetrics = this.queryMetrics.filter(
			(m) => now - m.timestamp.getTime() < 24 * 60 * 60 * 1000, // Last 24 hours
		)

		const slowQueries = recentMetrics.filter((m) => m.executionTime > this.config.slowQueryThreshold).length

		const failedQueries = recentMetrics.filter((m) => !m.success).length

		const averageExecutionTime =
			recentMetrics.length > 0 ? recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length : 0

		const activeAlerts = Array.from(this.alerts.values()).filter((a) => !a.resolved).length

		const healthy =
			activeAlerts === 0 &&
			slowQueries < this.config.alertThresholds.slowQueries &&
			failedQueries < this.config.alertThresholds.failedQueries

		return {
			healthy,
			alerts: Array.from(this.alerts.values()),
			metrics: {
				totalQueries: recentMetrics.length,
				slowQueries,
				failedQueries,
				averageExecutionTime,
				activeAlerts,
			},
		}
	}

	/**
	 * Get query performance insights
	 */
	getQueryInsights(): {
		slowestQueries: Array<{
			queryName: string
			averageTime: number
			maxTime: number
			count: number
		}>
		mostFrequentQueries: Array<{
			queryName: string
			count: number
			averageTime: number
		}>
		errorPatterns: Array<{
			error: string
			count: number
			queries: string[]
		}>
	} {
		const now = Date.now()
		const recentMetrics = this.queryMetrics.filter(
			(m) => now - m.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000, // Last 7 days
		)

		// Group by query name
		const queryGroups = new Map<string, QueryMetrics[]>()
		for (const metric of recentMetrics) {
			if (!queryGroups.has(metric.queryName)) {
				queryGroups.set(metric.queryName, [])
			}
			queryGroups.get(metric.queryName)!.push(metric)
		}

		// Calculate slowest queries
		const slowestQueries = Array.from(queryGroups.entries())
			.map(([queryName, metrics]) => ({
				queryName,
				averageTime: metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length,
				maxTime: Math.max(...metrics.map((m) => m.executionTime)),
				count: metrics.length,
			}))
			.sort((a, b) => b.averageTime - a.averageTime)
			.slice(0, 10)

		// Calculate most frequent queries
		const mostFrequentQueries = Array.from(queryGroups.entries())
			.map(([queryName, metrics]) => ({
				queryName,
				count: metrics.length,
				averageTime: metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10)

		// Calculate error patterns
		const errorGroups = new Map<string, { count: number; queries: Set<string> }>()
		for (const metric of recentMetrics.filter((m) => !m.success && m.error)) {
			const error = metric.error!
			if (!errorGroups.has(error)) {
				errorGroups.set(error, { count: 0, queries: new Set() })
			}
			errorGroups.get(error)!.count++
			errorGroups.get(error)!.queries.add(metric.queryName)
		}

		const errorPatterns = Array.from(errorGroups.entries())
			.map(([error, data]) => ({
				error,
				count: data.count,
				queries: Array.from(data.queries),
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10)

		return {
			slowestQueries,
			mostFrequentQueries,
			errorPatterns,
		}
	}

	/**
	 * Resolve alert
	 */
	resolveAlert(alertId: string): boolean {
		const alert = this.alerts.get(alertId)
		if (alert) {
			alert.resolved = true
			return true
		}
		return false
	}

	/**
	 * Clear resolved alerts
	 */
	clearResolvedAlerts(): number {
		let cleared = 0
		for (const [id, alert] of this.alerts.entries()) {
			if (alert.resolved) {
				this.alerts.delete(id)
				cleared++
			}
		}
		return cleared
	}

	// Private methods

	private async performHealthCheck(): Promise<void> {
		try {
			// Check connection health
			const connectionHealth = await this.connectionManager.healthCheck()
			if (!connectionHealth.healthy) {
				this.createAlert({
					type: "error",
					severity: "critical",
					message: `Database connection failed: ${connectionHealth.error}`,
					metadata: { responseTime: connectionHealth.responseTime },
				})
			}

			// Check connection pool
			const stats = this.connectionManager.getStats()
			if (stats.activeConnections > this.config.alertThresholds.connectionPool) {
				this.createAlert({
					type: "warning",
					severity: "medium",
					message: `High connection pool usage: ${stats.activeConnections} active connections`,
					metadata: { activeConnections: stats.activeConnections },
				})
			}

			// Check WAL mode
			if (!stats.walMode) {
				this.createAlert({
					type: "warning",
					severity: "low",
					message: "WAL mode is not enabled - consider enabling for better performance",
					metadata: { walMode: stats.walMode },
				})
			}
		} catch (error) {
			this.createAlert({
				type: "error",
				severity: "high",
				message: `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				metadata: { error: error instanceof Error ? error.message : "Unknown error" },
			})
		}
	}

	private recordQueryMetrics(metrics: QueryMetrics): void {
		this.queryMetrics.push(metrics)

		// Keep only last 10000 metrics to prevent memory issues
		if (this.queryMetrics.length > 10000) {
			this.queryMetrics = this.queryMetrics.slice(-10000)
		}
	}

	private createAlert(alert: Omit<HealthAlert, "id" | "timestamp" | "resolved">): void {
		const alertId = `${alert.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

		const newAlert: HealthAlert = {
			...alert,
			id: alertId,
			timestamp: new Date(),
			resolved: false,
		}

		this.alerts.set(alertId, newAlert)

		// Log critical alerts
		if (alert.severity === "critical") {
			console.error(`🚨 CRITICAL ALERT: ${alert.message}`, alert.metadata)
		} else if (alert.severity === "high") {
			console.warn(`⚠️ HIGH ALERT: ${alert.message}`, alert.metadata)
		}
	}
}
