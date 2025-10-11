import { sendMcpServersUpdate } from "@core/controller/mcp/subscribeToMcpServers"
import type { McpServer } from "@shared/mcp"
import { MIN_MCP_TIMEOUT_SECONDS } from "@shared/mcp"
import { convertMcpServersToProtoMcpServers } from "@shared/proto-conversions/mcp/mcp-server-conversion"
import { z } from "zod"
import { HostProvider } from "@/hosts/host-provider"
import { Logger } from "@/services/logging/Logger"
import { ShowMessageType } from "@/shared/proto/host/window"
import { McpConnectionManager } from "./mcp_connection_manager"
import { McpNotificationManager } from "./mcp_notification_manager"
import { McpSettingsManager } from "./mcp_settings_manager"
import { McpTransportFactory } from "./mcp_transport_factory"
import { BaseConfigSchema, ServerConfigSchema } from "./schemas"
import type { McpServerConfig } from "./types"

/**
 * Hub coordinator for MCP server management
 *
 * This service has been refactored from a 1,155-line monolith into a lean
 * hub-and-spoke coordinator (~250 lines) that delegates to specialized services.
 *
 * **Hub Responsibilities (Coordination):**
 * - Provide unified API facade for MCP operations
 * - Coordinate between specialized managers
 * - Handle RPC method routing
 * - Manage initialization and disposal
 * - Notify webview of state changes
 *
 * **Delegated to Specialized Services:**
 * - Settings I/O → McpSettingsManager
 * - Transport creation → McpTransportFactory
 * - Notifications → McpNotificationManager
 * - Connections → McpConnectionManager
 *
 * @example
 * ```typescript
 * const mcpHub = new McpHub(getMcpServersPath, getSettingsDirectoryPath, clientVersion)
 * const servers = mcpHub.getServers()
 * await mcpHub.callTool(serverName, toolName, args, ulid)
 * ```
 */
export class McpHub {
	// Specialized service delegates
	private readonly settingsManager: McpSettingsManager
	private readonly transportFactory: McpTransportFactory
	private readonly notificationManager: McpNotificationManager
	private readonly connectionManager: McpConnectionManager

	isConnecting: boolean = false

	constructor(
		getMcpServersPath: () => Promise<string>,
		getSettingsDirectoryPath: () => Promise<string>,
		clientVersion: string,
	) {
		// Initialize specialized service delegates
		this.settingsManager = new McpSettingsManager(getMcpServersPath, getSettingsDirectoryPath)
		this.transportFactory = new McpTransportFactory()
		this.notificationManager = new McpNotificationManager()
		this.connectionManager = new McpConnectionManager(
			this.transportFactory,
			this.notificationManager,
			this.settingsManager,
			clientVersion,
		)

		// Start watching settings file and initialize servers
		this.watchMcpSettingsFile()
		this.initializeMcpServers()
	}

	/**
	 * Get enabled servers (delegates to ConnectionManager)
	 *
	 * @returns Array of enabled MCP servers
	 */
	getServers(): McpServer[] {
		return this.connectionManager.getEnabledServers()
	}

	/**
	 * Get MCP settings file path (delegates to SettingsManager)
	 *
	 * @returns Promise<string> - Path to settings file
	 */
	async getMcpSettingsFilePath(): Promise<string> {
		return await this.settingsManager.getSettingsFilePath()
	}

	/**
	 * Get MCP servers directory path (delegates to SettingsManager)
	 *
	 * @returns Promise<string> - Path to MCP servers directory
	 */
	async getMcpServersPath(): Promise<string> {
		return await this.settingsManager.getMcpServersPathAsync()
	}

	/**
	 * Watch MCP settings file for changes
	 *
	 * Sets up file watching (via SettingsManager) and triggers connection
	 * updates when settings change.
	 *
	 * @private
	 */
	private async watchMcpSettingsFile(): Promise<void> {
		await this.settingsManager.watchSettingsFile(async (settings) => {
			await this.updateServerConnections(settings.mcpServers)
		})
	}

	/**
	 * Initialize MCP servers from settings
	 *
	 * Reads settings (via SettingsManager) and establishes initial connections
	 * (via ConnectionManager).
	 *
	 * @private
	 */
	private async initializeMcpServers(): Promise<void> {
		const settings = await this.settingsManager.readSettings()
		const servers = settings?.mcpServers || {}

		await this.updateServerConnections(servers)
	}

