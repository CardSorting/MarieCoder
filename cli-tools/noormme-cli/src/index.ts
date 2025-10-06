#!/usr/bin/env node

import chalk from "chalk"
import { Command } from "commander"
import { promises as fs } from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { DatabaseSetup } from "./utils/database-setup.js"
import { DependencyInstaller } from "./utils/dependency-installer.js"
import { ProgressIndicator } from "./utils/progress-indicator.js"
import { ProjectGenerator } from "./utils/project-generator.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const program = new Command()

program.name("noormme").description("NOORMME CLI - Seamless Next.js template deployment with automatic setup").version("1.0.0")

// New command - Create and deploy Next.js template
program
	.command("new <project-name>")
	.description("Create a new Next.js project with NOORMME integration")
	.option("-t, --template <template>", "Project template", "nextjs")
	.option("--auth", "Include authentication (NextAuth)", true)
	.option("--admin", "Include admin panel", true)
	.option("--tailwind", "Include Tailwind CSS", true)
	.option("--tests", "Include test setup", false)
	.option("--skip-deps", "Skip dependency installation", false)
	.option("--skip-db", "Skip database setup", false)
	.option("--skip-migrate", "Skip database migration", false)
	.option("--skip-seed", "Skip database seeding", false)
	.option("--timeout <seconds>", "Timeout for operations (seconds)", "300")
	.action(async (projectName, options) => {
		const startTime = Date.now()
		const timeout = parseInt(options.timeout) * 1000

		console.log(chalk.blue.bold("\n🚀 NOORMME Project Generator - Seamless Next.js Deployment\n"))
		console.log(chalk.gray(`Creating project: ${projectName}`))
		console.log(chalk.gray(`Template: ${options.template}`))
		console.log(chalk.gray(`Timeout: ${options.timeout}s\n`))

		const progress = new ProgressIndicator()

		try {
			// Step 1: Validate project name and directory
			progress.start("Validating project name and directory...")
			await validateProjectName(projectName)
			const projectPath = path.resolve(process.cwd(), projectName)

			if (
				await fs.access(projectPath).then(
					() => true,
					() => false,
				)
			) {
				throw new Error(`Directory ${projectName} already exists`)
			}
			progress.complete("✅ Project directory validated")

			// Step 2: Generate project structure
			progress.start("Generating project structure...")
			const generator = new ProjectGenerator(projectPath, {
				projectName,
				template: options.template,
				includeAuth: options.auth,
				includeAdmin: options.admin,
				includeTailwind: options.tailwind,
				includeTests: options.tests,
			})

			await withTimeout(generator.generate(), timeout, "Project generation timed out")
			progress.complete("✅ Project structure generated")

			// Step 3: Install dependencies (if not skipped)
			if (!options.skipDeps) {
				progress.start("Installing dependencies...")
				const installer = new DependencyInstaller(projectPath)

				await withTimeout(installer.install(), timeout, "Dependency installation timed out")
				progress.complete("✅ Dependencies installed")
			}

			// Step 4: Database setup (if not skipped)
			if (!options.skipDb) {
				progress.start("Setting up database...")
				const dbSetup = new DatabaseSetup(projectPath)

				await withTimeout(dbSetup.initialize(), timeout, "Database initialization timed out")
				progress.complete("✅ Database initialized")

				// Step 5: Run migrations (if not skipped)
				if (!options.skipMigrate) {
					progress.start("Running database migrations...")

					await withTimeout(dbSetup.migrate(), timeout, "Database migration timed out")
					progress.complete("✅ Database migrations completed")

					// Step 6: Seed database (if not skipped)
					if (!options.skipSeed) {
						progress.start("Seeding database...")

						await withTimeout(dbSetup.seed(), timeout, "Database seeding timed out")
						progress.complete("✅ Database seeded")
					}
				}
			}

			const endTime = Date.now()
			const duration = ((endTime - startTime) / 1000).toFixed(1)

			console.log(chalk.green.bold("\n🎉 Project created successfully!\n"))
			console.log(chalk.white(`📁 Project location: ${projectPath}`))
			console.log(chalk.white(`⏱️  Setup time: ${duration}s`))
			console.log(chalk.white(`🚀 Ready to develop!\n`))

			console.log(chalk.blue("Next steps:"))
			console.log(chalk.gray(`  cd ${projectName}`))
			console.log(chalk.gray("  npm run dev"))
			console.log(chalk.gray("  # Open http://localhost:3000\n"))
		} catch (error) {
			progress.error("❌ Project creation failed")
			console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`))

			// Cleanup on failure
			try {
				const projectPath = path.resolve(process.cwd(), projectName)
				if (
					await fs.access(projectPath).then(
						() => true,
						() => false,
					)
				) {
					console.log(chalk.yellow("\n🧹 Cleaning up failed project..."))
					await fs.rm(projectPath, { recursive: true, force: true })
					console.log(chalk.gray("✅ Cleanup completed"))
				}
			} catch (cleanupError) {
				console.error(chalk.red(`Cleanup failed: ${cleanupError}`))
			}

			process.exit(1)
		}
	})

// Deploy command - Deploy existing project
program
	.command("deploy [project-path]")
	.description("Deploy an existing NOORMME project (install deps, setup DB, migrate, seed)")
	.option("--skip-deps", "Skip dependency installation", false)
	.option("--skip-db", "Skip database setup", false)
	.option("--skip-migrate", "Skip database migration", false)
	.option("--skip-seed", "Skip database seeding", false)
	.option("--timeout <seconds>", "Timeout for operations (seconds)", "300")
	.action(async (projectPath = ".", options) => {
		const startTime = Date.now()
		const timeout = parseInt(options.timeout) * 1000
		const resolvedPath = path.resolve(projectPath)

		console.log(chalk.blue.bold("\n🚀 NOORMME Project Deployment\n"))
		console.log(chalk.gray(`Deploying project: ${resolvedPath}`))
		console.log(chalk.gray(`Timeout: ${options.timeout}s\n`))

		const progress = new ProgressIndicator()

		try {
			// Validate project exists and is NOORMME project
			progress.start("Validating project...")
			await validateNOORMMEProject(resolvedPath)
			progress.complete("✅ Project validated")

			// Install dependencies (if not skipped)
			if (!options.skipDeps) {
				progress.start("Installing dependencies...")
				const installer = new DependencyInstaller(resolvedPath)

				await withTimeout(installer.install(), timeout, "Dependency installation timed out")
				progress.complete("✅ Dependencies installed")
			}

			// Database setup (if not skipped)
			if (!options.skipDb) {
				progress.start("Setting up database...")
				const dbSetup = new DatabaseSetup(resolvedPath)

				await withTimeout(dbSetup.initialize(), timeout, "Database initialization timed out")
				progress.complete("✅ Database initialized")

				// Run migrations (if not skipped)
				if (!options.skipMigrate) {
					progress.start("Running database migrations...")

					await withTimeout(dbSetup.migrate(), timeout, "Database migration timed out")
					progress.complete("✅ Database migrations completed")

					// Seed database (if not skipped)
					if (!options.skipSeed) {
						progress.start("Seeding database...")

						await withTimeout(dbSetup.seed(), timeout, "Database seeding timed out")
						progress.complete("✅ Database seeded")
					}
				}
			}

			const endTime = Date.now()
			const duration = ((endTime - startTime) / 1000).toFixed(1)

			console.log(chalk.green.bold("\n🎉 Project deployed successfully!\n"))
			console.log(chalk.white(`⏱️  Deployment time: ${duration}s`))
			console.log(chalk.blue("Next steps:"))
			console.log(chalk.gray("  npm run dev"))
			console.log(chalk.gray("  # Open http://localhost:3000\n"))
		} catch (error) {
			progress.error("❌ Deployment failed")
			console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`))
			process.exit(1)
		}
	})

// Helper functions
async function validateProjectName(name: string): Promise<void> {
	if (!name || name.trim() === "") {
		throw new Error("Project name is required")
	}

	// Check for valid project name
	const validNameRegex = /^[a-zA-Z0-9-_]+$/
	if (!validNameRegex.test(name)) {
		throw new Error("Project name can only contain letters, numbers, hyphens, and underscores")
	}
}

async function validateNOORMMEProject(projectPath: string): Promise<void> {
	try {
		await fs.access(projectPath)
	} catch {
		throw new Error(`Project path does not exist: ${projectPath}`)
	}

	// Check for package.json
	const packageJsonPath = path.join(projectPath, "package.json")
	try {
		await fs.access(packageJsonPath)
	} catch {
		throw new Error("Not a valid Node.js project (package.json not found)")
	}

	// Check for NOORMME indicators
	const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"))
	const hasNOORMME = packageJson.dependencies?.noormme || packageJson.devDependencies?.noormme

	if (!hasNOORMME) {
		throw new Error("Not a NOORMME project (noormme dependency not found)")
	}
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
	})

	return Promise.race([promise, timeoutPromise])
}

program.parse()
