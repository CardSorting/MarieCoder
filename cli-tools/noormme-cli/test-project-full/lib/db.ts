/**
 * NOORMME Database Integration for Next.js
 * Provides type-safe database operations with SQLite and Kysely
 */

import Database from "better-sqlite3"
import { Kysely, SqliteDialect } from "kysely"

// Database schema types with RBAC support
export interface DatabaseSchema {
	users: {
		id: string
		email: string
		name: string
		password_hash?: string
		email_verified: boolean
		image?: string
		status: "active" | "inactive" | "suspended"
		last_login?: string
		created_at: string
		updated_at: string
	}
	roles: {
		id: string
		name: string
		description?: string
		is_system: boolean
		created_at: string
		updated_at: string
	}
	permissions: {
		id: string
		name: string
		description?: string
		resource: string
		action: string
		created_at: string
		updated_at: string
	}
	user_roles: {
		id: string
		user_id: string
		role_id: string
		assigned_by: string
		expires_at?: string
		created_at: string
		updated_at: string
	}
	role_permissions: {
		id: string
		role_id: string
		permission_id: string
		created_at: string
		updated_at: string
	}
	sessions: {
		id: string
		user_id: string
		token: string
		expires_at: string
		ip_address?: string
		user_agent?: string
		created_at: string
		updated_at: string
	}
	payments: {
		id: string
		user_id: string
		amount: number
		currency: string
		status: "pending" | "completed" | "failed" | "refunded"
		provider: "stripe" | "paypal"
		provider_payment_id: string
		metadata: string // JSON string
		created_at: string
		updated_at: string
	}
	subscriptions: {
		id: string
		user_id: string
		plan_id: string
		status: "active" | "cancelled" | "past_due"
		provider: "stripe" | "paypal"
		provider_subscription_id: string
		current_period_start: string
		current_period_end: string
		created_at: string
		updated_at: string
	}
	audit_logs: {
		id: string
		user_id?: string
		action: string
		resource_type: string
		resource_id: string
		details: string // JSON string
		ip_address?: string
		user_agent?: string
		created_at: string
	}
	jobs: {
		id: string
		type: string
		payload: string // JSON string
		status: "pending" | "processing" | "completed" | "failed" | "cancelled"
		priority: number
		attempts: number
		max_attempts: number
		error_message?: string
		scheduled_at?: string
		started_at?: string
		completed_at?: string
		created_at: string
		updated_at: string
	}
}

export interface DatabaseConfig {
	connectionString: string
	options?: Record<string, any>
}

export class NOORMMEDatabase {
	private kysely: Kysely<DatabaseSchema>
	private sqlite: Database.Database

	constructor(config: DatabaseConfig) {
		this.config = config
		this.sqlite = new Database(config.connectionString.replace("file:", ""))

		// Configure SQLite for better performance
		this.sqlite.pragma("journal_mode = WAL")
		this.sqlite.pragma("synchronous = NORMAL")
		this.sqlite.pragma("cache_size = -64000")
		this.sqlite.pragma("temp_store = MEMORY")
		this.sqlite.pragma("foreign_keys = ON")

		this.kysely = new Kysely<DatabaseSchema>({
			dialect: new SqliteDialect({
				database: this.sqlite,
			}),
		})
	}

	/**
	 * Get Kysely query builder instance
	 */
	getKysely(): Kysely<DatabaseSchema> {
		return this.kysely
	}

	/**
	 * Get repository for a specific table
	 */
	getRepository<T extends keyof DatabaseSchema>(tableName: T) {
		return {
			findById: async (id: string) => {
				return await this.kysely.selectFrom(tableName).where("id", "=", id).selectAll().executeTakeFirst()
			},
			findAll: async () => {
				return await this.kysely.selectFrom(tableName).selectAll().execute()
			},
			create: async (data: Partial<DatabaseSchema[T]>) => {
				const now = new Date().toISOString()
				const insertData = {
					...data,
					created_at: now,
					updated_at: now,
				} as DatabaseSchema[T]

				return await this.kysely.insertInto(tableName).values(insertData).returningAll().executeTakeFirst()
			},
			update: async (id: string, data: Partial<DatabaseSchema[T]>) => {
				const updateData = {
					...data,
					updated_at: new Date().toISOString(),
				}

				return await this.kysely
					.updateTable(tableName)
					.set(updateData)
					.where("id", "=", id)
					.returningAll()
					.executeTakeFirst()
			},
			delete: async (id: string) => {
				const result = await this.kysely.deleteFrom(tableName).where("id", "=", id).execute()

				return result.length > 0
			},
		}
	}

