/**
 * Database Optimizer
 * Intelligent database optimization with automatic scheduling
 * Following NOORMME Marie Kondo methodology - keeping only what sparks joy
 */

import { DatabaseConnectionManager } from "../connection/DatabaseConnectionManager"

export interface OptimizationConfig {
	autoVacuum: boolean
	autoAnalyze: boolean
	walCheckpointInterval: number
	optimizationSchedule: {
		enabled: boolean
		interval: number // in milliseconds
		timeOfDay?: string // HH:MM format
	}
}

export interface OptimizationResult {
	operation: string
	success: boolean
	duration: number
	details: string
	timestamp: Date
}

export class DatabaseOptimizer {
	private connectionManager: DatabaseConnectionManager
	private config: OptimizationConfig
	private optimizationHistory: OptimizationResult[] = []
	private schedulerInterval: NodeJS.Timeout | null = null
	private isRunning = false

	constructor(connectionManager: DatabaseConnectionManager, config: OptimizationConfig) {
		this.connectionManager = connectionManager
		this.config = config
	}

	/**
	 * Start optimization scheduler
	 */
	async startScheduler(): Promise<void> {
		if (!this.config.optimizationSchedule.enabled || this.isRunning) {
			return
		}

		this.isRunning = true

		if (this.config.optimizationSchedule.timeOfDay) {
			// Schedule for specific time of day
			this.scheduleDailyOptimization()
		} else {
			// Schedule at regular intervals
			this.schedulerInterval = setInterval(() => this.performOptimization(), this.config.optimizationSchedule.interval)
		}

		console.log("⚡ Database optimization scheduler started")
	}

	/**
	 * Stop optimization scheduler
	 */
	async stopScheduler(): Promise<void> {
		if (this.schedulerInterval) {
			clearInterval(this.schedulerInterval)
			this.schedulerInterval = null
		}
		this.isRunning = false
		console.log("⚡ Database optimization scheduler stopped")
	}

