/**
 * CLI MCP Manager
 * Handles MCP (Model Context Protocol) integration for CLI mode
 */

import type { Controller } from "@/core/controller"
import { McpHub } from "@/services/mcp/McpHub"
import type { McpServer } from "@/shared/mcp"
import { output } from "../ui/output/output"

export class CliMcpManager {
	private mcpHub: McpHub

	constructor(
		readonly controller: Controller,
		private readonly verbose: boolean = false,
	) {
		this.mcpHub = controller.mcpHub
	}

	/**
	 * Initialize MCP servers from configuration
	 */
	async initialize(): Promise<void> {
		// Give MCP hub time to initialize servers automatically
		await new Promise((resolve) => setTimeout(resolve, 1000))

		if (this.verbose) {
			output.log("\n🔌 Checking MCP servers...")
		}

		try {
			const mcpServers = this.getMcpServers()

			if (mcpServers.length === 0) {
				if (this.verbose) {
					output.log("  No MCP servers configured")
				}
				return
			}

			// Count connected servers
			const connectedServers = mcpServers.filter((s) => s.status === "connected")
			const failedServers = mcpServers.filter((s) => s.status === "disconnected" && !s.disabled)

			if (connectedServers.length > 0) {
				output.log(`✓ MCP: ${connectedServers.length} server${connectedServers.length !== 1 ? "s" : ""} connected`)
			}
			if (failedServers.length > 0 && this.verbose) {
				output.log(`  ⚠️  ${failedServers.length} server${failedServers.length !== 1 ? "s" : ""} failed to connect`)
			}
		} catch (error) {
			if (this.verbose) {
				output.warn("⚠️  MCP initialization check failed:", error instanceof Error ? error.message : String(error))
			}
		}
	}

	/**
	 * Get configured MCP servers from hub
	 */
	private getMcpServers(): McpServer[] {
		try {
			return this.mcpHub.getServers()
		} catch (error) {
			if (this.verbose) {
				output.warn("Could not load MCP servers:", error)
			}
			return []
		}
	}

	/**
	 * Display available MCP tools and resources
	 */
	async displayAvailableTools(): Promise<void> {
		output.log("\n🔧 Available MCP Tools")
		output.log("─".repeat(80))

		try {
			const servers = this.mcpHub.getServers()
			const connectedServers = servers.filter((s) => s.status === "connected")

			if (connectedServers.length === 0) {
				output.log("  No MCP servers connected")
				output.log("  Configure MCP servers in your settings to extend capabilities")
				output.log("─".repeat(80))
				return
			}

			for (const server of connectedServers) {
				output.log(`\n  Server: ${server.name}`)

				// Get tools from server (already loaded in server object)
				if (server.tools && server.tools.length > 0) {
					output.log(`    Tools (${server.tools.length}):`)
					for (const tool of server.tools.slice(0, 5)) {
						// Show first 5 tools
						output.log(
							`      • ${tool.name}${tool.description ? ` - ${tool.description.slice(0, 60)}${tool.description.length > 60 ? "..." : ""}` : ""}`,
						)
					}
					if (server.tools.length > 5) {
						output.log(`      ... and ${server.tools.length - 5} more`)
					}
				}

				// Get resources from server (already loaded in server object)
				if (server.resources && server.resources.length > 0) {
					output.log(`    Resources (${server.resources.length}):`)
					for (const resource of server.resources.slice(0, 3)) {
						// Show first 3 resources
						output.log(`      • ${resource.name || resource.uri}`)
					}
					if (server.resources.length > 3) {
						output.log(`      ... and ${server.resources.length - 3} more`)
					}
				}
			}

			output.log("\n─".repeat(80))
		} catch (error) {
			console.error("  Error retrieving MCP tools:", error instanceof Error ? error.message : String(error))
			output.log("─".repeat(80))
		}
	}

	/**
	 * Show MCP server status
	 */
	async displayStatus(): Promise<void> {
		output.log("\n🔌 MCP Server Status")
		output.log("─".repeat(80))

		try {
			const servers = this.mcpHub.getServers()

			if (servers.length === 0) {
				output.log("  No MCP servers configured")
				output.log("\n  💡 Tip: Configure MCP servers to extend MarieCoder's capabilities")
				output.log("     - File system access")
				output.log("     - Database connections")
				output.log("     - API integrations")
				output.log("     - Custom tools and workflows")
			} else {
				for (const server of servers) {
					const statusIcon = this.getStatusIcon(server.status)
					output.log(`  ${statusIcon} ${server.name} - ${server.status || "unknown"}`)
					if (server.disabled) {
						output.log(`      (disabled)`)
					}
					if (server.error) {
						output.log(`      Error: ${server.error}`)
					}
				}

				const connectedCount = servers.filter((s) => s.status === "connected").length
				const disabledCount = servers.filter((s) => s.disabled).length

				output.log(`\n  Summary: ${connectedCount}/${servers.length - disabledCount} servers connected`)
			}

			output.log("─".repeat(80))
		} catch (error) {
			console.error("  Error retrieving MCP status:", error instanceof Error ? error.message : String(error))
			output.log("─".repeat(80))
		}
	}

	/**
	 * Get status icon for server state
	 */
	private getStatusIcon(status?: string): string {
		switch (status) {
			case "connected":
				return "✓"
			case "disconnected":
				return "✗"
			case "connecting":
				return "⟳"
			case "error":
				return "⚠️"
			default:
				return "?"
		}
	}

	/**
	 * Cleanup MCP connections
	 */
	async cleanup(): Promise<void> {
		try {
			// MCP hub cleanup is handled by the controller
			if (this.verbose) {
				output.log("✓ MCP cleanup initiated")
			}
		} catch (error) {
			if (this.verbose) {
				output.warn("⚠️  Error during MCP cleanup:", error)
			}
		}
	}
}
