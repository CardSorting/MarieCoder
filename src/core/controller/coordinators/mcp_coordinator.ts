import type { StateManager } from "@core/storage/StateManager"
import { Logger } from "@services/logging/Logger"
import { McpHub } from "@services/mcp/McpHub"
import type { McpMarketplaceCatalog } from "@shared/mcp"
import { clineEnvConfig } from "@/config"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"
import { ControllerEventType } from "../events/controller_events"
import { ControllerEventEmitter } from "../events/event_emitter"
import { sendMcpMarketplaceCatalogEvent } from "../mcp/subscribeToMcpMarketplaceCatalog"

/**
 * Coordinates MCP Hub lifecycle and marketplace catalog management
 */
export class McpCoordinator {
	constructor(
		private mcpHub: McpHub,
		private stateManager: StateManager,
		private eventEmitter: ControllerEventEmitter,
	) {}

	/**
	 * Initialize MCP coordinator by loading marketplace catalog
	 */
	async initialize(): Promise<void> {
		await this.silentlyRefreshMarketplace()
	}

	/**
	 * Fetch MCP marketplace catalog from API
	 */
	async fetchMarketplaceCatalog(silent: boolean = false): Promise<McpMarketplaceCatalog | undefined> {
		// Emit refresh started event
		await this.eventEmitter.emit(ControllerEventType.MCP_MARKETPLACE_REFRESH_STARTED, { silent })

		try {
			const response = await fetch(`${clineEnvConfig.mcpBaseUrl}/marketplace`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			})

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const data = await response.json()

			if (!data) {
				throw new Error("Invalid response from MCP marketplace API")
			}

			const catalog: McpMarketplaceCatalog = {
				items: (data || []).map((item: any) => ({
					...item,
					githubStars: item.githubStars ?? 0,
					downloadCount: item.downloadCount ?? 0,
					tags: item.tags ?? [],
				})),
			}

			// Store in global state
			this.stateManager.setGlobalState("mcpMarketplaceCatalog", catalog)

			// Emit success event
			await this.eventEmitter.emit(ControllerEventType.MCP_MARKETPLACE_REFRESH_COMPLETED, {
				catalog,
				itemCount: catalog.items.length,
				silent,
			})

			return catalog
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			Logger.error("Failed to fetch MCP marketplace", err)

			// Emit error event
			await this.eventEmitter.emit(ControllerEventType.MCP_MARKETPLACE_ERROR, {
				error: err,
				silent,
			})

			if (!silent) {
				HostProvider.window.showMessage({
					type: ShowMessageType.ERROR,
					message: err.message,
				})
			}
			return undefined
		}
	}

	/**
	 * Fetch marketplace catalog (RPC variant) with enhanced error handling
	 */
	async fetchMarketplaceCatalogRPC(silent: boolean = false): Promise<McpMarketplaceCatalog | undefined> {
		try {
			const response = await fetch(`${clineEnvConfig.mcpBaseUrl}/marketplace`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"User-Agent": "cline-vscode-extension",
				},
			})

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const data = await response.json()

			if (!data) {
				throw new Error("Invalid response from MCP marketplace API")
			}

			const catalog: McpMarketplaceCatalog = {
				items: (data || []).map((item: any) => ({
					...item,
					githubStars: item.githubStars ?? 0,
					downloadCount: item.downloadCount ?? 0,
					tags: item.tags ?? [],
				})),
			}

			// Store in global state
			this.stateManager.setGlobalState("mcpMarketplaceCatalog", catalog)
			return catalog
		} catch (error) {
			Logger.error("Failed to fetch MCP marketplace", error instanceof Error ? error : new Error(String(error)))
			if (!silent) {
				const errorMessage = error instanceof Error ? error.message : "Failed to fetch MCP marketplace"
				throw new Error(errorMessage)
			}
			return undefined
		}
	}

	/**
	 * Silently refresh marketplace catalog and send event
	 */
	async silentlyRefreshMarketplace(): Promise<void> {
		try {
			const catalog = await this.fetchMarketplaceCatalog(true)
			if (catalog) {
				await sendMcpMarketplaceCatalogEvent(catalog)
			}
		} catch (error) {
			Logger.error("Failed to silently refresh MCP marketplace", error instanceof Error ? error : new Error(String(error)))
		}
	}

	/**
	 * Silently refresh marketplace catalog (RPC variant) and return result
	 * Unlike silentlyRefreshMarketplace, this doesn't send a message to the webview
	 */
	async silentlyRefreshMarketplaceRPC(): Promise<McpMarketplaceCatalog | undefined> {
		try {
			return await this.fetchMarketplaceCatalogRPC(true)
		} catch (error) {
			Logger.error(
				"Failed to silently refresh MCP marketplace (RPC)",
				error instanceof Error ? error : new Error(String(error)),
			)
			return undefined
		}
	}

	/**
	 * Cleanup MCP Hub resources
	 */
	async cleanup(): Promise<void> {
		this.mcpHub.dispose()
	}
}
