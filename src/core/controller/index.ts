import { Anthropic } from "@anthropic-ai/sdk"
import { ApiService } from "@core/api"
import { downloadTask } from "@integrations/misc/export-markdown"
import { McpHub } from "@services/mcp/McpHub"
import { ApiProvider, ModelInfo } from "@shared/api"
import { ChatContent } from "@shared/ChatContent"
import { ExtensionState, Platform } from "@shared/ExtensionMessage"
import { HistoryItem } from "@shared/HistoryItem"
import { Mode } from "@shared/storage/types"
import { UserInfo } from "@shared/UserInfo"
import { fileExistsAtPath } from "@utils/fs"
import fs from "fs/promises"
import * as path from "path"
import * as vscode from "vscode"
import { HostProvider } from "@/hosts/host-provider"
import { ExtensionRegistryInfo } from "@/registry"
import { featureFlagsService } from "@/services/feature-flags"
import { getDistinctId } from "@/services/logging/distinctId"
import { Logger } from "@/services/logging/Logger"
import { getLatestAnnouncementId } from "@/utils/announcements"
import { PromptRegistry } from "../prompts/system-prompt"
import {
	ensureCacheDirectoryExists,
	ensureMcpServersDirectoryExists,
	ensureSettingsDirectoryExists,
	GlobalFileNames,
} from "../storage/disk"
import { StateManager } from "../storage/StateManager"
import { Task } from "../task"
import { McpCoordinator } from "./coordinators/mcp_coordinator"
import { StateCoordinator } from "./coordinators/state_coordinator"
import { TaskCoordinator } from "./coordinators/task_coordinator"
import { WorkspaceCoordinator } from "./coordinators/workspace_coordinator"
import { ControllerEventType, type EventListener, type EventUnsubscribe } from "./events/controller_events"
import { ControllerEventEmitter } from "./events/event_emitter"
import { ControllerInitializer } from "./initialization/controller_initializer"
import { appendClineStealthModels } from "./models/refreshOpenRouterModels"
import { sendStateUpdate } from "./state/subscribeToState"
import { sendChatButtonClickedEvent } from "./ui/subscribeToChatButtonClicked"

/**
 * Main Controller for Marie extension
 * Orchestrates coordinators and manages extension lifecycle
 */
export class Controller {
	task?: Task

	mcpHub: McpHub
	readonly stateManager: StateManager
	readonly eventEmitter: ControllerEventEmitter

	// Coordinators
	workspaceCoordinator: WorkspaceCoordinator
	mcpCoordinator: McpCoordinator
	stateCoordinator: StateCoordinator
	taskCoordinator: TaskCoordinator

	constructor(readonly context: vscode.ExtensionContext) {
		PromptRegistry.getInstance() // Ensure prompts and tools are registered
		HostProvider.get().logToChannel("MarieProvider instantiated")
		this.stateManager = StateManager.get()

		// Initialize event emitter
		this.eventEmitter = new ControllerEventEmitter()

		// Initialize MCP Hub
		this.mcpHub = new McpHub(
			() => ensureMcpServersDirectoryExists(),
			() => ensureSettingsDirectoryExists(),
			ExtensionRegistryInfo.version,
		)

		// Initialize coordinators with event emitter
		this.workspaceCoordinator = new WorkspaceCoordinator(context, this.stateManager, this.eventEmitter)
		this.mcpCoordinator = new McpCoordinator(this.mcpHub, this.stateManager, this.eventEmitter)
		this.stateCoordinator = new StateCoordinator(this.stateManager, this, this.eventEmitter)
		this.taskCoordinator = new TaskCoordinator(this, this.stateManager, this.mcpHub, this.eventEmitter)

		// Delegate initialization
		ControllerInitializer.initialize(this, context, {
			initializeWorkspace: false, // Workspace initialized on demand during task creation
			setupEventListeners: true,
		}).catch((error) => {
			Logger.error("[Controller] Failed to initialize", error instanceof Error ? error : new Error(String(error)))
		})
	}

	/**
	 * Dispose and cleanup resources
	 */
	async dispose(): Promise<void> {
		await this.taskCoordinator.clearCurrentTask()
		await this.mcpCoordinator.cleanup()
		await this.workspaceCoordinator.cleanup()

		Logger.debug("Controller disposed")
	}

