/**
 * SettingsContext - Manages application settings and configuration
 *
 * This context handles:
 * - All user preferences and settings
 * - Configuration state
 * - Settings synchronization with extension
 *
 * Benefits:
 * - Components only re-render when settings change
 * - Centralized settings management
 * - Clear separation of configuration concerns
 */

import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings"
import { DEFAULT_BROWSER_SETTINGS } from "@shared/BrowserSettings"
import { DEFAULT_DICTATION_SETTINGS, type DictationSettings } from "@shared/DictationSettings"
import { DEFAULT_PLATFORM, type ExtensionState } from "@shared/ExtensionMessage"
import { DEFAULT_MCP_DISPLAY_MODE } from "@shared/McpDisplayMode"
import type { UserInfo } from "@shared/proto/cline/account"
import { EmptyRequest } from "@shared/proto/cline/common"
import { type TerminalProfile } from "@shared/proto/cline/state"
import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { createContextSelector } from "@/hooks/use_context_selector"
import { debug, logError } from "@/utils/debug_logger"
import { StateServiceClient, UiServiceClient } from "../services/grpc-client"

export interface SettingsContextType extends ExtensionState {
	// Hydration state
	didHydrateState: boolean

	// Terminal profiles
	availableTerminalProfiles: TerminalProfile[]

	// Setters
	setDictationSettings: (value: DictationSettings) => void
	setGlobalClineRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalClineRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalCursorRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalWindsurfRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalWorkflowToggles: (toggles: Record<string, boolean>) => void
	setGlobalWorkflowToggles: (toggles: Record<string, boolean>) => void
	setUserInfo: (userInfo?: UserInfo) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsContextProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	const [state, setState] = useState<ExtensionState>({
		version: "",
		clineMessages: [],
		taskHistory: [],
		autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS,
		browserSettings: DEFAULT_BROWSER_SETTINGS,
		dictationSettings: DEFAULT_DICTATION_SETTINGS,
		focusChainSettings: { enabled: false, remindClineInterval: 0 },
		preferredLanguage: "English",
		openaiReasoningEffort: "medium",
		mode: "act",
		platform: DEFAULT_PLATFORM,
		distinctId: "",
		planActSeparateModelsSetting: true,
		enableCheckpointsSetting: true,
		mcpDisplayMode: DEFAULT_MCP_DISPLAY_MODE,
		globalClineRulesToggles: {},
		localClineRulesToggles: {},
		localCursorRulesToggles: {},
		localWindsurfRulesToggles: {},
		localWorkflowToggles: {},
		globalWorkflowToggles: {},
		shellIntegrationTimeout: 4000,
		terminalReuseEnabled: true,
		terminalOutputLineLimit: 500,
		defaultTerminalProfile: "default",
		isNewUser: false,
		mcpResponsesCollapsed: false,
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		customPrompt: undefined,
		useAutoCondense: false,
		autoCondenseThreshold: undefined,
		favoritedModelIds: [],
		lastDismissedInfoBannerVersion: 0,
		lastDismissedModelBannerVersion: 0,
		shouldShowAnnouncement: false,
		workspaceRoots: [],
		primaryRootIndex: 0,
		isMultiRootWorkspace: false,
		multiRootSetting: { user: false, featureFlag: false },
	})

	const [didHydrateState, setDidHydrateState] = useState(false)
	const [availableTerminalProfiles, setAvailableTerminalProfiles] = useState<TerminalProfile[]>([])

	// Subscription refs
	const stateSubscriptionRef = useRef<(() => void) | null>(null)
	const workspaceUpdatesUnsubscribeRef = useRef<(() => void) | null>(null)

	// Setting updaters
	const setDictationSettings = useCallback((value: DictationSettings) => {
		setState((prevState) => ({
			...prevState,
			dictationSettings: value,
		}))
	}, [])

	const setGlobalClineRulesToggles = useCallback((toggles: Record<string, boolean>) => {
		setState((prevState) => ({
			...prevState,
			globalClineRulesToggles: toggles,
		}))
	}, [])

	const setLocalClineRulesToggles = useCallback((toggles: Record<string, boolean>) => {
		setState((prevState) => ({
			...prevState,
			localClineRulesToggles: toggles,
		}))
	}, [])

	const setLocalCursorRulesToggles = useCallback((toggles: Record<string, boolean>) => {
		setState((prevState) => ({
			...prevState,
			localCursorRulesToggles: toggles,
		}))
	}, [])

	const setLocalWindsurfRulesToggles = useCallback((toggles: Record<string, boolean>) => {
		setState((prevState) => ({
			...prevState,
			localWindsurfRulesToggles: toggles,
		}))
	}, [])

	const setLocalWorkflowToggles = useCallback((toggles: Record<string, boolean>) => {
		setState((prevState) => ({
			...prevState,
			localWorkflowToggles: toggles,
		}))
	}, [])

