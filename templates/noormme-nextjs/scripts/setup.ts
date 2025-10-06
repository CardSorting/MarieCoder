#!/usr/bin/env tsx

/**
 * NOORMME SAAS Template Setup Script
 * Automated setup for production-ready Next.js SAAS application
 * Following NORMIE DEV methodology - clean, unified, production-ready
 */

import { execSync } from "child_process"
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs"
import path from "path"

interface SetupOptions {
	skipEnv: boolean
	skipDatabase: boolean
	skipDependencies: boolean
	force: boolean
}

class SetupManager {
	private options: SetupOptions

	constructor(
		options: SetupOptions = {
			skipEnv: false,
			skipDatabase: false,
			skipDependencies: false,
			force: false,
		},
	) {
		this.options = options
	}

	async run(): Promise<void> {
		console.log("🚀 Starting NOORMME SAAS Template Setup")
		console.log("Following NORMIE DEV methodology - clean, unified, production-ready\n")

		try {
			await this.checkPrerequisites()
			await this.setupEnvironment()
			await this.installDependencies()
			await this.setupDatabase()
			await this.setupDirectories()
			await this.generateSecrets()
			await this.runMigrations()
			await this.seedDatabase()

			console.log("\n✅ Setup completed successfully!")
			console.log("\n🎯 Next steps:")
			console.log("   1. Review and update .env.local with your configuration")
			console.log('   2. Run "npm run dev" to start the development server')
			console.log("   3. Visit http://localhost:3000 to see your application")
			console.log('   4. Use "npm run artisan" to access development commands')
		} catch (error) {
			console.error("\n❌ Setup failed:", error instanceof Error ? error.message : String(error))
			process.exit(1)
		}
	}

	private async checkPrerequisites(): Promise<void> {
		console.log("🔍 Checking prerequisites...")

		const requiredVersions = {
			node: "18.0.0",
			npm: "8.0.0",
		}

		// Check Node.js version
		const nodeVersion = process.version
		const requiredNodeVersion = requiredVersions.node
		if (!this.versionCheck(nodeVersion, requiredNodeVersion)) {
			throw new Error(`Node.js ${requiredNodeVersion} or higher is required. Current version: ${nodeVersion}`)
		}

		// Check npm version
		try {
			const npmVersion = execSync("npm --version", { encoding: "utf8" }).trim()
			if (!this.versionCheck(npmVersion, requiredVersions.npm)) {
				throw new Error(`npm ${requiredVersions.npm} or higher is required. Current version: ${npmVersion}`)
			}
		} catch {
			throw new Error("npm is not installed or not accessible")
		}

		console.log("✅ Prerequisites check passed")
	}

	private versionCheck(current: string, required: string): boolean {
		const currentVersion = current.replace("v", "").split(".").map(Number)
		const requiredVersion = required.split(".").map(Number)

		for (let i = 0; i < Math.max(currentVersion.length, requiredVersion.length); i++) {
			const currentPart = currentVersion[i] || 0
			const requiredPart = requiredVersion[i] || 0

			if (currentPart > requiredPart) return true
			if (currentPart < requiredPart) return false
		}

		return true
	}

	private async setupEnvironment(): Promise<void> {
		if (this.options.skipEnv) {
			console.log("⏭️  Skipping environment setup")
			return
		}

		console.log("🔧 Setting up environment configuration...")

		const envExamplePath = path.join(process.cwd(), "env.example")
		const envLocalPath = path.join(process.cwd(), ".env.local")

		if (!existsSync(envExamplePath)) {
			throw new Error("env.example file not found")
		}

		if (existsSync(envLocalPath) && !this.options.force) {
			console.log("⚠️  .env.local already exists. Use --force to overwrite.")
			return
		}

		copyFileSync(envExamplePath, envLocalPath)
		console.log("✅ Environment configuration created")
	}

	private async installDependencies(): Promise<void> {
		if (this.options.skipDependencies) {
			console.log("⏭️  Skipping dependency installation")
			return
		}

		console.log("📦 Installing dependencies...")

		try {
			execSync("npm install", { stdio: "inherit" })
			console.log("✅ Dependencies installed successfully")
		} catch (error) {
			throw new Error('Failed to install dependencies. Please run "npm install" manually.')
		}
	}

