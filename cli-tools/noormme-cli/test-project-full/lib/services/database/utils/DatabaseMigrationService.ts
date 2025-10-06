/**
 * Database Migration Service
 * Handles database schema migrations and versioning
 * Following NOORMME service layer pattern with SQLite WAL mode support
 */

import fs from "fs"
import { Kysely } from "kysely"
import path from "path"
import { DatabaseConnectionManager } from "../connection/DatabaseConnectionManager"

export interface Migration {
	id: string
	name: string
	version: string
	up: string
	down: string
	executedAt?: Date
	executionTime?: number
}

export interface MigrationConfig {
	migrationsPath: string
	connectionName?: string
	enableBackup?: boolean
	backupPath?: string
}

export class DatabaseMigrationService {
	private connectionManager: DatabaseConnectionManager
	private db: Kysely<any>
	private config: MigrationConfig

	constructor(connectionManager: DatabaseConnectionManager, config: MigrationConfig) {
		this.connectionManager = connectionManager
		this.config = {
			connectionName: "default",
			enableBackup: true,
			backupPath: "./data/backups",
			...config,
		}

		this.db = this.connectionManager.getKysely(this.config.connectionName)
	}

	/**
	 * Initialize migration system
	 */
	async initialize(): Promise<void> {
		try {
			// Create migrations table if it doesn't exist
			await this.createMigrationsTable()
			console.log("Migration system initialized")
		} catch (error) {
			console.error("Failed to initialize migration system:", error)
			throw error
		}
	}

	/**
	 * Run all pending migrations
	 */
	async migrate(): Promise<Migration[]> {
		try {
			const migrations = await this.getPendingMigrations()
			const executedMigrations: Migration[] = []

			for (const migration of migrations) {
				console.log(`Running migration: ${migration.name}`)

				const startTime = Date.now()
				await this.executeMigration(migration, "up")
				const executionTime = Date.now() - startTime

				// Record migration execution
				await this.recordMigrationExecution(migration, executionTime)

				executedMigrations.push({
					...migration,
					executedAt: new Date(),
					executionTime,
				})

				console.log(`Migration completed: ${migration.name} (${executionTime}ms)`)
			}

			return executedMigrations
		} catch (error) {
			console.error("Migration failed:", error)
			throw error
		}
	}

	/**
	 * Rollback last migration
	 */
	async rollback(): Promise<Migration | null> {
		try {
			const lastMigration = await this.getLastExecutedMigration()
			if (!lastMigration) {
				console.log("No migrations to rollback")
				return null
			}

			console.log(`Rolling back migration: ${lastMigration.name}`)

			const startTime = Date.now()
			await this.executeMigration(lastMigration, "down")
			const executionTime = Date.now() - startTime

			// Remove migration record
			await this.removeMigrationRecord(lastMigration.id)

			console.log(`Rollback completed: ${lastMigration.name} (${executionTime}ms)`)

			return {
				...lastMigration,
				executedAt: new Date(),
				executionTime,
			}
		} catch (error) {
			console.error("Rollback failed:", error)
			throw error
		}
	}

	/**
	 * Rollback to specific migration
	 */
	async rollbackTo(migrationId: string): Promise<Migration[]> {
		try {
			const migrationsToRollback = await this.getMigrationsAfter(migrationId)
			const rolledBackMigrations: Migration[] = []

			for (const migration of migrationsToRollback.reverse()) {
				const result = await this.rollback()
				if (result) {
					rolledBackMigrations.push(result)
				}
			}

			return rolledBackMigrations
		} catch (error) {
			console.error("Rollback to migration failed:", error)
			throw error
		}
	}

	/**
	 * Get migration status
	 */
	async getStatus(): Promise<{
		executed: Migration[]
		pending: Migration[]
		lastExecuted?: Migration
		totalMigrations: number
	}> {
		try {
			const [executed, pending] = await Promise.all([this.getExecutedMigrations(), this.getPendingMigrations()])

			const lastExecuted = executed.length > 0 ? executed[executed.length - 1] : undefined

			return {
				executed,
				pending,
				lastExecuted,
				totalMigrations: executed.length + pending.length,
			}
		} catch (error) {
			console.error("Failed to get migration status:", error)
			throw error
		}
	}

