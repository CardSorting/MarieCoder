import { db } from "../src/lib/db"

async function migrate() {
	try {
		console.log("🔄 Running database migrations...")

		// Create users table with enhanced SAAS fields
		await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'super_admin')),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
        avatar TEXT,
        timezone TEXT DEFAULT 'UTC',
        preferences TEXT DEFAULT '{}', -- JSON for user preferences
        lastLoginAt DATETIME,
        emailVerifiedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

		// Create subscriptions table
		await db.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
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
        stripeSubscriptionId TEXT,
        stripeCustomerId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )
    `)

		// Create plans table
		await db.execute(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
        features TEXT DEFAULT '[]', -- JSON array of features
        limits TEXT DEFAULT '{}', -- JSON object of limits
        isActive BOOLEAN DEFAULT TRUE,
        sortOrder INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

		// Create payments table with enhanced fields
		await db.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        subscriptionId TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled', 'refunded')),
        provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'manual')),
        providerId TEXT,
        providerData TEXT DEFAULT '{}', -- JSON for provider-specific data
        description TEXT,
        metadata TEXT DEFAULT '{}', -- JSON for additional metadata
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (subscriptionId) REFERENCES subscriptions (id) ON DELETE SET NULL
      )
    `)

		// Create audit_logs table for admin tracking
		await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        userId TEXT,
        adminId TEXT,
        action TEXT NOT NULL,
        resourceType TEXT NOT NULL,
        resourceId TEXT,
        details TEXT DEFAULT '{}', -- JSON for action details
        ipAddress TEXT,
        userAgent TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (adminId) REFERENCES users (id) ON DELETE SET NULL
      )
    `)

		// Create user_sessions table for session management
		await db.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expiresAt DATETIME NOT NULL,
        ipAddress TEXT,
        userAgent TEXT,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )
    `)

		// Create notifications table
		await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT DEFAULT '{}', -- JSON for additional data
        isRead BOOLEAN DEFAULT FALSE,
        readAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )
    `)

		// Create system_settings table for admin configuration
		await db.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        type TEXT DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
        description TEXT,
        isPublic BOOLEAN DEFAULT FALSE,
        updatedBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updatedBy) REFERENCES users (id) ON DELETE SET NULL
      )
    `)

		// Create comprehensive indexes for performance
		await db.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_users_status ON users (status)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_users_lastLoginAt ON users (lastLoginAt)")

		await db.execute("CREATE INDEX IF NOT EXISTS idx_subscriptions_userId ON subscriptions (userId)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status)")
		await db.execute(
			"CREATE INDEX IF NOT EXISTS idx_subscriptions_stripeSubscriptionId ON subscriptions (stripeSubscriptionId)",
		)

		await db.execute("CREATE INDEX IF NOT EXISTS idx_plans_isActive ON plans (isActive)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_plans_sortOrder ON plans (sortOrder)")

		await db.execute("CREATE INDEX IF NOT EXISTS idx_payments_userId ON payments (userId)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_payments_providerId ON payments (providerId)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_payments_createdAt ON payments (createdAt)")

		await db.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON audit_logs (userId)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_adminId ON audit_logs (adminId)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_resourceType ON audit_logs (resourceType)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_createdAt ON audit_logs (createdAt)")

		await db.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_userId ON user_sessions (userId)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (token)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_expiresAt ON user_sessions (expiresAt)")

		await db.execute("CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications (userId)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_notifications_isRead ON notifications (isRead)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (type)")

		await db.execute("CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings (key)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_system_settings_isPublic ON system_settings (isPublic)")

		console.log("✅ Database migrations completed successfully")
	} catch (error) {
		console.error("❌ Migration failed:", error)
		process.exit(1)
	}
}

migrate()
