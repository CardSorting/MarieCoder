import { ANTHROPIC_MIN_THINKING_BUDGET, ApiProvider } from "@shared/api"
import { ExtensionContext } from "vscode"
import { Controller } from "@/core/controller"
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@/shared/AutoApprovalSettings"
import { DEFAULT_BROWSER_SETTINGS } from "@/shared/BrowserSettings"
import { ClineRulesToggles } from "@/shared/cline-rules"
import { DEFAULT_DICTATION_SETTINGS, DictationSettings } from "@/shared/DictationSettings"
import { DEFAULT_FOCUS_CHAIN_SETTINGS } from "@/shared/FocusChainSettings"
import { DEFAULT_MCP_DISPLAY_MODE } from "@/shared/McpDisplayMode"
import { OpenaiReasoningEffort } from "@/shared/storage/types"
import { readTaskHistoryFromState } from "../disk"
import { GlobalStateAndSettings, LocalState, SecretKey, Secrets } from "../state-keys"
/**
 * Reads encrypted secrets from secure storage.
 *
 * Secrets include sensitive authentication tokens like API keys that should
 * never be stored in plain text. VS Code's secrets API provides encrypted
 * storage for these values.
 *
 * @param context - VS Code extension context providing access to secrets storage
 * @returns Object containing all decrypted secrets
 */
export async function readSecretsFromDisk(context: ExtensionContext): Promise<Secrets> {
	const [apiKey, openRouterApiKey] = await Promise.all([
		context.secrets.get("apiKey") as Promise<Secrets["apiKey"]>,
		context.secrets.get("openRouterApiKey") as Promise<Secrets["openRouterApiKey"]>,
	])

	return {
		apiKey,
		openRouterApiKey,
	}
}

/**
 * Reads workspace-specific state from storage.
 *
 * Workspace state is scoped to the current workspace/project and includes
 * local configuration like rules toggles that are specific to this project.
 * This state is separate from global state (which applies to all workspaces).
 *
 * @param context - VS Code extension context providing access to workspace storage
 * @returns Object containing workspace-specific configuration
 */
export async function readWorkspaceStateFromDisk(context: ExtensionContext): Promise<LocalState> {
	const localClineRulesToggles = context.workspaceState.get("localClineRulesToggles") as ClineRulesToggles | undefined
	const localWindsurfRulesToggles = context.workspaceState.get("localWindsurfRulesToggles") as ClineRulesToggles | undefined
	const localCursorRulesToggles = context.workspaceState.get("localCursorRulesToggles") as ClineRulesToggles | undefined
	const localWorkflowToggles = context.workspaceState.get("workflowToggles") as ClineRulesToggles | undefined

	return {
		localClineRulesToggles: localClineRulesToggles || {},
		localWindsurfRulesToggles: localWindsurfRulesToggles || {},
		localCursorRulesToggles: localCursorRulesToggles || {},
		workflowToggles: localWorkflowToggles || {},
	}
}

/**
 * Reads global state and settings from storage.
 *
 * Global state applies across ALL workspaces and includes user preferences,
 * API configurations, model settings, and other extension-wide configuration.
 * This function handles backwards compatibility by providing sensible defaults
 * for missing values.
 *
 * This function is complex because it:
 * - Reads many different configuration values from storage
 * - Provides default values for backwards compatibility
 * - Handles multi-root workspace support
 * - Merges partial state objects with defaults (e.g., browserSettings)
 *
 * @param context - VS Code extension context providing access to global storage
 * @returns Object containing all global settings with defaults applied
 * @throws Error if reading from storage fails (logged and re-thrown)
 */
