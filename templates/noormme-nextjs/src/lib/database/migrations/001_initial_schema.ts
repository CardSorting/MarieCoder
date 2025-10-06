/**
 * Initial SAAS Schema Migration
 * Following NORMIE DEV methodology - clean, optimized database structure
 */

import { Migration } from "../migration"

export const initialSchema: Migration = {
	id: "001_initial_schema",
	version: "001",
	name: "Initial SAAS Schema",
	description: "Create initial database schema for SAAS application with optimized structure and indexes",
	createdAt: new Date().toISOString(),

	async up(db: any) {
		// Enable optimal SQLite settings first
		await db.execute("PRAGMA journal_mode=WAL")
		await db.execute("PRAGMA synchronous=NORMAL")
		await db.execute("PRAGMA cache_size=-64000") // 64MB cache
		await db.execute("PRAGMA temp_store=MEMORY")
		await db.execute("PRAGMA foreign_keys=ON")
		await db.execute("PRAGMA optimize") // Optimize database

		// Users table with enhanced SAAS fields and constraints
		await db.execute(`
			CREATE TABLE users (
				id TEXT PRIMARY KEY,
				email TEXT UNIQUE NOT NULL COLLATE NOCASE,
				name TEXT NOT NULL,
				role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'super_admin')),
				status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
				avatar TEXT,
				timezone TEXT DEFAULT 'UTC',
				preferences TEXT DEFAULT '{}',
				lastLoginAt DATETIME,
				emailVerifiedAt DATETIME,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				
				-- Constraints
				CONSTRAINT chk_email_format CHECK (email LIKE '%@%.%'),
				CONSTRAINT chk_name_length CHECK (length(name) >= 2 AND length(name) <= 100),
				CONSTRAINT chk_timezone_valid CHECK (timezone IN ('UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'))
			)
		`)

		// Plans table (created before subscriptions for foreign key reference)
		await db.execute(`
			CREATE TABLE plans (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				description TEXT,
				price REAL NOT NULL CHECK (price >= 0),
				currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY')),
				interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
				features TEXT DEFAULT '[]',
				limits TEXT DEFAULT '{}',
				isActive BOOLEAN DEFAULT TRUE,
				sortOrder INTEGER DEFAULT 0 CHECK (sortOrder >= 0),
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				
				-- Constraints
				CONSTRAINT chk_plan_name_length CHECK (length(name) >= 2 AND length(name) <= 50),
				CONSTRAINT chk_price_reasonable CHECK (price <= 10000)
			)
		`)

		// Subscriptions table with enhanced billing logic
		await db.execute(`
			CREATE TABLE subscriptions (
				id TEXT PRIMARY KEY,
				userId TEXT NOT NULL,
				planId TEXT NOT NULL,
				status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
				currentPeriodStart DATETIME NOT NULL,
				currentPeriodEnd DATETIME NOT NULL,
				cancelAtPeriodEnd BOOLEAN DEFAULT FALSE,
				canceledAt DATETIME,
				trialStart DATETIME,
				trialEnd DATETIME,
				stripeSubscriptionId TEXT UNIQUE,
				stripeCustomerId TEXT,
				metadata TEXT DEFAULT '{}',
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				
				-- Foreign keys
				FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
				FOREIGN KEY (planId) REFERENCES plans (id) ON DELETE RESTRICT,
				
				-- Constraints
				CONSTRAINT chk_period_valid CHECK (currentPeriodEnd > currentPeriodStart),
				CONSTRAINT chk_trial_valid CHECK (trialEnd IS NULL OR trialEnd > trialStart),
				CONSTRAINT chk_stripe_ids_unique CHECK (stripeSubscriptionId IS NULL OR stripeSubscriptionId != '')
			)
		`)

		// Payments table with enhanced tracking
		await db.execute(`
			CREATE TABLE payments (
				id TEXT PRIMARY KEY,
				userId TEXT NOT NULL,
				subscriptionId TEXT,
				amount REAL NOT NULL CHECK (amount > 0),
				currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY')),
				status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled', 'refunded')),
				provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'manual')),
				providerId TEXT UNIQUE,
				providerData TEXT DEFAULT '{}',
				description TEXT,
				metadata TEXT DEFAULT '{}',
				failureReason TEXT,
				processedAt DATETIME,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				
				-- Foreign keys
				FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
				FOREIGN KEY (subscriptionId) REFERENCES subscriptions (id) ON DELETE SET NULL,
				
				-- Constraints
				CONSTRAINT chk_provider_id_format CHECK (providerId IS NULL OR length(providerId) > 0),
				CONSTRAINT chk_amount_reasonable CHECK (amount <= 100000)
			)
		`)

		// Audit logs for comprehensive tracking
		await db.execute(`
			CREATE TABLE audit_logs (
				id TEXT PRIMARY KEY,
				userId TEXT,
				adminId TEXT,
				action TEXT NOT NULL,
				resourceType TEXT NOT NULL,
				resourceId TEXT,
				details TEXT DEFAULT '{}',
				ipAddress TEXT,
				userAgent TEXT,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				
				-- Foreign keys
				FOREIGN KEY (userId) REFERENCES users (id) ON DELETE SET NULL,
				FOREIGN KEY (adminId) REFERENCES users (id) ON DELETE SET NULL,
				
				-- Constraints
				CONSTRAINT chk_action_length CHECK (length(action) >= 2 AND length(action) <= 100),
				CONSTRAINT chk_resource_type CHECK (resourceType IN ('user', 'subscription', 'payment', 'plan', 'notification', 'system_setting'))
			)
		`)

		// User sessions for enhanced security
		await db.execute(`
			CREATE TABLE user_sessions (
				id TEXT PRIMARY KEY,
				userId TEXT NOT NULL,
				token TEXT UNIQUE NOT NULL,
				expiresAt DATETIME NOT NULL,
				ipAddress TEXT,
				userAgent TEXT,
				isActive BOOLEAN DEFAULT TRUE,
				lastAccessedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				
				-- Foreign keys
				FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
				
				-- Constraints
				CONSTRAINT chk_token_length CHECK (length(token) >= 32),
				CONSTRAINT chk_expires_future CHECK (expiresAt > createdAt)
			)
		`)

		// Notifications with enhanced categorization
		await db.execute(`
			CREATE TABLE notifications (
				id TEXT PRIMARY KEY,
				userId TEXT NOT NULL,
				type TEXT NOT NULL,
				title TEXT NOT NULL,
				message TEXT NOT NULL,
				data TEXT DEFAULT '{}',
				isRead BOOLEAN DEFAULT FALSE,
				readAt DATETIME,
				priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				
				-- Foreign keys
				FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
				
				-- Constraints
				CONSTRAINT chk_type_valid CHECK (type IN ('info', 'warning', 'error', 'success', 'billing', 'security', 'system')),
				CONSTRAINT chk_title_length CHECK (length(title) >= 1 AND length(title) <= 100),
				CONSTRAINT chk_message_length CHECK (length(message) >= 1 AND length(message) <= 500)
			)
		`)

		// System settings with enhanced validation
		await db.execute(`
			CREATE TABLE system_settings (
				id TEXT PRIMARY KEY,
				key TEXT UNIQUE NOT NULL,
				value TEXT NOT NULL,
				type TEXT DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
				description TEXT,
				isPublic BOOLEAN DEFAULT FALSE,
				updatedBy TEXT,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				
				-- Foreign keys
				FOREIGN KEY (updatedBy) REFERENCES users (id) ON DELETE SET NULL,
				
				-- Constraints
				CONSTRAINT chk_key_format CHECK (key REGEXP '^[a-zA-Z][a-zA-Z0-9_.-]*$'),
				CONSTRAINT chk_value_not_empty CHECK (length(value) > 0)
			)
		`)

		// Create comprehensive indexes for optimal performance
		await this.createIndexes(db)
	},

	async down(db: any) {
		// Drop tables in reverse order (respecting foreign key constraints)
		const tables = [
			"system_settings",
			"notifications",
			"user_sessions",
			"audit_logs",
			"payments",
			"subscriptions",
			"plans",
			"users",
		]

		for (const table of tables) {
			await db.execute(`DROP TABLE IF EXISTS ${table}`)
		}
	},

	// Helper method for creating indexes
	async createIndexes(db: any) {
		// User indexes
		await db.execute("CREATE UNIQUE INDEX idx_users_email ON users (email)")
		await db.execute("CREATE INDEX idx_users_role ON users (role)")
		await db.execute("CREATE INDEX idx_users_status ON users (status)")
		await db.execute("CREATE INDEX idx_users_lastLoginAt ON users (lastLoginAt DESC)")
		await db.execute("CREATE INDEX idx_users_createdAt ON users (createdAt DESC)")

		// Plan indexes
		await db.execute("CREATE INDEX idx_plans_isActive ON plans (isActive)")
		await db.execute("CREATE INDEX idx_plans_sortOrder ON plans (sortOrder ASC)")
		await db.execute("CREATE INDEX idx_plans_price ON plans (price ASC)")

		// Subscription indexes
		await db.execute("CREATE INDEX idx_subscriptions_userId ON subscriptions (userId)")
		await db.execute("CREATE INDEX idx_subscriptions_status ON subscriptions (status)")
		await db.execute("CREATE INDEX idx_subscriptions_planId ON subscriptions (planId)")
		await db.execute("CREATE UNIQUE INDEX idx_subscriptions_stripeId ON subscriptions (stripeSubscriptionId)")
		await db.execute("CREATE INDEX idx_subscriptions_periodEnd ON subscriptions (currentPeriodEnd DESC)")
		await db.execute("CREATE INDEX idx_subscriptions_trialEnd ON subscriptions (trialEnd DESC)")

		// Payment indexes
		await db.execute("CREATE INDEX idx_payments_userId ON payments (userId)")
		await db.execute("CREATE INDEX idx_payments_subscriptionId ON payments (subscriptionId)")
		await db.execute("CREATE INDEX idx_payments_status ON payments (status)")
		await db.execute("CREATE INDEX idx_payments_provider ON payments (provider)")
		await db.execute("CREATE UNIQUE INDEX idx_payments_providerId ON payments (providerId)")
		await db.execute("CREATE INDEX idx_payments_createdAt ON payments (createdAt DESC)")
		await db.execute("CREATE INDEX idx_payments_processedAt ON payments (processedAt DESC)")

		// Audit log indexes
		await db.execute("CREATE INDEX idx_audit_logs_userId ON audit_logs (userId)")
		await db.execute("CREATE INDEX idx_audit_logs_adminId ON audit_logs (adminId)")
		await db.execute("CREATE INDEX idx_audit_logs_action ON audit_logs (action)")
		await db.execute("CREATE INDEX idx_audit_logs_resourceType ON audit_logs (resourceType)")
		await db.execute("CREATE INDEX idx_audit_logs_createdAt ON audit_logs (createdAt DESC)")
		await db.execute("CREATE INDEX idx_audit_logs_resource ON audit_logs (resourceType, resourceId)")

		// Session indexes
		await db.execute("CREATE INDEX idx_user_sessions_userId ON user_sessions (userId)")
		await db.execute("CREATE UNIQUE INDEX idx_user_sessions_token ON user_sessions (token)")
		await db.execute("CREATE INDEX idx_user_sessions_expiresAt ON user_sessions (expiresAt)")
		await db.execute("CREATE INDEX idx_user_sessions_isActive ON user_sessions (isActive)")

		// Notification indexes
		await db.execute("CREATE INDEX idx_notifications_userId ON notifications (userId)")
		await db.execute("CREATE INDEX idx_notifications_isRead ON notifications (isRead)")
		await db.execute("CREATE INDEX idx_notifications_type ON notifications (type)")
		await db.execute("CREATE INDEX idx_notifications_priority ON notifications (priority)")
		await db.execute("CREATE INDEX idx_notifications_createdAt ON notifications (createdAt DESC)")

		// System settings indexes
		await db.execute("CREATE UNIQUE INDEX idx_system_settings_key ON system_settings (key)")
		await db.execute("CREATE INDEX idx_system_settings_isPublic ON system_settings (isPublic)")
		await db.execute("CREATE INDEX idx_system_settings_type ON system_settings (type)")
	},
}
