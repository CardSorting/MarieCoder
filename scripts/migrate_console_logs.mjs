#!/usr/bin/env node
/**
 * Console Log Migration Script
 *
 * Automatically replaces console.log/error/warn with output.log/error/warn
 * and adds necessary imports.
 *
 * Usage:
 *   node scripts/migrate_console_logs.mjs src/cli/index.ts
 *   node scripts/migrate_console_logs.mjs src/cli/*.ts
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const DRY_RUN = process.env.DRY_RUN === "true"
const BACKUP = process.env.NO_BACKUP !== "true"
const VERBOSE = process.env.VERBOSE === "true"

// Statistics
const stats = {
	filesProcessed: 0,
	filesModified: 0,
	replacements: 0,
	errors: 0,
}

/**
 * Main migration function
 */
async function migrateFile(filePath) {
	try {
		// Read file
		const content = fs.readFileSync(filePath, "utf-8")
		const originalContent = content

		// Check if already migrated
		if (content.includes("from './cli_output'") || content.includes('from "./cli_output"')) {
			if (VERBOSE) {
				console.log(`⏭️  Skipping ${filePath} - already migrated`)
			}
			return
		}

		// Count console calls before
		const beforeCount = (content.match(/console\.(log|error|warn|info|debug)/g) || []).length

		if (beforeCount === 0) {
			if (VERBOSE) {
				console.log(`⏭️  Skipping ${filePath} - no console calls`)
			}
			return
		}

		let modified = content

		// Replace console calls
		modified = modified.replace(/console\.log\(/g, "output.log(")
		modified = modified.replace(/console\.warn\(/g, "output.warn(")
		modified = modified.replace(/console\.info\(/g, "output.info(")

		// Keep console.error and console.debug as-is (special handling)
		// We'll only replace console.error in non-critical contexts

		// Add import if needed
		if (!modified.includes("from './cli_output'") && !modified.includes('from "./cli_output"')) {
			// Find the import section
			const lines = modified.split("\n")
			let lastImportIndex = -1

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i]
				if (line.startsWith("import ") || line.includes("from ")) {
					lastImportIndex = i
				} else if (lastImportIndex >= 0 && line.trim().length > 0 && !line.startsWith("//")) {
					// Found first non-import line
					break
				}
			}

			// Insert import after last import
			if (lastImportIndex >= 0) {
				lines.splice(lastImportIndex + 1, 0, 'import { output } from "./cli_output"')
			} else {
				// No imports found, add at top after comments
				let insertIndex = 0
				for (let i = 0; i < lines.length; i++) {
					if (!lines[i].startsWith("//") && !lines[i].startsWith("/*") && !lines[i].startsWith("*")) {
						insertIndex = i
						break
					}
				}
				lines.splice(insertIndex, 0, 'import { output } from "./cli_output"', "")
			}

			modified = lines.join("\n")
		}

		// Count replacements
		const afterCount = (modified.match(/output\.(log|warn|info)/g) || []).length
		const replacementCount = afterCount

		if (replacementCount === 0) {
			if (VERBOSE) {
				console.log(`⏭️  Skipping ${filePath} - no changes made`)
			}
			return
		}

		stats.filesProcessed++

		// Create backup if enabled
		if (BACKUP && !DRY_RUN) {
			const backupPath = `${filePath}.bak`
			fs.writeFileSync(backupPath, originalContent, "utf-8")
			if (VERBOSE) {
				console.log(`💾 Backup created: ${backupPath}`)
			}
		}

		// Write modified file (unless dry run)
		if (!DRY_RUN) {
			fs.writeFileSync(filePath, modified, "utf-8")
			stats.filesModified++
		}

		stats.replacements += replacementCount

		// Report
		const relativePath = path.relative(process.cwd(), filePath)
		console.log(`✅ ${relativePath}`)
		console.log(`   ${beforeCount} console calls → ${replacementCount} replaced`)

		if (DRY_RUN) {
			console.log("   [DRY RUN - no changes written]")
		}
	} catch (error) {
		stats.errors++
		console.error(`❌ Error migrating ${filePath}:`, error.message)
	}
}

/**
 * Process all files
 */
async function main() {
	const args = process.argv.slice(2)

	if (args.length === 0) {
		console.error("Usage: node migrate_console_logs.mjs <file1> [file2] ...")
		console.error("")
		console.error("Options (environment variables):")
		console.error("  DRY_RUN=true    - Preview changes without writing")
		console.error("  NO_BACKUP=true  - Skip creating .bak files")
		console.error("  VERBOSE=true    - Show detailed output")
		console.error("")
		console.error("Examples:")
		console.error("  node migrate_console_logs.mjs src/cli/index.ts")
		console.error('  DRY_RUN=true node migrate_console_logs.mjs "src/cli/*.ts"')
		console.error("  NO_BACKUP=true node migrate_console_logs.mjs src/cli/cli_*.ts")
		process.exit(1)
	}

	console.log("🔄 Console Log Migration Script")
	console.log("=".repeat(50))

	if (DRY_RUN) {
		console.log("🔍 DRY RUN MODE - No files will be modified")
	}
	if (!BACKUP) {
		console.log("⚠️  Backups disabled")
	}
	console.log("")

	// Process each file
	for (const filePattern of args) {
		// Handle glob patterns (basic support)
		if (filePattern.includes("*")) {
			const dir = path.dirname(filePattern)
			const pattern = path.basename(filePattern)
			const files = fs.readdirSync(dir)

			const matchingFiles = files
				.filter((f) => {
					if (pattern === "*.ts") {
						return f.endsWith(".ts") && !f.endsWith(".test.ts")
					}
					if (pattern === "cli_*.ts") {
						return f.startsWith("cli_") && f.endsWith(".ts")
					}
					return f.includes(pattern.replace("*", ""))
				})
				.map((f) => path.join(dir, f))

			for (const file of matchingFiles) {
				await migrateFile(file)
			}
		} else {
			await migrateFile(filePattern)
		}
	}

	// Print summary
	console.log("")
	console.log("=".repeat(50))
	console.log("📊 Migration Summary")
	console.log("")
	console.log(`  Files processed: ${stats.filesProcessed}`)
	console.log(`  Files modified:  ${stats.filesModified}`)
	console.log(`  Replacements:    ${stats.replacements}`)
	console.log(`  Errors:          ${stats.errors}`)

	if (DRY_RUN) {
		console.log("")
		console.log("✅ Dry run complete - run without DRY_RUN=true to apply changes")
	} else {
		console.log("")
		console.log("✅ Migration complete!")
		if (BACKUP && stats.filesModified > 0) {
			console.log("💾 Backups saved with .bak extension")
			console.log("   To restore: mv file.ts.bak file.ts")
		}
	}
}

// Run migration
main().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})