	/**
	 * Set user info in global state
	 */
	async setUserInfo(info?: UserInfo): Promise<void> {
		this.stateManager.setGlobalState("userInfo", info)
	}

	/**
	 * Initialize a new task with given parameters
	 */
	async initTask(
		task?: string,
		images?: string[],
		files?: string[],
		historyItem?: HistoryItem,
		taskSettings?: Partial<import("@core/storage/state-keys").Settings>,
	): Promise<string> {
		// Initialize workspace on demand
		await this.workspaceCoordinator.initialize()

		// Create task through coordinator
		return await this.taskCoordinator.createTask({
			task,
			images,
			files,
			historyItem,
			taskSettings,
		})
	}

	/**
	 * Reinitialize existing task from history by ID
	 */
	async reinitExistingTaskFromId(taskId: string): Promise<void> {
		await this.taskCoordinator.reinitTask(taskId)
	}

	/**
	 * Toggle to act mode for yolo mode
	 */
	async toggleActModeForYoloMode(): Promise<boolean> {
		const modeToSwitchTo: Mode = "act"

		// Switch to act mode
		this.stateManager.setGlobalState("mode", modeToSwitchTo)

		// Update API handler with new mode
		if (this.task) {
			const apiConfiguration = this.stateManager.getApiConfiguration()
			this.task.api = ApiService.createHandler({ ...apiConfiguration, ulid: this.task.ulid }, modeToSwitchTo)
		}

		await this.postStateToWebview()

		// Additional safety check
		return this.task !== undefined
	}

	/**
	 * Toggle between plan and act modes
	 */
	async togglePlanActMode(modeToSwitchTo: Mode, chatContent?: ChatContent): Promise<boolean> {
		const didSwitchToActMode = modeToSwitchTo === "act"

		// Store mode to global state
		this.stateManager.setGlobalState("mode", modeToSwitchTo)

		// Update API handler with new mode
		if (this.task) {
			const apiConfiguration = this.stateManager.getApiConfiguration()
			this.task.api = ApiService.createHandler({ ...apiConfiguration, ulid: this.task.ulid }, modeToSwitchTo)
		}

		await this.postStateToWebview()

		if (this.task) {
			if (this.task.taskState.isAwaitingPlanResponse && didSwitchToActMode) {
				this.task.taskState.didRespondToPlanAskBySwitchingMode = true
				await this.task.handleWebviewAskResponse(
					"messageResponse",
					chatContent?.message || "PLAN_MODE_TOGGLE_RESPONSE",
					chatContent?.images || [],
					chatContent?.files || [],
				)
				return true
			} else {
				this.cancelTask()
				return false
			}
		}

		return false
	}

	/**
	 * Cancel current task
	 */
	async cancelTask(): Promise<void> {
		await this.taskCoordinator.cancelTask()
	}

	/**
	 * Handle task creation from prompt
	 */
	async handleTaskCreation(prompt: string): Promise<void> {
		await sendChatButtonClickedEvent()
		await this.initTask(prompt)
	}

	/**
	 * Silently refresh MCP marketplace catalog
	 */
	async silentlyRefreshMcpMarketplace(): Promise<void> {
		await this.mcpCoordinator.silentlyRefreshMarketplace()
	}

	/**
	 * Silently refresh MCP marketplace catalog (RPC variant)
	 */
	async silentlyRefreshMcpMarketplaceRPC(): Promise<import("@shared/mcp").McpMarketplaceCatalog | undefined> {
		return await this.mcpCoordinator.silentlyRefreshMarketplaceRPC()
	}

