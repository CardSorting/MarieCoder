import { Anthropic } from "@anthropic-ai/sdk"
import { ErrorService } from "@core/api/services/error-service"
import type { ApiStream } from "@core/api/transform/stream"
import { parseAssistantMessageV2 } from "@core/assistant-message"
import type { ContextManager } from "@core/context/context-management/context_manager"
import { checkContextWindowExceededError } from "@core/context/context-management/context-error-handling"
import type { ModelContextTracker } from "@core/context/context-tracking/ModelContextTracker"
import {
	getGlobalClineRules,
	getLocalClineRules,
	getLocalCursorRules,
	getLocalWindsurfRules,
	refreshAllToggles,
} from "@core/context/instructions/user-instructions/rule_loader"
import type { ClineIgnoreController } from "@core/ignore/ClineIgnoreController"
import { summarizeTask } from "@core/prompts/context_summarization"
import { formatResponse } from "@core/prompts/response_formatters"
import type { SystemPromptContext } from "@core/prompts/system-prompt"
import { getSystemPrompt } from "@core/prompts/system-prompt"
import { ensureTaskDirectoryExists } from "@core/storage/disk"
import { isMultiRootEnabled } from "@core/workspace/multi-root-utils"
import { ensureCheckpointInitialized } from "@integrations/checkpoints/initializer"
import type { ICheckpointManager } from "@integrations/checkpoints/types"
import type { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import { formatContentBlockToMarkdown } from "@integrations/misc/export-markdown"
import { processFilesIntoText } from "@integrations/misc/extract-text"
import { showSystemNotification } from "@integrations/notifications"
import { Logger } from "@services/logging/Logger"
import type { McpHub } from "@services/mcp/McpHub"
import { findLastIndex } from "@shared/array"
import type { ClineApiReqCancelReason, ClineApiReqInfo } from "@shared/ExtensionMessage"
import { DEFAULT_LANGUAGE_SETTINGS, getLanguageKey, type LanguageDisplay } from "@shared/Languages"
import { isLocalModel, isNextGenModelFamily } from "@utils/model-utils"
import pWaitFor from "p-wait-for"
import * as path from "path"
import type { ApiHandler } from "@/core/api"
import type { Controller } from "@/core/controller"
import type { StateManager } from "@/core/storage/StateManager"
import type { WorkspaceRootManager } from "@/core/workspace/WorkspaceRootManager"
import { HostProvider } from "@/hosts/host-provider"
import { telemetryService } from "@/services/telemetry"
import { ShowMessageType } from "@/shared/proto/index.host"
import type { MessageStateHandler } from "../message-state"
import type { TaskState } from "../TaskState"
import type { ToolExecutor } from "../ToolExecutor"
import { updateApiReqMsg } from "../utils"
import type { TaskContextBuilder } from "./task_context_builder"
import type { TaskMessageService } from "./task_message_service"

type UserContent = Array<Anthropic.ContentBlockParam>

/**
 * Handles all API communication with LLM providers
 *
 * This service manages the complete lifecycle of AI agent API requests, from
 * streaming responses to parsing assistant messages and handling complex error
 * scenarios. It coordinates between the AI provider, context management,
 * tool execution, and user communication.
 *
 * Responsibilities:
 * - Make API requests with retry logic
 * - Stream and parse assistant responses
 * - Handle context window management
 * - Manage mistake and auto-approval limits
 * - Coordinate checkpoints with first API request
 * - Process tool use blocks
 * - Track token usage and costs
 * - Handle stream interruptions and errors
 *
 * @example
 * ```typescript
 * const apiService = new TaskApiService(api, taskState, messageService, ...)
 * const didEndLoop = await apiService.recursivelyMakeClineRequests(userContent, true)
 * ```
 */
export class TaskApiService {
	constructor(
		private readonly api: ApiHandler,
		private readonly taskState: TaskState,
		private readonly messageService: TaskMessageService,
		private readonly contextBuilder: TaskContextBuilder,
		private readonly messageStateHandler: MessageStateHandler,
		private readonly contextManager: ContextManager,
		private readonly diffViewProvider: DiffViewProvider,
		private readonly toolExecutor: ToolExecutor,
		private readonly stateManager: StateManager,
		private readonly cwd: string,
		private readonly taskId: string,
		private readonly ulid: string,
		private readonly controller: Controller,
		private readonly modelContextTracker: ModelContextTracker,
		private readonly mcpHub: McpHub,
		private readonly clineIgnoreController: ClineIgnoreController,
		private readonly workspaceManager: WorkspaceRootManager | undefined,
		private readonly checkpointManager: ICheckpointManager | undefined,
		private readonly postStateToWebview: () => Promise<void>,
		private readonly migrateDisableBrowserToolSetting: () => Promise<void>,
		private readonly getCurrentProviderInfo: () => any,
		private readonly getApiRequestIdSafe: () => string | undefined,
		private readonly taskInitializationStartTime: number,
	) {}

	/**
	 * Get current ask method from message service
	 * @private
	 */
	private get ask() {
		return this.messageService.ask.bind(this.messageService)
	}

	/**
	 * Get current say method from message service
	 * @private
	 */
	private get say() {
		return this.messageService.say.bind(this.messageService)
	}

	/**
	 * Get current loadContext method from context builder
	 * @private
	 */
	private get loadContext() {
		return this.contextBuilder.loadContext.bind(this.contextBuilder)
	}

	/**
	 * Attempt an API request with automatic retry logic
	 *
	 * This generator function yields chunks from the API stream. It handles:
	 * - System prompt generation with all context
	 * - First-chunk failures (rate limits, context window exceeded)
	 * - Automatic retry with context truncation
	 * - Manual retry prompts for users
	 *
	 * @param previousApiReqIndex - Index of previous API request message
	 * @yields API stream chunks (usage, reasoning, text, etc.)
	 * @throws Error if task is aborted or all retries exhausted
	 */
	async *attemptApiRequest(previousApiReqIndex: number): ApiStream {
		// Wait for MCP servers to be connected before generating system prompt
		await pWaitFor(() => this.mcpHub.isConnecting !== true, {
			timeout: 10_000,
		}).catch(() => {
			Logger.error("MCP servers failed to connect in time")
		})

		const providerInfo = this.getCurrentProviderInfo()
		const ide = (await HostProvider.env.getHostVersion({})).platform || "Unknown"
		await this.migrateDisableBrowserToolSetting()
		const browserSettings = this.stateManager.getGlobalSettingsKey("browserSettings")
		const disableBrowserTool = browserSettings.disableToolUse ?? false
		// cline browser tool uses image recognition for navigation (requires model image support).
		const modelSupportsBrowserUse = providerInfo.model.info.supportsImages ?? false

		const supportsBrowserUse = modelSupportsBrowserUse && !disableBrowserTool // only enable browser use if the model supports it and the user hasn't disabled it
		const preferredLanguageRaw = this.stateManager.getGlobalSettingsKey("preferredLanguage")
		const preferredLanguage = getLanguageKey(preferredLanguageRaw as LanguageDisplay)
		const preferredLanguageInstructions =
			preferredLanguage && preferredLanguage !== DEFAULT_LANGUAGE_SETTINGS
				? `# Preferred Language\n\nSpeak in ${preferredLanguage}.`
				: ""

		const allToggles = await refreshAllToggles(this.controller, this.cwd)

		const globalClineRulesFileInstructions = await getGlobalClineRules(allToggles.globalClineRules)

		const localClineRulesFileInstructions = await getLocalClineRules(this.cwd, allToggles.localClineRules)
		const [localCursorRulesFileInstructions, localCursorRulesDirInstructions] = await getLocalCursorRules(
			this.cwd,
			allToggles.cursorRules,
		)
		const localWindsurfRulesFileInstructions = await getLocalWindsurfRules(this.cwd, allToggles.windsurfRules)

		const clineIgnoreContent = this.clineIgnoreController.clineIgnoreContent
		let clineIgnoreInstructions: string | undefined
		if (clineIgnoreContent) {
			clineIgnoreInstructions = formatResponse.clineIgnoreInstructions(clineIgnoreContent)
		}

		// Prepare multi-root workspace information if enabled
		let workspaceRoots: Array<{ path: string; name: string; vcs?: string }> | undefined
		const multiRootEnabled = isMultiRootEnabled(this.stateManager)
		if (multiRootEnabled && this.workspaceManager) {
			workspaceRoots = this.workspaceManager.getRoots().map((root) => ({
				path: root.path,
				name: root.name || path.basename(root.path), // Fallback to basename if name is undefined
				vcs: root.vcs as string | undefined, // Cast VcsType to string
			}))
		}

		const promptContext: SystemPromptContext = {
			cwd: this.cwd,
			ide,
			providerInfo,
			supportsBrowserUse,
			mcpHub: this.mcpHub,
			focusChainSettings: this.stateManager.getGlobalSettingsKey("focusChainSettings"),
			globalClineRulesFileInstructions,
			localClineRulesFileInstructions,
			localCursorRulesFileInstructions,
			localCursorRulesDirInstructions,
			localWindsurfRulesFileInstructions,
			clineIgnoreInstructions,
			preferredLanguageInstructions,
			browserSettings: this.stateManager.getGlobalSettingsKey("browserSettings"),
			yoloModeToggled: this.stateManager.getGlobalSettingsKey("yoloModeToggled"),
			isMultiRootEnabled: multiRootEnabled,
			workspaceRoots,
		}

		const systemPrompt = await getSystemPrompt(promptContext)

		const contextManagementMetadata = await this.contextManager.getNewContextMessagesAndMetadata(
			this.messageStateHandler.getApiConversationHistory(),
			this.messageStateHandler.getClineMessages(),
			this.api,
			this.taskState.conversationHistoryDeletedRange,
			previousApiReqIndex,
			await ensureTaskDirectoryExists(this.taskId),
			this.stateManager.getGlobalSettingsKey("useAutoCondense"),
		)

		if (contextManagementMetadata.updatedConversationHistoryDeletedRange) {
			this.taskState.conversationHistoryDeletedRange = contextManagementMetadata.conversationHistoryDeletedRange
			await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
			// saves task history item which we use to keep track of conversation history deleted range
		}

		const stream = this.api.createMessage(systemPrompt, contextManagementMetadata.truncatedConversationHistory)

		const iterator = stream[Symbol.asyncIterator]()

		try {
			// awaiting first chunk to see if it will throw an error
			this.taskState.isWaitingForFirstChunk = true
			const firstChunk = await iterator.next()
			yield firstChunk.value
			this.taskState.isWaitingForFirstChunk = false
		} catch (error) {
			const isContextWindowExceededError = checkContextWindowExceededError(error)
			const clineError = ErrorService.toClineError(error)

			// Capture provider failure telemetry using clineError
			// TODO: Move into errorService
			// ErrorService.get().logMessage(clineError.message)
			// ErrorService.get().logException(clineError)

			if (isContextWindowExceededError && !this.taskState.didAutomaticallyRetryFailedApiRequest) {
				await this.handleContextWindowExceededError()
			} else {
				// request failed after retrying automatically once, ask user if they want to retry again
				// note that this api_req_failed ask is unique in that we only present this option if the api hasn't streamed any content yet (ie it fails on the first chunk due), as it would allow them to hit a retry button. However if the api failed mid-stream, it could be in any arbitrary state where some tools may have executed, so that error is handled differently and requires cancelling the task entirely.

				if (isContextWindowExceededError) {
					const truncatedConversationHistory = this.contextManager.getTruncatedMessages(
						this.messageStateHandler.getApiConversationHistory(),
						this.taskState.conversationHistoryDeletedRange,
					)

					// If the conversation has more than 3 messages, we can truncate again. If not, then the conversation is bricked.
					// ToDo: Allow the user to change their input if this is the case.
					if (truncatedConversationHistory.length > 3) {
						clineError.message = "Context window exceeded. Click retry to truncate the conversation and try again."
						this.taskState.didAutomaticallyRetryFailedApiRequest = false
					}
				}

				const streamingFailedMessage = clineError.serialize()

				// Update the 'api_req_started' message to reflect final failure before asking user to manually retry
				const lastApiReqStartedIndex = findLastIndex(
					this.messageStateHandler.getClineMessages(),
					(m) => m.say === "api_req_started",
				)
				if (lastApiReqStartedIndex !== -1) {
					const clineMessages = this.messageStateHandler.getClineMessages()
					const currentApiReqInfo: ClineApiReqInfo = JSON.parse(clineMessages[lastApiReqStartedIndex].text || "{}")
					delete currentApiReqInfo.retryStatus

					await this.messageStateHandler.updateClineMessage(lastApiReqStartedIndex, {
						text: JSON.stringify({
							...currentApiReqInfo, // Spread the modified info (with retryStatus removed)
							// cancelReason: "retries_exhausted", // Indicate that automatic retries failed
							streamingFailedMessage,
						} satisfies ClineApiReqInfo),
					})
					// this.ask will trigger postStateToWebview, so this change should be picked up.
				}

				const { response } = await this.ask("api_req_failed", streamingFailedMessage)

				if (response !== "yesButtonClicked") {
					// this will never happen since if noButtonClicked, we will clear current task, aborting this instance
					throw new Error("API request failed")
				}

				// Clear streamingFailedMessage when user manually retries
				const manualRetryApiReqIndex = findLastIndex(
					this.messageStateHandler.getClineMessages(),
					(m) => m.say === "api_req_started",
				)
				if (manualRetryApiReqIndex !== -1) {
					const clineMessages = this.messageStateHandler.getClineMessages()
					const currentApiReqInfo: ClineApiReqInfo = JSON.parse(clineMessages[manualRetryApiReqIndex].text || "{}")
					delete currentApiReqInfo.streamingFailedMessage
					await this.messageStateHandler.updateClineMessage(manualRetryApiReqIndex, {
						text: JSON.stringify(currentApiReqInfo),
					})
				}

				await this.say("api_req_retried")

				// Reset the automatic retry flag so the request can proceed
				this.taskState.didAutomaticallyRetryFailedApiRequest = false
			}
			// delegate generator output from the recursive call
			yield* this.attemptApiRequest(previousApiReqIndex)
			return
		}

		// no error, so we can continue to yield all remaining chunks
		// (needs to be placed outside of try/catch since it we want caller to handle errors not with api_req_failed as that is reserved for first chunk failures only)
		// this delegates to another generator or iterable object. In this case, it's saying "yield all remaining values from this iterator". This effectively passes along all subsequent chunks from the original stream.
		yield* iterator
	}

	/**
	 * Handle context window exceeded error with automatic retry
	 *
	 * Automatically truncates conversation history to 1/4 size and retries
	 * the API request. This is done once per request automatically.
	 *
	 * @private
	 */
	private async handleContextWindowExceededError(): Promise<void> {
		const apiConversationHistory = this.messageStateHandler.getApiConversationHistory()

		this.taskState.conversationHistoryDeletedRange = this.contextManager.calculateTruncationRange(
			apiConversationHistory,
			this.taskState.conversationHistoryDeletedRange,
			"quarter", // Force aggressive truncation
		)
		await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
		await this.contextManager.triggerApplyStandardContextTruncationNoticeChange(
			Date.now(),
			await ensureTaskDirectoryExists(this.taskId),
			apiConversationHistory,
		)

		this.taskState.didAutomaticallyRetryFailedApiRequest = true
	}

	/**
	 * Present assistant message content to UI
	 *
	 * Processes and presents content blocks from the assistant's response.
	 * Handles text blocks (with thinking tag removal), tool_use blocks,
	 * and coordinates with ToolExecutor for tool execution.
	 *
	 * Uses locking mechanism to prevent race conditions when streaming
	 * updates arrive while previous block is still being processed.
	 *
	 * @returns Promise that resolves when current block is presented/executed
	 */
	async presentAssistantMessage(): Promise<void> {
		if (this.taskState.abort) {
			throw new Error("Cline instance aborted")
		}

		if (this.taskState.presentAssistantMessageLocked) {
			this.taskState.presentAssistantMessageHasPendingUpdates = true
			return
		}
		this.taskState.presentAssistantMessageLocked = true
		this.taskState.presentAssistantMessageHasPendingUpdates = false

		if (this.taskState.currentStreamingContentIndex >= this.taskState.assistantMessageContent.length) {
			// this may happen if the last content block was completed before streaming could finish. if streaming is finished, and we're out of bounds then this means we already presented/executed the last content block and are ready to continue to next request
			if (this.taskState.didCompleteReadingStream) {
				this.taskState.userMessageContentReady = true
			}
			this.taskState.presentAssistantMessageLocked = false
			return
			//throw new Error("No more content blocks to stream! This shouldn't happen...") // remove and just return after testing
		}

		const block = structuredClone(this.taskState.assistantMessageContent[this.taskState.currentStreamingContentIndex]) // need to create copy bc while stream is updating the array, it could be updating the reference block properties too
		switch (block.type) {
			case "text": {
				if (this.taskState.didRejectTool || this.taskState.didAlreadyUseTool) {
					break
				}
				let content = block.content
				if (content) {
					// (have to do this for partial and complete since sending content in thinking tags to markdown renderer will automatically be removed)
					// Remove end substrings of <thinking or </thinking (below xml parsing is only for opening tags)
					// (this is done with the xml parsing below now, but keeping here for reference)
					// content = content.replace(/<\/?t(?:h(?:i(?:n(?:k(?:i(?:n(?:g)?)?)?)?)?)?)?$/, "")
					// Remove all instances of <thinking> (with optional line break after) and </thinking> (with optional line break before)
					// - Needs to be separate since we dont want to remove the line break before the first tag
					// - Needs to happen before the xml parsing below
					content = content.replace(/<thinking>\s?/g, "")
					content = content.replace(/\s?<\/thinking>/g, "")

					// Remove partial XML tag at the very end of the content (for tool use and thinking tags)
					// (prevents scrollview from jumping when tags are automatically removed)
					const lastOpenBracketIndex = content.lastIndexOf("<")
					if (lastOpenBracketIndex !== -1) {
						const possibleTag = content.slice(lastOpenBracketIndex)
						// Check if there's a '>' after the last '<' (i.e., if the tag is complete) (complete thinking and tool tags will have been removed by now)
						const hasCloseBracket = possibleTag.includes(">")
						if (!hasCloseBracket) {
							// Extract the potential tag name
							let tagContent: string
							if (possibleTag.startsWith("</")) {
								tagContent = possibleTag.slice(2).trim()
							} else {
								tagContent = possibleTag.slice(1).trim()
							}
							// Check if tagContent is likely an incomplete tag name (letters and underscores only)
							const isLikelyTagName = /^[a-zA-Z_]+$/.test(tagContent)
							// Preemptively remove < or </ to keep from these artifacts showing up in chat (also handles closing thinking tags)
							const isOpeningOrClosing = possibleTag === "<" || possibleTag === "</"
							// If the tag is incomplete and at the end, remove it from the content
							if (isOpeningOrClosing || isLikelyTagName) {
								content = content.slice(0, lastOpenBracketIndex).trim()
							}
						}
					}
				}

				if (!block.partial) {
					// Some models add code block artifacts (around the tool calls) which show up at the end of text content
					// matches ``` with at least one char after the last backtick, at the end of the string
					const match = content?.trimEnd().match(/```[a-zA-Z0-9_-]+$/)
					if (match) {
						const matchLength = match[0].length
						content = content.trimEnd().slice(0, -matchLength)
					}
				}

				await this.say("text", content, undefined, undefined, block.partial)
				break
			}
			case "tool_use":
				await this.toolExecutor.executeTool(block)
				break
		}

		/*
		Seeing out of bounds is fine, it means that the next too call is being built up and ready to add to assistantMessageContent to present. 
		When you see the UI inactive during this, it means that a tool is breaking without presenting any UI. For example the write_to_file tool was breaking when relpath was undefined, and for invalid relpath it never presented UI.
		*/
		this.taskState.presentAssistantMessageLocked = false // this needs to be placed here, if not then calling this.presentAssistantMessage below would fail (sometimes) since it's locked
		// NOTE: when tool is rejected, iterator stream is interrupted and it waits for userMessageContentReady to be true. Future calls to present will skip execution since didRejectTool and iterate until contentIndex is set to message length and it sets userMessageContentReady to true itself (instead of preemptively doing it in iterator)
		if (!block.partial || this.taskState.didRejectTool || this.taskState.didAlreadyUseTool) {
			// block is finished streaming and executing
			if (this.taskState.currentStreamingContentIndex === this.taskState.assistantMessageContent.length - 1) {
				// its okay that we increment if !didCompleteReadingStream, it'll just return bc out of bounds and as streaming continues it will call presentAssistantMessage if a new block is ready. if streaming is finished then we set userMessageContentReady to true when out of bounds. This gracefully allows the stream to continue on and all potential content blocks be presented.
				// last block is complete and it is finished executing
				this.taskState.userMessageContentReady = true // will allow pwaitfor to continue
			}

			// call next block if it exists (if not then read stream will call it when its ready)
			this.taskState.currentStreamingContentIndex++
			this.presentAssistantMessage()
		}

		// block is partial, but the read stream may have finished
		if (this.taskState.presentAssistantMessageHasPendingUpdates) {
			this.presentAssistantMessage()
		}
	}

	/**
	 * Main API request orchestration loop
	 *
	 * Recursively makes AI agent requests, processing responses and handling
	 * tool executions until task completion. This is the central coordination
	 * point for the entire AI agent interaction loop.
	 *
	 * Handles:
	 * - Mistake limit checks with user intervention
	 * - Auto-approval limit management
	 * - Context loading with auto-condense support
	 * - Checkpoint creation (first request only)
	 * - API streaming and parsing
	 * - Token tracking and cost calculation
	 * - Stream abortion and error recovery
	 * - Recursive continuation for multi-turn conversations
	 *
	 * @param userContent - User message content blocks to send
	 * @param includeFileDetails - Whether to include file listings in context
	 * @returns Promise<boolean> - True if loop should end, false to continue
	 * @throws Error if task is aborted
	 */
	async recursivelyMakeClineRequests(userContent: UserContent, includeFileDetails: boolean = false): Promise<boolean> {
		if (this.taskState.abort) {
			throw new Error("Cline instance aborted")
		}

		// Increment API request counter for focus chain list management
		this.taskState.apiRequestCount++
		this.taskState.apiRequestsSinceLastTodoUpdate++

		// Used to know what models were used in the task if user wants to export metadata for error reporting purposes
		const { model, providerId, customPrompt } = this.getCurrentProviderInfo()
		if (providerId && model.id) {
			try {
				await this.modelContextTracker.recordModelUsage(
					providerId,
					model.id,
					this.stateManager.getGlobalSettingsKey("mode"),
				)
			} catch {}
		}

		if (this.taskState.consecutiveMistakeCount >= 3) {
			const autoApprovalSettings = this.stateManager.getGlobalSettingsKey("autoApprovalSettings")
			if (autoApprovalSettings.enabled && autoApprovalSettings.enableNotifications) {
				showSystemNotification({
					subtitle: "Error",
					message: "Cline is having trouble. Would you like to continue the task?",
				})
			}
			const { response, text, images, files } = await this.ask(
				"mistake_limit_reached",
				this.api.getModel().id.includes("claude")
					? `This may indicate a failure in his thought process or inability to use a tool properly, which can be mitigated with some user guidance (e.g. "Try breaking down the task into smaller steps").`
					: "Cline uses complex prompts and iterative task execution that may be challenging for less capable models. For best results, it's recommended to use Claude 4 Sonnet for its advanced agentic coding capabilities.",
			)
			if (response === "messageResponse") {
				// Display the user's message in the chat UI
				await this.say("user_feedback", text, images, files)

				// This userContent is for the *next* API call.
				const feedbackUserContent: UserContent = []
				feedbackUserContent.push({
					type: "text",
					text: formatResponse.tooManyMistakes(text),
				})
				if (images && images.length > 0) {
					feedbackUserContent.push(...formatResponse.imageBlocks(images))
				}

				let fileContentString = ""
				if (files && files.length > 0) {
					fileContentString = await processFilesIntoText(files)
				}

				if (fileContentString) {
					feedbackUserContent.push({
						type: "text",
						text: fileContentString,
					})
				}

				userContent = feedbackUserContent
			}
			this.taskState.consecutiveMistakeCount = 0
		}

		const autoApprovalSettings = this.stateManager.getGlobalSettingsKey("autoApprovalSettings")

		if (
			autoApprovalSettings.enabled &&
			this.taskState.consecutiveAutoApprovedRequestsCount >= autoApprovalSettings.maxRequests
		) {
			if (autoApprovalSettings.enableNotifications) {
				showSystemNotification({
					subtitle: "Max Requests Reached",
					message: `Cline has auto-approved ${autoApprovalSettings.maxRequests.toString()} API requests.`,
				})
			}
			const { response, text, images, files } = await this.ask(
				"auto_approval_max_req_reached",
				`Cline has auto-approved ${autoApprovalSettings.maxRequests.toString()} API requests. Would you like to reset the count and proceed with the task?`,
			)
			// if we get past the promise it means the user approved and did not start a new task
			this.taskState.consecutiveAutoApprovedRequestsCount = 0

			// Process user feedback if provided
			if (response === "messageResponse") {
				// Display the user's message in the chat UI
				await this.say("user_feedback", text, images, files)

				// This userContent is for the *next* API call.
				const feedbackUserContent: UserContent = []
				feedbackUserContent.push({
					type: "text",
					text: formatResponse.autoApprovalMaxReached(text),
				})
				if (images && images.length > 0) {
					feedbackUserContent.push(...formatResponse.imageBlocks(images))
				}

				let fileContentString = ""
				if (files && files.length > 0) {
					fileContentString = await processFilesIntoText(files)
				}

				if (fileContentString) {
					feedbackUserContent.push({
						type: "text",
						text: fileContentString,
					})
				}

				userContent = feedbackUserContent
			}
		}

		// get previous api req's index to check token usage and determine if we need to truncate conversation history
		const previousApiReqIndex = findLastIndex(this.messageStateHandler.getClineMessages(), (m) => m.say === "api_req_started")

		// Save checkpoint if this is the first API request
		const isFirstRequest = this.messageStateHandler.getClineMessages().filter((m) => m.say === "api_req_started").length === 0

		// getting verbose details is an expensive operation, it uses globby to top-down build file structure of project which for large projects can take a few seconds
		// for the best UX we show a placeholder api_req_started message with a loading spinner as this happens
		await this.say(
			"api_req_started",
			JSON.stringify({
				request: userContent.map((block) => formatContentBlockToMarkdown(block)).join("\n\n") + "\n\nLoading...",
			}),
		)

		// Initialize checkpointManager first if enabled and it's the first request
		if (
			isFirstRequest &&
			this.stateManager.getGlobalSettingsKey("enableCheckpointsSetting") &&
			this.checkpointManager && // TODO REVIEW: may be able to implement a replacement for the 15s timer
			!this.taskState.checkpointManagerErrorMessage
		) {
			try {
				await ensureCheckpointInitialized({ checkpointManager: this.checkpointManager })
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error"
				Logger.error("Failed to initialize checkpoint manager", error instanceof Error ? error : new Error(errorMessage))
				this.taskState.checkpointManagerErrorMessage = errorMessage // will be displayed right away since we saveClineMessages next which posts state to webview
				HostProvider.window.showMessage({
					type: ShowMessageType.ERROR,
					message: `Checkpoint initialization timed out: ${errorMessage}`,
				})
			}
		}

		// Now, if it's the first request AND checkpoints are enabled AND tracker was successfully initialized,
		// then say "checkpoint_created" and perform the commit.
		if (isFirstRequest && this.stateManager.getGlobalSettingsKey("enableCheckpointsSetting") && this.checkpointManager) {
			await this.say("checkpoint_created") // Now this is conditional
			const lastCheckpointMessageIndex = findLastIndex(
				this.messageStateHandler.getClineMessages(),
				(m) => m.say === "checkpoint_created",
			)
			if (lastCheckpointMessageIndex !== -1) {
				this.checkpointManager
					?.commit()
					.then(async (commitHash) => {
						if (commitHash) {
							await this.messageStateHandler.updateClineMessage(lastCheckpointMessageIndex, {
								lastCheckpointHash: commitHash,
							})
							// saveClineMessagesAndUpdateHistory will be called later after API response,
							// so no need to call it here unless this is the only modification to this message.
							// For now, assuming it's handled later.
						}
					})
					.catch((error) => {
						Logger.error(
							`[TaskCheckpointManager] Failed to create checkpoint commit for task ${this.taskId}`,
							error instanceof Error ? error : new Error(String(error)),
						)
					})
			}
		} else if (
			isFirstRequest &&
			this.stateManager.getGlobalSettingsKey("enableCheckpointsSetting") &&
			!this.checkpointManager &&
			this.taskState.checkpointManagerErrorMessage
		) {
			// Checkpoints are enabled, but tracker failed to initialize.
			// checkpointManagerErrorMessage is already set and will be part of the state.
			// No explicit UI message here, error message will be in ExtensionState.
		}

		// Separate logic when using the auto-condense context management vs the original context management methods
		const useAutoCondense = this.stateManager.getGlobalSettingsKey("useAutoCondense")
		if (useAutoCondense && isNextGenModelFamily(this.api.getModel().id)) {
			// when we initially trigger the context cleanup, we will be increasing the context window size, so we need some state `currentlySummarizing`
			// to store whether we have already started the context summarization flow, so we don't attempt to summarize again. additionally, immediately
			// post summarizing we need to increment the conversationHistoryDeletedRange to mask out the summarization-trigger user & assistant response messaages
			let shouldCompact = false
			if (this.taskState.currentlySummarizing) {
				this.taskState.currentlySummarizing = false

				if (this.taskState.conversationHistoryDeletedRange) {
					const [start, end] = this.taskState.conversationHistoryDeletedRange
					const apiHistory = this.messageStateHandler.getApiConversationHistory()

					// we want to increment the deleted range to remove the pre-summarization tool call output, with additional safety check
					const safeEnd = Math.min(end + 2, apiHistory.length - 1)
					if (end + 2 <= safeEnd) {
						this.taskState.conversationHistoryDeletedRange = [start, end + 2]
						await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
					}
				}
			} else {
				const autoCondenseThreshold = this.stateManager.getGlobalSettingsKey("autoCondenseThreshold") as
					| number
					| undefined
				shouldCompact = this.contextManager.shouldCompactContextWindow(
					this.messageStateHandler.getClineMessages(),
					this.api,
					previousApiReqIndex,
					autoCondenseThreshold,
				)

				// There is an edge case where the summarize_task tool call completes but the user cancels the next request before it finishes
				// this will result in this.taskState.currentlySummarizing being false, and we also failed to update the context window token
				// estimate, which require a full new message to be completed along with gathering the latest usage block. A proxy for whether
				// we just summarized would be to check the number of in-range messages, which itself has some extreme edge case (e.g. what if
				// first+second user messages take up entire context-window, but in this case there's already an issue). TODO: Examine other
				// approaches such as storing this.taskState.currentlySummarizing on disk in the clineMessages. This was intentionally not done
				// for now to prevent additional disk from needing to be used.
				// The worse case scenario is effectively cline summarizing a summary, which is bad UX, but doesn't break other logic.
				if (shouldCompact && this.taskState.conversationHistoryDeletedRange) {
					const apiHistory = this.messageStateHandler.getApiConversationHistory()
					const activeMessageCount = apiHistory.length - this.taskState.conversationHistoryDeletedRange[1] - 1

					// IMPORTANT - we didn't append this next user message yet so the last message in this array is an assistant message
					// that's why we are comparing to an even number of messages (0, 2) rather than odd (1, 3)
					if (activeMessageCount <= 2) {
						shouldCompact = false
					}
				}
			}

			let parsedUserContent: UserContent
			let environmentDetails: string
			let clinerulesError: boolean

			// when summarizing the context window, we do not want to inject updated to the context
			if (shouldCompact) {
				parsedUserContent = userContent
				environmentDetails = ""
				clinerulesError = false
				this.taskState.lastAutoCompactTriggerIndex = previousApiReqIndex
			} else {
				;[parsedUserContent, environmentDetails, clinerulesError] = await this.loadContext(
					userContent,
					includeFileDetails,
				)
			}

			// error handling if the user uses the /newrule command & their .clinerules is a file, for file read operations didnt work properly
			if (clinerulesError === true) {
				await this.say(
					"error",
					"Issue with processing the /newrule command. Double check that, if '.clinerules' already exists, it's a directory and not a file. Otherwise there was an issue referencing this file/directory.",
				)
			}

			userContent = parsedUserContent
			// add environment details as its own text block, separate from tool results
			// do not add environment details to the message which we are compacting the context window
			if (!shouldCompact) {
				userContent.push({ type: "text", text: environmentDetails })
			}

			if (shouldCompact) {
				userContent.push({
					type: "text",
					text: summarizeTask(this.stateManager.getGlobalSettingsKey("focusChainSettings")),
				})
			}
		} else {
			const useCompactPrompt = customPrompt === "compact" && isLocalModel(this.getCurrentProviderInfo())
			const [parsedUserContent, environmentDetails, clinerulesError] = await this.loadContext(
				userContent,
				includeFileDetails,
				useCompactPrompt,
			)

			if (clinerulesError === true) {
				await this.say(
					"error",
					"Issue with processing the /newrule command. Double check that, if '.clinerules' already exists, it's a directory and not a file. Otherwise there was an issue referencing this file/directory.",
				)
			}

			userContent = parsedUserContent

			userContent.push({ type: "text", text: environmentDetails })
		}

		await this.messageStateHandler.addToApiConversationHistory({
			role: "user",
			content: userContent,
		})

		telemetryService.captureConversationTurnEvent(this.ulid, providerId, model.id, "user")

		// Capture task initialization timing telemetry for the first API request
		if (isFirstRequest) {
			const durationMs = Math.round(performance.now() - this.taskInitializationStartTime)
			telemetryService.captureTaskInitialization(this.ulid, this.taskId, durationMs, providerId)
		}

		// since we sent off a placeholder api_req_started message to update the webview while waiting to actually start the API request (to load potential details for example), we need to update the text of that message
		const lastApiReqIndex = findLastIndex(this.messageStateHandler.getClineMessages(), (m) => m.say === "api_req_started")
		await this.messageStateHandler.updateClineMessage(lastApiReqIndex, {
			text: JSON.stringify({
				request: userContent.map((block) => formatContentBlockToMarkdown(block)).join("\n\n"),
			} satisfies ClineApiReqInfo),
		})
		await this.postStateToWebview()

		try {
			let cacheWriteTokens = 0
			let cacheReadTokens = 0
			let inputTokens = 0
			let outputTokens = 0
			let totalCost: number | undefined

			const abortStream = async (cancelReason: ClineApiReqCancelReason, streamingFailedMessage?: string) => {
				if (this.diffViewProvider.isEditing) {
					await this.diffViewProvider.revertChanges() // closes diff view
				}

				// if last message is a partial we need to update and save it
				const lastMessage = this.messageStateHandler.getClineMessages().at(-1)
				if (lastMessage && lastMessage.partial) {
					// lastMessage.ts = Date.now() DO NOT update ts since it is used as a key for virtuoso list
					lastMessage.partial = false
					// instead of streaming partialMessage events, we do a save and post like normal to persist to disk
					// await this.saveClineMessagesAndUpdateHistory()
				}

				// Let assistant know their response was interrupted for when task is resumed
				await this.messageStateHandler.addToApiConversationHistory({
					role: "assistant",
					content: [
						{
							type: "text",
							text:
								assistantMessage +
								`\n\n[${
									cancelReason === "streaming_failed"
										? "Response interrupted by API Error"
										: "Response interrupted by user"
								}]`,
						},
					],
				})

				// update api_req_started to have cancelled and cost, so that we can display the cost of the partial stream
				await updateApiReqMsg({
					messageStateHandler: this.messageStateHandler,
					lastApiReqIndex,
					inputTokens,
					outputTokens,
					cacheWriteTokens,
					cacheReadTokens,
					totalCost,
					api: this.api,
					cancelReason,
					streamingFailedMessage,
				})
				await this.messageStateHandler.saveClineMessagesAndUpdateHistory()

				telemetryService.captureConversationTurnEvent(this.ulid, providerId, this.api.getModel().id, "assistant", {
					tokensIn: inputTokens,
					tokensOut: outputTokens,
					cacheWriteTokens,
					cacheReadTokens,
					totalCost,
				})

				// signals to provider that it can retrieve the saved messages from disk, as abortTask can not be awaited on in nature
				this.taskState.didFinishAbortingStream = true
			}

			// reset streaming state
			this.taskState.currentStreamingContentIndex = 0
			this.taskState.assistantMessageContent = []
			this.taskState.didCompleteReadingStream = false
			this.taskState.userMessageContent = []
			this.taskState.userMessageContentReady = false
			this.taskState.didRejectTool = false
			this.taskState.didAlreadyUseTool = false
			this.taskState.presentAssistantMessageLocked = false
			this.taskState.presentAssistantMessageHasPendingUpdates = false
			this.taskState.didAutomaticallyRetryFailedApiRequest = false
			await this.diffViewProvider.reset()

			const stream = this.attemptApiRequest(previousApiReqIndex) // yields only if the first chunk is successful, otherwise will allow the user to retry the request (most likely due to rate limit error, which gets thrown on the first chunk)
			let assistantMessage = ""
			let reasoningMessage = ""
			const reasoningDetails = []
			const antThinkingContent: (Anthropic.Messages.RedactedThinkingBlock | Anthropic.Messages.ThinkingBlock)[] = []
			this.taskState.isStreaming = true
			let didReceiveUsageChunk = false
			try {
				for await (const chunk of stream) {
					if (!chunk) {
						continue
					}
					switch (chunk.type) {
						case "usage":
							didReceiveUsageChunk = true
							inputTokens += chunk.inputTokens
							outputTokens += chunk.outputTokens
							cacheWriteTokens += chunk.cacheWriteTokens ?? 0
							cacheReadTokens += chunk.cacheReadTokens ?? 0
							totalCost = chunk.totalCost
							break
						case "reasoning":
							// reasoning will always come before assistant message
							reasoningMessage += chunk.reasoning
							// fixes bug where cancelling task > aborts task > for loop may be in middle of streaming reasoning > say function throws error before we get a chance to properly clean up and cancel the task.
							if (!this.taskState.abort) {
								await this.say("reasoning", reasoningMessage, undefined, undefined, true)
							}
							break
						// for cline/openrouter providers
						case "reasoning_details":
							reasoningDetails.push(chunk.reasoning_details)
							break
						// for anthropic providers
						case "ant_thinking":
							antThinkingContent.push({
								type: "thinking",
								thinking: chunk.thinking,
								signature: chunk.signature,
							})
							break
						case "ant_redacted_thinking":
							antThinkingContent.push({
								type: "redacted_thinking",
								data: chunk.data,
							})
							break
						case "text": {
							if (reasoningMessage && assistantMessage.length === 0) {
								// complete reasoning message
								await this.say("reasoning", reasoningMessage, undefined, undefined, false)
							}
							assistantMessage += chunk.text
							// parse raw assistant message into content blocks
							const prevLength = this.taskState.assistantMessageContent.length

							this.taskState.assistantMessageContent = parseAssistantMessageV2(assistantMessage)

							if (this.taskState.assistantMessageContent.length > prevLength) {
								this.taskState.userMessageContentReady = false // new content we need to present, reset to false in case previous content set this to true
							}
							// present content to user
							this.presentAssistantMessage()
							break
						}
					}

					if (this.taskState.abort) {
						if (!this.taskState.abandoned) {
							// only need to gracefully abort if this instance isn't abandoned (sometimes openrouter stream hangs, in which case this would affect future instances of cline)
							await abortStream("user_cancelled")
						}
						break // aborts the stream
					}

					if (this.taskState.didRejectTool) {
						// userContent has a tool rejection, so interrupt the assistant's response to present the user's feedback
						assistantMessage += "\n\n[Response interrupted by user feedback]"
						// this.userMessageContentReady = true // instead of setting this preemptively, we allow the present iterator to finish and set userMessageContentReady when its ready
						break
					}

					// PREV: we need to let the request finish for openrouter to get generation details
					// UPDATE: it's better UX to interrupt the request at the cost of the api cost not being retrieved
					if (this.taskState.didAlreadyUseTool) {
						assistantMessage +=
							"\n\n[Response interrupted by a tool use result. Only one tool may be used at a time and should be placed at the end of the message.]"
						break
					}
				}
			} catch (error) {
				// abandoned happens when extension is no longer waiting for the cline instance to finish aborting (error is thrown here when any function in the for loop throws due to this.abort)
				if (!this.taskState.abandoned) {
					// abortTask has been extracted to lifecycle service, need to access it differently
					// For now, we'll need the parent Task to handle this
					throw error // Re-throw so Task can handle abort
				}
			} finally {
				this.taskState.isStreaming = false
			}

			// OpenRouter/Cline may not return token usage as part of the stream (since it may abort early), so we fetch after the stream is finished
			// (updateApiReq below will update the api_req_started message with the usage details. we do this async so it updates the api_req_started message in the background)
			if (!didReceiveUsageChunk) {
				this.api.getApiStreamUsage?.().then(async (apiStreamUsage) => {
					if (apiStreamUsage) {
						inputTokens += apiStreamUsage.inputTokens
						outputTokens += apiStreamUsage.outputTokens
						cacheWriteTokens += apiStreamUsage.cacheWriteTokens ?? 0
						cacheReadTokens += apiStreamUsage.cacheReadTokens ?? 0
						totalCost = apiStreamUsage.totalCost
					}
					await updateApiReqMsg({
						messageStateHandler: this.messageStateHandler,
						lastApiReqIndex,
						inputTokens,
						outputTokens,
						cacheWriteTokens,
						cacheReadTokens,
						api: this.api,
						totalCost,
					})
					await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
					await this.postStateToWebview()
				})
			}

			// need to call here in case the stream was aborted
			if (this.taskState.abort) {
				throw new Error("Cline instance aborted")
			}

			this.taskState.didCompleteReadingStream = true

			// set any blocks to be complete to allow presentAssistantMessage to finish and set userMessageContentReady to true
			// (could be a text block that had no subsequent tool uses, or a text block at the very end, or an invalid tool use, etc. whatever the case, presentAssistantMessage relies on these blocks either to be completed or the user to reject a block in order to proceed and eventually set userMessageContentReady to true)
			const partialBlocks = this.taskState.assistantMessageContent.filter((block) => block.partial)
			partialBlocks.forEach((block) => {
				block.partial = false
			})
			// this.assistantMessageContent.forEach((e) => (e.partial = false)) // can't just do this bc a tool could be in the middle of executing ()
			if (partialBlocks.length > 0) {
				this.presentAssistantMessage() // if there is content to update then it will complete and update this.userMessageContentReady to true, which we pwaitfor before making the next request. all this is really doing is presenting the last partial message that we just set to complete
			}

			await updateApiReqMsg({
				messageStateHandler: this.messageStateHandler,
				lastApiReqIndex,
				inputTokens,
				outputTokens,
				cacheWriteTokens,
				cacheReadTokens,
				api: this.api,
				totalCost,
			})
			await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
			await this.postStateToWebview()

			// now add to apiconversationhistory
			// need to save assistant responses to file before proceeding to tool use since user can exit at any moment and we wouldn't be able to save the assistant's response
			let didEndLoop = false
			if (assistantMessage.length > 0) {
				telemetryService.captureConversationTurnEvent(this.ulid, providerId, model.id, "assistant", {
					tokensIn: inputTokens,
					tokensOut: outputTokens,
					cacheWriteTokens,
					cacheReadTokens,
					totalCost,
				})

				await this.messageStateHandler.addToApiConversationHistory({
					role: "assistant",
					content: [
						// This is critical for maintaining the model's reasoning flow and conversation integrity.
						// "When providing thinking blocks, the entire sequence of consecutive thinking blocks must match the outputs generated by the model during the original request; you cannot rearrange or modify the sequence of these blocks." The signature_delta is used to verify that the thinking was generated by Claude, and the thinking blocks will be ignored if it's incorrect or missing.
						// https://docs.claude.com/en/docs/build-with-claude/extended-thinking#preserving-thinking-blocks
						...antThinkingContent,
						{
							type: "text",
							text: assistantMessage,
							// reasoning_details only exists for cline/openrouter providers
							// @ts-ignore-next-line
							reasoning_details: reasoningDetails.length > 0 ? reasoningDetails : undefined,
						},
					] as Array<
						Anthropic.Messages.RedactedThinkingBlock | Anthropic.Messages.ThinkingBlock | Anthropic.Messages.TextBlock
					>,
				})

				// NOTE: this comment is here for future reference - this was a workaround for userMessageContent not getting set to true. It was due to it not recursively calling for partial blocks when didRejectTool, so it would get stuck waiting for a partial block to complete before it could continue.
				// in case the content blocks finished
				// it may be the api stream finished after the last parsed content block was executed, so  we are able to detect out of bounds and set userMessageContentReady to true (note you should not call presentAssistantMessage since if the last block is completed it will be presented again)
				// const completeBlocks = this.assistantMessageContent.filter((block) => !block.partial) // if there are any partial blocks after the stream ended we can consider them invalid
				// if (this.currentStreamingContentIndex >= completeBlocks.length) {
				// 	this.userMessageContentReady = true
				// }

				await pWaitFor(() => this.taskState.userMessageContentReady)

				// if the model did not tool use, then we need to tell it to either use a tool or attempt_completion
				const didToolUse = this.taskState.assistantMessageContent.some((block) => block.type === "tool_use")

				if (!didToolUse) {
					// normal request where tool use is required
					this.taskState.userMessageContent.push({
						type: "text",
						text: formatResponse.noToolsUsed(),
					})
					this.taskState.consecutiveMistakeCount++
				}

				const recDidEndLoop = await this.recursivelyMakeClineRequests(this.taskState.userMessageContent)
				didEndLoop = recDidEndLoop
			} else {
				// if there's no assistant_responses, that means we got no text or tool_use content blocks from API which we should assume is an error
				const { model, providerId } = this.getCurrentProviderInfo()
				const reqId = this.getApiRequestIdSafe()

				// Minimal diagnostics: structured log and telemetry
				Logger.error(
					`[EmptyAssistantMessage] ulid: ${this.ulid}, providerId: ${providerId}, modelId: ${model.id}, requestId: ${reqId}`,
				)
				telemetryService.captureProviderApiError({
					ulid: this.ulid,
					model: model.id,
					provider: providerId,
					errorMessage: "empty_assistant_message",
					requestId: reqId,
				})

				const baseErrorMessage =
					"Invalid API Response: The provider returned an empty or unparsable response. This is a provider-side issue where the model failed to generate valid output or returned tool calls that Cline cannot process. Retrying the request may help resolve this issue."
				const errorText = reqId ? `${baseErrorMessage} (Request ID: ${reqId})` : baseErrorMessage

				await this.say("error", errorText)
				await this.messageStateHandler.addToApiConversationHistory({
					role: "assistant",
					content: [
						{
							type: "text",
							text: "Failure: I did not provide a response.",
						},
					],
				})

				// Offer the user a chance to retry this API request
				const { response } = await this.ask(
					"api_req_failed",
					"No assistant message was received. Would you like to retry the request?",
				)

				if (response === "yesButtonClicked") {
					// Signal the loop to continue (i.e., do not end), so it will attempt again
					return false
				}

				// Returns early to avoid retry since user dismissed
				return true
			}

			return didEndLoop // will always be false for now
		} catch (_error) {
			// this should never happen since the only thing that can throw an error is the attemptApiRequest, which is wrapped in a try catch that sends an ask where if noButtonClicked, will clear current task and destroy this instance. However to avoid unhandled promise rejection, we will end this loop which will end execution of this instance (see startTask)
			return true // needs to be true so parent loop knows to end task
		}
	}
}