	/**
	 * Perform comprehensive database optimization
	 */
	async optimize(): Promise<OptimizationResult[]> {
		const results: OptimizationResult[] = []

		try {
			// WAL checkpoint
			if (this.config.walCheckpointInterval > 0) {
				results.push(await this.performWalCheckpoint())
			}

			// Analyze tables
			if (this.config.autoAnalyze) {
				results.push(await this.performAnalyze())
			}

			// Vacuum database
			if (this.config.autoVacuum) {
				results.push(await this.performVacuum())
			}

			// Update statistics
			results.push(await this.updateStatistics())

			// Clean up old data
			results.push(await this.cleanupOldData())

			// Store results
			this.optimizationHistory.push(...results)

			// Keep only last 100 optimization results
			if (this.optimizationHistory.length > 100) {
				this.optimizationHistory = this.optimizationHistory.slice(-100)
			}

			console.log("✅ Database optimization completed successfully")
			return results
		} catch (error) {
			const errorResult: OptimizationResult = {
				operation: "optimization",
				success: false,
				duration: 0,
				details: `Optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: new Date(),
			}

			results.push(errorResult)
			this.optimizationHistory.push(errorResult)

			console.error("❌ Database optimization failed:", error)
			throw error
		}
	}

	/**
	 * Get optimization history
	 */
	getOptimizationHistory(): OptimizationResult[] {
		return [...this.optimizationHistory]
	}

	/**
	 * Get optimization statistics
	 */
	getOptimizationStats(): {
		totalOptimizations: number
		successfulOptimizations: number
		averageDuration: number
		lastOptimization: Date | null
		mostRecentResults: OptimizationResult[]
	} {
		const total = this.optimizationHistory.length
		const successful = this.optimizationHistory.filter((r) => r.success).length
		const averageDuration = total > 0 ? this.optimizationHistory.reduce((sum, r) => sum + r.duration, 0) / total : 0
		const lastOptimization = total > 0 ? this.optimizationHistory[this.optimizationHistory.length - 1].timestamp : null
		const mostRecentResults = this.optimizationHistory.slice(-10)

		return {
			totalOptimizations: total,
			successfulOptimizations: successful,
			averageDuration,
			lastOptimization,
			mostRecentResults,
		}
	}

	/**
	 * Check if optimization is needed
	 */
	async isOptimizationNeeded(): Promise<{
		needed: boolean
		reasons: string[]
		recommendations: string[]
	}> {
		const reasons: string[] = []
		const recommendations: string[] = []

		try {
			const connection = this.connectionManager.getConnection()

			// Check database size
			const dbSize = await this.getDatabaseSize()
			if (dbSize > 50 * 1024 * 1024) {
				// 50MB
				reasons.push(`Large database size: ${(dbSize / 1024 / 1024).toFixed(2)}MB`)
				recommendations.push("Consider running VACUUM to reclaim space")
			}

			// Check WAL file size
			const walSize = await this.getWalSize()
			if (walSize > 10 * 1024 * 1024) {
				// 10MB
				reasons.push(`Large WAL file: ${(walSize / 1024 / 1024).toFixed(2)}MB`)
				recommendations.push("Run WAL checkpoint to reduce WAL file size")
			}

			// Check table statistics age
			const statsAge = await this.getStatisticsAge()
			if (statsAge > 7 * 24 * 60 * 60 * 1000) {
				// 7 days
				reasons.push(`Old table statistics: ${Math.floor(statsAge / (24 * 60 * 60 * 1000))} days`)
				recommendations.push("Run ANALYZE to update table statistics")
			}

			// Check for fragmentation
			const fragmentation = await this.getFragmentationLevel()
			if (fragmentation > 0.3) {
				// 30%
				reasons.push(`High fragmentation: ${(fragmentation * 100).toFixed(1)}%`)
				recommendations.push("Run VACUUM to reduce fragmentation")
			}

			return {
				needed: reasons.length > 0,
				reasons,
				recommendations,
			}
		} catch (error) {
			console.error("Error checking optimization needs:", error)
			return {
				needed: false,
				reasons: [],
				recommendations: [],
			}
		}
	}

	// Private methods

	private async performOptimization(): Promise<void> {
		try {
			const needsOptimization = await this.isOptimizationNeeded()
			if (needsOptimization.needed) {
				console.log("🔧 Optimization needed, starting optimization...")
				await this.optimize()
			}
		} catch (error) {
			console.error("Error in scheduled optimization:", error)
		}
	}

	private scheduleDailyOptimization(): void {
		const [hours, minutes] = this.config.optimizationSchedule.timeOfDay!.split(":").map(Number)

		const scheduleNext = () => {
			const now = new Date()
			const scheduled = new Date()
			scheduled.setHours(hours, minutes, 0, 0)

			// If time has passed today, schedule for tomorrow
			if (scheduled <= now) {
				scheduled.setDate(scheduled.getDate() + 1)
			}

			const delay = scheduled.getTime() - now.getTime()

			setTimeout(async () => {
				await this.performOptimization()
				scheduleNext() // Schedule next day
			}, delay)
		}

		scheduleNext()
	}

	private async performWalCheckpoint(): Promise<OptimizationResult> {
		const startTime = Date.now()

		try {
			const connection = this.connectionManager.getConnection()
			connection.exec("PRAGMA wal_checkpoint(TRUNCATE)")

			const duration = Date.now() - startTime
			return {
				operation: "wal_checkpoint",
				success: true,
				duration,
				details: "WAL checkpoint completed successfully",
				timestamp: new Date(),
			}
		} catch (error) {
			const duration = Date.now() - startTime
			return {
				operation: "wal_checkpoint",
				success: false,
				duration,
				details: `WAL checkpoint failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: new Date(),
			}
		}
	}