	const setGlobalWorkflowToggles = useCallback((toggles: Record<string, boolean>) => {
		setState((prevState) => ({
			...prevState,
			globalWorkflowToggles: toggles,
		}))
	}, [])

	const setUserInfo = useCallback((userInfo?: UserInfo) => {
		setState((prevState) => ({ ...prevState, userInfo }))
	}, [])

	// Subscribe to state updates
	useEffect(() => {
		// Set up state subscription
		stateSubscriptionRef.current = StateServiceClient.subscribeToState(EmptyRequest.create({}), {
			onResponse: (response) => {
				if (response.stateJson) {
					try {
						const stateData = JSON.parse(response.stateJson) as ExtensionState
						setState((prevState) => {
							// Versioning logic for autoApprovalSettings
							const incomingVersion = stateData.autoApprovalSettings?.version ?? 1
							const currentVersion = prevState.autoApprovalSettings?.version ?? 1
							const shouldUpdateAutoApproval = incomingVersion > currentVersion

							const newState = {
								...stateData,
								autoApprovalSettings: shouldUpdateAutoApproval
									? stateData.autoApprovalSettings
									: prevState.autoApprovalSettings,
							}

							setDidHydrateState(true)
							debug.log("[DEBUG] Settings state updated")
							return newState
						})
					} catch (error) {
						logError("Error parsing state JSON:", error)
						debug.log("[DEBUG] ERR getting state", error)
					}
				}
			},
			onError: (error) => {
				logError("Error in state subscription:", error)
			},
			onComplete: () => {
				debug.log("State subscription completed")
			},
		})

		// Initialize webview
		UiServiceClient.initializeWebview(EmptyRequest.create({}))
			.then(() => {
				debug.log("[DEBUG] Webview initialization completed")
			})
			.catch((error: Error) => {
				logError("Failed to initialize webview:", error)
			})

		// Fetch available terminal profiles on launch
		StateServiceClient.getAvailableTerminalProfiles(EmptyRequest.create({}))
			.then((response) => {
				setAvailableTerminalProfiles(response.profiles)
			})
			.catch((error) => {
				logError("Failed to fetch available terminal profiles:", error)
			})

		// Clean up
		return () => {
			if (stateSubscriptionRef.current) {
				stateSubscriptionRef.current()
				stateSubscriptionRef.current = null
			}
			if (workspaceUpdatesUnsubscribeRef.current) {
				workspaceUpdatesUnsubscribeRef.current()
				workspaceUpdatesUnsubscribeRef.current = null
			}
		}
	}, [])

	// Memoize context value to prevent unnecessary re-renders
	const contextValue = useMemo<SettingsContextType>(
		() => ({
			...state,
			didHydrateState,
			availableTerminalProfiles,
			globalClineRulesToggles: state.globalClineRulesToggles || {},
			localClineRulesToggles: state.localClineRulesToggles || {},
			localCursorRulesToggles: state.localCursorRulesToggles || {},
			localWindsurfRulesToggles: state.localWindsurfRulesToggles || {},
			localWorkflowToggles: state.localWorkflowToggles || {},
			globalWorkflowToggles: state.globalWorkflowToggles || {},
			setDictationSettings,
			setGlobalClineRulesToggles,
			setLocalClineRulesToggles,
			setLocalCursorRulesToggles,
			setLocalWindsurfRulesToggles,
			setLocalWorkflowToggles,
			setGlobalWorkflowToggles,
			setUserInfo,
		}),
		[
			state,
			didHydrateState,
			availableTerminalProfiles,
			setDictationSettings,
			setGlobalClineRulesToggles,
			setLocalClineRulesToggles,
			setLocalCursorRulesToggles,
			setLocalWindsurfRulesToggles,
			setLocalWorkflowToggles,
			setGlobalWorkflowToggles,
			setUserInfo,
		],
	)

	return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>
}

/**
 * Hook to access settings state
 *
 * @example
 * ```typescript
 * const { autoApprovalSettings, setDictationSettings } = useSettingsState()
 * ```
 */
export const useSettingsState = () => {
	const context = useContext(SettingsContext)
	if (context === undefined) {
		throw new Error("useSettingsState must be used within a SettingsContextProvider")
	}
	return context
}

/**
 * Optimized selector hook for settings state
 * Reduces re-renders by only updating when selected settings change
 *
 * @example
 * ```typescript
 * // Single setting:
 * const autoApproval = useSettingsStateSelector(state => state.autoApprovalSettings)
 *
 * // Multiple settings:
 * const { browserSettings, dictationSettings } = useSettingsStateSelector(
 *   state => ({
 *     browserSettings: state.browserSettings,
 *     dictationSettings: state.dictationSettings,
 *   })
 * )
 *
 * // Computed value:
 * const isConfigured = useSettingsStateSelector(
 *   state => !!state.apiConfiguration
 * )
 * ```
 */
export const useSettingsStateSelector = createContextSelector(useSettingsState)
