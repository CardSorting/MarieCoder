/**
 * Tests for UIStateContext
 */

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { UIStateContextProvider, useUIState } from "../UIStateContext"

// Mock the gRPC client
vi.mock("../../services/grpc-client", () => ({
	UiServiceClient: {
		subscribeToDidBecomeVisible: vi.fn(() => vi.fn()),
		subscribeToFocusChatInput: vi.fn(() => vi.fn()),
		subscribeToRelinquishControl: vi.fn(() => vi.fn()),
	},
}))

// Mock the debug logger
vi.mock("../../utils/debug_logger", () => ({
	debug: {
		log: vi.fn(),
	},
	logError: vi.fn(),
}))

describe("UIStateContext", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Suppress console.log in tests
		vi.spyOn(console, "log").mockImplementation(() => {})
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe("Provider", () => {
		it("should provide initial state", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			expect(result.current.showHistory).toBe(false)
			expect(result.current.showSettings).toBe(false)
			expect(result.current.showMcp).toBe(false)
			expect(result.current.expandTaskHeader).toBe(true)
			expect(result.current.showChatModelSelector).toBe(false)
		})

		it("should throw error when used outside provider", () => {
			// Suppress error output in console
			vi.spyOn(console, "error").mockImplementation(() => {})

			expect(() => {
				renderHook(() => useUIState())
			}).toThrow("useUIState must be used within a UIStateContextProvider")
		})
	})

	describe("Navigation", () => {
		it("should navigate to history", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			act(() => {
				result.current.navigateToHistory()
			})

			expect(result.current.showHistory).toBe(true)
		})

		it("should navigate to chat", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			// First navigate to history
			act(() => {
				result.current.navigateToHistory()
			})

			expect(result.current.showHistory).toBe(true)

			// Then navigate back to chat
			act(() => {
				result.current.navigateToChat()
			})

			expect(result.current.showHistory).toBe(false)
		})

		it("should navigate to settings (legacy)", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			act(() => {
				result.current.navigateToSettings()
			})

			expect(result.current.showSettings).toBe(true)
		})

		it("should navigate to MCP (legacy)", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			act(() => {
				result.current.navigateToMcp("installed")
			})

			expect(result.current.showMcp).toBe(true)
			expect(result.current.mcpTab).toBe("installed")
		})

		it("should navigate to MCP without tab", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			act(() => {
				result.current.navigateToMcp()
			})

			expect(result.current.showMcp).toBe(true)
		})
	})

	describe("Hide functions", () => {
		it("should hide history", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			act(() => {
				result.current.navigateToHistory()
			})

			expect(result.current.showHistory).toBe(true)

			act(() => {
				result.current.hideHistory()
			})

			expect(result.current.showHistory).toBe(false)
		})

		it("should hide settings", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			act(() => {
				result.current.navigateToSettings()
			})

			expect(result.current.showSettings).toBe(true)

			act(() => {
				result.current.hideSettings()
			})

			expect(result.current.showSettings).toBe(false)
		})

		it("should close MCP view", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			act(() => {
				result.current.navigateToMcp("installed")
			})

			expect(result.current.showMcp).toBe(true)
			expect(result.current.mcpTab).toBe("installed")

			act(() => {
				result.current.closeMcpView()
			})

			expect(result.current.showMcp).toBe(false)
			expect(result.current.mcpTab).toBeUndefined()
		})

		it("should hide chat model selector", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			act(() => {
				result.current.setShowChatModelSelector(true)
			})

			expect(result.current.showChatModelSelector).toBe(true)

			act(() => {
				result.current.hideChatModelSelector()
			})

			expect(result.current.showChatModelSelector).toBe(false)
		})
	})

	describe("Setters", () => {
		it("should set expand task header", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			expect(result.current.expandTaskHeader).toBe(true)

			act(() => {
				result.current.setExpandTaskHeader(false)
			})

			expect(result.current.expandTaskHeader).toBe(false)
		})

		it("should set showMcp directly", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			act(() => {
				result.current.setShowMcp(true)
			})

			expect(result.current.showMcp).toBe(true)
		})

		it("should set mcpTab directly", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			act(() => {
				result.current.setMcpTab("servers")
			})

			expect(result.current.mcpTab).toBe("servers")
		})
	})

	describe("Relinquish control", () => {
		it("should register and call relinquish control callbacks", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			const callback = vi.fn()

			let unsubscribe: (() => void) | undefined

			act(() => {
				unsubscribe = result.current.onRelinquishControl(callback)
			})

			// Callback should be registered but not called yet
			expect(callback).not.toHaveBeenCalled()

			// Clean up
			if (unsubscribe) {
				act(() => {
					unsubscribe()
				})
			}
		})

		it("should unregister relinquish control callback", () => {
			const { result } = renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			const callback = vi.fn()

			let unsubscribe: (() => void) | undefined

			act(() => {
				unsubscribe = result.current.onRelinquishControl(callback)
			})

			// Unregister
			if (unsubscribe) {
				act(() => {
					unsubscribe()
				})
			}

			// Callback should not be called after unregistering
			expect(callback).not.toHaveBeenCalled()
		})
	})

	describe("Event subscriptions", () => {
		it("should set up gRPC subscriptions on mount", async () => {
			const { UiServiceClient } = await import("../../services/grpc-client")

			renderHook(() => useUIState(), {
				wrapper: UIStateContextProvider,
			})

			// Verify subscriptions were set up
			expect(UiServiceClient.subscribeToDidBecomeVisible).toHaveBeenCalled()
			expect(UiServiceClient.subscribeToFocusChatInput).toHaveBeenCalled()
			expect(UiServiceClient.subscribeToRelinquishControl).toHaveBeenCalled()
		})
	})
})