	private async performAnalyze(): Promise<OptimizationResult> {
		const startTime = Date.now()

		try {
			const connection = this.connectionManager.getConnection()
			connection.exec("ANALYZE")

			const duration = Date.now() - startTime
			return {
				operation: "analyze",
				success: true,
				duration,
				details: "Table analysis completed successfully",
				timestamp: new Date(),
			}
		} catch (error) {
			const duration = Date.now() - startTime
			return {
				operation: "analyze",
				success: false,
				duration,
				details: `Table analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: new Date(),
			}
		}
	}

	private async performVacuum(): Promise<OptimizationResult> {
		const startTime = Date.now()

		try {
			const connection = this.connectionManager.getConnection()
			connection.exec("VACUUM")

			const duration = Date.now() - startTime
			return {
				operation: "vacuum",
				success: true,
				duration,
				details: "Database vacuum completed successfully",
				timestamp: new Date(),
			}
		} catch (error) {
			const duration = Date.now() - startTime
			return {
				operation: "vacuum",
				success: false,
				duration,
				details: `Database vacuum failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: new Date(),
			}
		}
	}

	private async updateStatistics(): Promise<OptimizationResult> {
		const startTime = Date.now()

		try {
			const connection = this.connectionManager.getConnection()

			// Update database statistics
			connection.exec("PRAGMA optimize")

			const duration = Date.now() - startTime
			return {
				operation: "update_statistics",
				success: true,
				duration,
				details: "Database statistics updated successfully",
				timestamp: new Date(),
			}
		} catch (error) {
			const duration = Date.now() - startTime
			return {
				operation: "update_statistics",
				success: false,
				duration,
				details: `Statistics update failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: new Date(),
			}
		}
	}

	private async cleanupOldData(): Promise<OptimizationResult> {
		const startTime = Date.now()

		try {
			const connection = this.connectionManager.getConnection()

			// Clean up old audit logs (older than 90 days)
			const cutoffDate = new Date()
			cutoffDate.setDate(cutoffDate.getDate() - 90)

			const stmt = connection.prepare(`
        DELETE FROM audit_logs 
        WHERE created_at < ?
      `)

			const result = stmt.run(cutoffDate.toISOString())

			const duration = Date.now() - startTime
			return {
				operation: "cleanup_old_data",
				success: true,
				duration,
				details: `Cleaned up ${result.changes} old audit log entries`,
				timestamp: new Date(),
			}
		} catch (error) {
			const duration = Date.now() - startTime
			return {
				operation: "cleanup_old_data",
				success: false,
				duration,
				details: `Data cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: new Date(),
			}
		}
	}

	private async getDatabaseSize(): Promise<number> {
		const connection = this.connectionManager.getConnection()
		const result = connection.prepare("PRAGMA page_count").get() as { page_count: number }
		const pageSize = connection.prepare("PRAGMA page_size").get() as { page_size: number }
		return result.page_count * pageSize.page_size
	}

	private async getWalSize(): Promise<number> {
		const connection = this.connectionManager.getConnection()
		const result = connection.prepare("PRAGMA wal_autocheckpoint").get() as { wal_autocheckpoint: number }
		// This is a simplified check - in reality, you'd check the actual WAL file size
		return result.wal_autocheckpoint * 1024 // Approximate
	}

	private async getStatisticsAge(): Promise<number> {
		const connection = this.connectionManager.getConnection()
		const result = connection.prepare("PRAGMA table_info(sqlite_stat1)").get()
		// This is a simplified check - in reality, you'd check when statistics were last updated
		return 0 // Placeholder
	}

	private async getFragmentationLevel(): Promise<number> {
		const connection = this.connectionManager.getConnection()
		const result = connection.prepare("PRAGMA integrity_check").get() as { integrity_check: string }
		// This is a simplified check - in reality, you'd analyze fragmentation
		return result.integrity_check === "ok" ? 0 : 0.5 // Placeholder
	}
}
