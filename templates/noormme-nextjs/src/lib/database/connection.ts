/**
 * Enhanced Database Connection Manager for NOORMME SAAS
 * Following NORMIE DEV methodology - optimized, reliable, performant
 */

import { NOORMME } from "noormme"
import { MigrationManager } from "./migration"
import { QueryBuilderFactory, SAASQueryPatterns } from "./query-builder"

export interface DatabaseConfig {
	database: string
	wal?: boolean
	cacheSize?: number
	synchronous?: "OFF" | "NORMAL" | "FULL"
	tempStore?: "DEFAULT" | "FILE" | "MEMORY"
	foreignKeys?: boolean
	optimize?: boolean
	timeout?: number
	busyTimeout?: number
}

export interface DatabaseStats {
	totalConnections: number
	activeConnections: number
	queryCount: number
	avgQueryTime: number
	lastOptimized: Date | null
	cacheHits: number
	cacheMisses: number
}

export class DatabaseManager {
	private static instance: DatabaseManager
	private db: NOORMME
	private config: DatabaseConfig
	private queryBuilder: QueryBuilderFactory
	private saasPatterns: SAASQueryPatterns
	private migrationManager: MigrationManager
	private stats: DatabaseStats
	private queryTimes: number[] = []

	private constructor(config: DatabaseConfig) {
		this.config = {
			database: config.database,
			wal: config.wal ?? true,
			cacheSize: config.cacheSize ?? -64000, // 64MB
			synchronous: config.synchronous ?? "NORMAL",
			tempStore: config.tempStore ?? "MEMORY",
			foreignKeys: config.foreignKeys ?? true,
			optimize: config.optimize ?? true,
			timeout: config.timeout ?? 30000,
			busyTimeout: config.busyTimeout ?? 5000,
		}

		this.db = new NOORMME({
			dialect: "sqlite",
			connection: {
				database: this.config.database,
			} as any,
		})

		this.queryBuilder = new QueryBuilderFactory(this.db.getKysely() as any)
		this.saasPatterns = new SAASQueryPatterns(this.queryBuilder)
		this.migrationManager = MigrationManager.getInstance(this.db.getKysely() as any)

		this.stats = {
			totalConnections: 0,
			activeConnections: 0,
			queryCount: 0,
			avgQueryTime: 0,
			lastOptimized: null,
			cacheHits: 0,
			cacheMisses: 0,
		}
	}

	static getInstance(config?: DatabaseConfig): DatabaseManager {
		if (!DatabaseManager.instance) {
			if (!config) {
				throw new Error("Database configuration required for first initialization")
			}
			DatabaseManager.instance = new DatabaseManager(config)
		}
		return DatabaseManager.instance
	}

	/**
	 * Initialize database with optimal settings
	 */
	async initialize(): Promise<void> {
		try {
			console.log("🔄 Initializing database connection...")

			// Apply SQLite optimizations
			await this.applyOptimizations()

			// Run migrations
			await this.runMigrations()

			// Create initial data if needed
			await this.initializeData()

			// Schedule periodic optimizations
			this.scheduleOptimizations()

			console.log("✅ Database initialized successfully")
		} catch (error) {
			console.error("❌ Database initialization failed:", error)
			throw error
		}
	}

	/**
	 * Apply SQLite performance optimizations
	 */
	private async applyOptimizations(): Promise<void> {
		const optimizations = [
			// WAL mode for better concurrency
			{ sql: "PRAGMA journal_mode=WAL", description: "Enable WAL mode" },

			// Optimize synchronous behavior
			{ sql: `PRAGMA synchronous=${this.config.synchronous}`, description: "Set synchronous mode" },

			// Increase cache size
			{ sql: `PRAGMA cache_size=${this.config.cacheSize}`, description: "Set cache size" },

			// Use memory for temporary storage
			{ sql: `PRAGMA temp_store=${this.config.tempStore}`, description: "Set temp store" },

			// Enable foreign keys
			{ sql: `PRAGMA foreign_keys=${this.config.foreignKeys ? "ON" : "OFF"}`, description: "Set foreign keys" },

			// Set busy timeout
			{ sql: `PRAGMA busy_timeout=${this.config.busyTimeout}`, description: "Set busy timeout" },

			// Optimize database
			{ sql: "PRAGMA optimize", description: "Optimize database" },
		]

		for (const optimization of optimizations) {
			await this.db.execute(optimization.sql)
			console.log(`  ✅ ${optimization.description}`)
		}
	}

