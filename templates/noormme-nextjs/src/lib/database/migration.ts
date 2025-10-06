/**
 * Advanced Migration System for NOORMME SAAS
 * Following NORMIE DEV methodology - leveraging Kysely's full capabilities
 */

import { createHash } from "crypto"
import { Kysely } from "kysely"
import { Database } from "@/types/database"
import { NOORMError, ValidationError } from "./errors"

export interface Migration {
	id: string
	version: string
	name: string
	up: (db: Kysely<Database>) => Promise<void>
	down?: (db: Kysely<Database>) => Promise<void>
	description: string
	createdAt: string
}

export interface MigrationRecord {
	id: string
	version: string
	name: string
	description: string
	executed_at: string
	execution_time_ms: number
	checksum: string
}

export interface MigrationStatus {
	total: number
	executed: number
	pending: number
	latest: string | null
	lastExecuted: string | null
}

export interface MigrationResult {
	success: boolean
	migration: Migration
	executionTime: number
	error?: string
}

/**
 * Enhanced Migration Manager leveraging Kysely's full capabilities
 * Following NORMIE DEV methodology - clean, type-safe, performant
 */
export class MigrationManager {
	private static instance: MigrationManager
	private db: Kysely<Database>

	private constructor(db: Kysely<Database>) {
		this.db = db
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(db: Kysely<Database>): MigrationManager {
		if (!MigrationManager.instance) {
			MigrationManager.instance = new MigrationManager(db)
		}
		return MigrationManager.instance
	}

	/**
	 * Initialize migration tracking table with proper schema
	 */
	async initialize(): Promise<void> {
		try {
			// Create migration tracking table
			await this.db.executeQuery({
				sql: `
					CREATE TABLE IF NOT EXISTS schema_migrations (
						id TEXT PRIMARY KEY,
						version TEXT UNIQUE NOT NULL,
						name TEXT NOT NULL,
						description TEXT,
						executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
						execution_time_ms INTEGER,
						checksum TEXT NOT NULL,
						created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
						updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
					)
				`,
				parameters: [],
			} as any)

			// Create indexes for performance
			await this.db.executeQuery({
				sql: `
					CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
					ON schema_migrations (version)
				`,
				parameters: [],
			} as any)

			await this.db.executeQuery({
				sql: `
					CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at 
					ON schema_migrations (executed_at)
				`,
				parameters: [],
			} as any)

			console.log("✅ Migration tracking table initialized")
		} catch (error) {
			throw new NOORMError(
				`Failed to initialize migration tracking: ${error instanceof Error ? error.message : "Unknown error"}`,
				"MIGRATION_INIT_ERROR",
				"Please check your database connection and try again",
			)
		}
	}

	/**
	 * Get all executed migrations with proper typing
	 */
	async getExecutedMigrations(): Promise<MigrationRecord[]> {
		try {
			const result = await this.db.executeQuery({
				sql: `
					SELECT id, version, name, description, executed_at, execution_time_ms, checksum
					FROM schema_migrations
					ORDER BY version ASC
				`,
				parameters: [],
			} as any)

			return result.rows.map((migration: any) => ({
				id: migration.id,
				version: migration.version,
				name: migration.name,
				description: migration.description || "",
				executed_at: migration.executed_at,
				execution_time_ms: migration.execution_time_ms || 0,
				checksum: migration.checksum,
			}))
		} catch (error) {
			throw new NOORMError(
				`Failed to get executed migrations: ${error instanceof Error ? error.message : "Unknown error"}`,
				"GET_MIGRATIONS_ERROR",
				"Please check your database connection and try again",
			)
		}
	}

	/**
	 * Check if migration has been executed
	 */
	async isMigrationExecuted(version: string): Promise<boolean> {
		try {
			if (!version || typeof version !== "string" || version.trim() === "") {
				throw new ValidationError("Valid version is required", "Please provide a valid migration version")
			}

			const result = await this.db.executeQuery({
				sql: `
					SELECT id FROM schema_migrations WHERE version = ?
				`,
				parameters: [version],
			} as any)

			return result.rows.length > 0
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to check migration status: ${error instanceof Error ? error.message : "Unknown error"}`,
				"CHECK_MIGRATION_ERROR",
				"Please check the migration version and try again",
			)
		}
	}

	/**
	 * Execute a single migration with comprehensive error handling
	 */
	async executeMigration(migration: Migration): Promise<MigrationResult> {
		const startTime = Date.now()

		try {
			if (!migration || !migration.version || !migration.name || !migration.up) {
				throw new ValidationError(
					"Valid migration object is required",
					"Please provide a migration with version, name, and up function",
				)
			}

			// Check if already executed
			if (await this.isMigrationExecuted(migration.version)) {
				throw new NOORMError(
					`Migration ${migration.version} has already been executed`,
					"MIGRATION_ALREADY_EXECUTED",
					"Skip this migration or use a different version",
				)
			}

			console.log(`🔄 Executing migration: ${migration.name} (${migration.version})`)

			// Execute migration in transaction
			const result = await this.db.transaction().execute(async (trx) => {
				// Execute migration
				await migration.up(trx)

				// Record migration
				const executionTime = Date.now() - startTime
				const checksum = this.generateChecksum(migration)
				const now = new Date().toISOString()

				await trx.executeQuery({
					sql: `
						INSERT INTO schema_migrations 
						(id, version, name, description, execution_time_ms, checksum, executed_at, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					`,
					parameters: [
						migration.id,
						migration.version,
						migration.name,
						migration.description,
						executionTime,
						checksum,
						now,
						now,
						now,
					],
				} as any)

				return { executionTime, checksum }
			})

			console.log(`✅ Migration completed: ${migration.name} (${result.executionTime}ms)`)

			return {
				success: true,
				migration,
				executionTime: result.executionTime,
			}
		} catch (error) {
			const executionTime = Date.now() - startTime
			console.error(`❌ Migration failed: ${migration.name}`, error)

			return {
				success: false,
				migration,
				executionTime,
				error: error instanceof Error ? error.message : "Unknown error",
			}
		}
	}

	/**
	 * Rollback a migration with proper validation
	 */
	async rollbackMigration(migration: Migration): Promise<MigrationResult> {
		const startTime = Date.now()

		try {
			if (!migration || !migration.version || !migration.name) {
				throw new ValidationError(
					"Valid migration object is required",
					"Please provide a migration with version and name",
				)
			}

			if (!migration.down) {
				throw new NOORMError(
					`Migration ${migration.name} does not support rollback`,
					"MIGRATION_NO_ROLLBACK",
					"Add a down function to enable rollback",
				)
			}

			// Check if migration was executed
			if (!(await this.isMigrationExecuted(migration.version))) {
				throw new NOORMError(
					`Migration ${migration.version} has not been executed`,
					"MIGRATION_NOT_EXECUTED",
					"Cannot rollback a migration that hasn't been executed",
				)
			}

			console.log(`🔄 Rolling back migration: ${migration.name}`)

			// Execute rollback in transaction
			const result = await this.db.transaction().execute(async (trx) => {
				// Execute rollback
				await migration.down!(trx)

				// Remove migration record
				await trx.executeQuery({
					sql: `
						DELETE FROM schema_migrations WHERE version = ?
					`,
					parameters: [migration.version],
				} as any)

				return { executionTime: Date.now() - startTime }
			})

			console.log(`✅ Migration rolled back: ${migration.name}`)

			return {
				success: true,
				migration,
				executionTime: result.executionTime,
			}
		} catch (error) {
			const executionTime = Date.now() - startTime
			console.error(`❌ Rollback failed: ${migration.name}`, error)

			return {
				success: false,
				migration,
				executionTime,
				error: error instanceof Error ? error.message : "Unknown error",
			}
		}
	}

	/**
	 * Run all pending migrations with comprehensive reporting
	 */
	async runMigrations(migrations: Migration[]): Promise<{
		success: boolean
		executed: number
		failed: number
		results: MigrationResult[]
	}> {
		try {
			if (!Array.isArray(migrations)) {
				throw new ValidationError("Valid migrations array is required", "Please provide an array of migration objects")
			}

			await this.initialize()

			const executedMigrations = await this.getExecutedMigrations()
			const executedVersions = new Set(executedMigrations.map((m) => m.version))

			// Sort migrations by version
			const sortedMigrations = [...migrations].sort((a, b) => a.version.localeCompare(b.version))

			const pendingMigrations = sortedMigrations.filter((migration) => !executedVersions.has(migration.version))

			if (pendingMigrations.length === 0) {
				console.log("✅ No pending migrations")
				return {
					success: true,
					executed: 0,
					failed: 0,
					results: [],
				}
			}

			console.log(`🔄 Running ${pendingMigrations.length} pending migrations...`)

			const results: MigrationResult[] = []
			let executed = 0
			let failed = 0

			for (const migration of pendingMigrations) {
				const result = await this.executeMigration(migration)
				results.push(result)

				if (result.success) {
					executed++
				} else {
					failed++
					// Stop on first failure
					console.error(`❌ Stopping migration process due to failure: ${migration.name}`)
					break
				}
			}

			if (failed === 0) {
				console.log("✅ All migrations completed successfully")
			} else {
				console.log(`❌ Migration process completed with ${failed} failures`)
			}

			return {
				success: failed === 0,
				executed,
				failed,
				results,
			}
		} catch (error) {
			throw new NOORMError(
				`Failed to run migrations: ${error instanceof Error ? error.message : "Unknown error"}`,
				"RUN_MIGRATIONS_ERROR",
				"Please check your migrations and try again",
			)
		}
	}

	/**
	 * Generate secure checksum for migration integrity
	 */
	private generateChecksum(migration: Migration): string {
		try {
			const content = `${migration.version}${migration.name}${migration.description}${migration.id}`
			return createHash("sha256").update(content).digest("hex")
		} catch {
			// Fallback to simple hash if crypto is not available
			let hash = 0
			const content = `${migration.version}${migration.name}${migration.description}${migration.id}`
			for (let i = 0; i < content.length; i++) {
				const char = content.charCodeAt(i)
				hash = (hash << 5) - hash + char
				hash = hash & hash // Convert to 32bit integer
			}
			return Math.abs(hash).toString(16)
		}
	}

	/**
	 * Get comprehensive migration status
	 */
	async getStatus(availableMigrations?: Migration[]): Promise<MigrationStatus> {
		try {
			await this.initialize()

			const executed = await this.getExecutedMigrations()
			const latest = executed.length > 0 ? executed[executed.length - 1].version : null
			const lastExecuted = executed.length > 0 ? executed[executed.length - 1].executed_at : null

			let pending = 0
			if (availableMigrations) {
				const executedVersions = new Set(executed.map((m) => m.version))
				pending = availableMigrations.filter((m) => !executedVersions.has(m.version)).length
			}

			return {
				total: availableMigrations ? availableMigrations.length : executed.length,
				executed: executed.length,
				pending,
				latest,
				lastExecuted,
			}
		} catch (error) {
			throw new NOORMError(
				`Failed to get migration status: ${error instanceof Error ? error.message : "Unknown error"}`,
				"GET_STATUS_ERROR",
				"Please check your database connection and try again",
			)
		}
	}

	/**
	 * Validate migration integrity
	 */
	async validateMigrations(migrations: Migration[]): Promise<{
		valid: boolean
		errors: string[]
	}> {
		const errors: string[] = []

		try {
			if (!Array.isArray(migrations)) {
				errors.push("Migrations must be an array")
				return { valid: false, errors }
			}

			const versions = new Set<string>()
			const names = new Set<string>()

			for (const migration of migrations) {
				// Check required fields
				if (!migration.version || typeof migration.version !== "string") {
					errors.push(`Migration missing or invalid version: ${migration.name || "unknown"}`)
				}

				if (!migration.name || typeof migration.name !== "string") {
					errors.push(`Migration missing or invalid name: ${migration.version || "unknown"}`)
				}

				if (!migration.up || typeof migration.up !== "function") {
					errors.push(`Migration missing up function: ${migration.name || migration.version}`)
				}

				if (!migration.id || typeof migration.id !== "string") {
					errors.push(`Migration missing or invalid id: ${migration.name || migration.version}`)
				}

				// Check for duplicates
				if (migration.version && versions.has(migration.version)) {
					errors.push(`Duplicate version: ${migration.version}`)
				}
				versions.add(migration.version)

				if (migration.name && names.has(migration.name)) {
					errors.push(`Duplicate name: ${migration.name}`)
				}
				names.add(migration.name)
			}

			return {
				valid: errors.length === 0,
				errors,
			}
		} catch (error) {
			errors.push(`Validation error: ${error instanceof Error ? error.message : "Unknown error"}`)
			return { valid: false, errors }
		}
	}

	/**
	 * Get migration by version
	 */
	async getMigrationByVersion(version: string): Promise<MigrationRecord | null> {
		try {
			if (!version || typeof version !== "string" || version.trim() === "") {
				throw new ValidationError("Valid version is required", "Please provide a valid migration version")
			}

			const result = await this.db.executeQuery({
				sql: `
					SELECT id, version, name, description, executed_at, execution_time_ms, checksum
					FROM schema_migrations
					WHERE version = ?
				`,
				parameters: [version],
			} as any)

			if (result.rows.length === 0) {
				return null
			}

			const migration = result.rows[0] as any
			return {
				id: migration.id,
				version: migration.version,
				name: migration.name,
				description: migration.description || "",
				executed_at: migration.executed_at,
				execution_time_ms: migration.execution_time_ms || 0,
				checksum: migration.checksum,
			}
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to get migration by version: ${error instanceof Error ? error.message : "Unknown error"}`,
				"GET_MIGRATION_ERROR",
				"Please check the migration version and try again",
			)
		}
	}

	/**
	 * Clean up old migration records (optional)
	 */
	async cleanupOldMigrations(keepCount: number = 10): Promise<number> {
		try {
			if (keepCount < 1) {
				throw new ValidationError("Keep count must be at least 1", "Please provide a valid number of migrations to keep")
			}

			// Get all migrations ordered by execution time
			const result = await this.db.executeQuery({
				sql: `
					SELECT version FROM schema_migrations
					ORDER BY executed_at DESC
				`,
				parameters: [],
			} as any)

			const allMigrations = result.rows as any[]

			if (allMigrations.length <= keepCount) {
				return 0
			}

			// Get migrations to delete
			const migrationsToDelete = allMigrations.slice(keepCount)
			const versionsToDelete = migrationsToDelete.map((m) => m.version)

			// Delete old migrations
			if (versionsToDelete.length > 0) {
				const placeholders = versionsToDelete.map(() => "?").join(",")
				await this.db.executeQuery({
					sql: `
						DELETE FROM schema_migrations 
						WHERE version IN (${placeholders})
					`,
					parameters: versionsToDelete,
				} as any)
			}

			const deletedCount = versionsToDelete.length
			console.log(`🧹 Cleaned up ${deletedCount} old migration records`)

			return deletedCount
		} catch (error) {
			throw new NOORMError(
				`Failed to cleanup old migrations: ${error instanceof Error ? error.message : "Unknown error"}`,
				"CLEANUP_ERROR",
				"Please check your parameters and try again",
			)
		}
	}
}
