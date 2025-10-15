#!/usr/bin/env node

/**
 * Bundle Size Monitoring Script
 *
 * Checks if the bundle size exceeds defined thresholds and reports warnings.
 * Run after build to ensure bundle size is within acceptable limits.
 *
 * Usage:
 *   node scripts/check-bundle-size.mjs
 *   npm run check:bundle-size
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Bundle size thresholds (in KB)
const THRESHOLDS = {
	// Main bundle should stay under 700KB (currently ~640KB)
	"index.js": 700,

	// Vendor bundles
	"vendor-react": 250, // React + React-DOM
	vendor: 3000, // Main vendor chunk (large but acceptable)

	// Lazy-loaded views
	SettingsView: 35,
	McpConfigurationView: 25,
	HistoryView: 20,

	// Lazy-loaded components
	TaskSection: 10,
	ActionButtons: 10,
	WelcomeSection: 5,
	InputSection: 5,
	MessagesArea: 5,
	Navbar: 5,
	VoiceRecorder: 5,
}

// Warning threshold (percentage over limit before warning)
const WARNING_THRESHOLD = 0.9 // Warn at 90% of limit

// Build directory
const BUILD_DIR = path.join(__dirname, "../build/assets")

/**
 * Convert file size in bytes to KB
 */
function bytesToKB(bytes) {
	return (bytes / 1024).toFixed(2)
}

/**
 * Get file size in KB
 */
function getFileSizeKB(filePath) {
	const stats = fs.statSync(filePath)
	return parseFloat(bytesToKB(stats.size))
}

/**
 * Find files matching a pattern
 */
function findFiles(dir, pattern) {
	const files = fs.readdirSync(dir)
	return files.filter((file) => {
		if (pattern instanceof RegExp) {
			return pattern.test(file)
		}
		return file.includes(pattern)
	})
}

/**
 * Check a single file against threshold
 */
function checkFile(fileName, threshold) {
	const files = findFiles(BUILD_DIR, fileName)

	if (files.length === 0) {
		return {
			status: "missing",
			message: `⚠️  File not found: ${fileName}`,
		}
	}

	const file = files[0]
	const filePath = path.join(BUILD_DIR, file)
	const sizeKB = getFileSizeKB(filePath)

	const percentage = (sizeKB / threshold) * 100
	const overLimit = sizeKB > threshold
	const nearLimit = sizeKB > threshold * WARNING_THRESHOLD

	let status = "ok"
	let icon = "✅"
	let message = `${file}: ${sizeKB} KB / ${threshold} KB (${percentage.toFixed(1)}%)`

	if (overLimit) {
		status = "error"
		icon = "❌"
		message = `${file}: ${sizeKB} KB > ${threshold} KB LIMIT (${percentage.toFixed(1)}%) - OVER LIMIT!`
	} else if (nearLimit) {
		status = "warning"
		icon = "⚠️ "
		message = `${file}: ${sizeKB} KB / ${threshold} KB (${percentage.toFixed(1)}%) - Approaching limit`
	}

	return {
		status,
		icon,
		message,
		file,
		sizeKB,
		threshold,
		percentage: percentage.toFixed(1),
	}
}

/**
 * Main bundle size check
 */
function checkBundleSize() {
	console.log("\n📦 Bundle Size Check\n")
	console.log("=".repeat(80))
	console.log("\n")

	const results = []
	let hasErrors = false
	let hasWarnings = false

	// Check each file against its threshold
	for (const [pattern, threshold] of Object.entries(THRESHOLDS)) {
		const result = checkFile(pattern, threshold)
		results.push(result)

		console.log(`${result.icon} ${result.message}`)

		if (result.status === "error") {
			hasErrors = true
		} else if (result.status === "warning") {
			hasWarnings = true
		}
	}

	// Summary
	console.log("\n" + "=".repeat(80))
	console.log("\n📊 Summary:\n")

	const okCount = results.filter((r) => r.status === "ok").length
	const warningCount = results.filter((r) => r.status === "warning").length
	const errorCount = results.filter((r) => r.status === "error").length
	const missingCount = results.filter((r) => r.status === "missing").length

	console.log(`✅ OK: ${okCount}`)
	console.log(`⚠️  Warnings: ${warningCount}`)
	console.log(`❌ Errors: ${errorCount}`)
	console.log(`❓ Missing: ${missingCount}`)

	// Recommendations
	if (hasErrors || hasWarnings) {
		console.log("\n💡 Recommendations:\n")

		if (hasErrors) {
			console.log("❌ ERRORS FOUND:")
			console.log("   - Review large chunks and consider splitting them")
			console.log("   - Check for unnecessary dependencies")
			console.log("   - Consider lazy loading more components")
			console.log("")
		}

		if (hasWarnings) {
			console.log("⚠️  WARNINGS:")
			console.log("   - Monitor these files closely")
			console.log("   - Plan optimization before hitting limits")
			console.log("   - Consider code splitting strategies")
			console.log("")
		}
	}

	// Calculate total size
	const totalSize = results.filter((r) => r.sizeKB).reduce((sum, r) => sum + r.sizeKB, 0)

	console.log(`\n📦 Total Bundle Size: ${totalSize.toFixed(2)} KB`)
	console.log(
		`📦 Initial Load (main + vendor-react): ~${(results.find((r) => r.file?.includes("index"))?.sizeKB || 0) + (results.find((r) => r.file?.includes("vendor-react"))?.sizeKB || 0)} KB`,
	)

	// Exit with error if any checks failed
	if (hasErrors) {
		console.log("\n❌ Bundle size check FAILED\n")
		process.exit(1)
	} else if (hasWarnings) {
		console.log("\n⚠️  Bundle size check passed with warnings\n")
		process.exit(0)
	} else {
		console.log("\n✅ Bundle size check PASSED\n")
		process.exit(0)
	}
}

// Run the check
try {
	if (!fs.existsSync(BUILD_DIR)) {
		console.error("❌ Build directory not found. Run `npm run build` first.")
		process.exit(1)
	}

	checkBundleSize()
} catch (error) {
	console.error("❌ Error checking bundle size:", error.message)
	process.exit(1)
}
