#!/usr/bin/env tsx

/**
 * Queue System Setup Script
 * Validates environment configuration and provides setup guidance
 */

import { existsSync, readFileSync } from "fs"
import { join } from "path"

interface EnvironmentCheck {
	key: string
	required: boolean
	description: string
	category: string
}

const ENVIRONMENT_CHECKS: EnvironmentCheck[] = [
	// Database
	{ key: "DATABASE_URL", required: true, description: "Database connection string", category: "Database" },

	// NextAuth
	{ key: "NEXTAUTH_SECRET", required: true, description: "NextAuth secret key", category: "Authentication" },
	{ key: "NEXTAUTH_URL", required: true, description: "NextAuth URL", category: "Authentication" },

	// OAuth Providers
	{ key: "GOOGLE_CLIENT_ID", required: false, description: "Google OAuth client ID", category: "OAuth" },
	{ key: "GOOGLE_CLIENT_SECRET", required: false, description: "Google OAuth client secret", category: "OAuth" },
	{ key: "GITHUB_CLIENT_ID", required: false, description: "GitHub OAuth client ID", category: "OAuth" },
	{ key: "GITHUB_CLIENT_SECRET", required: false, description: "GitHub OAuth client secret", category: "OAuth" },

	// Payment Providers
	{ key: "STRIPE_SECRET_KEY", required: false, description: "Stripe secret key", category: "Payments" },
	{ key: "STRIPE_PUBLISHABLE_KEY", required: false, description: "Stripe publishable key", category: "Payments" },
	{ key: "STRIPE_WEBHOOK_SECRET", required: false, description: "Stripe webhook secret", category: "Payments" },
	{ key: "PAYPAL_CLIENT_ID", required: false, description: "PayPal client ID", category: "Payments" },
	{ key: "PAYPAL_CLIENT_SECRET", required: false, description: "PayPal client secret", category: "Payments" },
	{ key: "PAYPAL_WEBHOOK_ID", required: false, description: "PayPal webhook ID", category: "Payments" },

	// Queue System Configuration
	{ key: "QUEUE_CONCURRENCY", required: false, description: "Max concurrent persistent jobs (default: 5)", category: "Queue" },
	{ key: "QUEUE_INTERVAL", required: false, description: "Processing interval in ms (default: 1000)", category: "Queue" },
	{ key: "QUEUE_BATCH_SIZE", required: false, description: "Jobs per batch (default: 10)", category: "Queue" },
	{ key: "QUEUE_CLEANUP_DAYS", required: false, description: "Days to keep completed jobs (default: 7)", category: "Queue" },
	{
		key: "QUEUE_IN_MEMORY_CONCURRENCY",
		required: false,
		description: "Max concurrent in-memory jobs (default: 3)",
		category: "Queue",
	},
	{
		key: "QUEUE_IN_MEMORY_INTERVAL",
		required: false,
		description: "In-memory processing interval (default: 100)",
		category: "Queue",
	},
	{ key: "QUEUE_IN_MEMORY_TIMEOUT", required: false, description: "Job timeout in ms (default: 30000)", category: "Queue" },
	{
		key: "QUEUE_CLEANUP_INTERVAL",
		required: false,
		description: "Cleanup interval in ms (default: 3600000)",
		category: "Queue",
	},

	// Email Configuration
	{ key: "EMAIL_FROM", required: false, description: "Default sender email address", category: "Email" },
	{ key: "EMAIL_API_KEY", required: false, description: "Email service API key", category: "Email" },

	// Image Processing Configuration
	{
		key: "IMAGE_OUTPUT_DIR",
		required: false,
		description: "Processed images output directory (default: ./uploads/processed)",
		category: "Images",
	},
	{ key: "IMAGE_TEMP_DIR", required: false, description: "Temporary files directory (default: ./temp)", category: "Images" },
]

