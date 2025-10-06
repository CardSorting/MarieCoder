/**
 * Database Connection Manager
 * Handles SQLite database connections with WAL mode optimization
 * Following NOORMME service layer pattern with connection pooling
 */

import Database from "better-sqlite3"
import fs from "fs"
import { Kysely, SqliteDialect } from "kysely"
import path from "path"

export interface DatabaseConfig {
	databasePath: string
	enableWAL: boolean
	enableForeignKeys: boolean
	cacheSize: number
	journalMode: "WAL" | "DELETE" | "TRUNCATE" | "PERSIST" | "MEMORY" | "OFF"
	synchronous: "OFF" | "NORMAL" | "FULL" | "EXTRA"
	tempStore: "DEFAULT" | "FILE" | "MEMORY"
	timeout: number
	maxRetries: number
}

export interface DatabaseStats {
	connections: number
	activeConnections: number
	queriesExecuted: number
	lastQueryTime: Date
	walMode: boolean
	databaseSize: number
}

export class DatabaseConnectionManager {
	private static instance: DatabaseConnectionManager
	private config: DatabaseConfig
	private connections: Map<string, Database.Database> = new Map()
	private kyselyInstances: Map<string, Kysely<any>> = new Map()
	private stats: DatabaseStats

	constructor(config: Partial<DatabaseConfig> = {}) {
		this.config = {
			databasePath: config.databasePath || "./data/app.db",
			enableWAL: config.enableWAL ?? true,
			enableForeignKeys: config.enableForeignKeys ?? true,
			cacheSize: config.cacheSize || -64000, // 64MB
			journalMode: config.journalMode || "WAL",
			synchronous: config.synchronous || "NORMAL",
			tempStore: config.tempStore || "MEMORY",
			timeout: config.timeout || 5000,
			maxRetries: config.maxRetries || 3,
		}

		this.stats = {
			connections: 0,
			activeConnections: 0,
			queriesExecuted: 0,
			lastQueryTime: new Date(),
			walMode: false,
			databaseSize: 0,
		}

		this.initializeDatabase()
	}

	static getInstance(config?: Partial<DatabaseConfig>): DatabaseConnectionManager {
		if (!DatabaseConnectionManager.instance) {
			DatabaseConnectionManager.instance = new DatabaseConnectionManager(config)
		}
		return DatabaseConnectionManager.instance
	}

	/**
	 * Get a database connection
	 */
	getConnection(connectionName: string = "default"): Database.Database {
		if (!this.connections.has(connectionName)) {
			this.createConnection(connectionName)
		}

		const connection = this.connections.get(connectionName)!
		this.stats.activeConnections++
		this.stats.lastQueryTime = new Date()

		return connection
	}

	/**
	 * Get a Kysely instance
	 */
	getKysely<T = any>(connectionName: string = "default"): Kysely<T> {
		if (!this.kyselyInstances.has(connectionName)) {
			this.createKyselyInstance(connectionName)
		}

		return this.kyselyInstances.get(connectionName)!
	}

	/**
	 * Execute a transaction
	 */
	async executeTransaction<T>(callback: (db: Kysely<any>) => Promise<T>, connectionName: string = "default"): Promise<T> {
		const kysely = this.getKysely(connectionName)
		return await kysely.transaction().execute(callback)
	}

	/**
	 * Execute a raw SQL query
	 */
	executeRawQuery(query: string, params: any[] = [], connectionName: string = "default"): any {
		const connection = this.getConnection(connectionName)
		const stmt = connection.prepare(query)

		this.stats.queriesExecuted++
		this.stats.lastQueryTime = new Date()

		try {
			if (query.trim().toUpperCase().startsWith("SELECT")) {
				return stmt.all(params)
			} else {
				return stmt.run(params)
			}
		} catch (error) {
			console.error("Database query error:", error)
			throw error
		}
	}

	/**
	 * Get database statistics
	 */
	getStats(): DatabaseStats {
		return { ...this.stats }
	}

