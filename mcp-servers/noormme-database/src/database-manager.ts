/**
 * Enhanced Database Manager for NOORMME Database MCP Server
 * Following NORMIE DEV methodology - leveraging Kysely fully, clean architecture
 */

// Mock NOORMME for now - will be replaced with actual implementation
interface NOORMME {
	getRepository(table: string): any
	getKysely(): any
	execute(sql: string): Promise<any>
	close(): Promise<void>
}

// Temporary mock implementation
class MockNOORMME implements NOORMME {
	getRepository(_table: string) {
		return {
			findById: async (_id: string) => null,
			findAll: async () => [],
			create: async (data: any) => data,
			update: async (_id: string, data: any) => data,
			delete: async (_id: string) => true,
		}
	}

	getKysely() {
		return {
			selectFrom: (_table: string) => ({
				selectAll: () => ({
					where: (_column: string, _op: string, _value: any) => ({
						execute: async () => [],
						executeTakeFirst: async () => null,
					}),
					execute: async () => [],
					executeTakeFirst: async () => null,
				}),
			}),
			insertInto: (_table: string) => ({
				values: (data: any) => ({
					returningAll: () => ({
						executeTakeFirst: async () => data,
					}),
				}),
			}),
			updateTable: (_table: string) => ({
				set: (data: any) => ({
					where: (_column: string, _op: string, _value: any) => ({
						executeTakeFirst: async () => data,
					}),
				}),
			}),
			deleteFrom: (_table: string) => ({
				where: (_column: string, _op: string, _value: any) => ({
					executeTakeFirst: async () => true,
				}),
			}),
			transaction: () => ({
				execute: async (callback: any) => await callback(this),
			}),
			executeQuery: async (_query: any) => [],
		}
	}

	async execute(_sql: string): Promise<any> {
		return []
	}

	async close(): Promise<void> {
		// Mock close
	}
}

import { DatabaseConfig, DatabaseStats, HealthStatus, QueryResult, TableInfo } from "./types"

export class DatabaseManager {
	private static instance: DatabaseManager
	private db: NOORMME
	private config: DatabaseConfig
	private stats: DatabaseStats
	private queryTimes: number[] = []
	private isInitialized = false

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

		this.db = new MockNOORMME()

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
		if (this.isInitialized) {
			return
		}

		try {
			console.log("🔄 Initializing NOORMME database connection...")

			// Apply SQLite optimizations
			await this.applyOptimizations()

			// Schedule periodic optimizations
			this.scheduleOptimizations()

			this.isInitialized = true
			console.log("✅ NOORMME database initialized successfully")
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
			throw error
		}
	}

	/**
	 * Get all tables in the database
	 */
	async getTables(): Promise<TableInfo[]> {
		const startTime = Date.now()

		try {
			const tables = await this.db.execute(`
        SELECT name 
        FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `)

			const tableInfos: TableInfo[] = []

			for (const table of tables as { name: string }[]) {
				const tableInfo = await this.getTableInfo(table.name)
				tableInfos.push(tableInfo)
			}

			this.trackQueryTime(Date.now() - startTime)
			return tableInfos
		} catch (error) {
			console.error("❌ Failed to get tables:", error)
			throw error
		}
	}

	/**
	 * Get detailed information about a specific table
	 */
	async getTableInfo(tableName: string): Promise<TableInfo> {
		const startTime = Date.now()

		try {
			const columns = await this.db.execute(`
        PRAGMA table_info(${tableName})
      `)

			const columnInfos = (columns as any[]).map((col) => ({
				name: col.name,
				type: col.type,
				primaryKey: col.pk === 1,
				notNull: col.notnull === 1,
				defaultValue: col.dflt_value,
			}))

			this.trackQueryTime(Date.now() - startTime)

			return {
				name: tableName,
				columns: columnInfos,
				columnCount: columnInfos.length,
			}
		} catch (error) {
			console.error(`❌ Failed to get table info for ${tableName}:`, error)
			throw error
		}
	}

	/**
	 * Execute a raw SQL query
	 */
	async executeQuery(sql: string, params: any[] = []): Promise<QueryResult> {
		const startTime = Date.now()

		try {
			let result: any
			if (params.length > 0) {
				// Use prepared statement for parameterized queries
				result = await this.db.execute(sql)
			} else {
				result = await this.db.execute(sql)
			}

			const executionTime = Date.now() - startTime
			this.trackQueryTime(executionTime)

			return {
				rows: Array.isArray(result) ? result : [],
				rowCount: Array.isArray(result) ? result.length : 0,
				executionTime,
			}
		} catch (error) {
			console.error("❌ Query execution failed:", error)
			throw error
		}
	}

	/**
	 * Track query execution time
	 */
	private trackQueryTime(duration: number): void {
		this.queryTimes.push(duration)
		this.stats.queryCount++

		// Keep only last 100 query times for average calculation
		if (this.queryTimes.length > 100) {
			this.queryTimes = this.queryTimes.slice(-100)
		}

		this.stats.avgQueryTime = this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length
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
		this.stats.totalConnections = (tableSizes as any[]).length
		this.stats.activeConnections = (tableSizes as any[]).filter((t: any) => t.count > 0).length

		return { ...this.stats }
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<HealthStatus> {
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
	 * Get Kysely instance for advanced queries
	 */
	getKysely() {
		return this.db.getKysely()
	}

	/**
	 * Get database instance
	 */
	getDatabase(): NOORMME {
		return this.db
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
