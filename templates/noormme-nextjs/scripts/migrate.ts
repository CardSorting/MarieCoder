import { db } from "../src/lib/db"

async function migrate() {
	try {
		console.log("🔄 Running database migrations...")

		// Create users table
		await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

		// Create payments table
		await db.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        status TEXT DEFAULT 'pending',
        provider TEXT NOT NULL,
        providerId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `)

		// Create indexes
		await db.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_payments_userId ON payments (userId)")
		await db.execute("CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status)")

		console.log("✅ Database migrations completed successfully")
	} catch (error) {
		console.error("❌ Migration failed:", error)
		process.exit(1)
	}
}

migrate()
