/**
 * UIStateContext - Manages UI navigation and visibility state
 *
 * This context handles:
 * - View navigation (chat, settings, history, MCP)
 * - UI visibility toggles
 * - View state management
 *
 * Benefits:
 * - Components only re-render when UI state changes
 * - Clear separation of UI concerns
 * - Easier to test and maintain
 */

import type { McpViewTab } from "@shared/mcp"
import { EmptyRequest } from "@shared/proto/cline/common"
import type React from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { createContextSelector } from "@/hooks/use_context_selector"
import { debug, logError } from "@/utils/debug_logger"
import { UiServiceClient } from "../services/grpc-client"

export interface UIStateContextType {
	// View state
	showMcp: boolean
	mcpTab?: McpViewTab
	showSettings: boolean
	showHistory: boolean
	showChatModelSelector: boolean
	expandTaskHeader: boolean

	// Navigation functions
	navigateToMcp: (tab?: McpViewTab) => void
	navigateToSettings: () => void
	navigateToHistory: () => void
	navigateToChat: () => void

	// Hide functions
	hideSettings: () => void
	hideHistory: () => void
	hideChatModelSelector: () => void
	closeMcpView: () => void

	// Setters
	setShowMcp: (value: boolean) => void
	setMcpTab: (tab?: McpViewTab) => void
	setShowChatModelSelector: (value: boolean) => void
	setExpandTaskHeader: (value: boolean) => void

	// Event callbacks
	onRelinquishControl: (callback: () => void) => () => void
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined)

