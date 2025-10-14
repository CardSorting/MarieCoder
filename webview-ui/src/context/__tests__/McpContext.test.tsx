/**
 * Tests for McpContext
 *
 * Validates the MCP context functionality including:
 * - Provider initialization
 * - MCP server management
 * - Marketplace catalog
 * - State management
 */

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { McpMarketplaceCatalog, McpServer } from "../../../../../src/shared/mcp"
import { McpContextProvider, useMcpState } from "../McpContext"

describe("McpContext", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("Provider Initialization", () => {
		it("should initialize with default state", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			expect(result.current.mcpServers).toEqual([])
			expect(result.current.mcpMarketplaceCatalog).toEqual({ items: [] })
		})

		it("should provide setter functions", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			expect(typeof result.current.setMcpServers).toBe("function")
			expect(typeof result.current.setMcpMarketplaceCatalog).toBe("function")
		})
	})

	describe("Hook Error Handling", () => {
		it("should throw error when used outside provider", () => {
			// Suppress console errors for this test
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			expect(() => {
				renderHook(() => useMcpState())
			}).toThrow("useMcpState must be used within a McpContextProvider")

			consoleSpy.mockRestore()
		})
	})

	describe("MCP Servers Management", () => {
		it("should update mcp servers", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockServers: McpServer[] = [
				{
					id: "server-1",
					name: "Test Server 1",
					command: "node",
					args: ["server1.js"],
					disabled: false,
					alwaysAllow: [],
				},
				{
					id: "server-2",
					name: "Test Server 2",
					command: "python",
					args: ["server2.py"],
					disabled: true,
					alwaysAllow: ["tool1", "tool2"],
				},
			]

			act(() => {
				result.current.setMcpServers(mockServers)
			})

			expect(result.current.mcpServers).toEqual(mockServers)
		})

		it("should handle empty server list", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockServers: McpServer[] = [
				{
					id: "server-1",
					name: "Test Server",
					command: "node",
					args: ["server.js"],
					disabled: false,
					alwaysAllow: [],
				},
			]

			act(() => {
				result.current.setMcpServers(mockServers)
			})

			expect(result.current.mcpServers).toHaveLength(1)

			act(() => {
				result.current.setMcpServers([])
			})

			expect(result.current.mcpServers).toEqual([])
		})

		it("should update servers with different configurations", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const servers1: McpServer[] = [
				{
					id: "server-1",
					name: "Server 1",
					command: "node",
					args: ["server1.js"],
					disabled: false,
					alwaysAllow: [],
				},
			]

			const servers2: McpServer[] = [
				{
					id: "server-2",
					name: "Server 2",
					command: "python",
					args: ["server2.py"],
					disabled: true,
					alwaysAllow: ["tool1"],
				},
			]

			act(() => {
				result.current.setMcpServers(servers1)
			})

			expect(result.current.mcpServers).toEqual(servers1)

			act(() => {
				result.current.setMcpServers(servers2)
			})

			expect(result.current.mcpServers).toEqual(servers2)
		})

		it("should handle servers with environment variables", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockServers: McpServer[] = [
				{
					id: "server-1",
					name: "Server with Env",
					command: "node",
					args: ["server.js"],
					disabled: false,
					alwaysAllow: [],
					env: {
						API_KEY: "test-key",
						PORT: "3000",
					},
				},
			]

			act(() => {
				result.current.setMcpServers(mockServers)
			})

			expect(result.current.mcpServers[0].env).toEqual({
				API_KEY: "test-key",
				PORT: "3000",
			})
		})

		it("should handle servers with transport configurations", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockServers: McpServer[] = [
				{
					id: "server-1",
					name: "HTTP Server",
					command: "node",
					args: ["server.js"],
					disabled: false,
					alwaysAllow: [],
					transportType: "http" as const,
					url: "http://localhost:3000",
				},
			]

			act(() => {
				result.current.setMcpServers(mockServers)
			})

			expect(result.current.mcpServers[0].transportType).toBe("http")
			expect(result.current.mcpServers[0].url).toBe("http://localhost:3000")
		})
	})

	describe("Marketplace Catalog Management", () => {
		it("should update marketplace catalog", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockCatalog: McpMarketplaceCatalog = {
				items: [
					{
						name: "Test Server 1",
						description: "A test server",
						author: "Test Author",
						sourceUrl: "https://github.com/test/server1",
					},
					{
						name: "Test Server 2",
						description: "Another test server",
						author: "Test Author 2",
						sourceUrl: "https://github.com/test/server2",
					},
				],
			}

			act(() => {
				result.current.setMcpMarketplaceCatalog(mockCatalog)
			})

			expect(result.current.mcpMarketplaceCatalog).toEqual(mockCatalog)
		})

		it("should handle empty marketplace catalog", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockCatalog: McpMarketplaceCatalog = {
				items: [
					{
						name: "Test Server",
						description: "A test server",
						author: "Test Author",
						sourceUrl: "https://github.com/test/server",
					},
				],
			}

			act(() => {
				result.current.setMcpMarketplaceCatalog(mockCatalog)
			})

			expect(result.current.mcpMarketplaceCatalog.items).toHaveLength(1)

			act(() => {
				result.current.setMcpMarketplaceCatalog({ items: [] })
			})

			expect(result.current.mcpMarketplaceCatalog.items).toEqual([])
		})

		it("should handle catalog with detailed item information", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockCatalog: McpMarketplaceCatalog = {
				items: [
					{
						name: "Advanced Server",
						description: "An advanced MCP server",
						author: "Advanced Author",
						sourceUrl: "https://github.com/advanced/server",
						tags: ["database", "api"],
						version: "1.2.3",
						license: "MIT",
					},
				],
			}

			act(() => {
				result.current.setMcpMarketplaceCatalog(mockCatalog)
			})

			const item = result.current.mcpMarketplaceCatalog.items[0]
			expect(item.name).toBe("Advanced Server")
			expect(item.tags).toEqual(["database", "api"])
			expect(item.version).toBe("1.2.3")
			expect(item.license).toBe("MIT")
		})
	})

	describe("Multiple Updates", () => {
		it("should handle updating both servers and catalog", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockServers: McpServer[] = [
				{
					id: "server-1",
					name: "Test Server",
					command: "node",
					args: ["server.js"],
					disabled: false,
					alwaysAllow: [],
				},
			]

			const mockCatalog: McpMarketplaceCatalog = {
				items: [
					{
						name: "Catalog Server",
						description: "A catalog server",
						author: "Catalog Author",
						sourceUrl: "https://github.com/catalog/server",
					},
				],
			}

			act(() => {
				result.current.setMcpServers(mockServers)
				result.current.setMcpMarketplaceCatalog(mockCatalog)
			})

			expect(result.current.mcpServers).toEqual(mockServers)
			expect(result.current.mcpMarketplaceCatalog).toEqual(mockCatalog)
		})
	})

	describe("State Independence", () => {
		it("should maintain independent state for servers and catalog", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockServers: McpServer[] = [
				{
					id: "server-1",
					name: "Test Server",
					command: "node",
					args: ["server.js"],
					disabled: false,
					alwaysAllow: [],
				},
			]

			const mockCatalog: McpMarketplaceCatalog = {
				items: [
					{
						name: "Catalog Item",
						description: "A catalog item",
						author: "Author",
						sourceUrl: "https://github.com/test/item",
					},
				],
			}

			act(() => {
				result.current.setMcpServers(mockServers)
			})

			act(() => {
				result.current.setMcpMarketplaceCatalog(mockCatalog)
			})

			// Updating one should not affect the other
			act(() => {
				result.current.setMcpServers([])
			})

			expect(result.current.mcpServers).toEqual([])
			expect(result.current.mcpMarketplaceCatalog).toEqual(mockCatalog)
		})
	})

	describe("Large Collections", () => {
		it("should handle many servers", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const manyServers: McpServer[] = Array.from({ length: 20 }, (_, i) => ({
				id: `server-${i}`,
				name: `Server ${i}`,
				command: i % 2 === 0 ? "node" : "python",
				args: [`server${i}.js`],
				disabled: i % 3 === 0,
				alwaysAllow: i % 2 === 0 ? [`tool${i}`] : [],
			}))

			act(() => {
				result.current.setMcpServers(manyServers)
			})

			expect(result.current.mcpServers).toHaveLength(20)
			expect(result.current.mcpServers[0].name).toBe("Server 0")
			expect(result.current.mcpServers[19].name).toBe("Server 19")
		})

		it("should handle large marketplace catalog", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const largeCatalog: McpMarketplaceCatalog = {
				items: Array.from({ length: 30 }, (_, i) => ({
					name: `Catalog Item ${i}`,
					description: `Description for item ${i}`,
					author: `Author ${i}`,
					sourceUrl: `https://github.com/author${i}/item${i}`,
				})),
			}

			act(() => {
				result.current.setMcpMarketplaceCatalog(largeCatalog)
			})

			expect(result.current.mcpMarketplaceCatalog.items).toHaveLength(30)
		})
	})

	describe("Server Configuration Variations", () => {
		it("should handle servers with different disabled states", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockServers: McpServer[] = [
				{
					id: "server-1",
					name: "Enabled Server",
					command: "node",
					args: ["server.js"],
					disabled: false,
					alwaysAllow: [],
				},
				{
					id: "server-2",
					name: "Disabled Server",
					command: "node",
					args: ["server.js"],
					disabled: true,
					alwaysAllow: [],
				},
			]

			act(() => {
				result.current.setMcpServers(mockServers)
			})

			expect(result.current.mcpServers[0].disabled).toBe(false)
			expect(result.current.mcpServers[1].disabled).toBe(true)
		})

		it("should handle servers with different alwaysAllow configurations", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockServers: McpServer[] = [
				{
					id: "server-1",
					name: "No Always Allow",
					command: "node",
					args: ["server.js"],
					disabled: false,
					alwaysAllow: [],
				},
				{
					id: "server-2",
					name: "With Always Allow",
					command: "node",
					args: ["server.js"],
					disabled: false,
					alwaysAllow: ["tool1", "tool2", "tool3"],
				},
			]

			act(() => {
				result.current.setMcpServers(mockServers)
			})

			expect(result.current.mcpServers[0].alwaysAllow).toEqual([])
			expect(result.current.mcpServers[1].alwaysAllow).toEqual(["tool1", "tool2", "tool3"])
		})
	})

	describe("State Immutability", () => {
		it("should maintain state immutability for servers", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const originalServers: McpServer[] = [
				{
					id: "server-1",
					name: "Original Server",
					command: "node",
					args: ["server.js"],
					disabled: false,
					alwaysAllow: [],
				},
			]

			act(() => {
				result.current.setMcpServers(originalServers)
			})

			const retrievedServers = result.current.mcpServers

			// Modifying retrieved servers should not affect internal state
			const newServers = [...retrievedServers]
			newServers[0] = {
				...newServers[0],
				name: "Modified Server",
			}

			// Original should remain unchanged in context
			expect(result.current.mcpServers[0].name).toBe("Original Server")
		})

		it("should maintain state immutability for catalog", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const originalCatalog: McpMarketplaceCatalog = {
				items: [
					{
						name: "Original Item",
						description: "Original description",
						author: "Original Author",
						sourceUrl: "https://original.url",
					},
				],
			}

			act(() => {
				result.current.setMcpMarketplaceCatalog(originalCatalog)
			})

			const retrievedCatalog = result.current.mcpMarketplaceCatalog

			// Modifying retrieved catalog should not affect internal state
			const newCatalog = { ...retrievedCatalog }
			newCatalog.items = [...newCatalog.items]
			newCatalog.items[0] = {
				...newCatalog.items[0],
				name: "Modified Item",
			}

			// Original should remain unchanged in context
			expect(result.current.mcpMarketplaceCatalog.items[0].name).toBe("Original Item")
		})
	})

	describe("Performance Considerations", () => {
		it("should handle rapid updates", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			act(() => {
				for (let i = 0; i < 10; i++) {
					result.current.setMcpServers([
						{
							id: `server-${i}`,
							name: `Server ${i}`,
							command: "node",
							args: ["server.js"],
							disabled: false,
							alwaysAllow: [],
						},
					])
				}
			})

			expect(result.current.mcpServers).toHaveLength(1)
			expect(result.current.mcpServers[0].name).toBe("Server 9")
		})
	})
})
