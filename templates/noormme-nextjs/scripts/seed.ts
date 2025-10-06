import { db } from "../src/lib/db"

async function seed() {
	try {
		console.log("🌱 Seeding database...")

		// Create admin user
		const adminUser = {
			id: "admin-1",
			email: "admin@example.com",
			name: "Admin User",
			role: "admin",
		}

		await db.execute(
			`
      INSERT OR IGNORE INTO users (id, email, name, role)
      VALUES (?, ?, ?, ?)
    `,
			[adminUser.id, adminUser.email, adminUser.name, adminUser.role],
		)

		// Create sample user
		const sampleUser = {
			id: "user-1",
			email: "user@example.com",
			name: "Sample User",
			role: "user",
		}

		await db.execute(
			`
      INSERT OR IGNORE INTO users (id, email, name, role)
      VALUES (?, ?, ?, ?)
    `,
			[sampleUser.id, sampleUser.email, sampleUser.name, sampleUser.role],
		)

		// Create sample payment
		const samplePayment = {
			id: "payment-1",
			userId: sampleUser.id,
			amount: 99.99,
			currency: "USD",
			status: "completed",
			provider: "stripe",
			providerId: "pi_1234567890",
		}

		await db.execute(
			`
      INSERT OR IGNORE INTO payments (id, userId, amount, currency, status, provider, providerId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
			[
				samplePayment.id,
				samplePayment.userId,
				samplePayment.amount,
				samplePayment.currency,
				samplePayment.status,
				samplePayment.provider,
				samplePayment.providerId,
			],
		)

		console.log("✅ Database seeded successfully")
		console.log("📧 Admin email: admin@example.com")
		console.log("📧 User email: user@example.com")
	} catch (error) {
		console.error("❌ Seeding failed:", error)
		process.exit(1)
	}
}

seed()