	/**
	 * Create a new migration file
	 */
	async createMigration(name: string): Promise<string> {
		try {
			const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0]
			const migrationId = `${timestamp}_${name.replace(/[^a-zA-Z0-9]/g, "_")}`
			const fileName = `${migrationId}.sql`

			const migrationTemplate = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- UP Migration
-- Add your schema changes here
-- Example:
-- CREATE TABLE example_table (
--     id TEXT PRIMARY KEY,
--     name TEXT NOT NULL,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );

-- DOWN Migration
-- Add your rollback changes here
-- Example:
-- DROP TABLE IF EXISTS example_table;
`

			const filePath = path.join(this.config.migrationsPath, fileName)

			// Ensure migrations directory exists
			if (!fs.existsSync(this.config.migrationsPath)) {
				fs.mkdirSync(this.config.migrationsPath, { recursive: true })
			}

			fs.writeFileSync(filePath, migrationTemplate)
			console.log(`Created migration file: ${fileName}`)

			return migrationId
		} catch (error) {
			console.error("Failed to create migration:", error)
			throw error
		}
	}

	/**
	 * Validate migration files
	 */
	async validateMigrations(): Promise<{
		valid: boolean
		errors: string[]
		warnings: string[]
	}> {
		const errors: string[] = []
		const warnings: string[] = []

		try {
			const migrationFiles = this.getMigrationFiles()

			for (const file of migrationFiles) {
				const migration = await this.parseMigrationFile(file)

				// Validate migration structure
				if (!migration.up.trim()) {
					errors.push(`Migration ${migration.name}: UP migration is empty`)
				}

				if (!migration.down.trim()) {
					warnings.push(`Migration ${migration.name}: DOWN migration is empty`)
				}

				// Validate SQL syntax (basic check)
				if (
					migration.up.includes("--") &&
					!migration.up.includes("CREATE") &&
					!migration.up.includes("ALTER") &&
					!migration.up.includes("DROP")
				) {
					warnings.push(`Migration ${migration.name}: UP migration appears to be commented out`)
				}
			}

			return {
				valid: errors.length === 0,
				errors,
				warnings,
			}
		} catch (error) {
			errors.push(`Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
			return {
				valid: false,
				errors,
				warnings,
			}
		}
	}

	// Private methods

	private async createMigrationsTable(): Promise<void> {
		const createTableSQL = `
			CREATE TABLE IF NOT EXISTS migrations (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				version TEXT NOT NULL,
				executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				execution_time INTEGER,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`

		await this.db.schema
			.createTable("migrations")
			.addColumn("id", "text", (col) => col.primaryKey())
			.addColumn("name", "text", (col) => col.notNull())
			.addColumn("version", "text", (col) => col.notNull())
			.addColumn("executed_at", "datetime", (col) => col.defaultTo("CURRENT_TIMESTAMP"))
			.addColumn("execution_time", "integer")
			.addColumn("created_at", "datetime", (col) => col.defaultTo("CURRENT_TIMESTAMP"))
			.execute()
	}

	private async getPendingMigrations(): Promise<Migration[]> {
		const executedMigrations = await this.getExecutedMigrations()
		const executedIds = new Set(executedMigrations.map((m) => m.id))

		const migrationFiles = this.getMigrationFiles()
		const pendingMigrations: Migration[] = []

		for (const file of migrationFiles) {
			const migration = await this.parseMigrationFile(file)
			if (!executedIds.has(migration.id)) {
				pendingMigrations.push(migration)
			}
		}

		// Sort by version/ID
		return pendingMigrations.sort((a, b) => a.id.localeCompare(b.id))
	}

	private async getExecutedMigrations(): Promise<Migration[]> {
		const results = await this.db.selectFrom("migrations").selectAll().orderBy("executed_at", "asc").execute()

		return results.map((result) => ({
			id: result.id,
			name: result.name,
			version: result.version,
			up: "", // Not stored in database
			down: "", // Not stored in database
			executedAt: new Date(result.executed_at),
			executionTime: result.execution_time,
		}))
	}

	private async getLastExecutedMigration(): Promise<Migration | null> {
		const result = await this.db.selectFrom("migrations").selectAll().orderBy("executed_at", "desc").executeTakeFirst()

		if (!result) return null

		return {
			id: result.id,
			name: result.name,
			version: result.version,
			up: "",
			down: "",
			executedAt: new Date(result.executed_at),
			executionTime: result.execution_time,
		}
	}

	private async getMigrationsAfter(migrationId: string): Promise<Migration[]> {
		const executedMigrations = await this.getExecutedMigrations()
		const targetIndex = executedMigrations.findIndex((m) => m.id === migrationId)

		if (targetIndex === -1) {
			throw new Error(`Migration ${migrationId} not found`)
		}

		return executedMigrations.slice(targetIndex + 1)
	}

	private async executeMigration(migration: Migration, direction: "up" | "down"): Promise<void> {
		const sql = direction === "up" ? migration.up : migration.down

		if (!sql.trim()) {
			throw new Error(`Migration ${migration.name} has no ${direction} SQL`)
		}

		// Create backup before migration if enabled
		if (this.config.enableBackup && direction === "up") {
			await this.createBackup()
		}

		// Execute migration SQL
		await this.db.raw(sql).execute()
	}

	private async recordMigrationExecution(migration: Migration, executionTime: number): Promise<void> {
		await this.db
			.insertInto("migrations")
			.values({
				id: migration.id,
				name: migration.name,
				version: migration.version,
				executed_at: new Date(),
				execution_time: executionTime,
			})
			.execute()
	}

	private async removeMigrationRecord(migrationId: string): Promise<void> {
		await this.db.deleteFrom("migrations").where("id", "=", migrationId).execute()
	}

	private getMigrationFiles(): string[] {
		if (!fs.existsSync(this.config.migrationsPath)) {
			return []
		}

		return fs
			.readdirSync(this.config.migrationsPath)
			.filter((file) => file.endsWith(".sql"))
			.sort()
	}

	private async parseMigrationFile(fileName: string): Promise<Migration> {
		const filePath = path.join(this.config.migrationsPath, fileName)
		const content = fs.readFileSync(filePath, "utf-8")

		// Extract migration ID from filename
		const id = fileName.replace(".sql", "")

		// Parse UP and DOWN sections
		const sections = content.split("-- DOWN Migration")
		if (sections.length !== 2) {
			throw new Error(`Invalid migration file format: ${fileName}`)
		}

		const upSection = sections[0].replace(/^-- UP Migration[\s\S]*?\n/, "").trim()
		const downSection = sections[1].trim()

		return {
			id,
			name: id.replace(/^\d+_/, "").replace(/_/g, " "),
			version: id.split("_")[0],
			up: upSection,
			down: downSection,
		}
	}

	private async createBackup(): Promise<void> {
		if (!this.config.enableBackup) return

		const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0]
		const backupFileName = `backup_${timestamp}.db`
		const backupPath = path.join(this.config.backupPath!, backupFileName)

		await this.connectionManager.backupDatabase(backupPath, this.config.connectionName)
	}
}
