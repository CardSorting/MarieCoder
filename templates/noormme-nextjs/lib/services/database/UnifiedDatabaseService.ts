/**
 * Unified Database Service
 * The single source of truth for all database operations
 * Following NOORMME Marie Kondo methodology - keeping only what sparks joy
 */

import type { DatabaseConfig } from "./connection/DatabaseConnectionManager"
import { DatabaseConnectionManager } from "./connection/DatabaseConnectionManager"
import { DatabaseCacheManager } from "./utils/DatabaseCacheManager"
import { DatabaseHealthMonitor } from "./utils/DatabaseHealthMonitor"
import type { MigrationConfig } from "./utils/DatabaseMigrationService"
import { DatabaseMigrationService } from "./utils/DatabaseMigrationService"
import { DatabaseOptimizer } from "./utils/DatabaseOptimizer"
import { KyselyQueryBuilder } from "./utils/KyselyQueryBuilder"

export interface UnifiedDatabaseConfig {
	connection: DatabaseConfig
	migration: MigrationConfig
	cache: {
		enabled: boolean
		ttl: number
		maxSize: number
	}
	monitoring: {
		enabled: boolean
		slowQueryThreshold: number
		healthCheckInterval: number
	}
	optimization: {
		autoVacuum: boolean
		autoAnalyze: boolean
		walCheckpointInterval: number
		optimizationSchedule: {
			enabled: boolean
			interval: number
			timeOfDay?: string
		}
	}
}

export interface DatabaseMetrics {
	connections: {
		active: number
		total: number
		peak: number
	}
	queries: {
		total: number
		slow: number
		failed: number
		averageTime: number
	}
	cache: {
		hits: number
		misses: number
		hitRate: number
		size: number
	}
	performance: {
		walMode: boolean
		databaseSize: number
		lastOptimization: Date
	}
}

export class UnifiedDatabaseService {
	private static instance: UnifiedDatabaseService
	private connectionManager: DatabaseConnectionManager
	private queryBuilder: KyselyQueryBuilder
	private migrationService: DatabaseMigrationService
	private cacheManager: DatabaseCacheManager
	private healthMonitor: DatabaseHealthMonitor
	private optimizer: DatabaseOptimizer
	private config: UnifiedDatabaseConfig
	private metrics: DatabaseMetrics

	constructor(config: UnifiedDatabaseConfig) {
		this.config = config
		this.connectionManager = DatabaseConnectionManager.getInstance(config.connection)
		this.queryBuilder = new KyselyQueryBuilder()
		this.migrationService = new DatabaseMigrationService(this.connectionManager, config.migration)
		this.cacheManager = new DatabaseCacheManager({
			...config.cache,
			strategy: "lru", // Default strategy
		})
		this.healthMonitor = new DatabaseHealthMonitor(this.connectionManager, {
			...config.monitoring,
			alertThresholds: {
				slowQueries: 10,
				failedQueries: 5,
				connectionPool: 80,
				cacheHitRate: 0.7,
			},
		})
		this.optimizer = new DatabaseOptimizer(this.connectionManager, {
			...config.optimization,
			optimizationSchedule: {
				enabled: true,
				interval: 24 * 60 * 60 * 1000, // 24 hours
				timeOfDay: "02:00",
			},
		})

		this.metrics = {
			connections: { active: 0, total: 0, peak: 0 },
			queries: { total: 0, slow: 0, failed: 0, averageTime: 0 },
			cache: { hits: 0, misses: 0, hitRate: 0, size: 0 },
			performance: { walMode: false, databaseSize: 0, lastOptimization: new Date() },
		}

		this.initialize()
	}

	static getInstance(config?: UnifiedDatabaseConfig): UnifiedDatabaseService {
		if (!UnifiedDatabaseService.instance) {
			if (!config) {
				throw new Error("UnifiedDatabaseService requires configuration on first initialization")
			}
			UnifiedDatabaseService.instance = new UnifiedDatabaseService(config)
		}
		return UnifiedDatabaseService.instance
	}

	/**
	 * Initialize the unified database service
	 */
	private async initialize(): Promise<void> {
		try {
			// Initialize migration system
			await this.migrationService.initialize()

			// Run pending migrations
			const executedMigrations = await this.migrationService.migrate()
			if (executedMigrations.length > 0) {
				console.log(`✅ Executed ${executedMigrations.length} migrations`)
			}

			// Start health monitoring
			if (this.config.monitoring.enabled) {
				await this.healthMonitor.start()
			}

			// Start optimization scheduler
			if (this.config.optimization.autoVacuum || this.config.optimization.autoAnalyze) {
				await this.optimizer.startScheduler()
			}

			console.log("🚀 Unified Database Service initialized successfully")
		} catch (error) {
			console.error("❌ Failed to initialize Unified Database Service:", error)
			throw error
		}
	}

	/**
	 * Execute a query with full monitoring, caching, and optimization
	 */
	async executeQuery<T>(
		queryFn: () => Promise<T>,
		queryName: string,
		options: {
			useCache?: boolean
			cacheKey?: string
			cacheTTL?: number
			monitor?: boolean
		} = {},
	): Promise<T> {
		const startTime = Date.now()
		const {
			useCache = this.config.cache.enabled,
			cacheKey = `${queryName}_${JSON.stringify(arguments)}`,
			cacheTTL = this.config.cache.ttl,
			monitor = this.config.monitoring.enabled,
		} = options

		try {
			// Check cache first
			if (useCache) {
				const cached = await this.cacheManager.get<T>(cacheKey)
				if (cached) {
					this.metrics.cache.hits++
					this.updateCacheMetrics()
					return cached
				}
				this.metrics.cache.misses++
			}

			// Execute query with monitoring
			const result = monitor ? await this.healthMonitor.executeWithMonitoring(queryFn, queryName) : await queryFn()

			// Cache result if enabled
			if (useCache && result) {
				await this.cacheManager.set(cacheKey, result, cacheTTL)
			}

			// Update metrics
			this.updateQueryMetrics(Date.now() - startTime, false)
			this.updateCacheMetrics()

			return result
		} catch (error) {
			this.updateQueryMetrics(Date.now() - startTime, true)
			throw error
		}
	}