	/**
	 * Initialize database connection and run migrations
	 */
	async connect(): Promise<void> {
		try {
			// Run initial schema creation
			await this.runMigrations()
			console.log("NOORMME Database connected successfully")
		} catch (error) {
			console.error("Database connection failed:", error)
			throw error
		}
	}

	/**
	 * Close database connection
	 */
	async disconnect(): Promise<void> {
		this.sqlite.close()
		console.log("Database connection closed")
	}

	/**
	 * Run database migrations
	 */
	private async runMigrations(): Promise<void> {
		// Create users table
		await this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT,
        email_verified INTEGER NOT NULL DEFAULT 0,
        image TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        last_login TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

		// Create roles table
		await this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

		// Create permissions table
		await this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

		// Create user_roles table
		await this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        assigned_by TEXT NOT NULL,
        expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (role_id) REFERENCES roles (id),
        FOREIGN KEY (assigned_by) REFERENCES users (id),
        UNIQUE(user_id, role_id)
      )
    `)

		// Create role_permissions table
		await this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id TEXT PRIMARY KEY,
        role_id TEXT NOT NULL,
        permission_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (role_id) REFERENCES roles (id),
        FOREIGN KEY (permission_id) REFERENCES permissions (id),
        UNIQUE(role_id, permission_id)
      )
    `)

		// Create sessions table
		await this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

		// Create payments table
		await this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'usd',
        status TEXT NOT NULL DEFAULT 'pending',
        provider TEXT NOT NULL,
        provider_payment_id TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

		// Create subscriptions table
		await this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        provider TEXT NOT NULL,
        provider_subscription_id TEXT NOT NULL,
        current_period_start TEXT NOT NULL,
        current_period_end TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

		// Create audit_logs table
		await this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `)

		// Create jobs table for queue system
		await this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        priority INTEGER NOT NULL DEFAULT 0,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        error_message TEXT,
        scheduled_at TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

		// Create indexes for better performance
		await this.sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
      CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);
      CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_at ON jobs(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_jobs_status_priority ON jobs(status, priority DESC);
    `)

		// Seed initial data
		await this.seedInitialData()
	}

	/**
	 * Seed initial roles and permissions
	 */
	private async seedInitialData(): Promise<void> {
		const now = new Date().toISOString()

		// Check if roles already exist
		const existingRoles = (await this.sqlite.prepare("SELECT COUNT(*) as count FROM roles").get()) as { count: number }

		if (existingRoles.count === 0) {
			// Create default roles
			const defaultRoles = [
				{ id: "super_admin", name: "Super Admin", description: "Full system access", is_system: 1 },
				{ id: "admin", name: "Admin", description: "Administrative access", is_system: 1 },
				{ id: "moderator", name: "Moderator", description: "Moderation access", is_system: 1 },
				{ id: "user", name: "User", description: "Standard user access", is_system: 1 },
			]

			for (const role of defaultRoles) {
				await this.sqlite
					.prepare(`
          INSERT INTO roles (id, name, description, is_system, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
					.run(role.id, role.name, role.description, role.is_system, now, now)
			}

			// Create default permissions
			const defaultPermissions = [
				// User management
				{
					id: "users.create",
					name: "Create Users",
					description: "Create new users",
					resource: "users",
					action: "create",
				},
				{ id: "users.read", name: "Read Users", description: "View user information", resource: "users", action: "read" },
				{
					id: "users.update",
					name: "Update Users",
					description: "Modify user information",
					resource: "users",
					action: "update",
				},
				{ id: "users.delete", name: "Delete Users", description: "Remove users", resource: "users", action: "delete" },

				// Role management
				{
					id: "roles.create",
					name: "Create Roles",
					description: "Create new roles",
					resource: "roles",
					action: "create",
				},
				{ id: "roles.read", name: "Read Roles", description: "View role information", resource: "roles", action: "read" },
				{
					id: "roles.update",
					name: "Update Roles",
					description: "Modify role information",
					resource: "roles",
					action: "update",
				},
				{ id: "roles.delete", name: "Delete Roles", description: "Remove roles", resource: "roles", action: "delete" },

				// Payment management
				{
					id: "payments.create",
					name: "Create Payments",
					description: "Process payments",
					resource: "payments",
					action: "create",
				},
				{
					id: "payments.read",
					name: "Read Payments",
					description: "View payment information",
					resource: "payments",
					action: "read",
				},
				{
					id: "payments.update",
					name: "Update Payments",
					description: "Modify payment information",
					resource: "payments",
					action: "update",
				},
				{
					id: "payments.delete",
					name: "Delete Payments",
					description: "Remove payments",
					resource: "payments",
					action: "delete",
				},

				// Admin panel access
				{
					id: "admin.access",
					name: "Admin Access",
					description: "Access admin panel",
					resource: "admin",
					action: "access",
				},
				{
					id: "admin.audit",
					name: "View Audit Logs",
					description: "View audit logs",
					resource: "admin",
					action: "audit",
				},
			]

			for (const permission of defaultPermissions) {
				await this.sqlite
					.prepare(`
          INSERT INTO permissions (id, name, description, resource, action, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
					.run(permission.id, permission.name, permission.description, permission.resource, permission.action, now, now)
			}

			// Assign permissions to roles
			const rolePermissions = [
				// Super Admin gets all permissions
				{ role_id: "super_admin", permission_id: "users.create" },
				{ role_id: "super_admin", permission_id: "users.read" },
				{ role_id: "super_admin", permission_id: "users.update" },
				{ role_id: "super_admin", permission_id: "users.delete" },
				{ role_id: "super_admin", permission_id: "roles.create" },
				{ role_id: "super_admin", permission_id: "roles.read" },
				{ role_id: "super_admin", permission_id: "roles.update" },
				{ role_id: "super_admin", permission_id: "roles.delete" },
				{ role_id: "super_admin", permission_id: "payments.create" },
				{ role_id: "super_admin", permission_id: "payments.read" },
				{ role_id: "super_admin", permission_id: "payments.update" },
				{ role_id: "super_admin", permission_id: "payments.delete" },
				{ role_id: "super_admin", permission_id: "admin.access" },
				{ role_id: "super_admin", permission_id: "admin.audit" },

				// Admin gets most permissions
				{ role_id: "admin", permission_id: "users.create" },
				{ role_id: "admin", permission_id: "users.read" },
				{ role_id: "admin", permission_id: "users.update" },
				{ role_id: "admin", permission_id: "roles.read" },
				{ role_id: "admin", permission_id: "payments.read" },
				{ role_id: "admin", permission_id: "payments.update" },
				{ role_id: "admin", permission_id: "admin.access" },

				// Moderator gets limited permissions
				{ role_id: "moderator", permission_id: "users.read" },
				{ role_id: "moderator", permission_id: "payments.read" },

				// User gets basic permissions
				{ role_id: "user", permission_id: "payments.create" },
				{ role_id: "user", permission_id: "payments.read" },
			]

			for (const rp of rolePermissions) {
				await this.sqlite
					.prepare(`
          INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `)
					.run(`${rp.role_id}-${rp.permission_id}`, rp.role_id, rp.permission_id, now, now)
			}
		}
	}
}

// Global database instance using the new unified service
import { createEnvironmentConfig, DatabaseServiceFactory } from "./services/database/ServiceFactory"

const environment = (process.env.NODE_ENV as "development" | "production" | "test") || "development"
const dbConfig = createEnvironmentConfig(environment)

// Initialize the service factory
const serviceFactory = DatabaseServiceFactory.getInstance()

// Initialize services asynchronously
let db: any = null

// Export the unified database service for backward compatibility
export { db }

// Export the service factory for advanced usage
export { serviceFactory }

// Legacy NOORMMEDatabase class for backward compatibility
export { NOORMMEDatabase }

// Initialize queue system when database is ready
import { initializeQueue } from "./queue/init"

// Initialize queue system after database is ready
serviceFactory
	.initialize(dbConfig)
	.then(async () => {
		db = serviceFactory.getUnifiedService()
		// Initialize queue system
		await initializeQueue()
	})
	.catch(async (error) => {
		console.error("Failed to initialize database services:", error)
		// Fallback to legacy implementation
		db = new NOORMMEDatabase({
			connectionString: process.env.DATABASE_URL || "file:./dev.db",
		})
		// Still try to initialize queue system
		try {
			await initializeQueue()
		} catch (queueError) {
			console.error("Failed to initialize queue system:", queueError)
		}
	})
