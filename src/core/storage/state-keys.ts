import { ApiProvider, ModelInfo } from "@shared/api"
import { FocusChainSettings } from "@shared/FocusChainSettings"
import { WorkspaceRoot } from "@/core/workspace/WorkspaceRoot"
import { AutoApprovalSettings } from "@/shared/AutoApprovalSettings"
import { BrowserSettings } from "@/shared/BrowserSettings"
import { ClineRulesToggles } from "@/shared/cline-rules"
import { DictationSettings } from "@/shared/DictationSettings"
import { HistoryItem } from "@/shared/HistoryItem"
import { McpDisplayMode } from "@/shared/McpDisplayMode"
import { McpMarketplaceCatalog } from "@/shared/mcp"
import { Mode, OpenaiReasoningEffort } from "@/shared/storage/types"
import { UserInfo } from "@/shared/UserInfo"
export type SecretKey = keyof Secrets

export type GlobalStateKey = keyof GlobalState

export type LocalStateKey = keyof LocalState

export type SettingsKey = keyof Settings

export type GlobalStateAndSettingsKey = keyof (GlobalState & Settings)

export type GlobalStateAndSettings = GlobalState & Settings

export interface GlobalState {
	lastShownAnnouncementId: string | undefined
	taskHistory: HistoryItem[]
	userInfo: UserInfo | undefined
	mcpMarketplaceCatalog: McpMarketplaceCatalog | undefined
	favoritedModelIds: string[]
	mcpMarketplaceEnabled: boolean
	mcpResponsesCollapsed: boolean
	terminalReuseEnabled: boolean
	isNewUser: boolean
	mcpDisplayMode: McpDisplayMode
	// Multi-root workspace support
	workspaceRoots: WorkspaceRoot[] | undefined
	primaryRootIndex: number
	multiRootEnabled: boolean
	lastDismissedInfoBannerVersion: number
	lastDismissedModelBannerVersion: number
}

export interface Settings {
	anthropicBaseUrl: string | undefined
	openRouterProviderSorting: string | undefined
	autoApprovalSettings: AutoApprovalSettings
	globalClineRulesToggles: ClineRulesToggles
	globalWorkflowToggles: ClineRulesToggles
	browserSettings: BrowserSettings
	planActSeparateModelsSetting: boolean
	enableCheckpointsSetting: boolean
	requestTimeoutMs: number | undefined
	shellIntegrationTimeout: number
	defaultTerminalProfile: string
	terminalOutputLineLimit: number
	strictPlanModeEnabled: boolean
	yoloModeToggled: boolean
	useAutoCondense: boolean
	preferredLanguage: string
	openaiReasoningEffort: OpenaiReasoningEffort
	mode: Mode
	dictationSettings: DictationSettings
	focusChainSettings: FocusChainSettings
	customPrompt: "compact" | undefined
	autoCondenseThreshold: number | undefined // number from 0 to 1

	// Plan mode configurations
	planModeApiProvider: ApiProvider
	planModeApiModelId: string | undefined
	planModeThinkingBudgetTokens: number | undefined
	planModeReasoningEffort: string | undefined
	planModeOpenRouterModelId: string | undefined
	planModeOpenRouterModelInfo: ModelInfo | undefined

	// Act mode configurations
	actModeApiProvider: ApiProvider
	actModeApiModelId: string | undefined
	actModeThinkingBudgetTokens: number | undefined
	actModeReasoningEffort: string | undefined
	actModeOpenRouterModelId: string | undefined
	actModeOpenRouterModelInfo: ModelInfo | undefined
}

export interface Secrets {
	apiKey: string | undefined // Anthropic API key
	openRouterApiKey: string | undefined
}

export interface LocalState {
	localClineRulesToggles: ClineRulesToggles
	localCursorRulesToggles: ClineRulesToggles
	localWindsurfRulesToggles: ClineRulesToggles
	workflowToggles: ClineRulesToggles
}
