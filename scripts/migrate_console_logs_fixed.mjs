#!/usr/bin/env node
/**
 * Console Log Migration Script (Fixed)
 *
 * Correctly replaces console.log/warn/info with output.log/warn/info
 * and adds imports in the right location.
 *
 * Usage:
 *   node scripts/migrate_console_logs_fixed.mjs src/cli/index.ts
 */

import fs from "node:fs"
import path from "node:path"

// Statistics
const stats = {
	filesProcessed: 0,
	filesModified: 0,
	replacements: 0,
	errors: 0,
}

/**
 * Find the correct position to insert import
 */
function findImportPosition(lines) {
	let lastImportLine = -1
	let inMultilineComment = false

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim()

		// Track multiline comments
		if (line.startsWith("/**") || line.startsWith("/*")) {
			inMultilineComment = true
		}
		if (line.includes("*/")) {
			inMultilineComment = false
			continue
		}

		// Skip comments and empty lines
		if (inMultilineComment || line.startsWith("//") || line.startsWith("*") || line.length === 0) {
			continue
		}

		// Found an import
		if (line.startsWith("import ")) {
			lastImportLine = i
		} else if (lastImportLine >= 0) {
			// First non-import line after imports
			return lastImportLine + 1
		}
	}

	// No imports found, insert after initial comments
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim()
		if (line.length > 0 && !line.startsWith("//") && !line.startsWith("/*") && !line.startsWith("*")) {
			return i
		}
	}

	return 0
}

/**
 * Migrate a file
 */
async function migrateFile(filePath) {
	try {
		// Read file
		const content = fs.readFileSync(filePath, "utf-8")
		const originalContent = content

		// Skip if already has output import
		if (content.includes("from './cli_output'") || content.includes('from "./cli_output"')) {
			console.log(`⏭️  Skipping ${path.basename(filePath)} - already migrated`)
			return
		}

		// Count console calls
		const consoleLogCount = (content.match(/console\.log\(/g) || []).length
		const consoleWarnCount = (content.match(/console\.warn\(/g) || []).length
		const consoleInfoCount = (content.match(/console\.info\(/g) || []).length
		const totalCount = consoleLogCount + consoleWarnCount + consoleInfoCount

		if (totalCount === 0) {
			console.log(`⏭️  Skipping ${path.basename(filePath)} - no console.log/warn/info`)
			return
		}

		// Replace console calls
		let modified = content
		modified = modified.replace(/console\.log\(/g, "output.log(")
		modified = modified.replace(/console\.warn\(/g, "output.warn(")
		modified = modified.replace(/console\.info\(/g, "output.info(")

		// Add import
		const lines = modified.split("\n")
		const importPos = findImportPosition(lines)
		lines.splice(importPos, 0, 'import { output } from "./cli_output"')
		modified = lines.join("\n")

		// Create backup
		const backupPath = `${filePath}.bak`
		fs.writeFileSync(backupPath, originalContent, "utf-8")

		// Write modified file
		fs.writeFileSync(filePath, modified, "utf-8")

		stats.filesProcessed++
		stats.filesModified++
		stats.replacements += totalCount

		// Report
		console.log(`✅ ${path.basename(filePath)}`)
		console.log(
			`   ${totalCount} replacements (log: ${consoleLogCount}, warn: ${consoleWarnCount}, info: ${consoleInfoCount})`,
		)
	} catch (error) {
		stats.errors++
		console.error(`❌ Error migrating ${filePath}:`, error.message)
	}
}

/**
 * Main function
 */
async function main() {
	const args = process.argv.slice(2)

	if (args.length === 0) {
		console.error("Usage: node migrate_console_logs_fixed.mjs <file1> [file2] ...")
		process.exit(1)
	}

	console.log("🔄 Console Log Migration (Fixed)")
	console.log("=".repeat(50))
	console.log("")

	// Process each file
	for (const filePath of args) {
		if (fs.existsSync(filePath)) {
			await migrateFile(filePath)
		} else {
			console.error(`❌ File not found: ${filePath}`)
			stats.errors++
		}
	}

	// Summary
	console.log("")
	console.log("=".repeat(50))
	console.log("📊 Migration Summary")
	console.log("")
	console.log(`  Files processed: ${stats.filesProcessed}`)
	console.log(`  Files modified:  ${stats.filesModified}`)
	console.log(`  Replacements:    ${stats.replacements}`)
	console.log(`  Errors:          ${stats.errors}`)
	console.log("")
	console.log("✅ Migration complete!")
	console.log("💾 Backups saved with .bak extension")
}

main().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})
