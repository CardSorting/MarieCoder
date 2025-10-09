import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings"
import { findLastIndex } from "@shared/array"
import { DEFAULT_BROWSER_SETTINGS } from "@shared/BrowserSettings"
import { DEFAULT_DICTATION_SETTINGS, DictationSettings } from "@shared/DictationSettings"
import { DEFAULT_PLATFORM, type ExtensionState } from "@shared/ExtensionMessage"
import { DEFAULT_FOCUS_CHAIN_SETTINGS } from "@shared/FocusChainSettings"
import { DEFAULT_MCP_DISPLAY_MODE } from "@shared/McpDisplayMode"
import type { UserInfo } from "@shared/proto/cline/account"
import { EmptyRequest } from "@shared/proto/cline/common"
import type { OpenRouterCompatibleModelInfo } from "@shared/proto/cline/models"
import { type TerminalProfile } from "@shared/proto/cline/state"
import { convertProtoToClineMessage } from "@shared/proto-conversions/cline-message"
import { convertProtoMcpServersToMcpServers } from "@shared/proto-conversions/mcp/mcp-server-conversion"
import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { debug, logError } from "@/utils/debug_logger"
import {
	basetenDefaultModelId,
	basetenModels,
	groqDefaultModelId,
	groqModels,
	type ModelInfo,
	openRouterDefaultModelId,
	openRouterDefaultModelInfo,
	requestyDefaultModelId,
	requestyDefaultModelInfo,
	vercelAiGatewayDefaultModelId,
	vercelAiGatewayDefaultModelInfo,
} from "../../../src/shared/api"
import type { McpMarketplaceCatalog, McpServer, McpViewTab } from "../../../src/shared/mcp"
import { McpServiceClient, ModelsServiceClient, StateServiceClient, UiServiceClient } from "../services/grpc-client"

export interface ExtensionStateContextType extends ExtensionState {
	didHydrateState: boolean
	openRouterModels: Record<string, ModelInfo>
	openAiModels: string[]
	requestyModels: Record<string, ModelInfo>
	groqModels: Record<string, ModelInfo>
	basetenModels: Record<string, ModelInfo>
	huggingFaceModels: Record<string, ModelInfo>
	vercelAiGatewayModels: Record<string, ModelInfo>
	mcpServers: McpServer[]
	mcpMarketplaceCatalog: McpMarketplaceCatalog
	totalTasksSize: number | null

	availableTerminalProfiles: TerminalProfile[]

	// View state
	showMcp: boolean
	mcpTab?: McpViewTab
	showSettings: boolean
	showHistory: boolean
	showChatModelSelector: boolean
	expandTaskHeader: boolean

	// Setters
	setDictationSettings: (value: DictationSettings) => void
	setShowChatModelSelector: (value: boolean) => void
	setMcpServers: (value: McpServer[]) => void
	setRequestyModels: (value: Record<string, ModelInfo>) => void
	setGroqModels: (value: Record<string, ModelInfo>) => void
	setBasetenModels: (value: Record<string, ModelInfo>) => void
	setHuggingFaceModels: (value: Record<string, ModelInfo>) => void
	setVercelAiGatewayModels: (value: Record<string, ModelInfo>) => void
	setGlobalClineRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalClineRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalCursorRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalWindsurfRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalWorkflowToggles: (toggles: Record<string, boolean>) => void
	setGlobalWorkflowToggles: (toggles: Record<string, boolean>) => void
	setMcpMarketplaceCatalog: (value: McpMarketplaceCatalog) => void
	setTotalTasksSize: (value: number | null) => void
	setExpandTaskHeader: (value: boolean) => void

	// Refresh functions
	refreshOpenRouterModels: () => void
	setUserInfo: (userInfo?: UserInfo) => void

	// Navigation state setters
	setShowMcp: (value: boolean) => void
	setMcpTab: (tab?: McpViewTab) => void

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

	// Event callbacks
	onRelinquishControl: (callback: () => void) => () => void
}

export const ExtensionStateContext = createContext<ExtensionStateContextType | undefined>(undefined)