function checkEnvironment(): void {
	console.log("🔍 Checking NOORMME Queue System Environment Configuration...\n")

	const envPath = join(process.cwd(), ".env.local")
	const envExamplePath = join(process.cwd(), "env.example")

	// Check if .env.local exists
	if (!existsSync(envPath)) {
		console.log("❌ .env.local file not found!")
		console.log("📝 Please copy env.example to .env.local and configure your environment variables:")
		console.log("   cp env.example .env.local\n")

		if (existsSync(envExamplePath)) {
			console.log("✅ env.example file found - you can copy from this template")
		} else {
			console.log("❌ env.example file not found - please create your environment configuration")
		}
		return
	}

	console.log("✅ .env.local file found")

	// Read environment file
	let envContent = ""
	try {
		envContent = readFileSync(envPath, "utf-8")
	} catch (error) {
		console.log("❌ Error reading .env.local file:", error)
		return
	}

	// Parse environment variables
	const envVars = new Map<string, string>()
	const lines = envContent.split("\n")

	for (const line of lines) {
		const trimmed = line.trim()
		if (trimmed && !trimmed.startsWith("#")) {
			const [key, ...valueParts] = trimmed.split("=")
			if (key && valueParts.length > 0) {
				envVars.set(key.trim(), valueParts.join("=").trim())
			}
		}
	}

	// Check each environment variable
	const categories = new Map<string, { required: EnvironmentCheck[]; optional: EnvironmentCheck[] }>()

	for (const check of ENVIRONMENT_CHECKS) {
		if (!categories.has(check.category)) {
			categories.set(check.category, { required: [], optional: [] })
		}

		const category = categories.get(check.category)!
		if (check.required) {
			category.required.push(check)
		} else {
			category.optional.push(check)
		}
	}

	// Display results by category
	let hasErrors = false

	for (const [categoryName, { required, optional }] of categories) {
		console.log(`\n📂 ${categoryName}:`)

		// Check required variables
		for (const check of required) {
			if (envVars.has(check.key) && envVars.get(check.key)) {
				console.log(`  ✅ ${check.key}: ${check.description}`)
			} else {
				console.log(`  ❌ ${check.key}: ${check.description} (REQUIRED)`)
				hasErrors = true
			}
		}

		// Check optional variables
		for (const check of optional) {
			if (envVars.has(check.key) && envVars.get(check.key)) {
				console.log(`  ✅ ${check.key}: ${check.description}`)
			} else {
				console.log(`  ⚪ ${check.key}: ${check.description} (optional)`)
			}
		}
	}

	// Summary
	console.log("\n" + "=".repeat(60))

	if (hasErrors) {
		console.log("❌ Environment configuration incomplete!")
		console.log("📝 Please configure the required environment variables in .env.local")
		console.log("🔧 You can use env.example as a template")
	} else {
		console.log("✅ Environment configuration looks good!")
		console.log("🚀 You can now start the development server:")
		console.log("   npm run dev")
		console.log("🎯 Visit /queue-demo to test the queue system")
	}

	// Queue-specific recommendations
	console.log("\n🎯 Queue System Recommendations:")
	console.log("  • Start with default queue settings for development")
	console.log("  • Adjust QUEUE_CONCURRENCY based on your server capacity")
	console.log("  • Set up EMAIL_FROM and EMAIL_API_KEY for email functionality")
	console.log("  • Configure IMAGE_OUTPUT_DIR and IMAGE_TEMP_DIR for image processing")
	console.log("  • Monitor queue performance at /api/queue/stats")
}

function showQueueInfo(): void {
	console.log("\n📚 NOORMME Queue System Information:")
	console.log("  🏗️  Two-tier architecture:")
	console.log("     • In-memory queues for fast, request-scoped operations")
	console.log("     • Persistent queues for reliable background job processing")
	console.log("  🔧 Pre-built handlers:")
	console.log("     • Email: Transactional emails, newsletters, bulk sending")
	console.log("     • Image: Processing, thumbnails, batch operations")
	console.log("     • Webhook: Delivery with retry logic and rate limiting")
	console.log("  📊 Monitoring:")
	console.log("     • GET /api/queue/stats - Queue statistics")
	console.log("     • GET /api/queue/jobs - Job management")
	console.log("     • POST /api/queue/cleanup - Clean up old jobs")
	console.log("  🎮 Demo:")
	console.log("     • Visit /queue-demo for interactive examples")
	console.log("  📖 Documentation:")
	console.log("     • See lib/queue/README.md for comprehensive guide")
}

function main(): void {
	console.log("🚀 NOORMME Queue System Setup")
	console.log("=".repeat(40))

	checkEnvironment()
	showQueueInfo()

	console.log("\n✨ Setup complete! Happy coding with NOORMME! ✨")
}

// Run if this file is executed directly
if (require.main === module) {
	main()
}

export { checkEnvironment, showQueueInfo }