export const UIStateContextProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	// UI view state
	const [showMcp, setShowMcp] = useState(false)
	const [mcpTab, setMcpTab] = useState<McpViewTab | undefined>(undefined)
	const [showSettings, setShowSettings] = useState(false)
	const [showHistory, setShowHistory] = useState(false)
	const [showChatModelSelector, setShowChatModelSelector] = useState(false)
	const [expandTaskHeader, setExpandTaskHeader] = useState(true)

	// Subscription refs
	const mcpButtonUnsubscribeRef = useRef<(() => void) | null>(null)
	const historyButtonClickedSubscriptionRef = useRef<(() => void) | null>(null)
	const chatButtonUnsubscribeRef = useRef<(() => void) | null>(null)
	const settingsButtonClickedSubscriptionRef = useRef<(() => void) | null>(null)
	const focusChatInputUnsubscribeRef = useRef<(() => void) | null>(null)
	const didBecomeVisibleUnsubscribeRef = useRef<(() => void) | null>(null)
	const relinquishControlUnsubscribeRef = useRef<(() => void) | null>(null)
	const relinquishControlCallbacks = useRef<Set<() => void>>(new Set())

	// Helper for MCP view
	const closeMcpView = useCallback(() => {
		setShowMcp(false)
		setMcpTab(undefined)
	}, [])

	// Hide functions
	const hideSettings = useCallback(() => setShowSettings(false), [])
	const hideHistory = useCallback(() => setShowHistory(false), [])
	const hideChatModelSelector = useCallback(() => setShowChatModelSelector(false), [])

	// Navigation functions
	const navigateToMcp = useCallback((tab?: McpViewTab) => {
		setShowSettings(false)
		setShowHistory(false)
		if (tab) {
			setMcpTab(tab)
		}
		setShowMcp(true)
	}, [])

	const navigateToSettings = useCallback(() => {
		setShowHistory(false)
		closeMcpView()
		setShowSettings(true)
	}, [closeMcpView])

	const navigateToHistory = useCallback(() => {
		setShowSettings(false)
		closeMcpView()
		setShowHistory(true)
	}, [closeMcpView])

	const navigateToChat = useCallback(() => {
		setShowSettings(false)
		closeMcpView()
		setShowHistory(false)
	}, [closeMcpView])

	// Event callback registration
	const onRelinquishControl = useCallback((callback: () => void) => {
		relinquishControlCallbacks.current.add(callback)
		return () => {
			relinquishControlCallbacks.current.delete(callback)
		}
	}, [])

	// Subscribe to UI events
	useEffect(() => {
		// Subscribe to MCP button clicked events
		mcpButtonUnsubscribeRef.current = UiServiceClient.subscribeToMcpButtonClicked(
			{},
			{
				onResponse: () => {
					debug.log("[DEBUG] Received mcpButtonClicked event from gRPC stream")
					navigateToMcp()
				},
				onError: (error) => {
					logError("Error in mcpButtonClicked subscription:", error)
				},
				onComplete: () => {
					debug.log("mcpButtonClicked subscription completed")
				},
			},
		)

		// Subscribe to history button clicked events
		historyButtonClickedSubscriptionRef.current = UiServiceClient.subscribeToHistoryButtonClicked(
			{},
			{
				onResponse: () => {
					debug.log("[DEBUG] Received history button clicked event from gRPC stream")
					navigateToHistory()
				},
				onError: (error) => {
					logError("Error in history button clicked subscription:", error)
				},
				onComplete: () => {
					debug.log("History button clicked subscription completed")
				},
			},
		)

		// Subscribe to chat button clicked events
		chatButtonUnsubscribeRef.current = UiServiceClient.subscribeToChatButtonClicked(
			{},
			{
				onResponse: () => {
					debug.log("[DEBUG] Received chat button clicked event from gRPC stream")
					navigateToChat()
				},
				onError: (error) => {
					logError("Error in chat button subscription:", error)
				},
				onComplete: () => {},
			},
		)

		// Subscribe to settings button clicked events
		settingsButtonClickedSubscriptionRef.current = UiServiceClient.subscribeToSettingsButtonClicked(EmptyRequest.create({}), {
			onResponse: () => {
				navigateToSettings()
			},
			onError: (error) => {
				logError("Error in settings button clicked subscription:", error)
			},
			onComplete: () => {
				debug.log("Settings button clicked subscription completed")
			},
		})

		// Subscribe to didBecomeVisible events
		didBecomeVisibleUnsubscribeRef.current = UiServiceClient.subscribeToDidBecomeVisible(EmptyRequest.create({}), {
			onResponse: () => {
				debug.log("[DEBUG] Received didBecomeVisible event from gRPC stream")
				window.dispatchEvent(new CustomEvent("focusChatInput"))
			},
			onError: (error) => {
				logError("Error in didBecomeVisible subscription:", error)
			},
			onComplete: () => {},
		})

		// Subscribe to focus chat input events
		focusChatInputUnsubscribeRef.current = UiServiceClient.subscribeToFocusChatInput(
			{},
			{
				onResponse: () => {
					window.dispatchEvent(new CustomEvent("focusChatInput"))
				},
				onError: (error: Error) => {
					logError("Error in focusChatInput subscription:", error)
				},
				onComplete: () => {},
			},
		)

		// Subscribe to relinquish control events
		relinquishControlUnsubscribeRef.current = UiServiceClient.subscribeToRelinquishControl(EmptyRequest.create({}), {
			onResponse: () => {
				relinquishControlCallbacks.current.forEach((callback) => {
					callback()
				})
			},
			onError: (error) => {
				logError("Error in relinquishControl subscription:", error)
			},
			onComplete: () => {},
		})

		// Clean up subscriptions
		return () => {
			if (mcpButtonUnsubscribeRef.current) {
				mcpButtonUnsubscribeRef.current()
				mcpButtonUnsubscribeRef.current = null
			}
			if (historyButtonClickedSubscriptionRef.current) {
				historyButtonClickedSubscriptionRef.current()
				historyButtonClickedSubscriptionRef.current = null
			}
			if (chatButtonUnsubscribeRef.current) {
				chatButtonUnsubscribeRef.current()
				chatButtonUnsubscribeRef.current = null
			}
			if (settingsButtonClickedSubscriptionRef.current) {
				settingsButtonClickedSubscriptionRef.current()
				settingsButtonClickedSubscriptionRef.current = null
			}
			if (didBecomeVisibleUnsubscribeRef.current) {
				didBecomeVisibleUnsubscribeRef.current()
				didBecomeVisibleUnsubscribeRef.current = null
			}
			if (focusChatInputUnsubscribeRef.current) {
				focusChatInputUnsubscribeRef.current()
				focusChatInputUnsubscribeRef.current = null
			}
			if (relinquishControlUnsubscribeRef.current) {
				relinquishControlUnsubscribeRef.current()
				relinquishControlUnsubscribeRef.current = null
			}
		}
	}, [navigateToMcp, navigateToHistory, navigateToChat, navigateToSettings])

	const contextValue: UIStateContextType = {
		showMcp,
		mcpTab,
		showSettings,
		showHistory,
		showChatModelSelector,
		expandTaskHeader,
		navigateToMcp,
		navigateToSettings,
		navigateToHistory,
		navigateToChat,
		hideSettings,
		hideHistory,
		hideChatModelSelector,
		closeMcpView,
		setShowMcp,
		setMcpTab,
		setShowChatModelSelector,
		setExpandTaskHeader,
		onRelinquishControl,
	}

	return <UIStateContext.Provider value={contextValue}>{children}</UIStateContext.Provider>
}

/**
 * Hook to access UI state
 *
 * @example
 * ```typescript
 * const { showSettings, navigateToSettings } = useUIState()
 * ```
 */
export const useUIState = () => {
	const context = useContext(UIStateContext)
	if (context === undefined) {
		throw new Error("useUIState must be used within a UIStateContextProvider")
	}
	return context
}

/**
 * Optimized selector hook for UI state
 * Reduces re-renders by only updating when selected state changes
 *
 * @example
 * ```typescript
 * // Single value:
 * const showSettings = useUIStateSelector(state => state.showSettings)
 *
 * // Multiple values (will only re-render if any of these change):
 * const { showSettings, navigateToSettings } = useUIStateSelector(
 *   state => ({
 *     showSettings: state.showSettings,
 *     navigateToSettings: state.navigateToSettings,
 *   })
 * )
 * ```
 */

export const useUIStateSelector = createContextSelector(useUIState)
