#!/usr/bin/env node
/**
 * NOORMME Setup Script
 * Zero-configuration setup for NOORMME Artisan MCP server
 * Following NORMIE DEV methodology - eliminates manual setup complexity
 */

import { exec } from "child_process"
import { access } from "fs/promises"
import * as path from "path"
import { promisify } from "util"

const execAsync = promisify(exec)

class NoormmeSetupCLI {
	constructor() {
		this.projectRoot = process.cwd()
	}

	async run() {
		console.log("🚀 NOORMME Auto-Setup")
		console.log("=====================")
		console.log()

		try {
			// Check if we're in a NOORMME project
			const isNoormmeProject = await this.checkNoormmeProject()
			if (!isNoormmeProject) {
				console.log("❌ Not a NOORMME project. Please run this from a NOORMME project directory.")
				process.exit(1)
			}

			// Check current status
			const status = await this.getStatus()
			this.printStatus(status)

			// Auto-setup if needed
			if (!status.ready) {
				console.log()
				console.log("🔧 Auto-setting up NOORMME Artisan server...")
				await this.autoSetup()
			}

			console.log()
			console.log("✅ NOORMME setup complete!")
			console.log()
			console.log("🎯 Next steps:")
			console.log("   • Start Cline and the NOORMME Artisan server will be auto-detected")
			console.log("   • Use 'npm run artisan -- list' to see available commands")
			console.log("   • Use 'npm run artisan -- help <command>' for command help")
			console.log()
		} catch (error) {
			console.error("❌ Setup failed:", error.message)
			process.exit(1)
		}
	}

	async checkFileExists(filePath) {
		try {
			await access(filePath)
			return true
		} catch {
			return false
		}
	}

	async checkNoormmeProject() {
		const artisanPath = path.join(this.projectRoot, "mcp-servers", "noormme-artisan")
		const packageJsonPath = path.join(artisanPath, "package.json")
		return await this.checkFileExists(packageJsonPath)
	}

	async getStatus() {
		const artisanPath = path.join(this.projectRoot, "mcp-servers", "noormme-artisan")

		const serverExists = await this.checkFileExists(path.join(artisanPath, "package.json"))
		if (!serverExists) {
			return {
				ready: false,
				needsBuild: false,
				needsInstall: false,
				issues: ["NOORMME Artisan server not found"],
			}
		}

		const distPath = path.join(artisanPath, "dist", "index.js")
		const nodeModulesPath = path.join(artisanPath, "node_modules")

		const needsBuild = !(await this.checkFileExists(distPath))
		const needsInstall = !(await this.checkFileExists(nodeModulesPath))
		const ready = !needsBuild && !needsInstall

		const issues = []
		if (needsBuild) {
			issues.push("Server not built")
		}
		if (needsInstall) {
			issues.push("Dependencies not installed")
		}

		return { ready, needsBuild, needsInstall, issues }
	}

	printStatus(status) {
		console.log("📊 Current Status:")
		if (status.ready) {
			console.log("   ✅ NOORMME Artisan server is ready")
		} else {
			console.log("   ⚠️ NOORMME Artisan server needs setup")
			status.issues.forEach((issue) => {
				console.log(`   • ${issue}`)
			})
		}
	}

	async autoSetup() {
		const artisanPath = path.join(this.projectRoot, "mcp-servers", "noormme-artisan")

		// Install dependencies if needed
		const nodeModulesPath = path.join(artisanPath, "node_modules")
		if (!(await this.checkFileExists(nodeModulesPath))) {
			console.log("   📦 Installing dependencies...")
			await this.runCommand("npm install", artisanPath)
		}

		// Build server if needed
		const distPath = path.join(artisanPath, "dist", "index.js")
		if (!(await this.checkFileExists(distPath))) {
			console.log("   🔨 Building server...")
			await this.runCommand("npm run build", artisanPath)
		}
	}

	async runCommand(command, cwd) {
		try {
			const { stderr } = await execAsync(command, { cwd })
			if (stderr && !stderr.includes("warning")) {
				throw new Error(stderr)
			}
		} catch (error) {
			throw new Error(`Command failed: ${command}\n${error.message}`)
		}
	}
}

// Run the setup
const setup = new NoormmeSetupCLI()
setup.run().catch((error) => {
	console.error("❌ Setup failed:", error)
	process.exit(1)
})