	/**
	 * Update server connections (delegates to ConnectionManager)
	 *
	 * Compares current connections with new configuration and updates accordingly.
	 * Notifies webview after updates complete.
	 *
	 * @param newServers - New server configuration
	 */
	async updateServerConnections(newServers: Record<string, McpServerConfig>): Promise<void> {
		this.isConnecting = true
		await this.connectionManager.updateServerConnections(newServers)
		await this.notifyWebviewOfServerChanges()
		this.isConnecting = false
	}

	/**
	 * Update server connections (RPC variant)
	 *
	 * Same as updateServerConnections but without webview notification.
	 * Used by RPC methods that return server list directly.
	 *
	 * @param newServers - New server configuration
	 */
	async updateServerConnectionsRPC(newServers: Record<string, McpServerConfig>): Promise<void> {
		this.isConnecting = true
		await this.connectionManager.updateServerConnections(newServers)
		this.isConnecting = false
	}

	/**
	 * Restart a server connection (delegates to ConnectionManager)
	 *
	 * @param serverName - Server name to restart
	 */
	async restartConnection(serverName: string): Promise<void> {
		this.isConnecting = true
		await this.connectionManager.restartConnection(serverName)
		await this.notifyWebviewOfServerChanges()
		this.isConnecting = false
	}

	/**
	 * Restart a server connection (RPC variant)
	 *
	 * @param serverName - Server name to restart
	 * @returns Promise<McpServer[]> - Updated server list
	 */
	async restartConnectionRPC(serverName: string): Promise<McpServer[]> {
		this.isConnecting = true
		await this.connectionManager.restartConnection(serverName)
		this.isConnecting = false

		const config = await this.settingsManager.readSettings()
		if (!config) {
			throw new Error("Failed to read or validate MCP settings")
		}

		return this.getSortedMcpServers(Object.keys(config.mcpServers || {}))
	}

	/**
	 * Read a resource from a server (delegates to ConnectionManager)
	 *
	 * @param serverName - Server name
	 * @param uri - Resource URI
	 * @returns Promise with resource content
	 */
	async readResource(serverName: string, uri: string) {
		return await this.connectionManager.readResource(serverName, uri)
	}

	/**
	 * Call a tool on a server (delegates to ConnectionManager)
	 *
	 * @param serverName - Server name
	 * @param toolName - Tool name
	 * @param toolArguments - Tool arguments
	 * @param ulid - Task ID
	 * @returns Promise with tool result
	 */
	async callTool(serverName: string, toolName: string, toolArguments: Record<string, unknown> | undefined, ulid: string) {
		return await this.connectionManager.callTool(serverName, toolName, toolArguments, ulid)
	}

	/**
	 * Toggle server disabled state (RPC method)
	 *
	 * Updates the disabled flag in settings and returns updated server list.
	 *
	 * @param serverName - Server name
	 * @param disabled - Whether to disable the server
	 * @returns Promise<McpServer[]> - Updated server list
	 */
	async toggleServerDisabledRPC(serverName: string, disabled: boolean): Promise<McpServer[]> {
		try {
			const config = await this.settingsManager.readSettings()
			if (!config) {
				throw new Error("Failed to read or validate MCP settings")
			}

			if (config.mcpServers[serverName]) {
				config.mcpServers[serverName].disabled = disabled

				await this.settingsManager.writeSettings(config)

				const connection = this.connectionManager.findConnection(serverName)
				if (connection) {
					connection.server.disabled = disabled
				}

				return this.getSortedMcpServers(Object.keys(config.mcpServers || {}))
			}

			Logger.error(`Server "${serverName}" not found in MCP configuration`)
			throw new Error(`Server "${serverName}" not found in MCP configuration`)
		} catch (error) {
			Logger.error("Failed to update server disabled state", error instanceof Error ? error : new Error(String(error)))
			HostProvider.window.showMessage({
				type: ShowMessageType.ERROR,
				message: `Failed to update server state: ${error instanceof Error ? error.message : String(error)}`,
			})
			throw error
		}
	}