	private async setupDatabase(): Promise<void> {
		if (this.options.skipDatabase) {
			console.log("⏭️  Skipping database setup")
			return
		}

		console.log("🗄️  Setting up database...")

		const databaseDir = path.join(process.cwd(), "database")
		if (!existsSync(databaseDir)) {
			mkdirSync(databaseDir, { recursive: true })
		}

		console.log("✅ Database directory created")
	}

	private async setupDirectories(): Promise<void> {
		console.log("📁 Setting up project directories...")

		const directories = [
			"src/components/ui",
			"src/components/admin",
			"src/components/auth",
			"src/components/features",
			"src/lib/services",
			"src/lib/repositories",
			"src/lib/middleware",
			"src/lib/queue",
			"src/types",
			"src/__tests__/fixtures",
			"src/__tests__/mocks",
			"uploads",
			"logs",
		]

		directories.forEach((dir) => {
			const fullPath = path.join(process.cwd(), dir)
			if (!existsSync(fullPath)) {
				mkdirSync(fullPath, { recursive: true })
			}
		})

		console.log("✅ Project directories created")
	}

	private async generateSecrets(): Promise<void> {
		console.log("🔐 Generating secure secrets...")

		const generateSecret = (length: number = 32): string => {
			const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
			let result = ""
			for (let i = 0; i < length; i++) {
				result += chars.charAt(Math.floor(Math.random() * chars.length))
			}
			return result
		}

		const secrets = {
			NEXTAUTH_SECRET: generateSecret(32),
			JWT_SECRET: generateSecret(32),
			ENCRYPTION_KEY: generateSecret(32),
		}

		const envLocalPath = path.join(process.cwd(), ".env.local")
		if (existsSync(envLocalPath)) {
			let envContent = require("fs").readFileSync(envLocalPath, "utf8")

			Object.entries(secrets).forEach(([key, value]) => {
				const regex = new RegExp(`^${key}=.*$`, "m")
				if (regex.test(envContent)) {
					envContent = envContent.replace(regex, `${key}="${value}"`)
				} else {
					envContent += `\n${key}="${value}"`
				}
			})

			writeFileSync(envLocalPath, envContent)
			console.log("✅ Secure secrets generated and updated")
		}
	}

	private async runMigrations(): Promise<void> {
		console.log("🔄 Running database migrations...")

		try {
			execSync("npm run migrate", { stdio: "inherit" })
			console.log("✅ Database migrations completed")
		} catch (error) {
			console.warn("⚠️  Database migrations failed. This may be normal for first-time setup.")
		}
	}

	private async seedDatabase(): Promise<void> {
		console.log("🌱 Seeding database...")

		try {
			execSync("npm run seed", { stdio: "inherit" })
			console.log("✅ Database seeding completed")
		} catch (error) {
			console.warn("⚠️  Database seeding failed. This may be normal for first-time setup.")
		}
	}
}

// CLI Interface
async function main() {
	const args = process.argv.slice(2)

	const options: SetupOptions = {
		skipEnv: args.includes("--skip-env"),
		skipDatabase: args.includes("--skip-database"),
		skipDependencies: args.includes("--skip-dependencies"),
		force: args.includes("--force"),
	}

	if (args.includes("--help")) {
		console.log(`
🚀 NOORMME SAAS Template Setup

Usage: npm run setup [options]

Options:
  --skip-env           Skip environment file creation
  --skip-database      Skip database setup
  --skip-dependencies  Skip dependency installation
  --force              Force overwrite existing files
  --help               Show this help message

Examples:
  npm run setup                    # Full setup
  npm run setup -- --skip-deps     # Skip dependency installation
  npm run setup -- --force         # Force overwrite existing files
`)
		process.exit(0)
	}

	const setupManager = new SetupManager(options)
	await setupManager.run()
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason)
	process.exit(1)
})

// Run the setup
main().catch((error) => {
	console.error("❌ Setup Error:", error.message)
	process.exit(1)
})
