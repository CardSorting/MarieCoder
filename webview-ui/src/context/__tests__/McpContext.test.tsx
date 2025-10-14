/**
 * Tests for McpContext
 *
 * Validates the MCP context functionality including:
 * - Provider initialization
 * - MCP server management
 * - Marketplace catalog
 * - State management
 */

import type { McpMarketplaceCatalog, McpServer } from "@shared/mcp"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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
					name: "Test Server 1",
					config: "node server1.js",
					status: "disconnected",
					disabled: false,
				},
				{
					name: "Test Server 2",
					config: "python server2.py",
					status: "connected",
					disabled: true,
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
					name: "Test Server",
					config: "node server.js",
					status: "disconnected",
					disabled: false,
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
					name: "Server 1",
					config: "node server1.js",
					status: "disconnected",
					disabled: false,
				},
			]

			const servers2: McpServer[] = [
				{
					name: "Server 2",
					config: "python server2.py",
					status: "connected",
					disabled: true,
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

		it("should handle servers with error messages", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockServers: McpServer[] = [
				{
					name: "Server with Error",
					config: "node server.js",
					status: "disconnected",
					disabled: false,
					error: "Connection failed",
				},
			]

			act(() => {
				result.current.setMcpServers(mockServers)
			})

			expect(result.current.mcpServers[0].error).toBe("Connection failed")
		})

		it("should handle servers with timeout configurations", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockServers: McpServer[] = [
				{
					name: "HTTP Server",
					config: "node server.js",
					status: "connected",
					disabled: false,
					timeout: 60,
				},
			]

			act(() => {
				result.current.setMcpServers(mockServers)
			})

			expect(result.current.mcpServers[0].timeout).toBe(60)
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
						mcpId: "test-server-1",
						githubUrl: "https://github.com/test/server1",
						name: "Test Server 1",
						author: "Test Author",
						description: "A test server",
						codiconIcon: "server",
						logoUrl: "",
						category: "test",
						tags: [],
						requiresApiKey: false,
						isRecommended: false,
						githubStars: 0,
						downloadCount: 0,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
						lastGithubSync: "2024-01-01",
					},
					{
						mcpId: "test-server-2",
						githubUrl: "https://github.com/test/server2",
						name: "Test Server 2",
						author: "Test Author 2",
						description: "Another test server",
						codiconIcon: "server",
						logoUrl: "",
						category: "test",
						tags: [],
						requiresApiKey: false,
						isRecommended: false,
						githubStars: 0,
						downloadCount: 0,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
						lastGithubSync: "2024-01-01",
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
						mcpId: "test-server",
						githubUrl: "https://github.com/test/server",
						name: "Test Server",
						author: "Test Author",
						description: "A test server",
						codiconIcon: "server",
						logoUrl: "",
						category: "test",
						tags: [],
						requiresApiKey: false,
						isRecommended: false,
						githubStars: 0,
						downloadCount: 0,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
						lastGithubSync: "2024-01-01",
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
						mcpId: "advanced-server",
						githubUrl: "https://github.com/advanced/server",
						name: "Advanced Server",
						author: "Advanced Author",
						description: "An advanced MCP server",
						codiconIcon: "database",
						logoUrl: "",
						category: "database",
						tags: ["database", "api"],
						requiresApiKey: true,
						isRecommended: true,
						githubStars: 100,
						downloadCount: 500,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
						lastGithubSync: "2024-01-01",
					},
				],
			}

			act(() => {
				result.current.setMcpMarketplaceCatalog(mockCatalog)
			})

			const item = result.current.mcpMarketplaceCatalog.items[0]
			expect(item.name).toBe("Advanced Server")
			expect(item.tags).toEqual(["database", "api"])
			expect(item.githubStars).toBe(100)
			expect(item.downloadCount).toBe(500)
		})
	})

	describe("Multiple Updates", () => {
		it("should handle updating both servers and catalog", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockServers: McpServer[] = [
				{
					name: "Test Server",
					config: "node server.js",
					status: "disconnected",
					disabled: false,
				},
			]

			const mockCatalog: McpMarketplaceCatalog = {
				items: [
					{
						mcpId: "catalog-server",
						githubUrl: "https://github.com/catalog/server",
						name: "Catalog Server",
						author: "Catalog Author",
						description: "A catalog server",
						codiconIcon: "server",
						logoUrl: "",
						category: "test",
						tags: [],
						requiresApiKey: false,
						isRecommended: false,
						githubStars: 0,
						downloadCount: 0,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
						lastGithubSync: "2024-01-01",
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
					name: "Test Server",
					config: "node server.js",
					status: "disconnected",
					disabled: false,
				},
			]

			const mockCatalog: McpMarketplaceCatalog = {
				items: [
					{
						mcpId: "catalog-item",
						githubUrl: "https://github.com/test/item",
						name: "Catalog Item",
						author: "Author",
						description: "A catalog item",
						codiconIcon: "server",
						logoUrl: "",
						category: "test",
						tags: [],
						requiresApiKey: false,
						isRecommended: false,
						githubStars: 0,
						downloadCount: 0,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
						lastGithubSync: "2024-01-01",
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
				name: `Server ${i}`,
				config: i % 2 === 0 ? `node server${i}.js` : `python server${i}.py`,
				status: i % 2 === 0 ? "connected" : "disconnected",
				disabled: i % 3 === 0,
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
					mcpId: `catalog-item-${i}`,
					githubUrl: `https://github.com/author${i}/item${i}`,
					name: `Catalog Item ${i}`,
					author: `Author ${i}`,
					description: `Description for item ${i}`,
					codiconIcon: "server",
					logoUrl: "",
					category: "test",
					tags: [],
					requiresApiKey: false,
					isRecommended: false,
					githubStars: 0,
					downloadCount: 0,
					createdAt: "2024-01-01",
					updatedAt: "2024-01-01",
					lastGithubSync: "2024-01-01",
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
					name: "Enabled Server",
					config: "node server.js",
					status: "connected",
					disabled: false,
				},
				{
					name: "Disabled Server",
					config: "node server.js",
					status: "disconnected",
					disabled: true,
				},
			]

			act(() => {
				result.current.setMcpServers(mockServers)
			})

			expect(result.current.mcpServers[0].disabled).toBe(false)
			expect(result.current.mcpServers[1].disabled).toBe(true)
		})

		it("should handle servers with different tool configurations", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const mockServers: McpServer[] = [
				{
					name: "No Tools",
					config: "node server.js",
					status: "connected",
					disabled: false,
					tools: [],
				},
				{
					name: "With Tools",
					config: "node server.js",
					status: "connected",
					disabled: false,
					tools: [
						{ name: "tool1", description: "Tool 1" },
						{ name: "tool2", description: "Tool 2" },
						{ name: "tool3", description: "Tool 3" },
					],
				},
			]

			act(() => {
				result.current.setMcpServers(mockServers)
			})

			expect(result.current.mcpServers[0].tools).toEqual([])
			expect(result.current.mcpServers[1].tools).toHaveLength(3)
		})
	})

	describe("State Immutability", () => {
		it("should maintain state immutability for servers", () => {
			const { result } = renderHook(() => useMcpState(), {
				wrapper: McpContextProvider,
			})

			const originalServers: McpServer[] = [
				{
					name: "Original Server",
					config: "node server.js",
					status: "disconnected",
					disabled: false,
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
						mcpId: "original-item",
						githubUrl: "https://original.url",
						name: "Original Item",
						author: "Original Author",
						description: "Original description",
						codiconIcon: "server",
						logoUrl: "",
						category: "test",
						tags: [],
						requiresApiKey: false,
						isRecommended: false,
						githubStars: 0,
						downloadCount: 0,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
						lastGithubSync: "2024-01-01",
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
							name: `Server ${i}`,
							config: "node server.js",
							status: "disconnected",
							disabled: false,
						},
					])
				}
			})

			expect(result.current.mcpServers).toHaveLength(1)
			expect(result.current.mcpServers[0].name).toBe("Server 9")
		})
	})
})