	/**
	 * Run database migrations
	 */
	private async runMigrations(): Promise<void> {
		// Import migrations dynamically
		const { initialSchema } = await import("./migrations/001_initial_schema")

		const migrations = [initialSchema]
		await this.migrationManager.runMigrations(migrations)
	}

	/**
	 * Initialize default data
	 */
	private async initializeData(): Promise<void> {
		// Check if we need to seed initial data
		const userCount = await this.queryBuilder.create("users").count()

		if (userCount === 0) {
			console.log("🌱 Seeding initial data...")
			await this.seedInitialData()
		}
	}

	/**
	 * Seed initial data
	 */
	private async seedInitialData(): Promise<void> {
		// Create default plans
		const defaultPlans = [
			{
				id: "plan-free",
				name: "Free Plan",
				description: "Perfect for getting started",
				price: 0,
				currency: "USD",
				interval: "month" as const,
				features: JSON.stringify(["Up to 100 requests/month", "Basic support", "Standard features"]),
				limits: JSON.stringify({
					requests: 100,
					storage: "1GB",
					users: 1,
				}),
				isActive: true,
				sortOrder: 1,
			},
			{
				id: "plan-pro",
				name: "Pro Plan",
				description: "For growing businesses",
				price: 29.99,
				currency: "USD",
				interval: "month" as const,
				features: JSON.stringify(["Up to 10,000 requests/month", "Priority support", "Advanced features", "API access"]),
				limits: JSON.stringify({
					requests: 10000,
					storage: "10GB",
					users: 5,
				}),
				isActive: true,
				sortOrder: 2,
			},
			{
				id: "plan-enterprise",
				name: "Enterprise Plan",
				description: "For large organizations",
				price: 99.99,
				currency: "USD",
				interval: "month" as const,
				features: JSON.stringify([
					"Unlimited requests",
					"24/7 dedicated support",
					"All features",
					"Custom integrations",
					"SSO support",
				]),
				limits: JSON.stringify({
					requests: -1, // unlimited
					storage: "100GB",
					users: -1, // unlimited
				}),
				isActive: true,
				sortOrder: 3,
			},
		]

		for (const plan of defaultPlans) {
			await this.db.getKysely().insertInto("plans").values(plan).execute()
		}

		// Create default system settings
		const defaultSettings = [
			{
				id: "setting-app-name",
				key: "app_name",
				value: "NOORMME SAAS",
				type: "string" as const,
				description: "Application name",
				isPublic: true,
			},
			{
				id: "setting-app-url",
				key: "app_url",
				value: process.env.APP_URL || "http://localhost:3000",
				type: "string" as const,
				description: "Application URL",
				isPublic: true,
			},
			{
				id: "setting-maintenance-mode",
				key: "maintenance_mode",
				value: "false",
				type: "boolean" as const,
				description: "Enable maintenance mode",
				isPublic: false,
			},
			{
				id: "setting-registration-enabled",
				key: "registration_enabled",
				value: "true",
				type: "boolean" as const,
				description: "Allow user registration",
				isPublic: true,
			},
		]

		for (const setting of defaultSettings) {
			await this.db.getKysely().insertInto("system_settings").values(setting).execute()
		}

		console.log("  ✅ Initial data seeded")
	}

