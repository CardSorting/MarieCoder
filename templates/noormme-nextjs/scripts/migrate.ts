/**
 * Enhanced Migration Script for NOORMME SAAS
 * Following NORMIE DEV methodology - clean, efficient, reliable migrations
 */

import { DatabaseFactory } from "../src/lib/database/connection"

async function migrate() {
	try {
		console.log("🔄 Running enhanced database migrations...")

		// Initialize database with enhanced connection manager
		const dbManager = await DatabaseFactory.create({
			database: process.env.DATABASE_URL || "./database.sqlite",
			wal: true,
			cacheSize: -64000,
			synchronous: "NORMAL",
			tempStore: "MEMORY",
			foreignKeys: true,
			optimize: true,
			timeout: 30000,
			busyTimeout: 5000,
		})

		// Get migration manager
		const migrationManager = dbManager.getMigrationManager()

		// Import and run migrations
		const { initialSchema } = await import("../src/lib/database/migrations/001_initial_schema")

		const migrations = [initialSchema]
		await migrationManager.runMigrations(migrations)

		// Get database statistics
		const stats = await dbManager.getStats()
		console.log("📊 Database Statistics:")
		console.log(`  - Total Tables: ${stats.totalConnections}`)
		console.log(`  - Active Tables: ${stats.activeConnections}`)
		console.log(`  - Query Count: ${stats.queryCount}`)
		console.log(`  - Avg Query Time: ${stats.avgQueryTime.toFixed(2)}ms`)

		// Health check
		const health = await dbManager.healthCheck()
		console.log(`🏥 Database Health: ${health.status.toUpperCase()}`)

		console.log("✅ Enhanced database migrations completed successfully")
	} catch (error) {
		console.error("❌ Migration failed:", error)
		process.exit(1)
	}
}

// Run migrations if called directly
if (require.main === module) {
	migrate()
}

export { migrate }