export const ExtensionStateContextProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	// UI view state
	const [showMcp, setShowMcp] = useState(false)
	const [mcpTab, setMcpTab] = useState<McpViewTab | undefined>(undefined)
	const [showSettings, setShowSettings] = useState(false)
	const [showHistory, setShowHistory] = useState(false)
	const [showChatModelSelector, setShowChatModelSelector] = useState(false)

	// Helper for MCP view
	const closeMcpView = useCallback(() => {
		setShowMcp(false)
		setMcpTab(undefined)
	}, []) // setState functions are stable

	// Hide functions
	const hideSettings = useCallback(() => setShowSettings(false), [])
	const hideHistory = useCallback(() => setShowHistory(false), [])
	const hideChatModelSelector = useCallback(() => setShowChatModelSelector(false), [])

	// Navigation functions
	const navigateToMcp = useCallback(
		(tab?: McpViewTab) => {
			setShowSettings(false)
			setShowHistory(false)
			if (tab) {
				setMcpTab(tab)
			}
			setShowMcp(true)
		},
		[], // setState functions are stable
	)

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

	const [state, setState] = useState<ExtensionState>({
		version: "",
		clineMessages: [],
		taskHistory: [],
		autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS,
		browserSettings: DEFAULT_BROWSER_SETTINGS,
		dictationSettings: DEFAULT_DICTATION_SETTINGS,
		focusChainSettings: DEFAULT_FOCUS_CHAIN_SETTINGS,
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
		mcpResponsesCollapsed: false, // Default value (expanded), will be overwritten by extension state
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		customPrompt: undefined,
		useAutoCondense: false,
		autoCondenseThreshold: undefined,
		favoritedModelIds: [],
		lastDismissedInfoBannerVersion: 0,
		lastDismissedModelBannerVersion: 0,
		shouldShowAnnouncement: false,

		// NEW: Add workspace information with defaults
		workspaceRoots: [],
		primaryRootIndex: 0,
		isMultiRootWorkspace: false,
		multiRootSetting: { user: false, featureFlag: false },
	})
	const [expandTaskHeader, setExpandTaskHeader] = useState(true)
	const [didHydrateState, setDidHydrateState] = useState(false)
	const [openRouterModels, setOpenRouterModels] = useState<Record<string, ModelInfo>>({
		[openRouterDefaultModelId]: openRouterDefaultModelInfo,
	})
	const [totalTasksSize, setTotalTasksSize] = useState<number | null>(null)
	const [availableTerminalProfiles, setAvailableTerminalProfiles] = useState<TerminalProfile[]>([])

	const [openAiModels, _setOpenAiModels] = useState<string[]>([])
	const [requestyModels, setRequestyModels] = useState<Record<string, ModelInfo>>({
		[requestyDefaultModelId]: requestyDefaultModelInfo,
	})
	const [groqModelsState, setGroqModels] = useState<Record<string, ModelInfo>>({
		[groqDefaultModelId]: groqModels[groqDefaultModelId],
	})
	const [basetenModelsState, setBasetenModels] = useState<Record<string, ModelInfo>>({
		[basetenDefaultModelId]: basetenModels[basetenDefaultModelId],
	})
	const [huggingFaceModels, setHuggingFaceModels] = useState<Record<string, ModelInfo>>({})
	const [vercelAiGatewayModels, setVercelAiGatewayModels] = useState<Record<string, ModelInfo>>({
		[vercelAiGatewayDefaultModelId]: vercelAiGatewayDefaultModelInfo,
	})
	const [mcpServers, setMcpServers] = useState<McpServer[]>([])
	const [mcpMarketplaceCatalog, setMcpMarketplaceCatalog] = useState<McpMarketplaceCatalog>({ items: [] })

	// References to store subscription cancellation functions
	const stateSubscriptionRef = useRef<(() => void) | null>(null)

	// Reference for focusChatInput subscription
	const focusChatInputUnsubscribeRef = useRef<(() => void) | null>(null)
	const mcpButtonUnsubscribeRef = useRef<(() => void) | null>(null)
	const historyButtonClickedSubscriptionRef = useRef<(() => void) | null>(null)
	const chatButtonUnsubscribeRef = useRef<(() => void) | null>(null)
	const settingsButtonClickedSubscriptionRef = useRef<(() => void) | null>(null)
	const partialMessageUnsubscribeRef = useRef<(() => void) | null>(null)
	const mcpMarketplaceUnsubscribeRef = useRef<(() => void) | null>(null)
	const openRouterModelsUnsubscribeRef = useRef<(() => void) | null>(null)
	const workspaceUpdatesUnsubscribeRef = useRef<(() => void) | null>(null)
	const relinquishControlUnsubscribeRef = useRef<(() => void) | null>(null)

	// Add ref for callbacks
	const relinquishControlCallbacks = useRef<Set<() => void>>(new Set())

	// Create hook function
	const onRelinquishControl = useCallback((callback: () => void) => {
		relinquishControlCallbacks.current.add(callback)
		return () => {
			relinquishControlCallbacks.current.delete(callback)
		}
	}, [])
	const mcpServersSubscriptionRef = useRef<(() => void) | null>(null)
	const didBecomeVisibleUnsubscribeRef = useRef<(() => void) | null>(null)

	// Subscribe to state updates and UI events using the gRPC streaming API
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
							// HACK: Preserve clineMessages if currentTaskItem is the same
							if (stateData.currentTaskItem?.id === prevState.currentTaskItem?.id) {
								stateData.clineMessages = stateData.clineMessages?.length
									? stateData.clineMessages
									: prevState.clineMessages
							}

							const newState = {
								...stateData,
								autoApprovalSettings: shouldUpdateAutoApproval
									? stateData.autoApprovalSettings
									: prevState.autoApprovalSettings,
							}

							setDidHydrateState(true)

							debug.log("[DEBUG] returning new state in ESC")

							return newState
						})
					} catch (error) {
						logError("Error parsing state JSON:", error)
						debug.log("[DEBUG] ERR getting state", error)
					}
				}
				debug.log('[DEBUG] ended "got subscribed state"')
			},
			onError: (error) => {
				logError("Error in state subscription:", error)
			},
			onComplete: () => {
				debug.log("State subscription completed")
			},
		})

		// Subscribe to MCP button clicked events with webview type
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

		// Set up history button clicked subscription with webview type
		historyButtonClickedSubscriptionRef.current = UiServiceClient.subscribeToHistoryButtonClicked(
			{},
			{
				onResponse: () => {
					// When history button is clicked, navigate to history view
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

		// Subscribe to chat button clicked events with webview type
		chatButtonUnsubscribeRef.current = UiServiceClient.subscribeToChatButtonClicked(
			{},
			{
				onResponse: () => {
					// When chat button is clicked, navigate to chat
					debug.log("[DEBUG] Received chat button clicked event from gRPC stream")
					navigateToChat()
				},
				onError: (error) => {
					logError("Error in chat button subscription:", error)
				},
				onComplete: () => {},
			},
		)

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

		// Set up settings button clicked subscription
		settingsButtonClickedSubscriptionRef.current = UiServiceClient.subscribeToSettingsButtonClicked(EmptyRequest.create({}), {
			onResponse: () => {
				// When settings button is clicked, navigate to settings
				navigateToSettings()
			},
			onError: (error) => {
				logError("Error in settings button clicked subscription:", error)
			},
			onComplete: () => {
				debug.log("Settings button clicked subscription completed")
			},
		})

		// Subscribe to partial message events
		partialMessageUnsubscribeRef.current = UiServiceClient.subscribeToPartialMessage(EmptyRequest.create({}), {
			onResponse: (protoMessage) => {
				try {
					// Validate critical fields
					if (!protoMessage.ts || protoMessage.ts <= 0) {
						logError("Invalid timestamp in partial message:", protoMessage)
						return
					}

					const partialMessage = convertProtoToClineMessage(protoMessage)
					setState((prevState) => {
						// worth noting it will never be possible for a more up-to-date message to be sent here or in normal messages post since the presentAssistantContent function uses lock
						const lastIndex = findLastIndex(prevState.clineMessages, (msg) => msg.ts === partialMessage.ts)
						if (lastIndex !== -1) {
							const newClineMessages = [...prevState.clineMessages]
							newClineMessages[lastIndex] = partialMessage
							return { ...prevState, clineMessages: newClineMessages }
						}
						return prevState
					})
				} catch (error) {
					logError("Failed to process partial message:", error, protoMessage)
				}
			},
			onError: (error) => {
				logError("Error in partialMessage subscription:", error)
			},
			onComplete: () => {
				debug.log("[DEBUG] partialMessage subscription completed")
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

		// Subscribe to OpenRouter models updates
		openRouterModelsUnsubscribeRef.current = ModelsServiceClient.subscribeToOpenRouterModels(EmptyRequest.create({}), {
			onResponse: (response: OpenRouterCompatibleModelInfo) => {
				debug.log("[DEBUG] Received OpenRouter models update from gRPC stream")
				const models = response.models
				setOpenRouterModels({
					[openRouterDefaultModelId]: openRouterDefaultModelInfo, // in case the extension sent a model list without the default model
					...models,
				})
			},
			onError: (error) => {
				logError("Error in OpenRouter models subscription:", error)
			},
			onComplete: () => {
				debug.log("OpenRouter models subscription completed")
			},
		})

		// Initialize webview using gRPC
		UiServiceClient.initializeWebview(EmptyRequest.create({}))
			.then(() => {
				debug.log("[DEBUG] Webview initialization completed via gRPC")
			})
			.catch((error) => {
				logError("Failed to initialize webview via gRPC:", error)
			})

		// Fetch available terminal profiles on launch
		StateServiceClient.getAvailableTerminalProfiles(EmptyRequest.create({}))
			.then((response) => {
				setAvailableTerminalProfiles(response.profiles)
			})
			.catch((error) => {
				logError("Failed to fetch available terminal profiles:", error)
			})

		// Subscribe to relinquish control events
		relinquishControlUnsubscribeRef.current = UiServiceClient.subscribeToRelinquishControl(EmptyRequest.create({}), {
			onResponse: () => {
				// Call all registered callbacks
				relinquishControlCallbacks.current.forEach((callback) => {
					callback()
				})
			},
			onError: (error) => {
				logError("Error in relinquishControl subscription:", error)
			},
			onComplete: () => {},
		})

		// Subscribe to focus chat input events
		focusChatInputUnsubscribeRef.current = UiServiceClient.subscribeToFocusChatInput(
			{},
			{
				onResponse: () => {
					// Dispatch a local DOM event within this webview only
					window.dispatchEvent(new CustomEvent("focusChatInput"))
				},
				onError: (error: Error) => {
					logError("Error in focusChatInput subscription:", error)
				},
				onComplete: () => {},
			},
		)

		// Clean up subscriptions when component unmounts
		return () => {
			if (stateSubscriptionRef.current) {
				stateSubscriptionRef.current()
				stateSubscriptionRef.current = null
			}
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
			if (partialMessageUnsubscribeRef.current) {
				partialMessageUnsubscribeRef.current()
				partialMessageUnsubscribeRef.current = null
			}
			if (mcpMarketplaceUnsubscribeRef.current) {
				mcpMarketplaceUnsubscribeRef.current()
				mcpMarketplaceUnsubscribeRef.current = null
			}
			if (openRouterModelsUnsubscribeRef.current) {
				openRouterModelsUnsubscribeRef.current()
				openRouterModelsUnsubscribeRef.current = null
			}
			if (workspaceUpdatesUnsubscribeRef.current) {
				workspaceUpdatesUnsubscribeRef.current()
				workspaceUpdatesUnsubscribeRef.current = null
			}
			if (relinquishControlUnsubscribeRef.current) {
				relinquishControlUnsubscribeRef.current()
				relinquishControlUnsubscribeRef.current = null
			}
			if (focusChatInputUnsubscribeRef.current) {
				focusChatInputUnsubscribeRef.current()
				focusChatInputUnsubscribeRef.current = null
			}
			if (mcpServersSubscriptionRef.current) {
				mcpServersSubscriptionRef.current()
				mcpServersSubscriptionRef.current = null
			}
			if (didBecomeVisibleUnsubscribeRef.current) {
				didBecomeVisibleUnsubscribeRef.current()
				didBecomeVisibleUnsubscribeRef.current = null
			}
		}
	}, [])

	const refreshOpenRouterModels = useCallback(() => {
		ModelsServiceClient.refreshOpenRouterModels(EmptyRequest.create({}))
			.then((response: OpenRouterCompatibleModelInfo) => {
				const models = response.models
				setOpenRouterModels({
					[openRouterDefaultModelId]: openRouterDefaultModelInfo, // in case the extension sent a model list without the default model
					...models,
				})
			})
			.catch((error: Error) => logError("Failed to refresh OpenRouter models:", error))
	}, [])

	// Memoize context value to prevent unnecessary re-renders
	const contextValue = useMemo<ExtensionStateContextType>(
		() => ({
			...state,
			didHydrateState,
			openRouterModels,
			openAiModels,
			requestyModels,
			groqModels: groqModelsState,
			basetenModels: basetenModelsState,
			huggingFaceModels,
			vercelAiGatewayModels,
			mcpServers,
			mcpMarketplaceCatalog,
			totalTasksSize,
			availableTerminalProfiles,
			showMcp,
			mcpTab,
			showSettings,
			showHistory,
			showChatModelSelector,
			globalClineRulesToggles: state.globalClineRulesToggles || {},
			localClineRulesToggles: state.localClineRulesToggles || {},
			localCursorRulesToggles: state.localCursorRulesToggles || {},
			localWindsurfRulesToggles: state.localWindsurfRulesToggles || {},
			localWorkflowToggles: state.localWorkflowToggles || {},
			globalWorkflowToggles: state.globalWorkflowToggles || {},
			enableCheckpointsSetting: state.enableCheckpointsSetting,
			currentFocusChainChecklist: state.currentFocusChainChecklist,

			// Navigation functions
			navigateToMcp,
			navigateToSettings,
			navigateToHistory,
			navigateToChat,

			// Hide functions
			hideSettings,
			hideHistory,
			hideChatModelSelector,
			setShowChatModelSelector,
			setMcpServers: (mcpServers: McpServer[]) => setMcpServers(mcpServers),
			setRequestyModels: (models: Record<string, ModelInfo>) => setRequestyModels(models),
			setGroqModels: (models: Record<string, ModelInfo>) => setGroqModels(models),
			setBasetenModels: (models: Record<string, ModelInfo>) => setBasetenModels(models),
			setHuggingFaceModels: (models: Record<string, ModelInfo>) => setHuggingFaceModels(models),
			setVercelAiGatewayModels: (models: Record<string, ModelInfo>) => setVercelAiGatewayModels(models),
			setMcpMarketplaceCatalog: (catalog: McpMarketplaceCatalog) => setMcpMarketplaceCatalog(catalog),
			setShowMcp,
			closeMcpView,
			setGlobalClineRulesToggles: (toggles: Record<string, boolean>) =>
				setState((prevState) => ({
					...prevState,
					globalClineRulesToggles: toggles,
				})),
			setLocalClineRulesToggles: (toggles: Record<string, boolean>) =>
				setState((prevState) => ({
					...prevState,
					localClineRulesToggles: toggles,
				})),
			setLocalCursorRulesToggles: (toggles: Record<string, boolean>) =>
				setState((prevState) => ({
					...prevState,
					localCursorRulesToggles: toggles,
				})),
			setLocalWindsurfRulesToggles: (toggles: Record<string, boolean>) =>
				setState((prevState) => ({
					...prevState,
					localWindsurfRulesToggles: toggles,
				})),
			setLocalWorkflowToggles: (toggles: Record<string, boolean>) =>
				setState((prevState) => ({
					...prevState,
					localWorkflowToggles: toggles,
				})),
			setGlobalWorkflowToggles: (toggles: Record<string, boolean>) =>
				setState((prevState) => ({
					...prevState,
					globalWorkflowToggles: toggles,
				})),
			setMcpTab,
			setTotalTasksSize,
			refreshOpenRouterModels,
			onRelinquishControl,
			setUserInfo: (userInfo?: UserInfo) => setState((prevState) => ({ ...prevState, userInfo })),
			expandTaskHeader,
			setExpandTaskHeader,
			setDictationSettings: (value: DictationSettings) =>
				setState((prevState) => ({
					...prevState,
					dictationSettings: value,
				})),
		}),
		[
			state,
			didHydrateState,
			openRouterModels,
			openAiModels,
			requestyModels,
			groqModelsState,
			basetenModelsState,
			huggingFaceModels,
			vercelAiGatewayModels,
			mcpServers,
			mcpMarketplaceCatalog,
			totalTasksSize,
			availableTerminalProfiles,
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
			refreshOpenRouterModels,
			onRelinquishControl,
		],
	)

	return <ExtensionStateContext.Provider value={contextValue}>{children}</ExtensionStateContext.Provider>
}

export const useExtensionState = () => {
	const context = useContext(ExtensionStateContext)
	if (context === undefined) {
		throw new Error("useExtensionState must be used within an ExtensionStateContextProvider")
	}
	return context
}