export async function readGlobalStateFromDisk(context: ExtensionContext): Promise<GlobalStateAndSettings> {
	try {
		// Get all global state values
		const strictPlanModeEnabled =
			context.globalState.get<GlobalStateAndSettings["strictPlanModeEnabled"]>("strictPlanModeEnabled")
		const yoloModeToggled = context.globalState.get<GlobalStateAndSettings["yoloModeToggled"]>("yoloModeToggled")
		const useAutoCondense = context.globalState.get<GlobalStateAndSettings["useAutoCondense"]>("useAutoCondense")
		const isNewUser = context.globalState.get<GlobalStateAndSettings["isNewUser"]>("isNewUser")
		const openRouterProviderSorting =
			context.globalState.get<GlobalStateAndSettings["openRouterProviderSorting"]>("openRouterProviderSorting")
		const lastShownAnnouncementId =
			context.globalState.get<GlobalStateAndSettings["lastShownAnnouncementId"]>("lastShownAnnouncementId")
		const autoApprovalSettings =
			context.globalState.get<GlobalStateAndSettings["autoApprovalSettings"]>("autoApprovalSettings")
		const browserSettings = context.globalState.get<GlobalStateAndSettings["browserSettings"]>("browserSettings")
		const preferredLanguage = context.globalState.get<GlobalStateAndSettings["preferredLanguage"]>("preferredLanguage")
		const focusChainSettings = context.globalState.get<GlobalStateAndSettings["focusChainSettings"]>("focusChainSettings")
		const dictationSettings = context.globalState.get<GlobalStateAndSettings["dictationSettings"]>("dictationSettings") as
			| DictationSettings
			| undefined

		const mcpMarketplaceCatalog =
			context.globalState.get<GlobalStateAndSettings["mcpMarketplaceCatalog"]>("mcpMarketplaceCatalog")
		const lastDismissedInfoBannerVersion =
			context.globalState.get<GlobalStateAndSettings["lastDismissedInfoBannerVersion"]>("lastDismissedInfoBannerVersion")
		const lastDismissedModelBannerVersion = context.globalState.get<
			GlobalStateAndSettings["lastDismissedModelBannerVersion"]
		>("lastDismissedModelBannerVersion")
		const customPrompt = context.globalState.get<GlobalStateAndSettings["customPrompt"]>("customPrompt")
		const autoCondenseThreshold =
			context.globalState.get<GlobalStateAndSettings["autoCondenseThreshold"]>("autoCondenseThreshold") // number from 0 to 1
		// Get mode-related configurations
		const mode = context.globalState.get<GlobalStateAndSettings["mode"]>("mode")

		// Plan mode configurations
		const planModeApiProvider = context.globalState.get<GlobalStateAndSettings["planModeApiProvider"]>("planModeApiProvider")
		const planModeApiModelId = context.globalState.get<GlobalStateAndSettings["planModeApiModelId"]>("planModeApiModelId")
		const planModeThinkingBudgetTokens =
			context.globalState.get<GlobalStateAndSettings["planModeThinkingBudgetTokens"]>("planModeThinkingBudgetTokens")
		const planModeReasoningEffort =
			context.globalState.get<GlobalStateAndSettings["planModeReasoningEffort"]>("planModeReasoningEffort")
		// Act mode configurations
		const actModeApiProvider = context.globalState.get<GlobalStateAndSettings["actModeApiProvider"]>("actModeApiProvider")
		const actModeApiModelId = context.globalState.get<GlobalStateAndSettings["actModeApiModelId"]>("actModeApiModelId")
		const actModeThinkingBudgetTokens =
			context.globalState.get<GlobalStateAndSettings["actModeThinkingBudgetTokens"]>("actModeThinkingBudgetTokens")
		const actModeReasoningEffort =
			context.globalState.get<GlobalStateAndSettings["actModeReasoningEffort"]>("actModeReasoningEffort")
		const planModeOpenRouterModelId =
			context.globalState.get<GlobalStateAndSettings["planModeOpenRouterModelId"]>("planModeOpenRouterModelId")
		const planModeOpenRouterModelInfo =
			context.globalState.get<GlobalStateAndSettings["planModeOpenRouterModelInfo"]>("planModeOpenRouterModelInfo")
		const actModeOpenRouterModelId =
			context.globalState.get<GlobalStateAndSettings["actModeOpenRouterModelId"]>("actModeOpenRouterModelId")
		const actModeOpenRouterModelInfo =
			context.globalState.get<GlobalStateAndSettings["actModeOpenRouterModelInfo"]>("actModeOpenRouterModelInfo")
		const anthropicBaseUrl = context.globalState.get<GlobalStateAndSettings["anthropicBaseUrl"]>("anthropicBaseUrl")
		const requestTimeoutMs = context.globalState.get<GlobalStateAndSettings["requestTimeoutMs"]>("requestTimeoutMs")
		const favoritedModelIds = context.globalState.get<GlobalStateAndSettings["favoritedModelIds"]>("favoritedModelIds")
		const globalClineRulesToggles =
			context.globalState.get<GlobalStateAndSettings["globalClineRulesToggles"]>("globalClineRulesToggles")
		const shellIntegrationTimeout =
			context.globalState.get<GlobalStateAndSettings["shellIntegrationTimeout"]>("shellIntegrationTimeout")
		const enableCheckpointsSettingRaw =
			context.globalState.get<GlobalStateAndSettings["enableCheckpointsSetting"]>("enableCheckpointsSetting")
		const mcpMarketplaceEnabledRaw =
			context.globalState.get<GlobalStateAndSettings["mcpMarketplaceEnabled"]>("mcpMarketplaceEnabled")
		const mcpDisplayMode = context.globalState.get<GlobalStateAndSettings["mcpDisplayMode"]>("mcpDisplayMode")
		const mcpResponsesCollapsedRaw =
			context.globalState.get<GlobalStateAndSettings["mcpResponsesCollapsed"]>("mcpResponsesCollapsed")
		const globalWorkflowToggles =
			context.globalState.get<GlobalStateAndSettings["globalWorkflowToggles"]>("globalWorkflowToggles")
		const terminalReuseEnabled =
			context.globalState.get<GlobalStateAndSettings["terminalReuseEnabled"]>("terminalReuseEnabled")
		const terminalOutputLineLimit =
			context.globalState.get<GlobalStateAndSettings["terminalOutputLineLimit"]>("terminalOutputLineLimit")
		const defaultTerminalProfile =
			context.globalState.get<GlobalStateAndSettings["defaultTerminalProfile"]>("defaultTerminalProfile")
		const openaiReasoningEffort =
			context.globalState.get<GlobalStateAndSettings["openaiReasoningEffort"]>("openaiReasoningEffort")
		const userInfo = context.globalState.get<GlobalStateAndSettings["userInfo"]>("userInfo")
		const planActSeparateModelsSettingRaw =
			context.globalState.get<GlobalStateAndSettings["planActSeparateModelsSetting"]>("planActSeparateModelsSetting")

		let apiProvider: ApiProvider
		if (planModeApiProvider) {
			apiProvider = planModeApiProvider
		} else {
			// New users should default to openrouter, since they've opted to use an API key instead of signing in
			apiProvider = "openrouter"
		}

		const mcpResponsesCollapsed = mcpResponsesCollapsedRaw ?? false

		// Plan/Act separate models setting is a boolean indicating whether the user wants to use different models for plan and act. Existing users expect this to be enabled, while we want new users to opt in to this being disabled by default.
		// On win11 state sometimes initializes as empty string instead of undefined
		let planActSeparateModelsSetting: boolean | undefined
		if (planActSeparateModelsSettingRaw === true || planActSeparateModelsSettingRaw === false) {
			planActSeparateModelsSetting = planActSeparateModelsSettingRaw
		} else {
			// default to false
			planActSeparateModelsSetting = false
		}

		const taskHistory = await readTaskHistoryFromState()

		// Multi-root workspace support
		const workspaceRoots = context.globalState.get<GlobalStateAndSettings["workspaceRoots"]>("workspaceRoots")
		/**
		 * Get primary root index from global state.
		 * The primary root is the main workspace folder that Cline focuses on when dealing with
		 * multi-root workspaces. In VS Code, you can have multiple folders open in one workspace,
		 * and the primary root index indicates which folder (by its position in the array, 0-based)
		 * should be treated as the main/default working directory for operations.
		 */
		const primaryRootIndex = context.globalState.get<GlobalStateAndSettings["primaryRootIndex"]>("primaryRootIndex")
		const multiRootEnabled = context.globalState.get<GlobalStateAndSettings["multiRootEnabled"]>("multiRootEnabled")

		return {
			// api configuration fields
			anthropicBaseUrl,
			openRouterProviderSorting,
			favoritedModelIds: favoritedModelIds || [],
			requestTimeoutMs,
			// Plan mode configurations
			planModeApiProvider: planModeApiProvider || apiProvider,
			planModeApiModelId,
			// undefined means it was never modified, 0 means it was turned off
			// (having this on by default ensures that <thinking> text does not pollute the user's chat and is instead rendered as reasoning)
			planModeThinkingBudgetTokens: planModeThinkingBudgetTokens ?? ANTHROPIC_MIN_THINKING_BUDGET,
			planModeReasoningEffort,
			planModeOpenRouterModelId,
			planModeOpenRouterModelInfo,
			// Act mode configurations
			actModeApiProvider: actModeApiProvider || apiProvider,
			actModeApiModelId,
			actModeThinkingBudgetTokens: actModeThinkingBudgetTokens ?? ANTHROPIC_MIN_THINKING_BUDGET,
			actModeReasoningEffort,
			actModeOpenRouterModelId,
			actModeOpenRouterModelInfo,

			// Other global fields
			focusChainSettings: focusChainSettings || DEFAULT_FOCUS_CHAIN_SETTINGS,
			dictationSettings: { ...DEFAULT_DICTATION_SETTINGS, ...dictationSettings },
			strictPlanModeEnabled: strictPlanModeEnabled ?? true,
			yoloModeToggled: yoloModeToggled ?? false,
			useAutoCondense: useAutoCondense ?? false,
			isNewUser: isNewUser ?? true,
			lastShownAnnouncementId,
			taskHistory: taskHistory || [],
			autoApprovalSettings: autoApprovalSettings || DEFAULT_AUTO_APPROVAL_SETTINGS, // default value can be 0 or empty string
			globalClineRulesToggles: globalClineRulesToggles || {},
			browserSettings: { ...DEFAULT_BROWSER_SETTINGS, ...browserSettings }, // this will ensure that older versions of browserSettings (e.g. before remoteBrowserEnabled was added) are merged with the default values (false for remoteBrowserEnabled)
			preferredLanguage: preferredLanguage || "English",
			openaiReasoningEffort: (openaiReasoningEffort as OpenaiReasoningEffort) || "medium",
			mode: mode || "act",
			userInfo,
			mcpMarketplaceEnabled: mcpMarketplaceEnabledRaw ?? true,
			mcpDisplayMode: mcpDisplayMode ?? DEFAULT_MCP_DISPLAY_MODE,
			mcpResponsesCollapsed: mcpResponsesCollapsed,
			planActSeparateModelsSetting: planActSeparateModelsSetting ?? false,
			enableCheckpointsSetting: enableCheckpointsSettingRaw ?? true,
			shellIntegrationTimeout: shellIntegrationTimeout || 4000,
			terminalReuseEnabled: terminalReuseEnabled ?? true,
			terminalOutputLineLimit: terminalOutputLineLimit ?? 500,
			defaultTerminalProfile: defaultTerminalProfile ?? "default",
			globalWorkflowToggles: globalWorkflowToggles || {},
			mcpMarketplaceCatalog,
			customPrompt,
			autoCondenseThreshold: autoCondenseThreshold || 0.75, // default to 0.75 if not set
			lastDismissedInfoBannerVersion: lastDismissedInfoBannerVersion ?? 0,
			lastDismissedModelBannerVersion: lastDismissedModelBannerVersion ?? 0,
			// Multi-root workspace support
			workspaceRoots,
			primaryRootIndex: primaryRootIndex ?? 0,
			// Feature flag - defaults to false
			// For now, always return false to disable multi-root support by default
			multiRootEnabled: !!multiRootEnabled,
		}
	} catch (error) {
		console.error("[StateHelpers] Failed to read global state:", error)
		throw error
	}
}

