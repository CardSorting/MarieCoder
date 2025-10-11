import { ApiHandler, ApiService } from "@core/api"
import { ContextManager } from "@core/context/context-management/context_manager"
import { FileContextTracker } from "@core/context/context-tracking"
import { ModelContextTracker } from "@core/context/context-tracking/ModelContextTracker"
import { ClineIgnoreController } from "@core/ignore/ClineIgnoreController"
import { isMultiRootEnabled } from "@core/workspace/multi-root-utils"
import { buildCheckpointManager } from "@integrations/checkpoints/factory"
import { ICheckpointManager } from "@integrations/checkpoints/types"
import { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import { TerminalManager } from "@integrations/terminal/TerminalManager"
import { BrowserSession } from "@services/browser/BrowserSession"
import { UrlContentFetcher } from "@services/browser/UrlContentFetcher"
import { Logger } from "@services/logging/Logger"
import { ApiConfiguration } from "@shared/api"
import { findLastIndex } from "@shared/array"
import { ClineApiReqInfo } from "@shared/ExtensionMessage"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/index.host"
import { FocusChainManager } from "../focus-chain"
import { MessageStateHandler } from "../message-state"
import { TaskApiService } from "../services/task_api_service"
import { TaskCommandService } from "../services/task_command_service"
import { TaskContextBuilder } from "../services/task_context_builder"
import { TaskLifecycleService } from "../services/task_lifecycle_service"
import { TaskMessageService } from "../services/task_message_service"
import { TaskState } from "../TaskState"
import { ToolExecutor } from "../ToolExecutor"
import type { TaskParams } from "../types/task_types"

/**
 * Result of initialization containing all initialized components
 */
export interface TaskInitializationResult {
	// Core components
	api: ApiHandler
	terminalManager: TerminalManager
	browserSession: BrowserSession
	urlContentFetcher: UrlContentFetcher
	contextManager: ContextManager
	diffViewProvider: DiffViewProvider
	clineIgnoreController: ClineIgnoreController
	toolExecutor: ToolExecutor

	// Trackers
	fileContextTracker: FileContextTracker
	modelContextTracker: ModelContextTracker

	// Managers
	focusChainManager?: FocusChainManager
	checkpointManager?: ICheckpointManager

	// Services
	messageService: TaskMessageService
	contextBuilder: TaskContextBuilder
	apiService: TaskApiService
	lifecycleService: TaskLifecycleService
	commandService: TaskCommandService

	// State
	messageStateHandler: MessageStateHandler
}

/**
 * Handles task initialization logic
 * Extracted from Task constructor for clarity and testability
 *
 * Responsibilities:
 * - Initialize all core services and components
 * - Set up trackers and managers
 * - Configure API handler with proper callbacks
 * - Build service dependencies
 */
export class TaskInitializer {
	/**
	 * Initialize all task components
	 * Returns fully initialized components ready for Task
	 *
	 * @param params - Task parameters
	 * @param taskState - Task state instance
	 * @param taskId - Task ID
	 * @param ulid - Task ULID
	 * @param taskIsFavorited - Whether task is favorited
	 * @param say - Say callback function
	 * @param ask - Ask callback function
	 * @param saveCheckpointCallback - Checkpoint save callback
	 * @param sayAndCreateMissingParamError - Error creation callback
	 * @param removeLastPartialMessageIfExistsWithType - Message cleanup callback
	 * @param executeCommandTool - Command execution callback
	 * @param switchToActModeCallback - Mode switch callback
	 * @returns Initialized components
	 */
	static async initialize(
		params: TaskParams,
		taskState: TaskState,
		taskId: string,
		ulid: string,
		taskIsFavorited: boolean | undefined,
		say: any,
		ask: any,
		saveCheckpointCallback: any,
		sayAndCreateMissingParamError: any,
		removeLastPartialMessageIfExistsWithType: any,
		executeCommandTool: any,
		switchToActModeCallback: any,
	): Promise<TaskInitializationResult> {
		const {
			controller,
			mcpHub,
			updateTaskHistory,
			postStateToWebview,
			cancelTask,
			shellIntegrationTimeout,
			terminalReuseEnabled,
			terminalOutputLineLimit,
			defaultTerminalProfile,
			cwd,
			stateManager,
			workspaceManager,
		} = params

		// Initialize core components
		const clineIgnoreController = new ClineIgnoreController(cwd)

		// Initialize terminal manager using host provider factory pattern
		const terminalManager = HostProvider.get().createTerminalManager()
		terminalManager.setShellIntegrationTimeout(shellIntegrationTimeout)
		terminalManager.setTerminalReuseEnabled(terminalReuseEnabled ?? true)
		terminalManager.setTerminalOutputLineLimit(terminalOutputLineLimit)
		terminalManager.setDefaultTerminalProfile(defaultTerminalProfile)

		// Initialize browser and content fetcher
		const urlContentFetcher = new UrlContentFetcher(controller.context)
		const browserSession = new BrowserSession(stateManager)
		browserSession.setUlid(ulid)

		// Initialize managers
		const contextManager = new ContextManager()
		const diffViewProvider = HostProvider.get().createDiffViewProvider()

		// Initialize message state handler
		const messageStateHandler = new MessageStateHandler({
			taskId,
			ulid,
			taskState,
			taskIsFavorited,
			updateTaskHistory,
		})

		// Initialize trackers
		const fileContextTracker = new FileContextTracker(controller, taskId)
		const modelContextTracker = new ModelContextTracker(taskId)

		// Initialize focus chain manager if enabled
		const focusChainSettings = stateManager.getGlobalSettingsKey("focusChainSettings")
		let focusChainManager: FocusChainManager | undefined
		if (focusChainSettings.enabled) {
			focusChainManager = new FocusChainManager({
				taskId,
				taskState,
				mode: stateManager.getGlobalSettingsKey("mode"),
				stateManager,
				postStateToWebview,
				say,
				focusChainSettings,
			})

			// Set up focus chain file watcher (async, runs in background)
			focusChainManager.setupFocusChainFileWatcher().catch((error) => {
				Logger.error(
					`[Task ${taskId}] Failed to setup focus chain file watcher`,
					error instanceof Error ? error : new Error(String(error)),
				)
			})
		}

		// Check for multiroot workspace and initialize checkpoint manager
		const isMultiRootWorkspace = workspaceManager && workspaceManager.getRoots().length > 1
		const checkpointsEnabled = stateManager.getGlobalSettingsKey("enableCheckpointsSetting")

		let checkpointManager: ICheckpointManager | undefined
		if (isMultiRootWorkspace && checkpointsEnabled) {
			// Set checkpoint manager error message to display warning in TaskHeader
			taskState.checkpointManagerErrorMessage = "Checkpoints are not currently supported in multi-root workspaces."
		} else if (!isMultiRootWorkspace) {
			try {
				checkpointManager = buildCheckpointManager({
					taskId,
					messageStateHandler,
					fileContextTracker,
					diffViewProvider,
					taskState,
					workspaceManager,
					updateTaskHistory,
					say,
					cancelTask,
					postStateToWebview,
					initialConversationHistoryDeletedRange: taskState.conversationHistoryDeletedRange,
					initialCheckpointManagerErrorMessage: taskState.checkpointManagerErrorMessage,
					stateManager,
				})
			} catch (error) {
				Logger.error("Failed to initialize checkpoint manager", error instanceof Error ? error : new Error(String(error)))
				if (checkpointsEnabled) {
					const errorMessage = error instanceof Error ? error.message : "Unknown error"
					HostProvider.window.showMessage({
						type: ShowMessageType.ERROR,
						message: `Failed to initialize checkpoint manager: ${errorMessage}`,
					})
				}
			}
		}

		// Prepare effective API configuration
		const apiConfiguration = stateManager.getApiConfiguration()
		const effectiveApiConfiguration: ApiConfiguration = {
			...apiConfiguration,
			ulid,
			onRetryAttempt: async (attempt: number, maxRetries: number, delay: number, error: any) => {
				const clineMessages = messageStateHandler.getClineMessages()
				const lastApiReqStartedIndex = findLastIndex(clineMessages, (m: any) => m.say === "api_req_started")
				if (lastApiReqStartedIndex !== -1) {
					try {
						const currentApiReqInfo: ClineApiReqInfo = JSON.parse(clineMessages[lastApiReqStartedIndex].text || "{}")
						currentApiReqInfo.retryStatus = {
							attempt,
							maxAttempts: maxRetries,
							delaySec: Math.round(delay / 1000),
							errorSnippet: error?.message ? `${String(error.message).substring(0, 50)}...` : undefined,
						}
						delete currentApiReqInfo.cancelReason
						delete currentApiReqInfo.streamingFailedMessage
						await messageStateHandler.updateClineMessage(lastApiReqStartedIndex, {
							text: JSON.stringify(currentApiReqInfo),
						})

						await postStateToWebview().catch((e) =>
							Logger.error(
								"Error posting state to webview in onRetryAttempt",
								e instanceof Error ? e : new Error(String(e)),
							),
						)
					} catch (e) {
						Logger.error(
							`[Task ${taskId}] Error updating api_req_started with retryStatus`,
							e instanceof Error ? e : new Error(String(e)),
						)
					}
				}
			},
		}

		const mode = stateManager.getGlobalSettingsKey("mode")
		const api = ApiService.createHandler(effectiveApiConfiguration, mode)

		// Initialize tool executor
		const toolExecutor = new ToolExecutor(
			controller.context,
			taskState,
			messageStateHandler,
			api,
			urlContentFetcher,
			browserSession,
			diffViewProvider,
			mcpHub,
			fileContextTracker,
			clineIgnoreController,
			contextManager,
			stateManager,
			cwd,
			taskId,
			ulid,
			workspaceManager,
			isMultiRootEnabled(stateManager),
			say,
			ask,
			saveCheckpointCallback,
			sayAndCreateMissingParamError,
			removeLastPartialMessageIfExistsWithType,
			executeCommandTool,
			() => checkpointManager?.doesLatestTaskCompletionHaveNewChanges() ?? Promise.resolve(false),
			focusChainManager?.updateFCListFromToolResponse.bind(focusChainManager) || (async () => {}),
			switchToActModeCallback,
		)

		// Initialize services
		const messageService = new TaskMessageService(taskState, messageStateHandler, postStateToWebview)

		const contextBuilder = new TaskContextBuilder(
			cwd,
			stateManager,
			controller,
			api,
			terminalManager,
			urlContentFetcher,
			fileContextTracker,
			clineIgnoreController,
			messageStateHandler,
			workspaceManager,
			focusChainManager,
			taskState,
			ulid,
		)

		const apiService = new TaskApiService(
			api,
			taskState,
			messageService,
			contextBuilder,
			messageStateHandler,
			contextManager,
			diffViewProvider,
			toolExecutor,
			stateManager,
			cwd,
			taskId,
			ulid,
			controller,
			modelContextTracker,
			mcpHub,
			clineIgnoreController,
			workspaceManager,
			checkpointManager,
			postStateToWebview,
			// These callbacks will be bound in Task class
			undefined as any, // migrateDisableBrowserToolSetting
			undefined as any, // getCurrentProviderInfo
			undefined as any, // getApiRequestIdSafe
			performance.now(), // taskInitializationStartTime
		)

		const lifecycleService = new TaskLifecycleService({
			clineIgnoreController,
			messageStateHandler,
			postStateToWebview,
			say,
			ask,
			checkpointManager,
			cwd,
			taskState,
			taskId,
			fileContextTracker,
			contextManager,
			stateManager,
			terminalManager,
			urlContentFetcher,
			browserSession,
			diffViewProvider,
			mcpHub,
			focusChainManager,
			recursivelyMakeClineRequests: undefined as any, // Will be bound in Task class
		})

		const commandService = new TaskCommandService({
			cwd,
			terminalManager,
			ask,
			say,
		})

		return {
			api,
			terminalManager,
			browserSession,
			urlContentFetcher,
			contextManager,
			diffViewProvider,
			clineIgnoreController,
			toolExecutor,
			fileContextTracker,
			modelContextTracker,
			focusChainManager,
			checkpointManager,
			messageService,
			contextBuilder,
			apiService,
			lifecycleService,
			commandService,
			messageStateHandler,
		}
	}
}