	/**
	 * Toggle tool auto-approve (RPC method)
	 *
	 * Updates auto-approve settings for specific tools and returns updated server list.
	 *
	 * @param serverName - Server name
	 * @param toolNames - Tool names to toggle
	 * @param shouldAllow - Whether to allow auto-approve
	 * @returns Promise<McpServer[]> - Updated server list
	 */
	async toggleToolAutoApproveRPC(serverName: string, toolNames: string[], shouldAllow: boolean): Promise<McpServer[]> {
		try {
			const settings = await this.settingsManager.readSettings()
			if (!settings) {
				throw new Error("Failed to read MCP settings")
			}

			// Initialize autoApprove if it doesn't exist
			if (!settings.mcpServers[serverName].autoApprove) {
				settings.mcpServers[serverName].autoApprove = []
			}

			const autoApprove = settings.mcpServers[serverName].autoApprove!

			// Update auto-approve list
			for (const toolName of toolNames) {
				const toolIndex = autoApprove.indexOf(toolName)

				if (shouldAllow && toolIndex === -1) {
					autoApprove.push(toolName)
				} else if (!shouldAllow && toolIndex !== -1) {
					autoApprove.splice(toolIndex, 1)
				}
			}

			await this.settingsManager.writeSettings(settings)

			// Update in-memory connection
			const connection = this.connectionManager.findConnection(serverName)
			if (connection?.server.tools) {
				connection.server.tools = connection.server.tools.map((tool) => ({
					...tool,
					autoApprove: autoApprove.includes(tool.name),
				}))
			}

			return this.getSortedMcpServers(Object.keys(settings.mcpServers || {}))
		} catch (error) {
			Logger.error("Failed to update autoApprove settings", error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * Toggle tool auto-approve (notification variant)
	 *
	 * Same as toggleToolAutoApproveRPC but notifies webview instead of returning servers.
	 *
	 * @param serverName - Server name
	 * @param toolNames - Tool names to toggle
	 * @param shouldAllow - Whether to allow auto-approve
	 */
	async toggleToolAutoApprove(serverName: string, toolNames: string[], shouldAllow: boolean): Promise<void> {
		try {
			await this.toggleToolAutoApproveRPC(serverName, toolNames, shouldAllow)
			await this.notifyWebviewOfServerChanges()
		} catch (error) {
			HostProvider.window.showMessage({
				type: ShowMessageType.ERROR,
				message: "Failed to update autoApprove settings",
			})
			throw error
		}
	}

	/**
	 * Add a remote MCP server (RPC method)
	 *
	 * Validates and adds a new remote server to settings.
	 *
	 * @param serverName - Server name
	 * @param serverUrl - Server URL
	 * @returns Promise<McpServer[]> - Updated server list
	 */
	async addRemoteServer(serverName: string, serverUrl: string): Promise<McpServer[]> {
		try {
			const settings = await this.settingsManager.readSettings()
			if (!settings) {
				throw new Error("Failed to read MCP settings")
			}

			if (settings.mcpServers[serverName]) {
				throw new Error(`An MCP server with the name "${serverName}" already exists`)
			}

			const urlValidation = z.string().url().safeParse(serverUrl)
			if (!urlValidation.success) {
				throw new Error(`Invalid server URL: ${serverUrl}. Please provide a valid URL.`)
			}

			const serverConfig = {
				url: serverUrl,
				disabled: false,
				autoApprove: [],
			}

			const parsedConfig = ServerConfigSchema.parse(serverConfig)

			// We update settings in memory, persist to settings store, then update connections.
			settings.mcpServers[serverName] = parsedConfig

			await this.settingsManager.writeSettings({ mcpServers: { ...settings.mcpServers } })

			await this.updateServerConnectionsRPC(settings.mcpServers)

			return this.getSortedMcpServers(Object.keys(settings.mcpServers || {}))
		} catch (error) {
			Logger.error("Failed to add remote MCP server", error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * Delete a server (RPC method)
	 *
	 * Removes server from settings and returns updated server list.
	 *
	 * @param serverName - Server name to delete
	 * @returns Promise<McpServer[]> - Updated server list
	 */
	async deleteServerRPC(serverName: string): Promise<McpServer[]> {
		try {
			await this.settingsManager.deleteServerConfig(serverName)
			const settings = await this.settingsManager.readSettings()
			if (!settings) {
				throw new Error("Failed to read MCP settings")
			}

			await this.updateServerConnectionsRPC(settings.mcpServers)

			return this.getSortedMcpServers(Object.keys(settings.mcpServers || {}))
		} catch (error) {
			Logger.error("Failed to delete MCP server", error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * Update server timeout (RPC method)
	 *
	 * Updates the timeout configuration for a server.
	 *
	 * @param serverName - Server name
	 * @param timeout - Timeout in seconds
	 * @returns Promise<McpServer[]> - Updated server list
	 */
	async updateServerTimeoutRPC(serverName: string, timeout: number): Promise<McpServer[]> {
		try {
			// Validate timeout
			const setConfigResult = BaseConfigSchema.shape.timeout.safeParse(timeout)
			if (!setConfigResult.success) {
				throw new Error(`Invalid timeout value: ${timeout}. Must be at minimum ${MIN_MCP_TIMEOUT_SECONDS} seconds.`)
			}

			const settings = await this.settingsManager.readSettings()
			if (!settings) {
				throw new Error("Failed to read MCP settings")
			}

			if (!settings.mcpServers?.[serverName]) {
				throw new Error(`Server "${serverName}" not found in settings`)
			}

			settings.mcpServers[serverName] = {
				...settings.mcpServers[serverName],
				timeout,
			}

			await this.settingsManager.writeSettings(settings)
			await this.updateServerConnectionsRPC(settings.mcpServers)

			return this.getSortedMcpServers(Object.keys(settings.mcpServers || {}))
		} catch (error) {
			Logger.error("Failed to update server timeout", error instanceof Error ? error : new Error(String(error)))
			HostProvider.window.showMessage({
				type: ShowMessageType.ERROR,
				message: `Failed to update server timeout: ${error instanceof Error ? error.message : String(error)}`,
			})
			throw error
		}
	}

	/**
	 * Get latest MCP servers (RPC method)
	 *
	 * Returns sorted list of all servers in settings order.
	 *
	 * @returns Promise<McpServer[]> - Sorted server list
	 */
	async getLatestMcpServersRPC(): Promise<McpServer[]> {
		const settings = await this.settingsManager.readSettings()
		if (!settings) {
			return []
		}

		return this.getSortedMcpServers(Object.keys(settings.mcpServers || {}))
	}

	/**
	 * Send latest MCP servers to webview
	 *
	 * Triggers webview notification with current server state.
	 */
	async sendLatestMcpServers(): Promise<void> {
		await this.notifyWebviewOfServerChanges()
	}

	/**
	 * Get pending notifications (delegates to NotificationManager)
	 *
	 * @returns Array of pending notifications
	 */
	getPendingNotifications() {
		return this.notificationManager.getPendingNotifications()
	}

	/**
	 * Set notification callback (delegates to NotificationManager)
	 *
	 * @param callback - Callback function for notifications
	 */
	setNotificationCallback(callback: (serverName: string, level: string, message: string) => void): void {
		this.notificationManager.setCallback(callback)
	}

	/**
	 * Clear notification callback (delegates to NotificationManager)
	 */
	clearNotificationCallback(): void {
		this.notificationManager.clearCallback()
	}

	/**
	 * Get sorted MCP servers based on settings order
	 *
	 * @param serverOrder - Array of server names in settings order
	 * @returns Sorted array of McpServer objects
	 * @private
	 */
	private getSortedMcpServers(serverOrder: string[]): McpServer[] {
		return [...this.connectionManager.getConnections()]
			.sort((a, b) => {
				const indexA = serverOrder.indexOf(a.server.name)
				const indexB = serverOrder.indexOf(b.server.name)
				return indexA - indexB
			})
			.map((connection) => connection.server)
	}

	/**
	 * Notify webview of server changes
	 *
	 * Reads current settings, sorts servers, and sends update to webview.
	 *
	 * @private
	 */
	private async notifyWebviewOfServerChanges(): Promise<void> {
		const serverOrder = await this.settingsManager.getServerOrder()
		const sortedServers = this.getSortedMcpServers(serverOrder)

		await sendMcpServersUpdate({
			mcpServers: convertMcpServersToProtoMcpServers(sortedServers),
		})
	}

	/**
	 * Dispose of all resources
	 *
	 * Cleans up all connections and stops watching settings file.
	 */
	async dispose(): Promise<void> {
		await this.connectionManager.dispose()
		await this.settingsManager.stopWatching()
	}
}