	/**
	 * Schedule periodic database optimizations
	 */
	private scheduleOptimizations(): void {
		// Run optimization every hour
		setInterval(
			async () => {
				await this.optimize()
			},
			60 * 60 * 1000,
		) // 1 hour
	}

	/**
	 * Optimize database performance
	 */
	async optimize(): Promise<void> {
		try {
			const startTime = Date.now()

			// Run ANALYZE to update statistics
			await this.db.execute("ANALYZE")

			// Run VACUUM to reclaim space
			await this.db.execute("VACUUM")

			// Update optimization timestamp
			this.stats.lastOptimized = new Date()

			const duration = Date.now() - startTime
			console.log(`✅ Database optimized (${duration}ms)`)
		} catch (error) {
			console.error("❌ Database optimization failed:", error)
		}
	}

	/**
	 * Get database statistics
	 */
	async getStats(): Promise<DatabaseStats> {
		// Get table sizes
		const tableSizes = await this.db.execute(`
			SELECT name, 
				   (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as count
			FROM sqlite_master m
			WHERE type='table' AND name NOT LIKE 'sqlite_%'
		`)

		// Update stats
		this.stats.totalConnections = tableSizes.length
		this.stats.activeConnections = tableSizes.filter((t: any) => t.count > 0).length

		return { ...this.stats }
	}

	/**
	 * Execute query with performance tracking
	 */
	async executeQuery<T>(queryFn: () => Promise<T>): Promise<T> {
		const startTime = Date.now()

		try {
			const result = await queryFn()

			const duration = Date.now() - startTime
			this.queryTimes.push(duration)
			this.stats.queryCount++

			// Keep only last 100 query times for average calculation
			if (this.queryTimes.length > 100) {
				this.queryTimes = this.queryTimes.slice(-100)
			}

			this.stats.avgQueryTime = this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length

			return result
		} catch (error) {
			console.error("❌ Query execution failed:", error)
			throw error
		}
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<{
		status: "healthy" | "degraded" | "unhealthy"
		details: {
			connected: boolean
			avgQueryTime: number
			lastOptimized: Date | null
			queryCount: number
		}
	}> {
		try {
			const startTime = Date.now()
			await this.db.execute("SELECT 1")
			const queryTime = Date.now() - startTime

			const status = queryTime < 100 ? "healthy" : queryTime < 500 ? "degraded" : "unhealthy"

			return {
				status,
				details: {
					connected: true,
					avgQueryTime: this.stats.avgQueryTime,
					lastOptimized: this.stats.lastOptimized,
					queryCount: this.stats.queryCount,
				},
			}
		} catch {
			return {
				status: "unhealthy",
				details: {
					connected: false,
					avgQueryTime: 0,
					lastOptimized: null,
					queryCount: 0,
				},
			}
		}
	}

	/**
	 * Get database instance
	 */
	getDatabase(): NOORMME {
		return this.db
	}

	/**
	 * Get query builder factory
	 */
	getQueryBuilder(): QueryBuilderFactory {
		return this.queryBuilder
	}

	/**
	 * Get SAAS query patterns
	 */
	getSAASPatterns(): SAASQueryPatterns {
		return this.saasPatterns
	}

	/**
	 * Get migration manager
	 */
	getMigrationManager(): MigrationManager {
		return this.migrationManager
	}

	/**
	 * Close database connection
	 */
	async close(): Promise<void> {
		try {
			await this.db.close()
			console.log("✅ Database connection closed")
		} catch (error) {
			console.error("❌ Error closing database:", error)
		}
	}
}

/**
 * Database factory for easy initialization
 */
export class DatabaseFactory {
	static async create(config: DatabaseConfig): Promise<DatabaseManager> {
		const manager = DatabaseManager.getInstance(config)
		await manager.initialize()
		return manager
	}

	static getInstance(): DatabaseManager {
		return DatabaseManager.getInstance()
	}
}
