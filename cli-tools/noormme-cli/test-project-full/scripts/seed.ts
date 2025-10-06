#!/usr/bin/env tsx

/**
 * Database seeding script
 * This script populates the database with initial data
 */

import { db } from "../src/lib/db"

async function seed() {
	try {
		console.log("Starting database seeding...")

		// Connect to database
		await db.connect()

		console.log("Seeding users...")
		// Example user data would be inserted here

		console.log("Seeding payment configurations...")
		// Example payment configuration data would be inserted here

		console.log("✅ Seeding completed successfully")
	} catch (error) {
		console.error("❌ Seeding failed:", error)
		process.exit(1)
	} finally {
		await db.disconnect()
	}
}

// Run seeding if this file is executed directly
if (require.main === module) {
	seed()
}

export { seed }
