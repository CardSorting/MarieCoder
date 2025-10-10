import { Anthropic } from "@anthropic-ai/sdk"
import { ApiHandler, ApiService, ProviderInfo } from "@core/api"
import { ApiStream } from "@core/api/transform/stream"
import { ContextManager } from "@core/context/context-management/context_manager"
import { FileContextTracker } from "@core/context/context-tracking"
import { ModelContextTracker } from "@core/context/context-tracking/ModelContextTracker"
import { sendPartialMessageEvent } from "@core/controller/ui/subscribeToPartialMessage"
import { ClineIgnoreController } from "@core/ignore/ClineIgnoreController"
import { formatResponse } from "@core/prompts/response_formatters"
import { isMultiRootEnabled } from "@core/workspace/multi-root-utils"
import { WorkspaceRootManager } from "@core/workspace/WorkspaceRootManager"
import { buildCheckpointManager } from "@integrations/checkpoints/factory"
import { ICheckpointManager } from "@integrations/checkpoints/types"
import { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import { TerminalManager } from "@integrations/terminal/TerminalManager"
import { BrowserSession } from "@services/browser/BrowserSession"
import { UrlContentFetcher } from "@services/browser/UrlContentFetcher"
import { Logger } from "@services/logging/Logger"
import { McpHub } from "@services/mcp/McpHub"
import { ApiConfiguration } from "@shared/api"
import { findLastIndex } from "@shared/array"
import { ClineApiReqInfo, ClineAsk, ClineSay } from "@shared/ExtensionMessage"
import { HistoryItem } from "@shared/HistoryItem"
import { convertClineMessageToProto } from "@shared/proto-conversions/cline-message"
import { ClineDefaultTool } from "@shared/tools"
import { ClineAskResponse } from "@shared/WebviewMessage"
import pWaitFor from "p-wait-for"
import { ulid } from "ulid"
import * as vscode from "vscode"
import { HostProvider } from "@/hosts/host-provider"
import { telemetryService } from "@/services/telemetry"
import { ShowMessageType } from "@/shared/proto/index.host"
import { Controller } from "../controller"
import { StateManager } from "../storage/StateManager"
import { FocusChainManager } from "./focus-chain"
import { MessageStateHandler } from "./message-state"
import { TaskApiService } from "./services/task_api_service"
import { TaskCommandService } from "./services/task_command_service"
import { TaskContextBuilder } from "./services/task_context_builder"
import { TaskLifecycleService } from "./services/task_lifecycle_service"
import { TaskMessageService } from "./services/task_message_service"
import { TaskState } from "./TaskState"
import { ToolExecutor } from "./ToolExecutor"

export type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>
type UserContent = Array<Anthropic.ContentBlockParam>

type TaskParams = {
	controller: Controller
	mcpHub: McpHub
	updateTaskHistory: (historyItem: HistoryItem) => Promise<HistoryItem[]>
	postStateToWebview: () => Promise<void>
	reinitExistingTaskFromId: (taskId: string) => Promise<void>
	cancelTask: () => Promise<void>
	shellIntegrationTimeout: number
	terminalReuseEnabled: boolean
	terminalOutputLineLimit: number
	defaultTerminalProfile: string
	cwd: string
	stateManager: StateManager
	workspaceManager?: WorkspaceRootManager
	task?: string
	images?: string[]
	files?: string[]
	historyItem?: HistoryItem
	taskId: string
}

export class Task {
	// Core task variables
	readonly taskId: string
	readonly ulid: string
	private taskIsFavorited?: boolean
	private taskInitializationStartTime: number

	taskState: TaskState

	// Core dependencies
	private controller: Controller
	private mcpHub: McpHub

	// Service handlers
	api: ApiHandler
	terminalManager: TerminalManager
	private urlContentFetcher: UrlContentFetcher
	browserSession: BrowserSession
	contextManager: ContextManager
	private diffViewProvider: DiffViewProvider
	public checkpointManager?: ICheckpointManager
	private clineIgnoreController: ClineIgnoreController
	private toolExecutor: ToolExecutor

	// Metadata tracking
	private fileContextTracker: FileContextTracker
	private modelContextTracker: ModelContextTracker

	// Focus Chain
	private focusChainManager?: FocusChainManager

	// Callbacks
	private updateTaskHistory: (historyItem: HistoryItem) => Promise<HistoryItem[]>
	private postStateToWebview: () => Promise<void>
	// Callback provided by controller for task re-initialization (currently unused but available for future use)
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: Reserved for future functionality
	private reinitExistingTaskFromId: (taskId: string) => Promise<void>
	private cancelTask: () => Promise<void>

	// Cache service
	private stateManager: StateManager

	// Message and conversation state
	messageStateHandler: MessageStateHandler

	// Services
	private messageService: TaskMessageService
	private contextBuilder: TaskContextBuilder
	private apiService: TaskApiService
	private lifecycleService: TaskLifecycleService
	private commandService: TaskCommandService

	// Workspace manager
	workspaceManager?: WorkspaceRootManager

	constructor(params: TaskParams) {
		const {
			controller,
			mcpHub,
			updateTaskHistory,
			postStateToWebview,
			reinitExistingTaskFromId,
			cancelTask,
			shellIntegrationTimeout,
			terminalReuseEnabled,
			terminalOutputLineLimit,
			defaultTerminalProfile,
			cwd,
			stateManager,
			workspaceManager,
			task,
			images,
			files,
			historyItem,
			taskId,
		} = params

		this.taskInitializationStartTime = performance.now()
		this.taskState = new TaskState()
		this.controller = controller
		this.mcpHub = mcpHub
		this.updateTaskHistory = updateTaskHistory
		this.postStateToWebview = postStateToWebview
		this.reinitExistingTaskFromId = reinitExistingTaskFromId
		this.cancelTask = cancelTask
		this.clineIgnoreController = new ClineIgnoreController(cwd)

		// Initialize terminal manager using host provider factory pattern
		this.terminalManager = HostProvider.get().createTerminalManager()
		this.terminalManager.setShellIntegrationTimeout(shellIntegrationTimeout)
		this.terminalManager.setTerminalReuseEnabled(terminalReuseEnabled ?? true)
		this.terminalManager.setTerminalOutputLineLimit(terminalOutputLineLimit)
		this.terminalManager.setDefaultTerminalProfile(defaultTerminalProfile)

		this.urlContentFetcher = new UrlContentFetcher(controller.context)
		this.browserSession = new BrowserSession(stateManager)
		this.contextManager = new ContextManager()
		this.diffViewProvider = HostProvider.get().createDiffViewProvider()
		this.stateManager = stateManager
		this.workspaceManager = workspaceManager

		// Set up MCP notification callback for real-time notifications
		this.mcpHub.setNotificationCallback(async (serverName: string, _level: string, message: string) => {
			// Display notification in chat immediately
			await this.say("mcp_notification", `[${serverName}] ${message}`)
		})

		// Initialize ULID and task metadata
		this.taskId = taskId
		if (historyItem) {
			this.ulid = historyItem.ulid ?? ulid()
			this.taskIsFavorited = historyItem.isFavorited
			this.taskState.conversationHistoryDeletedRange = historyItem.conversationHistoryDeletedRange
			if (historyItem.checkpointManagerErrorMessage) {
				this.taskState.checkpointManagerErrorMessage = historyItem.checkpointManagerErrorMessage
			}
		} else if (task || images || files) {
			this.ulid = ulid()
		} else {
			throw new Error(
				"Task initialization failed: Either historyItem or task/images/files must be provided. " +
					"Please ensure you pass either a historyItem to resume an existing task, or task/images/files to start a new one.",
			)
		}

		this.messageStateHandler = new MessageStateHandler({
			taskId: this.taskId,
			ulid: this.ulid,
			taskState: this.taskState,
			taskIsFavorited: this.taskIsFavorited,
			updateTaskHistory: this.updateTaskHistory,
		})

		// Initialize file context tracker
		this.fileContextTracker = new FileContextTracker(controller, this.taskId)
		this.modelContextTracker = new ModelContextTracker(this.taskId)

		// Initialize focus chain manager only if enabled
		const focusChainSettings = this.stateManager.getGlobalSettingsKey("focusChainSettings")
		if (focusChainSettings.enabled) {
			this.focusChainManager = new FocusChainManager({
				taskId: this.taskId,
				taskState: this.taskState,
				mode: this.stateManager.getGlobalSettingsKey("mode"),
				stateManager: this.stateManager,
				postStateToWebview: this.postStateToWebview,
				say: this.say.bind(this),
				focusChainSettings: focusChainSettings,
			})
		}

		// Check for multiroot workspace and warn about checkpoints
		const isMultiRootWorkspace = this.workspaceManager && this.workspaceManager.getRoots().length > 1
		const checkpointsEnabled = this.stateManager.getGlobalSettingsKey("enableCheckpointsSetting")

		if (isMultiRootWorkspace && checkpointsEnabled) {
			// Set checkpoint manager error message to display warning in TaskHeader
			this.taskState.checkpointManagerErrorMessage = "Checkpoints are not currently supported in multi-root workspaces."
		}

		// Initialize checkpoint manager based on workspace configuration
		if (!isMultiRootWorkspace) {
			try {
				this.checkpointManager = buildCheckpointManager({
					taskId: this.taskId,
					messageStateHandler: this.messageStateHandler,
					fileContextTracker: this.fileContextTracker,
					diffViewProvider: this.diffViewProvider,
					taskState: this.taskState,
					workspaceManager: this.workspaceManager,
					updateTaskHistory: this.updateTaskHistory,
					say: this.say.bind(this),
					cancelTask: this.cancelTask,
					postStateToWebview: this.postStateToWebview,
					initialConversationHistoryDeletedRange: this.taskState.conversationHistoryDeletedRange,
					initialCheckpointManagerErrorMessage: this.taskState.checkpointManagerErrorMessage,
					stateManager: this.stateManager,
				})
			} catch (error) {
				Logger.error("Failed to initialize checkpoint manager", error instanceof Error ? error : new Error(String(error)))
				if (this.stateManager.getGlobalSettingsKey("enableCheckpointsSetting")) {
					const errorMessage = error instanceof Error ? error.message : "Unknown error"
					HostProvider.window.showMessage({
						type: ShowMessageType.ERROR,
						message: `Failed to initialize checkpoint manager: ${errorMessage}`,
					})
				}
			}
		}

		// Prepare effective API configuration
		const apiConfiguration = this.stateManager.getApiConfiguration()
		const effectiveApiConfiguration: ApiConfiguration = {
			...apiConfiguration,
			ulid: this.ulid,
			onRetryAttempt: async (attempt: number, maxRetries: number, delay: number, error: any) => {
				const clineMessages = this.messageStateHandler.getClineMessages()
				const lastApiReqStartedIndex = findLastIndex(clineMessages, (m) => m.say === "api_req_started")
				if (lastApiReqStartedIndex !== -1) {
					try {
						const currentApiReqInfo: ClineApiReqInfo = JSON.parse(clineMessages[lastApiReqStartedIndex].text || "{}")
						currentApiReqInfo.retryStatus = {
							attempt: attempt, // attempt is already 1-indexed from retry.ts
							maxAttempts: maxRetries, // total attempts
							delaySec: Math.round(delay / 1000),
							errorSnippet: error?.message ? `${String(error.message).substring(0, 50)}...` : undefined,
						}
						// Clear previous cancelReason and streamingFailedMessage if we are retrying
						delete currentApiReqInfo.cancelReason
						delete currentApiReqInfo.streamingFailedMessage
						await this.messageStateHandler.updateClineMessage(lastApiReqStartedIndex, {
							text: JSON.stringify(currentApiReqInfo),
						})

						// Post the updated state to the webview so the UI reflects the retry attempt
						await this.postStateToWebview().catch((e) =>
							Logger.error(
								"Error posting state to webview in onRetryAttempt",
								e instanceof Error ? e : new Error(String(e)),
							),
						)

						// Auto-retry in progress
					} catch (e) {
						Logger.error(
							`[Task ${this.taskId}] Error updating api_req_started with retryStatus`,
							e instanceof Error ? e : new Error(String(e)),
						)
					}
				}
			},
		}
		const mode = this.stateManager.getGlobalSettingsKey("mode")
		const currentProvider = mode === "plan" ? apiConfiguration.planModeApiProvider : apiConfiguration.actModeApiProvider

		// Build API handler with effective configuration
		this.api = ApiService.createHandler(effectiveApiConfiguration, mode)

		// Set ulid on browserSession for telemetry tracking
		this.browserSession.setUlid(this.ulid)

		// Set up focus chain file watcher (async, runs in background) only if focus chain is enabled
		if (this.focusChainManager) {
			this.focusChainManager.setupFocusChainFileWatcher().catch((error) => {
				Logger.error(
					`[Task ${this.taskId}] Failed to setup focus chain file watcher`,
					error instanceof Error ? error : new Error(String(error)),
				)
			})
		}

		// initialize telemetry
		if (historyItem) {
			// Open task from history
			telemetryService.captureTaskRestarted(this.ulid, currentProvider || "anthropic")
		} else {
			// New task started
			telemetryService.captureTaskCreated(this.ulid, currentProvider || "anthropic")
		}

		// Initialize services
		this.messageService = new TaskMessageService(this.taskState, this.messageStateHandler, postStateToWebview)
		this.contextBuilder = new TaskContextBuilder(
			cwd,
			this.stateManager,
			this.controller,
			this.api,
			this.terminalManager,
			this.urlContentFetcher,
			this.fileContextTracker,
			this.clineIgnoreController,
			this.messageStateHandler,
			this.workspaceManager,
			this.focusChainManager,
			this.taskState,
			this.ulid,
		)

		this.toolExecutor = new ToolExecutor(
			this.controller.context,
			this.taskState,
			this.messageStateHandler,
			this.api,
			this.urlContentFetcher,
			this.browserSession,
			this.diffViewProvider,
			this.mcpHub,
			this.fileContextTracker,
			this.clineIgnoreController,
			this.contextManager,
			this.stateManager,
			cwd,
			this.taskId,
			this.ulid,
			this.workspaceManager,
			isMultiRootEnabled(this.stateManager),
			this.say.bind(this),
			this.ask.bind(this),
			this.saveCheckpointCallback.bind(this),
			this.sayAndCreateMissingParamError.bind(this),
			this.removeLastPartialMessageIfExistsWithType.bind(this),
			this.executeCommandTool.bind(this),
			() => this.checkpointManager?.doesLatestTaskCompletionHaveNewChanges() ?? Promise.resolve(false),
			this.focusChainManager?.updateFCListFromToolResponse.bind(this.focusChainManager) || (async () => {}),
			this.switchToActModeCallback.bind(this),
		)

		// Initialize API service after toolExecutor
		this.apiService = new TaskApiService(
			this.api,
			this.taskState,
			this.messageService,
			this.contextBuilder,
			this.messageStateHandler,
			this.contextManager,
			this.diffViewProvider,
			this.toolExecutor,
			this.stateManager,
			cwd,
			taskId,
			this.ulid,
			this.controller,
			this.modelContextTracker,
			this.mcpHub,
			this.clineIgnoreController,
			this.workspaceManager,
			this.checkpointManager,
			postStateToWebview,
			this.migrateDisableBrowserToolSetting.bind(this),
			this.getCurrentProviderInfo.bind(this),
			this.getApiRequestIdSafe.bind(this),
			this.taskInitializationStartTime,
		)

		// Initialize lifecycle service
		this.lifecycleService = new TaskLifecycleService({
			clineIgnoreController: this.clineIgnoreController,
			messageStateHandler: this.messageStateHandler,
			postStateToWebview: postStateToWebview,
			say: this.say.bind(this),
			ask: this.ask.bind(this),
			checkpointManager: this.checkpointManager,
			cwd: cwd,
			taskState: this.taskState,
			taskId: taskId,
			fileContextTracker: this.fileContextTracker,
			contextManager: this.contextManager,
			stateManager: this.stateManager,
			terminalManager: this.terminalManager,
			urlContentFetcher: this.urlContentFetcher,
			browserSession: this.browserSession,
			diffViewProvider: this.diffViewProvider,
			mcpHub: this.mcpHub,
			focusChainManager: this.focusChainManager,
			recursivelyMakeClineRequests: this.recursivelyMakeClineRequests.bind(this),
		})

		// Initialize command service
		this.commandService = new TaskCommandService({
			cwd: cwd,
			terminalManager: this.terminalManager,
			ask: this.ask.bind(this),
			say: this.say.bind(this),
		})

		// Start or resume task after all services are initialized
		if (historyItem) {
			this.lifecycleService.resumeTaskFromHistory()
		} else if (task || images || files) {
			this.lifecycleService.startTask(task, images, files)
		}
	}

	public resetConsecutiveAutoApprovedRequestsCount(): void {
		this.taskState.consecutiveAutoApprovedRequestsCount = 0
	}

	// Communicate with webview

	// partial has three valid states true (partial message), false (completion of partial message), undefined (individual complete message)
	async ask(
		type: ClineAsk,
		text?: string,
		partial?: boolean,
	): Promise<{
		response: ClineAskResponse
		text?: string
		images?: string[]
		files?: string[]
		askTs?: number
	}> {
		// Check if task was aborted - if so, stop execution to prevent sending results to webview
		// This prevents background promises from interfering with the new task instance
		if (this.taskState.abort) {
			throw new Error("Task execution aborted - instance is no longer active")
		}
		let askTs: number
		if (partial !== undefined) {
			const clineMessages = this.messageStateHandler.getClineMessages()
			const lastMessage = clineMessages.at(-1)
			const lastMessageIndex = clineMessages.length - 1

			const isUpdatingPreviousPartial =
				lastMessage && lastMessage.partial && lastMessage.type === "ask" && lastMessage.ask === type
			if (partial) {
				if (isUpdatingPreviousPartial) {
					// Existing partial message - update it and send only the changed message
					// instead of posting entire state to webview for better performance
					await this.messageStateHandler.updateClineMessage(lastMessageIndex, {
						text,
						partial,
					})
					const protoMessage = convertClineMessageToProto(lastMessage)
					await sendPartialMessageEvent(protoMessage)
					// Partial message update completed - abort this promise as it's not waiting for a response
					throw new Error("Ask promise superseded by partial message update")
				} else {
					// New partial message - add it with partial state and post full update
					askTs = Date.now()
					this.taskState.lastMessageTs = askTs
					await this.messageStateHandler.addToClineMessages({
						ts: askTs,
						type: "ask",
						ask: type,
						text,
						partial,
					})
					await this.postStateToWebview()
					// New partial message initiated - abort this promise as it will be handled separately
					throw new Error("Ask promise superseded by new partial message")
				}
			} else {
				// partial=false indicates completion of a previously partial message
				if (isUpdatingPreviousPartial) {
					// Complete version of previously partial message - finalize it and send update
					this.taskState.askResponse = undefined
					this.taskState.askResponseText = undefined
					this.taskState.askResponseImages = undefined
					this.taskState.askResponseFiles = undefined

					// Preserve original timestamp to maintain stable React key for list rendering
					// Changing the timestamp would cause flickering due to component remounting
					askTs = lastMessage.ts
					this.taskState.lastMessageTs = askTs
					await this.messageStateHandler.updateClineMessage(lastMessageIndex, {
						text,
						partial: false,
					})
					const protoMessage = convertClineMessageToProto(lastMessage)
					await sendPartialMessageEvent(protoMessage)
				} else {
					// New partial=false message - add as complete message
					this.taskState.askResponse = undefined
					this.taskState.askResponseText = undefined
					this.taskState.askResponseImages = undefined
					this.taskState.askResponseFiles = undefined
					askTs = Date.now()
					this.taskState.lastMessageTs = askTs
					await this.messageStateHandler.addToClineMessages({
						ts: askTs,
						type: "ask",
						ask: type,
						text,
					})
					await this.postStateToWebview()
				}
			}
		} else {
			// New non-partial message - add it as a complete message
			this.taskState.askResponse = undefined
			this.taskState.askResponseText = undefined
			this.taskState.askResponseImages = undefined
			this.taskState.askResponseFiles = undefined
			askTs = Date.now()
			this.taskState.lastMessageTs = askTs
			await this.messageStateHandler.addToClineMessages({
				ts: askTs,
				type: "ask",
				ask: type,
				text,
			})
			await this.postStateToWebview()
		}

		await pWaitFor(() => this.taskState.askResponse !== undefined || this.taskState.lastMessageTs !== askTs, {
			interval: 100,
		})
		if (this.taskState.lastMessageTs !== askTs) {
			// This occurs when multiple asks are sent in rapid succession (e.g., command_output)
			// The newer ask supersedes this one, so we gracefully abort this promise
			throw new Error("Ask request superseded by newer message")
		}
		const result = {
			response: this.taskState.askResponse!,
			text: this.taskState.askResponseText,
			images: this.taskState.askResponseImages,
			files: this.taskState.askResponseFiles,
		}
		this.taskState.askResponse = undefined
		this.taskState.askResponseText = undefined
		this.taskState.askResponseImages = undefined
		this.taskState.askResponseFiles = undefined
		return result
	}

	async handleWebviewAskResponse(askResponse: ClineAskResponse, text?: string, images?: string[], files?: string[]) {
		this.taskState.askResponse = askResponse
		this.taskState.askResponseText = text
		this.taskState.askResponseImages = images
		this.taskState.askResponseFiles = files
	}

	async say(
		type: ClineSay,
		text?: string,
		images?: string[],
		files?: string[],
		partial?: boolean,
	): Promise<number | undefined> {
		if (this.taskState.abort) {
			throw new Error("Task execution aborted - instance is no longer active")
		}

		if (partial !== undefined) {
			const lastMessage = this.messageStateHandler.getClineMessages().at(-1)
			const isUpdatingPreviousPartial =
				lastMessage && lastMessage.partial && lastMessage.type === "say" && lastMessage.say === type
			if (partial) {
				if (isUpdatingPreviousPartial) {
					// Existing partial message - update it and send only the changed message
					lastMessage.text = text
					lastMessage.images = images
					lastMessage.files = files
					lastMessage.partial = partial
					const protoMessage = convertClineMessageToProto(lastMessage)
					await sendPartialMessageEvent(protoMessage)
					return undefined
				} else {
					// New partial message - add it with partial state
					const sayTs = Date.now()
					this.taskState.lastMessageTs = sayTs
					await this.messageStateHandler.addToClineMessages({
						ts: sayTs,
						type: "say",
						say: type,
						text,
						images,
						files,
						partial,
					})
					await this.postStateToWebview()
					return sayTs
				}
			} else {
				// partial=false indicates completion of a previously partial message
				if (isUpdatingPreviousPartial) {
					// Complete version of previously partial message - finalize and persist
					this.taskState.lastMessageTs = lastMessage.ts
					lastMessage.text = text
					lastMessage.images = images
					lastMessage.files = files
					lastMessage.partial = false

					// Save to disk and send targeted update (more performant than full postStateToWebview)
					await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
					const protoMessage = convertClineMessageToProto(lastMessage)
					await sendPartialMessageEvent(protoMessage)
					return undefined
				} else {
					// New partial=false message - add as complete message
					const sayTs = Date.now()
					this.taskState.lastMessageTs = sayTs
					await this.messageStateHandler.addToClineMessages({
						ts: sayTs,
						type: "say",
						say: type,
						text,
						images,
						files,
					})
					await this.postStateToWebview()
					return sayTs
				}
			}
		} else {
			// New non-partial message - add as complete message
			const sayTs = Date.now()
			this.taskState.lastMessageTs = sayTs
			await this.messageStateHandler.addToClineMessages({
				ts: sayTs,
				type: "say",
				say: type,
				text,
				images,
				files,
			})
			await this.postStateToWebview()
			return sayTs
		}
	}

	async sayAndCreateMissingParamError(toolName: ClineDefaultTool, paramName: string, relPath?: string) {
		await this.say(
			"error",
			`Cline tried to use ${toolName}${
				relPath ? ` for '${relPath.toPosix()}'` : ""
			} without value for required parameter '${paramName}'. Retrying...`,
		)
		return formatResponse.toolError(formatResponse.missingToolParameterError(paramName))
	}

	async removeLastPartialMessageIfExistsWithType(type: "ask" | "say", askOrSay: ClineAsk | ClineSay) {
		const clineMessages = this.messageStateHandler.getClineMessages()
		const lastMessage = clineMessages.at(-1)
		if (lastMessage?.partial && lastMessage.type === type && (lastMessage.ask === askOrSay || lastMessage.say === askOrSay)) {
			this.messageStateHandler.setClineMessages(clineMessages.slice(0, -1))
			await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
		}
	}

	private async saveCheckpointCallback(isAttemptCompletionMessage?: boolean, completionMessageTs?: number): Promise<void> {
		return this.checkpointManager?.saveCheckpoint(isAttemptCompletionMessage, completionMessageTs) ?? Promise.resolve()
	}

	private async switchToActModeCallback(): Promise<boolean> {
		return await this.controller.toggleActModeForYoloMode()
	}

	// Task lifecycle

	async abortTask() {
		// Delegate to lifecycle service
		return this.lifecycleService.abortTask()
	}

	// Tools

	async executeCommandTool(command: string, timeoutSeconds: number | undefined): Promise<[boolean, ToolResponse]> {
		// Delegate to command service
		return this.commandService.executeCommandTool(command, timeoutSeconds)
	}

	/**
	 * Migrates the disableBrowserTool setting from VSCode configuration to browserSettings
	 */
	private async migrateDisableBrowserToolSetting(): Promise<void> {
		const config = vscode.workspace.getConfiguration("cline")
		const disableBrowserTool = config.get<boolean>("disableBrowserTool")

		if (disableBrowserTool !== undefined) {
			const browserSettings = this.stateManager.getGlobalSettingsKey("browserSettings")
			browserSettings.disableToolUse = disableBrowserTool
			// Remove from VSCode configuration
			await config.update("disableBrowserTool", undefined, true)
		}
	}

	private getCurrentProviderInfo(): ProviderInfo {
		const model = this.api.getModel()
		const apiConfig = this.stateManager.getApiConfiguration()
		const mode = this.stateManager.getGlobalSettingsKey("mode")
		const providerId = (mode === "plan" ? apiConfig.planModeApiProvider : apiConfig.actModeApiProvider) as string
		const customPrompt = this.stateManager.getGlobalSettingsKey("customPrompt")
		const capabilities = this.api.getCapabilities()
		const metadata = this.api.getProviderMetadata()

		return {
			model,
			providerId,
			customPrompt,
			capabilities,
			status: metadata.status,
			category: metadata.category,
		}
	}

	private getApiRequestIdSafe(): string | undefined {
		// Safely access API request ID from either method or property
		const apiHandler = this.api as any
		if (typeof apiHandler.getLastRequestId === "function") {
			return apiHandler.getLastRequestId()
		}
		return apiHandler.lastGenerationId
	}

	async *attemptApiRequest(previousApiReqIndex: number): ApiStream {
		// Delegate to API service
		yield* this.apiService.attemptApiRequest(previousApiReqIndex)
	}

	async presentAssistantMessage(): Promise<void> {
		// Delegate to API service
		return this.apiService.presentAssistantMessage()
	}

	async recursivelyMakeClineRequests(userContent: UserContent, includeFileDetails: boolean = false): Promise<boolean> {
		// Delegate to API service
		return this.apiService.recursivelyMakeClineRequests(userContent, includeFileDetails)
	}
}
