import { GlobalFileNames } from "@core/storage/disk"
import { Logger } from "@services/logging/Logger"
import { fileExistsAtPath } from "@utils/fs"
import chokidar, { FSWatcher } from "chokidar"
import * as fs from "fs/promises"
import * as path from "path"
import { z } from "zod"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"
import { McpSettingsSchema } from "./schemas"
import type { McpServerConfig } from "./types"

/**
 * Manages MCP settings file operations
 *
 * This service handles all interactions with the MCP settings file including:
 * - File path resolution and creation
 * - Reading and parsing JSON with validation
 * - Writing updated settings
 * - File watching for hot-reload
 * - Schema validation with Zod
 *
 * Responsibilities:
 * - Settings file I/O operations
 * - JSON parsing and validation
 * - Zod schema validation
 * - File system watching
 * - Error handling for invalid settings
 *
 * @example
 * ```typescript
 * const settingsManager = new McpSettingsManager(...)
 * const settings = await settingsManager.readSettings()
 * await settingsManager.watchSettingsFile((settings) => { ... })
 * ```
 */
export class McpSettingsManager {
	private settingsWatcher?: FSWatcher

	constructor(
		private readonly getMcpServersPath: () => Promise<string>,
		private readonly getSettingsDirectoryPath: () => Promise<string>,
	) {}

	/**
	 * Get MCP settings file path, creating it if it doesn't exist
	 *
	 * Resolves the path to the MCP settings file and ensures it exists.
	 * If the file doesn't exist, creates it with an empty server configuration.
	 *
	 * @returns Promise<string> - Absolute path to settings file
	 */
	async getSettingsFilePath(): Promise<string> {
		const mcpSettingsFilePath = path.join(await this.getSettingsDirectoryPath(), GlobalFileNames.mcpSettings)
		const fileExists = await fileExistsAtPath(mcpSettingsFilePath)

		if (!fileExists) {
			await fs.writeFile(
				mcpSettingsFilePath,
				`{
  "mcpServers": {
    
  }
}`,
			)
		}

		return mcpSettingsFilePath
	}

	/**
	 * Get MCP servers directory path
	 *
	 * @returns Promise<string> - Absolute path to MCP servers directory
	 */
	getMcpServersPathAsync(): Promise<string> {
		return this.getMcpServersPath()
	}

	/**
	 * Read and validate MCP settings file
	 *
	 * Reads the settings file, parses JSON, and validates against the schema.
	 * Shows error messages to the user if validation fails.
	 *
	 * @returns Promise<z.infer<typeof McpSettingsSchema> | undefined> - Validated settings or undefined on error
	 */
	async readSettings(): Promise<z.infer<typeof McpSettingsSchema> | undefined> {
		try {
			const settingsPath = await this.getSettingsFilePath()
			const content = await fs.readFile(settingsPath, "utf-8")

			let config: any

			// Parse JSON file content
			try {
				config = JSON.parse(content)
			} catch (_error) {
				HostProvider.window.showMessage({
					type: ShowMessageType.ERROR,
					message: "Invalid MCP settings format. Please ensure your settings follow the correct JSON format.",
				})
				return undefined
			}

			// Validate against schema
			const result = McpSettingsSchema.safeParse(config)
			if (!result.success) {
				HostProvider.window.showMessage({
					type: ShowMessageType.ERROR,
					message: "Invalid MCP settings schema.",
				})
				return undefined
			}

			return result.data
		} catch (error) {
			Logger.error("Failed to read MCP settings", error instanceof Error ? error : new Error(String(error)))
			return undefined
		}
	}

	/**
	 * Write MCP settings to file
	 *
	 * Serializes the settings object to JSON and writes it to the settings file.
	 *
	 * @param settings - The settings object to write
	 * @throws Error if write operation fails
	 */
	async writeSettings(settings: z.infer<typeof McpSettingsSchema>): Promise<void> {
		const settingsPath = await this.getSettingsFilePath()
		await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2))
	}

	/**
	 * Update a specific server configuration
	 *
	 * Updates the configuration for a single server while preserving other servers.
	 *
	 * @param serverName - Name of the server to update
	 * @param serverConfig - New configuration for the server
	 * @throws Error if settings cannot be read or written
	 */
	async updateServerConfig(serverName: string, serverConfig: McpServerConfig): Promise<void> {
		const settings = await this.readSettings()
		if (!settings) {
			throw new Error("Failed to read MCP settings")
		}

		settings.mcpServers[serverName] = serverConfig
		await this.writeSettings(settings)
	}

	/**
	 * Delete a server configuration
	 *
	 * Removes a server from the settings file.
	 *
	 * @param serverName - Name of the server to delete
	 * @throws Error if settings cannot be read or written
	 */
	async deleteServerConfig(serverName: string): Promise<void> {
		const settings = await this.readSettings()
		if (!settings) {
			throw new Error("Failed to read MCP settings")
		}

		delete settings.mcpServers[serverName]
		await this.writeSettings(settings)
	}

	/**
	 * Watch MCP settings file for changes
	 *
	 * Sets up a file watcher that calls the provided callback when the settings
	 * file changes. The callback receives the validated settings object.
	 *
	 * Uses chokidar with atomic write detection and write stability checking
	 * to handle editors that write files in chunks or use temporary files.
	 *
	 * @param onChange - Callback function called with new settings on change
	 * @returns Promise<void>
	 */
	async watchSettingsFile(onChange: (settings: z.infer<typeof McpSettingsSchema>) => Promise<void>): Promise<void> {
		const settingsPath = await this.getSettingsFilePath()

		this.settingsWatcher = chokidar.watch(settingsPath, {
			persistent: true, // Keep the process running
			ignoreInitial: true, // Don't fire 'add' events initially
			awaitWriteFinish: {
				// Wait for writes to finish before emitting events
				stabilityThreshold: 100, // Wait 100ms for file size to remain constant
				pollInterval: 100, // Check file size every 100ms
			},
			atomic: true, // Handle atomic writes (temp file then rename)
		})

		this.settingsWatcher.on("change", async () => {
			const settings = await this.readSettings()
			if (settings) {
				try {
					await onChange(settings)
				} catch (error) {
					Logger.error(
						"Failed to process MCP settings change",
						error instanceof Error ? error : new Error(String(error)),
					)
				}
			}
		})

		this.settingsWatcher.on("error", (error) => {
			Logger.error("Error watching MCP settings file", error instanceof Error ? error : new Error(String(error)))
		})
	}

	/**
	 * Stop watching the settings file
	 *
	 * Closes the file watcher and cleans up resources.
	 */
	async stopWatching(): Promise<void> {
		if (this.settingsWatcher) {
			await this.settingsWatcher.close()
			this.settingsWatcher = undefined
		}
	}

	/**
	 * Get server order from settings
	 *
	 * Returns the order of servers as they appear in the settings file.
	 * This is useful for maintaining consistent ordering in the UI.
	 *
	 * @returns Promise<string[]> - Array of server names in order
	 */
	async getServerOrder(): Promise<string[]> {
		const settings = await this.readSettings()
		if (!settings) {
			return []
		}

		return Object.keys(settings.mcpServers || {})
	}
}
