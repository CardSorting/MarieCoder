import { NOORMME } from "noormme"

/**
 * Unified database configuration following NORMIE DEV methodology
 * Single source of truth for database connection
 */

const db = new NOORMME({
	dialect: "sqlite",
	connection: {
		database: process.env.DATABASE_URL || "./database.sqlite",
	},
})

// Initialize database with optimal SQLite settings
async function initializeDatabase() {
	try {
		// Enable WAL mode for better performance
		await db.execute("PRAGMA journal_mode=WAL")
		await db.execute("PRAGMA synchronous=NORMAL")
		await db.execute("PRAGMA cache_size=-64000") // 64MB cache
		await db.execute("PRAGMA temp_store=MEMORY")
		await db.execute("PRAGMA foreign_keys=ON")

		console.log("✅ Database initialized with optimal settings")
	} catch (error) {
		console.error("❌ Database initialization failed:", error)
		throw error
	}
}

// Initialize on import
initializeDatabase()

export { db }
export default db
