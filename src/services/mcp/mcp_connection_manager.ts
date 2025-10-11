import { setTimeout as setTimeoutPromise } from "node:timers/promises"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import {
	CallToolResultSchema,
	ListResourcesResultSchema,
	ListResourceTemplatesResultSchema,
	ListToolsResultSchema,
	ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js"
import {
	DEFAULT_MCP_TIMEOUT_SECONDS,
	type McpResource,
	type McpResourceResponse,
	type McpResourceTemplate,
	type McpServer,
	type McpTool,
	type McpToolCallResponse,
} from "@shared/mcp"
import { secondsToMs } from "@utils/time"
import chokidar, { FSWatcher } from "chokidar"
import deepEqual from "fast-deep-equal"
import * as fs from "fs/promises"
import { HostProvider } from "@/hosts/host-provider"
import { Logger } from "@/services/logging/Logger"
import { ShowMessageType } from "@/shared/proto/host/window"
import { DEFAULT_REQUEST_TIMEOUT_MS } from "./constants"
import { McpNotificationManager } from "./mcp_notification_manager"
import { McpSettingsManager } from "./mcp_settings_manager"
import { McpTransportFactory } from "./mcp_transport_factory"
import { ServerConfigSchema } from "./schemas"
import type { McpConnection, McpServerConfig, Transport } from "./types"

/**
 * Manages MCP server connections and their lifecycle
 *
 * This service handles the complete lifecycle of MCP server connections:
 * - Creating and starting connections
 * - Managing connection state
 * - Restarting failed connections
 * - Cleaning up disconnected servers
 * - File watching for hot-reload
 * - Fetching tools and resources from servers
 *
 * Responsibilities:
 * - Connection lifecycle management
 * - Connection state tracking
 * - Tool and resource fetching
 * - File watching for server code changes
 * - Error state aggregation
 * - Connection lookup and filtering
 *
 * @example
 * ```typescript
 * const connectionManager = new McpConnectionManager(...)
 * await connectionManager.connectToServer(name, config)
 * const connection = connectionManager.findConnection(name)
 * ```
 */
export class McpConnectionManager {
	private connections: McpConnection[] = []
	private fileWatchers: Map<string, FSWatcher> = new Map()

	constructor(
		private readonly transportFactory: McpTransportFactory,
		private readonly notificationManager: McpNotificationManager,
		private readonly settingsManager: McpSettingsManager,
		private readonly clientVersion: string,
	) {}

	/**
	 * Get all connections
	 *
	 * @returns Array of all connections
	 */
	getConnections(): McpConnection[] {
		return this.connections
	}

	/**
	 * Get enabled servers only
	 *
	 * @returns Array of enabled MCP servers
	 */
	getEnabledServers(): McpServer[] {
		return this.connections.reduce<McpServer[]>((acc, conn) => {
			if (!conn.server.disabled) {
				acc.push(conn.server)
			}
			return acc
		}, [])
	}

	/**
	 * Find connection by name
	 *
	 * @param name - Server name to find
	 * @returns Connection if found, undefined otherwise
	 */
	findConnection(name: string): McpConnection | undefined {
		return this.connections.find((conn) => conn.server.name === name)
	}

	/**
	 * Connect to an MCP server
	 *
	 * Creates a new connection to the specified server. Handles:
	 * - Client creation and configuration
	 * - Transport setup (delegated to TransportFactory)
	 * - Notification handlers (delegated to NotificationManager)
	 * - Initial tool and resource fetching
	 * - Error state management
	 *
	 * @param name - Server name
	 * @param config - Server configuration
	 * @throws Error if connection fails
	 */
	async connectToServer(name: string, config: McpServerConfig): Promise<void> {
		// Remove existing connection if it exists
		this.connections = this.connections.filter((conn) => conn.server.name !== name)

		// Handle disabled servers
		if (config.disabled) {
			const disabledConnection: McpConnection = {
				server: {
					name,
					config: JSON.stringify(config),
					status: "disconnected",
					disabled: true,
				},
				client: null as unknown as Client,
				transport: null as unknown as Transport,
			}
			this.connections.push(disabledConnection)
			return
		}

		try {
			// Create MCP client
			const client = new Client(
				{
					name: "Cline",
					version: this.clientVersion,
				},
				{
					capabilities: {},
				},
			)

			// Create transport (delegates to TransportFactory)
			const transport = await this.transportFactory.createTransport(
				config,
				name,
				async (error) => {
					const connection = this.findConnection(name)
					if (connection) {
						connection.server.status = "disconnected"
						this.appendErrorMessage(connection, error.message)
					}
				},
				async () => {
					const connection = this.findConnection(name)
					if (connection) {
						connection.server.status = "disconnected"
					}
				},
				async (output) => {
					const connection = this.findConnection(name)
					if (connection) {
						this.appendErrorMessage(connection, output)
					}
				},
			)

			// Create connection object
			const connection: McpConnection = {
				server: {
					name,
					config: JSON.stringify(config),
					status: "connecting",
					disabled: config.disabled,
				},
				client,
				transport,
			}

			this.connections.push(connection)

			// Connect client to transport
			await client.connect(transport)

			connection.server.status = "connected"
			connection.server.error = ""

			// Set up notification handlers (delegates to NotificationManager)
			await this.notificationManager.setupNotificationHandlers(client, name)

			// Initial fetch of tools and resources
			connection.server.tools = await this.fetchToolsList(name)
			connection.server.resources = await this.fetchResourcesList(name)
			connection.server.resourceTemplates = await this.fetchResourceTemplatesList(name)
		} catch (error) {
			// Update status with error
			const connection = this.findConnection(name)
			if (connection) {
				connection.server.status = "disconnected"
				this.appendErrorMessage(connection, error instanceof Error ? error.message : String(error))
			}
			throw error
		}
	}

	/**
	 * Delete a connection
	 *
	 * Closes the transport and client, then removes the connection from
	 * the connections list.
	 *
	 * @param name - Server name to delete
	 */
	async deleteConnection(name: string): Promise<void> {
		const connection = this.findConnection(name)
		if (connection) {
			try {
				// Only close if transport/client exist (disabled servers don't have them)
				if (connection.transport) {
					await connection.transport.close()
				}
				if (connection.client) {
					await connection.client.close()
				}
			} catch (error) {
				Logger.error(`Failed to close transport for ${name}`, error instanceof Error ? error : new Error(String(error)))
			}

			this.connections = this.connections.filter((conn) => conn.server.name !== name)
		}
	}

	/**
	 * Restart a connection
	 *
	 * Deletes the existing connection and creates a new one with the
	 * same configuration. Shows user notifications during the process.
	 *
	 * @param serverName - Server name to restart
	 */
	async restartConnection(serverName: string): Promise<void> {
		const connection = this.findConnection(serverName)
		const config = connection?.server.config

		if (!config) {
			return
		}

		HostProvider.window.showMessage({
			type: ShowMessageType.INFORMATION,
			message: `Restarting ${serverName} MCP server...`,
		})

		if (connection) {
			connection.server.status = "connecting"
			connection.server.error = ""
		}

		await setTimeoutPromise(500) // Artificial delay for UX

		try {
			await this.deleteConnection(serverName)
			await this.connectToServer(serverName, JSON.parse(config))

			HostProvider.window.showMessage({
				type: ShowMessageType.INFORMATION,
				message: `${serverName} MCP server connected`,
			})
		} catch (error) {
			Logger.error(
				`Failed to restart connection for ${serverName}`,
				error instanceof Error ? error : new Error(String(error)),
			)

			HostProvider.window.showMessage({
				type: ShowMessageType.ERROR,
				message: `Failed to connect to ${serverName} MCP server`,
			})
		}
	}

	/**
	 * Update all server connections based on new config
	 *
	 * Compares current connections with new configuration and:
	 * - Deletes removed servers
	 * - Adds new servers
	 * - Reconnects servers with changed config
	 *
	 * @param newServers - New server configuration
	 */
	async updateServerConnections(newServers: Record<string, McpServerConfig>): Promise<void> {
		this.removeAllFileWatchers()

		const currentNames = new Set(this.connections.map((conn) => conn.server.name))
		const newNames = new Set(Object.keys(newServers))

		// Delete removed servers
		for (const name of currentNames) {
			if (!newNames.has(name)) {
				await this.deleteConnection(name)
			}
		}

		// Update or add servers
		for (const [name, config] of Object.entries(newServers)) {
			const currentConnection = this.findConnection(name)

			if (!currentConnection) {
				// New server
				try {
					if (config.type === "stdio") {
						this.setupFileWatcher(name, config)
					}
					await this.connectToServer(name, config)
				} catch (error) {
					Logger.error(
						`Failed to connect to new MCP server ${name}`,
						error instanceof Error ? error : new Error(String(error)),
					)
				}
			} else if (!deepEqual(JSON.parse(currentConnection.server.config), config)) {
				// Existing server with changed config
				try {
					if (config.type === "stdio") {
						this.setupFileWatcher(name, config)
					}
					await this.deleteConnection(name)
					await this.connectToServer(name, config)
				} catch (error) {
					Logger.error(
						`Failed to reconnect MCP server ${name}`,
						error instanceof Error ? error : new Error(String(error)),
					)
				}
			}
		}
	}

	/**
	 * Fetch tools list from a server
	 *
	 * @param serverName - Server name
	 * @returns Promise<McpTool[]> - List of tools with auto-approve status
	 * @private
	 */
	private async fetchToolsList(serverName: string): Promise<McpTool[]> {
		try {
			const connection = this.findConnection(serverName)

			if (!connection || connection.server.disabled || !connection.client) {
				return []
			}

			const response = await connection.client.request({ method: "tools/list" }, ListToolsResultSchema, {
				timeout: DEFAULT_REQUEST_TIMEOUT_MS,
			})

			// Get autoApprove settings
			const settingsPath = await this.settingsManager.getSettingsFilePath()
			const content = await fs.readFile(settingsPath, "utf-8")
			const config = JSON.parse(content)
			const autoApproveConfig = config.mcpServers[serverName]?.autoApprove || []

			// Mark tools as auto-approved based on settings
			const tools = (response?.tools || []).map((tool) => ({
				...tool,
				autoApprove: autoApproveConfig.includes(tool.name),
			}))

			return tools
		} catch (error) {
			Logger.error(`Failed to fetch tools for ${serverName}`, error instanceof Error ? error : new Error(String(error)))
			return []
		}
	}

	/**
	 * Fetch resources list from a server
	 *
	 * @param serverName - Server name
	 * @returns Promise<McpResource[]> - List of resources
	 * @private
	 */
	private async fetchResourcesList(serverName: string): Promise<McpResource[]> {
		try {
			const connection = this.findConnection(serverName)

			if (!connection || connection.server.disabled || !connection.client) {
				return []
			}

			const response = await connection.client.request({ method: "resources/list" }, ListResourcesResultSchema, {
				timeout: DEFAULT_REQUEST_TIMEOUT_MS,
			})

			return response?.resources || []
		} catch (_error) {
			return []
		}
	}

	/**
	 * Fetch resource templates list from a server
	 *
	 * @param serverName - Server name
	 * @returns Promise<McpResourceTemplate[]> - List of resource templates
	 * @private
	 */
	private async fetchResourceTemplatesList(serverName: string): Promise<McpResourceTemplate[]> {
		try {
			const connection = this.findConnection(serverName)

			if (!connection || connection.server.disabled || !connection.client) {
				return []
			}

			const response = await connection.client.request(
				{ method: "resources/templates/list" },
				ListResourceTemplatesResultSchema,
				{
					timeout: DEFAULT_REQUEST_TIMEOUT_MS,
				},
			)

			return response?.resourceTemplates || []
		} catch (_error) {
			return []
		}
	}

	/**
	 * Read a resource from a server
	 *
	 * @param serverName - Server name
	 * @param uri - Resource URI
	 * @returns Promise<McpResourceResponse> - Resource content
	 * @throws Error if server not found or disabled
	 */
	async readResource(serverName: string, uri: string): Promise<McpResourceResponse> {
		const connection = this.findConnection(serverName)

		if (!connection) {
			throw new Error(`No connection found for server: ${serverName}`)
		}

		if (connection.server.disabled) {
			throw new Error(`Server "${serverName}" is disabled`)
		}

		return await connection.client.request(
			{
				method: "resources/read",
				params: { uri },
			},
			ReadResourceResultSchema,
		)
	}

	/**
	 * Call a tool on a server
	 *
	 * @param serverName - Server name
	 * @param toolName - Tool name
	 * @param toolArguments - Tool arguments
	 * @param ulid - Unique task ID
	 * @returns Promise<McpToolCallResponse> - Tool result
	 * @throws Error if server not found or disabled
	 */
	async callTool(
		serverName: string,
		toolName: string,
		toolArguments: Record<string, unknown> | undefined,
		_ulid: string,
	): Promise<McpToolCallResponse> {
		const connection = this.findConnection(serverName)

		if (!connection) {
			throw new Error(
				`No connection found for server: ${serverName}. Please make sure to use MCP servers available under 'Connected MCP Servers'.`,
			)
		}

		if (connection.server.disabled) {
			throw new Error(`Server "${serverName}" is disabled and cannot be used`)
		}

		let timeout = secondsToMs(DEFAULT_MCP_TIMEOUT_SECONDS)

		try {
			const config = JSON.parse(connection.server.config)
			const parsedConfig = ServerConfigSchema.parse(config)
			timeout = secondsToMs(parsedConfig.timeout)
		} catch (error) {
			Logger.error(
				`Failed to parse timeout configuration for server ${serverName}`,
				error instanceof Error ? error : new Error(String(error)),
			)
		}

		try {
			const result = await connection.client.request(
				{
					method: "tools/call",
					params: {
						name: toolName,
						arguments: toolArguments,
					},
				},
				CallToolResultSchema,
				{ timeout },
			)

			return {
				...result,
				content: result.content ?? [],
			}
		} catch (error) {
			throw error
		}
	}

	/**
	 * Set up file watcher for a stdio server
	 *
	 * Watches the server's build file and triggers reconnection on changes.
	 *
	 * @param name - Server name
	 * @param config - Server configuration
	 * @private
	 */
	private setupFileWatcher(name: string, config: Extract<McpServerConfig, { type: "stdio" }>): void {
		const filePath = config.args?.find((arg: string) => arg.includes("build/index.js"))

		if (filePath) {
			const watcher = chokidar.watch(filePath, {})

			watcher.on("change", () => {
				this.restartConnection(name)
			})

			this.fileWatchers.set(name, watcher)
		}
	}

	/**
	 * Remove all file watchers
	 *
	 * Closes and clears all file watchers.
	 *
	 * @private
	 */
	private removeAllFileWatchers(): void {
		this.fileWatchers.forEach((watcher) => watcher.close())
		this.fileWatchers.clear()
	}

	/**
	 * Append error message to connection
	 *
	 * @param connection - Connection to append error to
	 * @param error - Error message
	 * @private
	 */
	private appendErrorMessage(connection: McpConnection, error: string): void {
		const newError = connection.server.error ? `${connection.server.error}\n${error}` : error
		connection.server.error = newError
	}

	/**
	 * Dispose of all connections
	 *
	 * Closes all connections and cleans up resources.
	 */
	async dispose(): Promise<void> {
		this.removeAllFileWatchers()

		for (const connection of this.connections) {
			try {
				await this.deleteConnection(connection.server.name)
			} catch (error) {
				Logger.error(
					`Failed to close connection for ${connection.server.name}`,
					error instanceof Error ? error : new Error(String(error)),
				)
			}
		}

		this.connections = []
	}
}
