import { ApiHandler, ProviderInfo } from "@core/api"
import { ApiStream } from "@core/api/transform/stream"
import { ContextManager } from "@core/context/context-management/context_manager"
import { FileContextTracker } from "@core/context/context-tracking"
import { ModelContextTracker } from "@core/context/context-tracking/ModelContextTracker"
import { sendPartialMessageEvent } from "@core/controller/ui/subscribeToPartialMessage"
import { ClineIgnoreController } from "@core/ignore/ClineIgnoreController"
import { formatResponse } from "@core/prompts/response_formatters"
import { WorkspaceRootManager } from "@core/workspace/WorkspaceRootManager"
import { ICheckpointManager } from "@integrations/checkpoints/types"
import { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import { TerminalManager } from "@integrations/terminal/TerminalManager"
import { BrowserSession } from "@services/browser/BrowserSession"
import { McpHub } from "@services/mcp/McpHub"
import { ClineAsk, ClineSay } from "@shared/ExtensionMessage"
import { HistoryItem } from "@shared/HistoryItem"
import { convertClineMessageToProto } from "@shared/proto-conversions/cline-message"
import { ClineDefaultTool } from "@shared/tools"
import { ClineAskResponse } from "@shared/WebviewMessage"
import pWaitFor from "p-wait-for"
import { ulid } from "ulid"
import { Controller } from "../controller"
import { StateManager } from "../storage/StateManager"
// Coordinators
import { EventCoordinator } from "./coordinators/event_coordinator"
import { ResourceCoordinator } from "./coordinators/resource_coordinator"
import { StateCoordinator } from "./coordinators/state_coordinator"
import { ToolCoordinator } from "./coordinators/tool_coordinator"
import { FocusChainManager } from "./focus-chain"
// Initialization
import { TaskInitializer } from "./initialization/task_initializer"
import { MessageStateHandler } from "./message-state"
import { TaskApiService } from "./services/task_api_service"
import { TaskCommandService } from "./services/task_command_service"
import { TaskContextBuilder } from "./services/task_context_builder"
import { TaskLifecycleService } from "./services/task_lifecycle_service"
import { TaskMessageService } from "./services/task_message_service"
import { TaskState } from "./TaskState"
import { ToolExecutor } from "./ToolExecutor"
// Types
import type { TaskParams, ToolResponse, UserContent } from "./types/task_types"

// Re-export types for backward compatibility
export type { ToolResponse, UserContent, TaskParams }

/**
 * Task orchestrator - coordinates task execution and manages lifecycle
 * Refactored to use facade pattern with specialized coordinators
 *
 * Architecture:
 * - Core state and dependencies
 * - Coordinators for cross-cutting concerns (events, tools, state, resources)
 * - Services for specific responsibilities (API, lifecycle, messages, etc.)
 * - Public API methods delegate to appropriate coordinators/services
 */
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

	// Service handlers (initialized asynchronously)
	api!: ApiHandler
	terminalManager!: TerminalManager
	private urlContentFetcher!: any
	browserSession!: BrowserSession
	contextManager!: ContextManager
	private diffViewProvider!: DiffViewProvider
	public checkpointManager?: ICheckpointManager
	private clineIgnoreController!: ClineIgnoreController
	private toolExecutor!: ToolExecutor

	// Metadata tracking (initialized asynchronously)
	private fileContextTracker!: FileContextTracker
	private modelContextTracker!: ModelContextTracker

	// Focus Chain
	private focusChainManager?: FocusChainManager

	// Callbacks
	private updateTaskHistory: (historyItem: HistoryItem) => Promise<HistoryItem[]>
	private postStateToWebview: () => Promise<void>
	// Callback provided by controller for task re-initialization (currently unused but available for future use)
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: Reserved for future functionality
	private reinitExistingTaskFromId: (taskId: string) => Promise<void>
	// Callback provided by controller for task cancellation (delegated to services)
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used by services, not directly by facade
	private cancelTask: () => Promise<void>

	// Cache service
	private stateManager: StateManager

	// Message and conversation state (initialized asynchronously)
	messageStateHandler!: MessageStateHandler

	// Services (initialized asynchronously)
	private messageService!: TaskMessageService
	private contextBuilder!: TaskContextBuilder
	private apiService!: TaskApiService
	private lifecycleService!: TaskLifecycleService
	private commandService!: TaskCommandService

	// Coordinators (initialized asynchronously)
	private eventCoordinator!: EventCoordinator
	// Tool and state coordinators reserved for future direct coordination needs
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: Architecture component for future coordination
	private toolCoordinator!: ToolCoordinator
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: Architecture component for future coordination
	private stateCoordinator!: StateCoordinator
	private resourceCoordinator!: ResourceCoordinator

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
			stateManager,
			workspaceManager,
			task,
			images,
			files,
			historyItem,
			taskId,
		} = params

		// Basic initialization
		this.taskInitializationStartTime = performance.now()
		this.taskState = new TaskState()
		this.controller = controller
		this.mcpHub = mcpHub
		this.updateTaskHistory = updateTaskHistory
		this.postStateToWebview = postStateToWebview
		this.reinitExistingTaskFromId = reinitExistingTaskFromId
		this.cancelTask = cancelTask
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

		// Initialize all components using TaskInitializer
		this.initializeComponents(params)
	}

	/**
	 * Initialize all task components using TaskInitializer
	 * Delegates complex initialization to specialized initializer
	 */
	private initializeComponents(params: TaskParams): void {
		// Use synchronous initialization approach - components are initialized immediately
		// The TaskInitializer returns all initialized components
		TaskInitializer.initialize(
			params,
			this.taskState,
			this.taskId,
			this.ulid,
			this.taskIsFavorited,
			this.say.bind(this),
			this.ask.bind(this),
			this.saveCheckpointCallback.bind(this),
			this.sayAndCreateMissingParamError.bind(this),
			this.removeLastPartialMessageIfExistsWithType.bind(this),
			this.executeCommandTool.bind(this),
			this.switchToActModeCallback.bind(this),
		).then((components) => {
			// Assign all initialized components
			this.api = components.api
			this.terminalManager = components.terminalManager
			this.browserSession = components.browserSession
			this.urlContentFetcher = components.urlContentFetcher
			this.contextManager = components.contextManager
			this.diffViewProvider = components.diffViewProvider
			this.clineIgnoreController = components.clineIgnoreController
			this.toolExecutor = components.toolExecutor
			this.fileContextTracker = components.fileContextTracker
			this.modelContextTracker = components.modelContextTracker
			this.focusChainManager = components.focusChainManager
			this.checkpointManager = components.checkpointManager
			this.messageService = components.messageService
			this.contextBuilder = components.contextBuilder
			this.messageStateHandler = components.messageStateHandler

			// Initialize API service with bound callbacks
			this.apiService = new TaskApiService(
				components.api,
				this.taskState,
				components.messageService,
				components.contextBuilder,
				components.messageStateHandler,
				components.contextManager,
				components.diffViewProvider,
				components.toolExecutor,
				this.stateManager,
				params.cwd,
				this.taskId,
				this.ulid,
				this.controller,
				components.modelContextTracker,
				this.mcpHub,
				components.clineIgnoreController,
				this.workspaceManager,
				components.checkpointManager,
				this.postStateToWebview,
				this.migrateDisableBrowserToolSetting.bind(this),
				this.getCurrentProviderInfo.bind(this),
				this.getApiRequestIdSafe.bind(this),
				this.taskInitializationStartTime,
			)

			// Initialize lifecycle service with bound callback
			this.lifecycleService = new TaskLifecycleService({
				clineIgnoreController: components.clineIgnoreController,
				messageStateHandler: components.messageStateHandler,
				postStateToWebview: this.postStateToWebview,
				say: this.say.bind(this),
				ask: this.ask.bind(this),
				checkpointManager: components.checkpointManager,
				cwd: params.cwd,
				taskState: this.taskState,
				taskId: this.taskId,
				fileContextTracker: components.fileContextTracker,
				contextManager: components.contextManager,
				stateManager: this.stateManager,
				terminalManager: components.terminalManager,
				urlContentFetcher: components.urlContentFetcher,
				browserSession: components.browserSession,
				diffViewProvider: components.diffViewProvider,
				mcpHub: this.mcpHub,
				focusChainManager: components.focusChainManager,
				recursivelyMakeClineRequests: this.recursivelyMakeClineRequests.bind(this),
			})

			this.commandService = components.commandService

			// Initialize coordinators
			this.eventCoordinator = new EventCoordinator()
			this.toolCoordinator = new ToolCoordinator(components.toolExecutor)
			this.stateCoordinator = new StateCoordinator(
				this.taskState,
				this.stateManager,
				this.updateTaskHistory,
				this.postStateToWebview,
			)
			this.resourceCoordinator = new ResourceCoordinator(
				components.browserSession,
				components.terminalManager,
				components.checkpointManager,
			)

			// Initialize event coordinator
			this.eventCoordinator.initialize()

			// Start or resume task after all services are initialized
			if (params.historyItem) {
				this.lifecycleService.resumeTaskFromHistory()
			} else if (params.task || params.images || params.files) {
				this.lifecycleService.startTask(params.task, params.images, params.files)
			}
		})
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
			`Cline tried to use ${toolName}${relPath ? ` for '${relPath.toPosix()}'` : ""} without value for required parameter '${paramName}'. Retrying...`,
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
		const result = await this.lifecycleService.abortTask()
		// Clean up resources via coordinator
		await this.resourceCoordinator.cleanup()
		await this.eventCoordinator.dispose()
		return result
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
		// This migration only works in VSCode environment, skip in CLI mode
		try {
			// Dynamically import vscode only if available
			const vscodeModule = await import("vscode").catch(() => null)
			if (!vscodeModule) {
				return
			}

			const config = vscodeModule.workspace.getConfiguration("cline")
			const disableBrowserTool = config.get<boolean>("disableBrowserTool")

			if (disableBrowserTool !== undefined) {
				const browserSettings = this.stateManager.getGlobalSettingsKey("browserSettings")
				browserSettings.disableToolUse = disableBrowserTool
				// Remove from VSCode configuration
				await config.update("disableBrowserTool", undefined, true)
			}
		} catch (_error) {
			// Silently ignore in CLI mode or if vscode is not available
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