	/**
	 * Optimize database
	 */
	optimizeDatabase(connectionName: string = "default"): void {
		const connection = this.getConnection(connectionName)

		try {
			// Run VACUUM to optimize database
			connection.exec("VACUUM")

			// Analyze tables for better query planning
			connection.exec("ANALYZE")

			console.log("Database optimization completed")
		} catch (error) {
			console.error("Database optimization failed:", error)
		}
	}

	/**
	 * Backup database
	 */
	backupDatabase(backupPath: string, connectionName: string = "default"): void {
		const connection = this.getConnection(connectionName)

		try {
			// Ensure backup directory exists
			const backupDir = path.dirname(backupPath)
			if (!fs.existsSync(backupDir)) {
				fs.mkdirSync(backupDir, { recursive: true })
			}

			// Create backup
			connection.backup(backupPath)
			console.log(`Database backup created: ${backupPath}`)
		} catch (error) {
			console.error("Database backup failed:", error)
			throw error
		}
	}

	/**
	 * Close all connections
	 */
	closeAllConnections(): void {
		for (const [name, connection] of this.connections) {
			try {
				connection.close()
				console.log(`Closed database connection: ${name}`)
			} catch (error) {
				console.error(`Error closing connection ${name}:`, error)
			}
		}

		this.connections.clear()
		this.kyselyInstances.clear()
		this.stats.connections = 0
		this.stats.activeConnections = 0
	}

	/**
	 * Health check
	 */
	async healthCheck(connectionName: string = "default"): Promise<{
		healthy: boolean
		responseTime: number
		error?: string
	}> {
		const startTime = Date.now()

		try {
			const connection = this.getConnection(connectionName)
			connection.prepare("SELECT 1").get()

			const responseTime = Date.now() - startTime

			return {
				healthy: true,
				responseTime,
			}
		} catch (error) {
			const responseTime = Date.now() - startTime

			return {
				healthy: false,
				responseTime,
				error: error instanceof Error ? error.message : "Unknown error",
			}
		}
	}

	// Private methods

	private initializeDatabase(): void {
		try {
			// Ensure database directory exists
			const dbDir = path.dirname(this.config.databasePath)
			if (!fs.existsSync(dbDir)) {
				fs.mkdirSync(dbDir, { recursive: true })
			}

			// Create default connection
			this.createConnection("default")

			console.log("Database connection manager initialized")
		} catch (error) {
			console.error("Failed to initialize database:", error)
			throw error
		}
	}

	private createConnection(connectionName: string): void {
		try {
			const connection = new Database(this.config.databasePath, {
				timeout: this.config.timeout,
				verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
			})

			// Configure SQLite settings
			this.configureSQLite(connection)

			this.connections.set(connectionName, connection)
			this.stats.connections++

			console.log(`Created database connection: ${connectionName}`)
		} catch (error) {
			console.error(`Failed to create connection ${connectionName}:`, error)
			throw error
		}
	}

	private createKyselyInstance(connectionName: string): void {
		const connection = this.getConnection(connectionName)

		const kysely = new Kysely<any>({
			dialect: new SqliteDialect({
				database: connection,
			}),
		})

		this.kyselyInstances.set(connectionName, kysely)
	}

	private configureSQLite(connection: Database.Database): void {
		try {
			// Enable WAL mode for better concurrency
			if (this.config.enableWAL) {
				connection.pragma(`journal_mode = ${this.config.journalMode}`)
				this.stats.walMode = true
			}

			// Set synchronous mode
			connection.pragma(`synchronous = ${this.config.synchronous}`)

			// Set cache size
			connection.pragma(`cache_size = ${this.config.cacheSize}`)

			// Set temp store
			connection.pragma(`temp_store = ${this.config.tempStore}`)

			// Enable foreign keys
			if (this.config.enableForeignKeys) {
				connection.pragma("foreign_keys = ON")
			}

			// Set query timeout
			connection.pragma(`busy_timeout = ${this.config.timeout}`)

			console.log("SQLite configuration applied")
		} catch (error) {
			console.error("Failed to configure SQLite:", error)
			throw error
		}
	}
}