/**
 * Resets all workspace-specific state for the current workspace.
 * This includes local rules toggles and workflow settings specific to this project.
 *
 * NOTE: This only affects the CURRENT workspace. It does not touch:
 * - Global state (user preferences, API configurations)
 * - Other workspaces' state
 *
 * Use this when a user wants to reset project-specific settings while keeping
 * their global preferences intact.
 */
export async function resetWorkspaceState(controller: Controller) {
	const context = controller.context
	await Promise.all(context.workspaceState.keys().map((key) => controller.context.workspaceState.update(key, undefined)))

	await controller.stateManager.reInitialize()
}

/**
 * Resets all global state and secrets that apply across ALL workspaces.
 * This includes:
 * - API keys and authentication tokens
 * - User preferences (language, theme, etc.)
 * - Model configurations and settings
 * - Global rules and toggles
 *
 * NOTE: This does NOT reset workspace-specific state. Workspace state is separate
 * and should be reset explicitly using resetWorkspaceState() if needed.
 *
 * Use this when a user wants to completely reset their global configuration,
 * such as when switching accounts or troubleshooting.
 */
export async function resetGlobalState(controller: Controller) {
	const context = controller.context

	// Clear all global state keys
	await Promise.all(context.globalState.keys().map((key) => context.globalState.update(key, undefined)))

	// Clear all secrets (API keys, tokens)
	const secretKeys: SecretKey[] = ["apiKey", "openRouterApiKey"]
	await Promise.all(secretKeys.map((key) => context.secrets.delete(key)))

	// Re-initialize state manager to load defaults
	await controller.stateManager.reInitialize()
}