	/**
	 * Handle OpenRouter OAuth callback
	 */
	async handleOpenRouterCallback(code: string): Promise<void> {
		let apiKey: string
		try {
			const response = await fetch("https://openrouter.ai/api/v1/auth/keys", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code }),
			})
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}
			const data = await response.json()
			if (data && data.key) {
				apiKey = data.key
			} else {
				throw new Error("Invalid response from OpenRouter API")
			}
		} catch (error) {
			Logger.error("Error exchanging code for API key", error instanceof Error ? error : new Error(String(error)))
			throw error
		}

		const openrouter: ApiProvider = "openrouter"
		const currentMode = this.stateManager.getGlobalSettingsKey("mode")

		// Update API configuration
		const currentApiConfiguration = this.stateManager.getApiConfiguration()
		const updatedConfig = {
			...currentApiConfiguration,
			planModeApiProvider: openrouter,
			actModeApiProvider: openrouter,
			openRouterApiKey: apiKey,
		}
		this.stateManager.setApiConfiguration(updatedConfig)

		await this.postStateToWebview()
		if (this.task) {
			this.task.api = ApiService.createHandler({ ...updatedConfig, ulid: this.task.ulid }, currentMode)
		}
	}

	/**
	 * Read OpenRouter models from disk cache
	 */
	async readOpenRouterModels(): Promise<Record<string, import("@shared/proto/cline/models").OpenRouterModelInfo> | undefined> {
		const openRouterModelsFilePath = path.join(await ensureCacheDirectoryExists(), GlobalFileNames.openRouterModels)
		try {
			if (await fileExistsAtPath(openRouterModelsFilePath)) {
				const fileContents = await fs.readFile(openRouterModelsFilePath, "utf8")
				const models = JSON.parse(fileContents)
				return appendClineStealthModels(models)
			}
		} catch (error) {
			Logger.error("Error reading cached OpenRouter models", error instanceof Error ? error : new Error(String(error)))
		}
		return undefined
	}

	/**
	 * Read Vercel AI Gateway models from disk cache
	 */
	async readVercelAiGatewayModels(): Promise<Record<string, ModelInfo> | undefined> {
		const vercelAiGatewayModelsFilePath = path.join(await ensureCacheDirectoryExists(), GlobalFileNames.vercelAiGatewayModels)
		const fileExists = await fileExistsAtPath(vercelAiGatewayModelsFilePath)
		if (fileExists) {
			const fileContents = await fs.readFile(vercelAiGatewayModelsFilePath, "utf8")
			return JSON.parse(fileContents)
		}
		return undefined
	}

	/**
	 * Get task with ID from history
	 */
	async getTaskWithId(id: string): Promise<{
		historyItem: HistoryItem
		taskDirPath: string
		apiConversationHistoryFilePath: string
		uiMessagesFilePath: string
		contextHistoryFilePath: string
		taskMetadataFilePath: string
		apiConversationHistory: Anthropic.MessageParam[]
	}> {
		const history = this.stateManager.getGlobalStateKey("taskHistory")
		const historyItem = history.find((item) => item.id === id)
		if (historyItem) {
			const taskDirPath = path.join(HostProvider.get().globalStorageFsPath, "tasks", id)
			const apiConversationHistoryFilePath = path.join(taskDirPath, GlobalFileNames.apiConversationHistory)
			const uiMessagesFilePath = path.join(taskDirPath, GlobalFileNames.uiMessages)
			const contextHistoryFilePath = path.join(taskDirPath, GlobalFileNames.contextHistory)
			const taskMetadataFilePath = path.join(taskDirPath, GlobalFileNames.taskMetadata)
			const fileExists = await fileExistsAtPath(apiConversationHistoryFilePath)
			if (fileExists) {
				const apiConversationHistory = JSON.parse(await fs.readFile(apiConversationHistoryFilePath, "utf8"))
				return {
					historyItem,
					taskDirPath,
					apiConversationHistoryFilePath,
					uiMessagesFilePath,
					contextHistoryFilePath,
					taskMetadataFilePath,
					apiConversationHistory,
				}
			}
		}
		// If task doesn't exist, remove it from state
		await this.deleteTaskFromState(id)
		throw new Error("Task not found")
	}

	/**
	 * Export task as markdown
	 */
	async exportTaskWithId(id: string): Promise<void> {
		const { historyItem, apiConversationHistory } = await this.getTaskWithId(id)
		await downloadTask(historyItem.ts, apiConversationHistory)
	}

	/**
	 * Delete task from state
	 */
	async deleteTaskFromState(id: string): Promise<HistoryItem[]> {
		const taskHistory = this.stateManager.getGlobalStateKey("taskHistory")
		const updatedTaskHistory = taskHistory.filter((task) => task.id !== id)
		this.stateManager.setGlobalState("taskHistory", updatedTaskHistory)

		await this.postStateToWebview()

		return updatedTaskHistory
	}

	/**
	 * Post current state to webview
	 */
	async postStateToWebview(): Promise<void> {
		const state = await this.getStateToPostToWebview()
		await sendStateUpdate(state)
	}

	/**
	 * Get current extension state for webview
	 */
	async getStateToPostToWebview(): Promise<ExtensionState> {
		const apiConfiguration = this.stateManager.getApiConfiguration()
		const lastShownAnnouncementId = this.stateManager.getGlobalStateKey("lastShownAnnouncementId")
		const taskHistory = this.stateManager.getGlobalStateKey("taskHistory")
		const autoApprovalSettings = this.stateManager.getGlobalSettingsKey("autoApprovalSettings")
		const browserSettings = this.stateManager.getGlobalSettingsKey("browserSettings")
		const focusChainSettings = this.stateManager.getGlobalSettingsKey("focusChainSettings")
		const dictationSettings = this.stateManager.getGlobalSettingsKey("dictationSettings")
		const preferredLanguage = this.stateManager.getGlobalSettingsKey("preferredLanguage")
		const openaiReasoningEffort = this.stateManager.getGlobalSettingsKey("openaiReasoningEffort")
		const mode = this.stateManager.getGlobalSettingsKey("mode")
		const strictPlanModeEnabled = this.stateManager.getGlobalSettingsKey("strictPlanModeEnabled")
		const yoloModeToggled = this.stateManager.getGlobalSettingsKey("yoloModeToggled")
		const useAutoCondense = this.stateManager.getGlobalSettingsKey("useAutoCondense")
		const userInfo = this.stateManager.getGlobalStateKey("userInfo")
		const mcpMarketplaceEnabled = this.stateManager.getGlobalStateKey("mcpMarketplaceEnabled")
		const mcpDisplayMode = this.stateManager.getGlobalStateKey("mcpDisplayMode")
		const planActSeparateModelsSetting = this.stateManager.getGlobalSettingsKey("planActSeparateModelsSetting")
		const enableCheckpointsSetting = this.stateManager.getGlobalSettingsKey("enableCheckpointsSetting")
		const globalClineRulesToggles = this.stateManager.getGlobalSettingsKey("globalClineRulesToggles")
		const globalWorkflowToggles = this.stateManager.getGlobalSettingsKey("globalWorkflowToggles")
		const shellIntegrationTimeout = this.stateManager.getGlobalSettingsKey("shellIntegrationTimeout")
		const terminalReuseEnabled = this.stateManager.getGlobalStateKey("terminalReuseEnabled")
		const defaultTerminalProfile = this.stateManager.getGlobalSettingsKey("defaultTerminalProfile")
		const isNewUser = this.stateManager.getGlobalStateKey("isNewUser")
		const customPrompt = this.stateManager.getGlobalSettingsKey("customPrompt")
		const mcpResponsesCollapsed = this.stateManager.getGlobalStateKey("mcpResponsesCollapsed")
		const terminalOutputLineLimit = this.stateManager.getGlobalSettingsKey("terminalOutputLineLimit")
		const favoritedModelIds = this.stateManager.getGlobalStateKey("favoritedModelIds")
		const lastDismissedInfoBannerVersion = this.stateManager.getGlobalStateKey("lastDismissedInfoBannerVersion") || 0
		const lastDismissedModelBannerVersion = this.stateManager.getGlobalStateKey("lastDismissedModelBannerVersion") || 0

		const localClineRulesToggles = this.stateManager.getWorkspaceStateKey("localClineRulesToggles")
		const localWindsurfRulesToggles = this.stateManager.getWorkspaceStateKey("localWindsurfRulesToggles")
		const localCursorRulesToggles = this.stateManager.getWorkspaceStateKey("localCursorRulesToggles")
		const workflowToggles = this.stateManager.getWorkspaceStateKey("workflowToggles")
		const autoCondenseThreshold = this.stateManager.getGlobalSettingsKey("autoCondenseThreshold")

		const currentTaskItem = this.task?.taskId ? (taskHistory || []).find((item) => item.id === this.task?.taskId) : undefined
		const clineMessages = this.task?.messageStateHandler.getClineMessages() || []
		const checkpointManagerErrorMessage = this.task?.taskState.checkpointManagerErrorMessage

		const processedTaskHistory = (taskHistory || [])
			.filter((item) => item.ts && item.task)
			.sort((a, b) => b.ts - a.ts)
			.slice(0, 100)

		const latestAnnouncementId = getLatestAnnouncementId()
		const shouldShowAnnouncement = lastShownAnnouncementId !== latestAnnouncementId
		const platform = process.platform as Platform
		const distinctId = getDistinctId()
		const version = ExtensionRegistryInfo.version

		// Set feature flag in dictation settings based on platform
		const updatedDictationSettings = {
			...dictationSettings,
			featureEnabled: process.platform === "darwin",
		}

		return {
			version,
			apiConfiguration,
			currentTaskItem,
			clineMessages,
			currentFocusChainChecklist: this.task?.taskState.currentFocusChainChecklist || null,
			checkpointManagerErrorMessage,
			autoApprovalSettings,
			browserSettings,
			focusChainSettings,
			dictationSettings: updatedDictationSettings,
			preferredLanguage,
			openaiReasoningEffort,
			mode,
			strictPlanModeEnabled,
			yoloModeToggled,
			useAutoCondense,
			userInfo,
			mcpMarketplaceEnabled,
			mcpDisplayMode,
			planActSeparateModelsSetting,
			enableCheckpointsSetting: enableCheckpointsSetting ?? true,
			distinctId,
			globalClineRulesToggles: globalClineRulesToggles || {},
			localClineRulesToggles: localClineRulesToggles || {},
			localWindsurfRulesToggles: localWindsurfRulesToggles || {},
			localCursorRulesToggles: localCursorRulesToggles || {},
			localWorkflowToggles: workflowToggles || {},
			globalWorkflowToggles: globalWorkflowToggles || {},
			shellIntegrationTimeout,
			terminalReuseEnabled,
			defaultTerminalProfile,
			isNewUser,
			mcpResponsesCollapsed,
			terminalOutputLineLimit,
			customPrompt,
			taskHistory: processedTaskHistory,
			platform,
			shouldShowAnnouncement,
			favoritedModelIds,
			autoCondenseThreshold,
			workspaceRoots: this.workspaceCoordinator.getWorkspaceManager()?.getRoots() ?? [],
			primaryRootIndex: this.workspaceCoordinator.getWorkspaceManager()?.getPrimaryIndex() ?? 0,
			isMultiRootWorkspace: (this.workspaceCoordinator.getWorkspaceManager()?.getRoots().length ?? 0) > 1,
			multiRootSetting: {
				user: this.stateManager.getGlobalStateKey("multiRootEnabled"),
				featureFlag: featureFlagsService.getMultiRootEnabled(),
			},
			lastDismissedInfoBannerVersion,
			lastDismissedModelBannerVersion,
		}
	}

	/**
	 * Clear current task
	 */
	async clearTask(): Promise<void> {
		await this.taskCoordinator.clearCurrentTask()
	}

	/**
	 * Update task history with item
	 */
	async updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]> {
		return await this.stateCoordinator.updateTaskHistory(item)
	}

	/**
	 * Handle persistence error via state coordinator
	 */
	async handlePersistenceError(error: unknown): Promise<void> {
		await this.stateCoordinator.handlePersistenceError(error)
	}

	/**
	 * Subscribe to a controller event
	 */
	on<T extends ControllerEventType>(event: T, listener: EventListener<T>): EventUnsubscribe {
		return this.eventEmitter.on(event, listener)
	}

	/**
	 * Subscribe to a controller event (one-time)
	 */
	once<T extends ControllerEventType>(event: T, listener: EventListener<T>): EventUnsubscribe {
		return this.eventEmitter.once(event, listener)
	}

	/**
	 * Unsubscribe from a controller event
	 */
	off<T extends ControllerEventType>(event: T, listener: EventListener<T>): void {
		this.eventEmitter.off(event, listener)
	}
}
