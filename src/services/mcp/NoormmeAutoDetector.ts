/**
 * NOORMME Auto-Detector
 * Automatically detects and configures the unified noormme-artisan MCP server
 * Following NORMIE DEV methodology - eliminates manual setup complexity
 */

import { fileExistsAtPath } from "@utils/fs"
import * as path from "path"
import { McpServerConfig } from "./types"

export class NoormmeAutoDetector {
	private readonly projectRoot: string
	private readonly mcpServersPath: string

	constructor(projectRoot: string) {
		this.projectRoot = projectRoot
		this.mcpServersPath = path.join(projectRoot, "mcp-servers")
	}

	/**
	 * Automatically detect and configure NOORMME Artisan MCP server
	 * Returns null if not found or not properly configured
	 */
	async detectNoormmeArtisan(): Promise<McpServerConfig | null> {
		try {
			// Check if the unified server exists
			const artisanPath = path.join(this.mcpServersPath, "noormme-artisan")
			const distPath = path.join(artisanPath, "dist", "index.js")
			const packageJsonPath = path.join(artisanPath, "package.json")

			// Verify the server is built and ready
			const [distExists, packageExists] = await Promise.all([fileExistsAtPath(distPath), fileExistsAtPath(packageJsonPath)])

			if (!distExists || !packageExists) {
				console.log("NOORMME Artisan server not found or not built")
				return null
			}

			// Create the MCP server configuration
			const config: McpServerConfig = {
				type: "stdio",
				transportType: undefined, // Required by schema
				command: "node",
				args: [distPath],
				env: {
					// Set working directory to the project root for proper context
					PWD: this.projectRoot,
					// Enable NOORMME mode
					NOORMME_MODE: "true",
					// Set project context
					NOORMME_PROJECT_ROOT: this.projectRoot,
				},
				disabled: false,
				timeout: 30, // 30 seconds timeout
				autoApprove: [
					// Auto-approve common NOORMME commands for better UX
					"artisan_list",
					"artisan_help",
					"artisan_project_status",
					// Auto-approve make commands (they're safe)
					"artisan_execute",
				],
			}

			console.log("✅ NOORMME Artisan server auto-detected and configured")
			return config
		} catch (error) {
			console.error("Error auto-detecting NOORMME Artisan server:", error)
			return null
		}
	}

	/**
	 * Check if NOORMME Artisan server needs to be built
	 */
	async needsBuild(): Promise<boolean> {
		const distPath = path.join(this.mcpServersPath, "noormme-artisan", "dist", "index.js")
		return !(await fileExistsAtPath(distPath))
	}

	/**
	 * Get the build command for NOORMME Artisan server
	 */
	getBuildCommand(): string {
		return "cd mcp-servers/noormme-artisan && npm run build"
	}

	/**
	 * Check if this is a NOORMME project (has the unified server)
	 */
	async isNoormmeProject(): Promise<boolean> {
		const artisanPath = path.join(this.mcpServersPath, "noormme-artisan")
		const packageJsonPath = path.join(artisanPath, "package.json")
		return await fileExistsAtPath(packageJsonPath)
	}

	/**
	 * Get project information for NOORMME context
	 */
	async getProjectInfo(): Promise<{
		isNoormme: boolean
		hasArtisan: boolean
		needsBuild: boolean
		buildCommand?: string
	}> {
		const isNoormme = await this.isNoormmeProject()
		const hasArtisan = isNoormme && !(await this.needsBuild())
		const needsBuild = isNoormme && (await this.needsBuild())

		return {
			isNoormme,
			hasArtisan,
			needsBuild,
			buildCommand: needsBuild ? this.getBuildCommand() : undefined,
		}
	}
}