	/**
	 * Execute a transaction with automatic retry and monitoring
	 */
	async executeTransaction<T>(
		callback: (db: any) => Promise<T>,
		options: {
			maxRetries?: number
			retryDelay?: number
			monitor?: boolean
		} = {},
	): Promise<T> {
		const { maxRetries = 3, retryDelay = 1000, monitor = this.config.monitoring.enabled } = options

		const transactionFn = () => this.connectionManager.executeTransaction(callback)

		if (monitor) {
			return await this.healthMonitor.executeWithMonitoring(
				() => KyselyQueryBuilder.executeWithRetry(transactionFn, maxRetries, retryDelay),
				"transaction",
			)
		}

		return await KyselyQueryBuilder.executeWithRetry(transactionFn, maxRetries, retryDelay)
	}

	/**
	 * Get optimized query builder
	 */
	getQueryBuilder(): KyselyQueryBuilder {
		return this.queryBuilder
	}

	/**
	 * Get database connection
	 */
	getConnection(): any {
		return this.connectionManager.getConnection()
	}

	/**
	 * Get Kysely instance
	 */
	getKysely<T = any>(): any {
		return this.connectionManager.getKysely<T>()
	}

	/**
	 * Health check with comprehensive metrics
	 */
	async healthCheck(): Promise<{
		healthy: boolean
		metrics: DatabaseMetrics
		issues: string[]
		recommendations: string[]
	}> {
		const issues: string[] = []
		const recommendations: string[] = []

		try {
			// Check connection health
			const connectionHealth = await this.connectionManager.healthCheck()
			if (!connectionHealth.healthy) {
				issues.push(`Connection health check failed: ${connectionHealth.error}`)
			}

			// Check cache performance
			if (this.metrics.cache.hitRate < 0.7) {
				issues.push(`Low cache hit rate: ${(this.metrics.cache.hitRate * 100).toFixed(1)}%`)
				recommendations.push("Consider increasing cache TTL or optimizing queries")
			}

			// Check slow queries
			if (this.metrics.queries.slow > this.metrics.queries.total * 0.1) {
				issues.push(`High number of slow queries: ${this.metrics.queries.slow}`)
				recommendations.push("Review and optimize slow queries")
			}

			// Check database size
			if (this.metrics.performance.databaseSize > 100 * 1024 * 1024) {
				// 100MB
				recommendations.push("Consider running VACUUM to optimize database size")
			}

			// Check WAL mode
			if (!this.metrics.performance.walMode) {
				issues.push("WAL mode is not enabled")
				recommendations.push("Enable WAL mode for better performance")
			}

			const healthy = issues.length === 0

			return {
				healthy,
				metrics: { ...this.metrics },
				issues,
				recommendations,
			}
		} catch (error) {
			issues.push(`Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`)
			return {
				healthy: false,
				metrics: { ...this.metrics },
				issues,
				recommendations,
			}
		}
	}

	/**
	 * Optimize database performance
	 */
	async optimize(): Promise<void> {
		try {
			await this.optimizer.optimize()
			this.metrics.performance.lastOptimization = new Date()
			console.log("✅ Database optimization completed")
		} catch (error) {
			console.error("❌ Database optimization failed:", error)
			throw error
		}
	}

	/**
	 * Create database backup
	 */
	async createBackup(backupPath?: string): Promise<string> {
		try {
			const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0]
			const defaultBackupPath = `./data/backups/backup_${timestamp}.db`
			const finalBackupPath = backupPath || defaultBackupPath

			this.connectionManager.backupDatabase(finalBackupPath)
			console.log(`✅ Database backup created: ${finalBackupPath}`)

			return finalBackupPath
		} catch (error) {
			console.error("❌ Database backup failed:", error)
			throw error
		}
	}

	/**
	 * Get comprehensive database statistics
	 */
	getStats(): DatabaseMetrics {
		return { ...this.metrics }
	}

	/**
	 * Clear cache
	 */
	async clearCache(): Promise<void> {
		await this.cacheManager.clear()
		this.metrics.cache = { hits: 0, misses: 0, hitRate: 0, size: 0 }
		console.log("✅ Cache cleared")
	}

	/**
	 * Close all connections and cleanup
	 */
	async close(): Promise<void> {
		try {
			await this.healthMonitor.stop()
			await this.optimizer.stopScheduler()
			await this.cacheManager.close()
			this.connectionManager.closeAllConnections()
			console.log("✅ Unified Database Service closed")
		} catch (error) {
			console.error("❌ Error closing Unified Database Service:", error)
			throw error
		}
	}

	// Private helper methods

	private updateQueryMetrics(executionTime: number, failed: boolean): void {
		this.metrics.queries.total++
		if (failed) {
			this.metrics.queries.failed++
		}
		if (executionTime > this.config.monitoring.slowQueryThreshold) {
			this.metrics.queries.slow++
		}

		// Update average execution time
		const totalTime = this.metrics.queries.averageTime * (this.metrics.queries.total - 1) + executionTime
		this.metrics.queries.averageTime = totalTime / this.metrics.queries.total
	}

	private updateCacheMetrics(): void {
		const total = this.metrics.cache.hits + this.metrics.cache.misses
		this.metrics.cache.hitRate = total > 0 ? this.metrics.cache.hits / total : 0
		this.metrics.cache.size = this.cacheManager.getSize()
	}
}
