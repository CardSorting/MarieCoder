/**
 * McpContext - Manages MCP server and marketplace state
 *
 * This context handles:
 * - MCP server configurations
 * - MCP marketplace catalog
 * - MCP subscriptions
 *
 * Benefits:
 * - Components only re-render when MCP state changes
 * - Isolated MCP-related logic
 * - Better organization of MCP functionality
 */

import type { McpMarketplaceCatalog, McpServer } from "@shared/mcp"
import { EmptyRequest } from "@shared/proto/cline/common"
import { convertProtoMcpServersToMcpServers } from "@shared/proto-conversions/mcp/mcp-server-conversion"
import type React from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { createContextSelector } from "@/hooks/use_context_selector"
import { debug, logError } from "@/utils/debug_logger"
import { McpServiceClient } from "../services/grpc-client"

export interface McpContextType {
	// MCP state
	mcpServers: McpServer[]
	mcpMarketplaceCatalog: McpMarketplaceCatalog

	// Setters
	setMcpServers: (value: McpServer[]) => void
	setMcpMarketplaceCatalog: (value: McpMarketplaceCatalog) => void
}

const McpContext = createContext<McpContextType | undefined>(undefined)

export const McpContextProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	const [mcpServers, setMcpServers] = useState<McpServer[]>([])
	const [mcpMarketplaceCatalog, setMcpMarketplaceCatalog] = useState<McpMarketplaceCatalog>({ items: [] })

	// Subscription refs
	const mcpServersSubscriptionRef = useRef<(() => void) | null>(null)
	const mcpMarketplaceUnsubscribeRef = useRef<(() => void) | null>(null)

	// Subscribe to MCP updates
	useEffect(() => {
		// Subscribe to MCP servers updates
		mcpServersSubscriptionRef.current = McpServiceClient.subscribeToMcpServers(EmptyRequest.create(), {
			onResponse: (response) => {
				debug.log("[DEBUG] Received MCP servers update from gRPC stream")
				if (response.mcpServers) {
					setMcpServers(convertProtoMcpServersToMcpServers(response.mcpServers))
				}
			},
			onError: (error) => {
				logError("Error in MCP servers subscription:", error)
			},
			onComplete: () => {
				debug.log("MCP servers subscription completed")
			},
		})

		// Subscribe to MCP marketplace catalog updates
		mcpMarketplaceUnsubscribeRef.current = McpServiceClient.subscribeToMcpMarketplaceCatalog(EmptyRequest.create({}), {
			onResponse: (catalog) => {
				debug.log("[DEBUG] Received MCP marketplace catalog update from gRPC stream")
				setMcpMarketplaceCatalog(catalog)
			},
			onError: (error) => {
				logError("Error in MCP marketplace catalog subscription:", error)
			},
			onComplete: () => {
				debug.log("MCP marketplace catalog subscription completed")
			},
		})

		// Clean up subscriptions
		return () => {
			if (mcpServersSubscriptionRef.current) {
				mcpServersSubscriptionRef.current()
				mcpServersSubscriptionRef.current = null
			}
			if (mcpMarketplaceUnsubscribeRef.current) {
				mcpMarketplaceUnsubscribeRef.current()
				mcpMarketplaceUnsubscribeRef.current = null
			}
		}
	}, [])

	const contextValue: McpContextType = {
		mcpServers,
		mcpMarketplaceCatalog,
		setMcpServers,
		setMcpMarketplaceCatalog,
	}

	return <McpContext.Provider value={contextValue}>{children}</McpContext.Provider>
}

/**
 * Hook to access MCP state
 *
 * @example
 * ```typescript
 * const { mcpServers, mcpMarketplaceCatalog } = useMcpState()
 * ```
 */
export const useMcpState = () => {
	const context = useContext(McpContext)
	if (context === undefined) {
		throw new Error("useMcpState must be used within a McpContextProvider")
	}
	return context
}

/**
 * Optimized selector hook for MCP state
 * Reduces re-renders by only updating when selected MCP data changes
 *
 * @example
 * ```typescript
 * // Single value:
 * const servers = useMcpStateSelector(state => state.mcpServers)
 *
 * // Filtered servers:
 * const activeServers = useMcpStateSelector(
 *   state => state.mcpServers.filter(s => s.status === 'active')
 * )
 *
 * // Multiple values:
 * const { servers, catalog } = useMcpStateSelector(
 *   state => ({
 *     servers: state.mcpServers,
 *     catalog: state.mcpMarketplaceCatalog,
 *   })
 * )
 * ```
 */
export const useMcpStateSelector = createContextSelector(useMcpState)
