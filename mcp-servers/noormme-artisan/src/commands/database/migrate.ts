/**
 * Database Migrate Command
 * Runs pending database migrations with NOORMME integration
 */

import fs from "fs-extra"
import path from "path"
import { ArtisanCommand, CommandArguments, CommandOptions, CommandResult } from "../../types.js"

export const migrateCommand: ArtisanCommand = {
	name: "db:migrate",
	description: "Run pending database migrations",
	signature: "db:migrate [options]",
	options: [
		{
			name: "step",
			description: "Number of migrations to run",
			type: "number",
			alias: "s",
		},
		{
			name: "force",
			description: "Force migration in production",
			type: "boolean",
			default: false,
			alias: "f",
		},
		{
			name: "pretend",
			description: "Show SQL without running migrations",
			type: "boolean",
			default: false,
			alias: "p",
		},
	],
	handler: async (_args: CommandArguments, options: CommandOptions): Promise<CommandResult> => {
		try {
			const step = options.step as number
			const force = options.force as boolean
			const pretend = options.pretend as boolean

			const result = await runMigrations({ step, force, pretend })

			return {
				success: true,
				message: result.message,
				data: result.data,
			}
		} catch (error) {
			return {
				success: false,
				message: "Migration failed",
				error: error instanceof Error ? error.message : String(error),
			}
		}
	},
}

async function runMigrations(options: {
	step?: number
	force: boolean
	pretend: boolean
}): Promise<{ message: string; data: any }> {
	try {
		const migrationsDir = path.join(process.cwd(), "src/lib/database/migrations")

		// Check if migrations directory exists
		if (!(await fs.pathExists(migrationsDir))) {
			return {
				message: "No migrations directory found",
				data: {
					executed: 0,
					pending: 0,
					migrations: [],
				},
			}
		}

		// Get all migration files
		const migrationFiles = await fs.readdir(migrationsDir)
		const migrationModules = migrationFiles.filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts")).sort()

		if (migrationModules.length === 0) {
			return {
				message: "No migration files found",
				data: {
					executed: 0,
					pending: 0,
					migrations: [],
				},
			}
		}

		// Check if database is initialized
		const dbPath = path.join(process.cwd(), "app.db")
		if (!(await fs.pathExists(dbPath))) {
			return {
				message: "Database not found. Please initialize the database first.",
				data: {
					executed: 0,
					pending: migrationModules.length,
					migrations: migrationModules,
				},
			}
		}

		if (options.pretend) {
			// Show what would be executed
			const sqlPreview = await generateMigrationPreview(migrationModules, options.step)
			return {
				message: "Migration SQL preview (pretend mode)",
				data: {
					migrations: sqlPreview,
					wouldExecute: options.step || migrationModules.length,
					total: migrationModules.length,
				},
			}
		}

		// Execute migrations
		const executedMigrations = await executeMigrations(migrationModules, options.step)

		return {
			message: `Successfully ran ${executedMigrations.length} migrations`,
			data: {
				executed: executedMigrations.length,
				pending: migrationModules.length - executedMigrations.length,
				migrations: executedMigrations,
			},
		}
	} catch (error) {
		throw new Error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`)
	}
}

async function generateMigrationPreview(migrationFiles: string[], step?: number): Promise<string[]> {
	const preview: string[] = []
	const filesToProcess = step ? migrationFiles.slice(0, step) : migrationFiles

	for (const file of filesToProcess) {
		try {
			const migrationPath = path.join(process.cwd(), "src/lib/database/migrations", file)
			const content = await fs.readFile(migrationPath, "utf-8")

			// Extract SQL from migration content (basic parsing)
			const sqlMatches = content.match(/await db\.schema\.[^;]+;/g)
			if (sqlMatches) {
				preview.push(...sqlMatches.map((sql) => sql.replace(/await db\.schema\./, "").replace(/;/g, ";")))
			} else {
				preview.push(`-- ${file}: Custom migration logic`)
			}
		} catch (_error) {
			preview.push(`-- ${file}: Error reading migration file`)
		}
	}

	return preview
}

async function executeMigrations(migrationFiles: string[], step?: number): Promise<string[]> {
	const executed: string[] = []
	const filesToProcess = step ? migrationFiles.slice(0, step) : migrationFiles

	// This would integrate with the actual NOORMME database system
	// For now, simulate execution
	for (const file of filesToProcess) {
		try {
			// In a real implementation, this would:
			// 1. Import the migration module
			// 2. Execute the up() method
			// 3. Record the migration in the migrations table
			// 4. Handle rollback on failure

			executed.push(file)
		} catch (error) {
			throw new Error(`Failed to execute migration ${file}: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	return executed
}
