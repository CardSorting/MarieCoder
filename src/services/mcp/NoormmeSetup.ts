/**
 * NOORMME Setup Service
 * Provides zero-configuration setup for NOORMME Artisan MCP server
 * Following NORMIE DEV methodology - eliminates manual setup complexity
 */

import { fileExistsAtPath } from "@utils/fs"
import { exec } from "child_process"
import * as path from "path"
import { promisify } from "util"

const execAsync = promisify(exec)

export class NoormmeSetup {
	private readonly projectRoot: string

	constructor(projectRoot: string) {
		this.projectRoot = projectRoot
	}

	/**
	 * Ensure NOORMME Artisan server is ready (built and configured)
	 * Returns true if ready, false if setup failed
	 */
	async ensureReady(): Promise<boolean> {
		try {
			const artisanPath = path.join(this.projectRoot, "mcp-servers", "noormme-artisan")

			// Check if the server exists
			if (!(await fileExistsAtPath(path.join(artisanPath, "package.json")))) {
				console.log("❌ NOORMME Artisan server not found")
				return false
			}

			// Check if it needs to be built
			const distPath = path.join(artisanPath, "dist", "index.js")
			if (!(await fileExistsAtPath(distPath))) {
				console.log("🔨 Building NOORMME Artisan server...")
				await this.buildServer()
			}

			// Check if dependencies are installed
			const nodeModulesPath = path.join(artisanPath, "node_modules")
			if (!(await fileExistsAtPath(nodeModulesPath))) {
				console.log("📦 Installing NOORMME Artisan dependencies...")
				await this.installDependencies()
			}

			console.log("✅ NOORMME Artisan server is ready")
			return true
		} catch (error) {
			console.error("❌ Failed to setup NOORMME Artisan server:", error)
			return false
		}
	}

	/**
	 * Build the NOORMME Artisan server
	 */
	private async buildServer(): Promise<void> {
		const artisanPath = path.join(this.projectRoot, "mcp-servers", "noormme-artisan")

		try {
			const { stderr } = await execAsync("npm run build", {
				cwd: artisanPath,
				timeout: 60000, // 60 seconds timeout
			})

			if (stderr && !stderr.includes("warning")) {
				throw new Error(`Build failed: ${stderr}`)
			}

			console.log("✅ NOORMME Artisan server built successfully")
		} catch (error) {
			throw new Error(`Failed to build NOORMME Artisan server: ${error}`)
		}
	}

	/**
	 * Install dependencies for NOORMME Artisan server
	 */
	private async installDependencies(): Promise<void> {
		const artisanPath = path.join(this.projectRoot, "mcp-servers", "noormme-artisan")

		try {
			const { stderr } = await execAsync("npm install", {
				cwd: artisanPath,
				timeout: 120000, // 2 minutes timeout
			})

			if (stderr && !stderr.includes("warning")) {
				throw new Error(`Installation failed: ${stderr}`)
			}

			console.log("✅ NOORMME Artisan dependencies installed successfully")
		} catch (error) {
			throw new Error(`Failed to install NOORMME Artisan dependencies: ${error}`)
		}
	}

	/**
	 * Get setup status and recommendations
	 */
	async getSetupStatus(): Promise<{
		ready: boolean
		needsBuild: boolean
		needsInstall: boolean
		recommendations: string[]
	}> {
		const artisanPath = path.join(this.projectRoot, "mcp-servers", "noormme-artisan")
		const recommendations: string[] = []

		// Check if server exists
		const serverExists = await fileExistsAtPath(path.join(artisanPath, "package.json"))
		if (!serverExists) {
			return {
				ready: false,
				needsBuild: false,
				needsInstall: false,
				recommendations: ["NOORMME Artisan server not found. Please ensure you're in a NOORMME project."],
			}
		}

		// Check if built
		const distPath = path.join(artisanPath, "dist", "index.js")
		const needsBuild = !(await fileExistsAtPath(distPath))
		if (needsBuild) {
			recommendations.push("Run 'npm run mcp:build' to build the server")
		}

		// Check if dependencies installed
		const nodeModulesPath = path.join(artisanPath, "node_modules")
		const needsInstall = !(await fileExistsAtPath(nodeModulesPath))
		if (needsInstall) {
			recommendations.push("Run 'cd mcp-servers/noormme-artisan && npm install' to install dependencies")
		}

		const ready = !needsBuild && !needsInstall

		return {
			ready,
			needsBuild,
			needsInstall,
			recommendations,
		}
	}

	/**
	 * Auto-setup NOORMME Artisan server with user-friendly messages
	 */
	async autoSetup(): Promise<boolean> {
		console.log("🚀 NOORMME Auto-Setup Starting...")

		const status = await this.getSetupStatus()

		if (status.ready) {
			console.log("✅ NOORMME Artisan server is already ready!")
			return true
		}

		if (status.recommendations.length > 0) {
			console.log("📋 Setup recommendations:")
			status.recommendations.forEach((rec) => console.log(`   • ${rec}`))
		}

		return await this.ensureReady()
	}
}
