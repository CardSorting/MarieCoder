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
import { usePaintHoldingNavigation } from "@/utils/paint_holding"
import { TransitionPresets, useViewTransition } from "@/utils/view_transitions"
import { UiServiceClient } from "../services/grpc-client"

export interface UIStateContextType {
	// View state
	showHistory: boolean
	expandTaskHeader: boolean

	// Navigation functions (simplified - only History and Chat)
	navigateToHistory: () => void
	navigateToChat: () => void

	// Hide functions
	hideHistory: () => void

	// Setters
	setExpandTaskHeader: (value: boolean) => void

	// Legacy support (kept for backward compatibility but not actively used)
	showMcp: boolean
	mcpTab?: McpViewTab
	showSettings: boolean
	showChatModelSelector: boolean
	navigateToMcp: (tab?: McpViewTab) => void
	navigateToSettings: () => void
	hideChatModelSelector: () => void
	hideSettings: () => void
	closeMcpView: () => void
	setShowMcp: (value: boolean) => void
	setMcpTab: (tab?: McpViewTab) => void
	setShowChatModelSelector: (value: boolean) => void
	onRelinquishControl: (callback: () => void) => () => void
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined)

export const UIStateContextProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	// Active UI state - simplified to only what we need
	const [showHistory, setShowHistory] = useState(false)
	const [expandTaskHeader, setExpandTaskHeader] = useState(true)

	// Legacy state - kept for backward compatibility but not actively used in navbar
	const [showMcp, setShowMcp] = useState(false)
	const [mcpTab, setMcpTab] = useState<McpViewTab | undefined>(undefined)
	const [showSettings, setShowSettings] = useState(false)
	const [showChatModelSelector, setShowChatModelSelector] = useState(false)

	// Subscription refs - kept for other parts of the app
	const focusChatInputUnsubscribeRef = useRef<(() => void) | null>(null)
	const didBecomeVisibleUnsubscribeRef = useRef<(() => void) | null>(null)
	const relinquishControlUnsubscribeRef = useRef<(() => void) | null>(null)
	const relinquishControlCallbacks = useRef<Set<() => void>>(new Set())

	// Advanced UX features for smooth transitions
	const transition = useViewTransition()
	const paintHoldNav = usePaintHoldingNavigation()

	// === SIMPLIFIED NAVIGATION FUNCTIONS ===
	// Only History and Chat - pure local state, no gRPC complexity

	/**
	 * Navigate to History view with smooth transition
	 * Shows task history, hides all other views
	 */
	const navigateToHistory = useCallback(async () => {
		debug.log("[UIStateContext] navigateToHistory - START")
		debug.log("[UIStateContext] Current state:", { showHistory, showSettings, showMcp })

		await paintHoldNav(async () => {
			await transition(() => {
				setShowHistory(true)
			}, TransitionPresets.fade(200))
		})

		debug.log("[UIStateContext] navigateToHistory - COMPLETE, showHistory set to true")
	}, [showHistory, showSettings, showMcp, transition, paintHoldNav])

	/**
	 * Navigate to Chat view (New Task) with smooth transition
	 * Hides history, shows chat interface
	 */
	const navigateToChat = useCallback(async () => {
		debug.log("[UIStateContext] navigateToChat - START")
		debug.log("[UIStateContext] Current state:", { showHistory })

		await paintHoldNav(async () => {
			await transition(() => {
				setShowHistory(false)
			}, TransitionPresets.fade(200))
		})

		debug.log("[UIStateContext] navigateToChat - COMPLETE, showHistory set to false")
	}, [showHistory, transition, paintHoldNav])

	// Hide functions with smooth transition
	const hideHistory = useCallback(async () => {
		debug.log("[UIStateContext] hideHistory called")
		await transition(() => {
			setShowHistory(false)
		}, TransitionPresets.fade(200))
	}, [transition])

	// === LEGACY FUNCTIONS (kept for backward compatibility) ===
	const closeMcpView = useCallback(async () => {
		await transition(() => {
			setShowMcp(false)
			setMcpTab(undefined)
		}, TransitionPresets.fade(200))
	}, [transition])

	const hideSettings = useCallback(async () => {
		await transition(() => setShowSettings(false), TransitionPresets.fade(200))
	}, [transition])

	const hideChatModelSelector = useCallback(() => setShowChatModelSelector(false), [])

	const navigateToMcp = useCallback(
		async (tab?: McpViewTab) => {
			debug.log("[UIStateContext] navigateToMcp (legacy) called", tab)
			await paintHoldNav(async () => {
				await transition(() => {
					setShowHistory(false)
					if (tab) {
						setMcpTab(tab)
					}
					setShowMcp(true)
				}, TransitionPresets.fade(200))
			})
		},
		[transition, paintHoldNav],
	)

	const navigateToSettings = useCallback(async () => {
		debug.log("[UIStateContext] navigateToSettings (legacy) called")
		await paintHoldNav(async () => {
			await transition(() => {
				setShowHistory(false)
				setShowSettings(true)
			}, TransitionPresets.fade(200))
		})
	}, [transition, paintHoldNav])

	// Event callback registration
	const onRelinquishControl = useCallback((callback: () => void) => {
		relinquishControlCallbacks.current.add(callback)
		return () => {
			relinquishControlCallbacks.current.delete(callback)
		}
	}, [])

	// Subscribe to essential UI events only (removed complex gRPC navigation subscriptions)
	useEffect(() => {
		debug.log("[UIStateContext] Setting up event subscriptions")

		// Subscribe to didBecomeVisible events
		didBecomeVisibleUnsubscribeRef.current = UiServiceClient.subscribeToDidBecomeVisible(EmptyRequest.create({}), {
			onResponse: () => {
				debug.log("[DEBUG] Received didBecomeVisible event")
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

		debug.log("[UIStateContext] Event subscriptions complete")

		// Clean up subscriptions
		return () => {
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
	}, [])

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
