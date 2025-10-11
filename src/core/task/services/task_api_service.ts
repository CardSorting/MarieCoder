import { Anthropic } from "@anthropic-ai/sdk"
import type { ApiStream } from "@core/api/transform/stream"
import { parseAssistantMessageV2 } from "@core/assistant-message"
import type { ContextManager } from "@core/context/context-management/context_manager"
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
import type { ICheckpointManager } from "@integrations/checkpoints/types"
import type { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import { formatContentBlockToMarkdown } from "@integrations/misc/export-markdown"
import { Logger } from "@services/logging/Logger"
import type { McpHub } from "@services/mcp/McpHub"
import { findLastIndex } from "@shared/array"
import type { ClineApiReqInfo } from "@shared/ExtensionMessage"
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
import type { MessageStateHandler } from "../message-state"
import type { TaskState } from "../TaskState"
import type { ToolExecutor } from "../ToolExecutor"
import { updateApiReqMsg } from "../utils"
import { ApiRetryService } from "./api_retry_service"
import { ApiStreamManager } from "./api_stream_manager"
import { TaskCheckpointCoordinator } from "./task_checkpoint_coordinator"
import type { TaskContextBuilder } from "./task_context_builder"
import { TaskLimitManager } from "./task_limit_manager"
import type { TaskMessageService } from "./task_message_service"

type UserContent = Array<Anthropic.ContentBlockParam>

/**
 * Orchestrates API communication with LLM providers
 *
 * This service acts as a coordinator, delegating responsibilities to specialized
 * services while managing the overall API request lifecycle. It has been refactored
 * from a 1,164-line monolith into a focused coordinator (~500 lines) that delegates
 * to focused services.
 *
 * **Coordinator Responsibilities:**
 * - Orchestrate the API request/response lifecycle
 * - Generate system prompts with all context
 * - Coordinate between specialized services
 * - Handle tool execution flow
 * - Manage recursive request loops
 *
 * **Delegated to Specialized Services:**
 * - Retry logic → ApiRetryService
 * - Stream processing → ApiStreamManager
 * - Checkpoint management → TaskCheckpointCoordinator
 * - Limit enforcement → TaskLimitManager
 *
 * @example
 * ```typescript
 * const apiService = new TaskApiService(api, taskState, messageService, ...)
 * const didEndLoop = await apiService.recursivelyMakeClineRequests(userContent, true)
 * ```
 */
export class TaskApiService {
	// Specialized service delegates
	private readonly retryService: ApiRetryService
	private readonly streamManager: ApiStreamManager
	private readonly checkpointCoordinator: TaskCheckpointCoordinator
	private readonly limitManager: TaskLimitManager

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
	) {
		// Initialize specialized service delegates
		this.retryService = new ApiRetryService(taskState, messageService, messageStateHandler, contextManager, taskId)

		this.streamManager = new ApiStreamManager(taskState, messageService, messageStateHandler, diffViewProvider, api, ulid)

		this.checkpointCoordinator = new TaskCheckpointCoordinator(
			taskState,
			messageService,
			messageStateHandler,
			stateManager,
			checkpointManager,
			taskId,
		)

		this.limitManager = new TaskLimitManager(taskState, messageService, stateManager)
	}

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
	 * - Automatic retry with context truncation (delegated to RetryService)
	 * - Manual retry prompts for users (delegated to RetryService)
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

		// Generate system prompt with all context
		const systemPrompt = await this.buildSystemPrompt()

		// Get conversation history with context management
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
		}

		// Create API stream
		const stream = this.api.createMessage(systemPrompt, contextManagementMetadata.truncatedConversationHistory)
		const iterator = stream[Symbol.asyncIterator]()

		try {
			// Await first chunk to see if it will throw an error
			this.retryService.setWaitingForFirstChunk(true)
			const firstChunk = await iterator.next()
			yield firstChunk.value
			this.retryService.setWaitingForFirstChunk(false)
		} catch (error) {
			// Delegate retry logic to RetryService
			const shouldRetry = await this.retryService.handleFirstChunkError(error, previousApiReqIndex)

			if (!shouldRetry) {
				throw new Error("API request failed")
			}

			// Retry by delegating to recursive call
			yield* this.attemptApiRequest(previousApiReqIndex)
			return
		}

		// No error, continue to yield all remaining chunks
		yield* iterator
	}

	/**
	 * Build system prompt with all context
	 *
	 * Gathers all necessary context (rules, settings, workspace info) and
	 * generates the system prompt for the API request.
	 *
	 * @returns Promise<string> - The system prompt
	 * @private
	 */
	private async buildSystemPrompt(): Promise<string> {
		const providerInfo = this.getCurrentProviderInfo()
		const ide = (await HostProvider.env.getHostVersion({})).platform || "Unknown"

		await this.migrateDisableBrowserToolSetting()
		const browserSettings = this.stateManager.getGlobalSettingsKey("browserSettings")
		const disableBrowserTool = browserSettings.disableToolUse ?? false
		const modelSupportsBrowserUse = providerInfo.model.info.supportsImages ?? false
		const supportsBrowserUse = modelSupportsBrowserUse && !disableBrowserTool

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
				name: root.name || path.basename(root.path),
				vcs: root.vcs as string | undefined,
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

		return await getSystemPrompt(promptContext)
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
			if (this.taskState.didCompleteReadingStream) {
				this.taskState.userMessageContentReady = true
			}
			this.taskState.presentAssistantMessageLocked = false
			return
		}

		const block = structuredClone(this.taskState.assistantMessageContent[this.taskState.currentStreamingContentIndex])

		switch (block.type) {
			case "text": {
				if (this.taskState.didRejectTool || this.taskState.didAlreadyUseTool) {
					break
				}

				let content = block.content
				if (content) {
					// Remove thinking tags and partial XML
					content = this.cleanThinkingTags(content)
					content = this.removePartialXmlTag(content)
				}

				if (!block.partial) {
					// Remove code block artifacts
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

		this.taskState.presentAssistantMessageLocked = false

		if (!block.partial || this.taskState.didRejectTool || this.taskState.didAlreadyUseTool) {
			if (this.taskState.currentStreamingContentIndex === this.taskState.assistantMessageContent.length - 1) {
				this.taskState.userMessageContentReady = true
			}

			this.taskState.currentStreamingContentIndex++
			this.presentAssistantMessage()
		}

		if (this.taskState.presentAssistantMessageHasPendingUpdates) {
			this.presentAssistantMessage()
		}
	}

	/**
	 * Clean thinking tags from content
	 * @private
	 */
	private cleanThinkingTags(content: string): string {
		content = content.replace(/<thinking>\s?/g, "")
		content = content.replace(/\s?<\/thinking>/g, "")
		return content
	}

	/**
	 * Remove partial XML tag at end of content
	 * @private
	 */
	private removePartialXmlTag(content: string): string {
		const lastOpenBracketIndex = content.lastIndexOf("<")
		if (lastOpenBracketIndex === -1) {
			return content
		}

		const possibleTag = content.slice(lastOpenBracketIndex)
		const hasCloseBracket = possibleTag.includes(">")
		if (hasCloseBracket) {
			return content
		}

		let tagContent: string
		if (possibleTag.startsWith("</")) {
			tagContent = possibleTag.slice(2).trim()
		} else {
			tagContent = possibleTag.slice(1).trim()
		}

		const isLikelyTagName = /^[a-zA-Z_]+$/.test(tagContent)
		const isOpeningOrClosing = possibleTag === "<" || possibleTag === "</"

		if (isOpeningOrClosing || isLikelyTagName) {
			return content.slice(0, lastOpenBracketIndex).trim()
		}

		return content
	}

	/**
	 * Main API request orchestration loop
	 *
	 * Recursively makes AI agent requests, processing responses and handling
	 * tool executions until task completion. This is the central coordination
	 * point for the entire AI agent interaction loop.
	 *
	 * Now delegates to specialized services for:
	 * - Limit checking (TaskLimitManager)
	 * - Checkpoint creation (TaskCheckpointCoordinator)
	 * - Stream processing (ApiStreamManager)
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

		// Increment API request counter
		this.taskState.apiRequestCount++
		this.taskState.apiRequestsSinceLastTodoUpdate++

		// Record model usage for telemetry
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

		// Check limits (delegates to LimitManager)
		const limitResult = await this.limitManager.checkLimitsBeforeRequest(userContent)
		if (!limitResult.shouldProceed) {
			return true // End loop
		}
		if (limitResult.updatedUserContent) {
			userContent = limitResult.updatedUserContent
		}

		// Get previous API request index
		const previousApiReqIndex = findLastIndex(this.messageStateHandler.getClineMessages(), (m) => m.say === "api_req_started")
		const isFirstRequest = this.messageStateHandler.getClineMessages().filter((m) => m.say === "api_req_started").length === 0

		// Show placeholder message while loading context
		await this.say(
			"api_req_started",
			JSON.stringify({
				request: userContent.map((block) => formatContentBlockToMarkdown(block)).join("\n\n") + "\n\nLoading...",
			}),
		)

		// Handle checkpoint (delegates to CheckpointCoordinator)
		await this.checkpointCoordinator.handleFirstRequestCheckpoint(isFirstRequest)

		// Load context and prepare user content
		userContent = await this.prepareUserContent(userContent, includeFileDetails, previousApiReqIndex, customPrompt)

		// Add to conversation history
		await this.messageStateHandler.addToApiConversationHistory({
			role: "user",
			content: userContent,
		})

		telemetryService.captureConversationTurnEvent(this.ulid, providerId, model.id, "user")

		// Capture task initialization timing for first request
		if (isFirstRequest) {
			const durationMs = Math.round(performance.now() - this.taskInitializationStartTime)
			telemetryService.captureTaskInitialization(this.ulid, this.taskId, durationMs, providerId)
		}

		// Update API request message
		const lastApiReqIndex = findLastIndex(this.messageStateHandler.getClineMessages(), (m) => m.say === "api_req_started")
		await this.messageStateHandler.updateClineMessage(lastApiReqIndex, {
			text: JSON.stringify({
				request: userContent.map((block) => formatContentBlockToMarkdown(block)).join("\n\n"),
			} satisfies ClineApiReqInfo),
		})
		await this.postStateToWebview()

		try {
			// Reset stream state (delegates to StreamManager)
			await this.streamManager.resetStreamState()

			// Process API stream (delegates to StreamManager)
			const stream = this.attemptApiRequest(previousApiReqIndex)
			const streamResult = await this.streamManager.processStream(stream, lastApiReqIndex, providerId, model.id)

			// If didn't receive usage chunk, fetch asynchronously
			if (!streamResult.didReceiveUsageChunk) {
				this.streamManager.fetchAndUpdateUsageAsync(lastApiReqIndex, streamResult.usage)
			}

			// Check for abort
			if (this.taskState.abort) {
				throw new Error("Cline instance aborted")
			}

			// Mark stream as complete
			this.streamManager.markStreamComplete()

			// Parse and present assistant message
			const didEndLoop = await this.handleAssistantResponse(
				streamResult.assistantMessage,
				streamResult.reasoningMessage,
				streamResult.antThinkingContent,
				streamResult.usage,
				lastApiReqIndex,
				providerId,
				model.id,
			)

			return didEndLoop
		} catch (_error) {
			// End loop on error
			return true
		}
	}

	/**
	 * Prepare user content with context loading
	 * @private
	 */
	private async prepareUserContent(
		userContent: UserContent,
		includeFileDetails: boolean,
		previousApiReqIndex: number,
		customPrompt?: string,
	): Promise<UserContent> {
		const useAutoCondense = this.stateManager.getGlobalSettingsKey("useAutoCondense")

		if (useAutoCondense && isNextGenModelFamily(this.api.getModel().id)) {
			const shouldCompact = this.shouldCompactContext(previousApiReqIndex)

			if (shouldCompact) {
				userContent.push({
					type: "text",
					text: summarizeTask(this.stateManager.getGlobalSettingsKey("focusChainSettings")),
				})
				this.taskState.lastAutoCompactTriggerIndex = previousApiReqIndex
			} else {
				const [parsedUserContent, environmentDetails] = await this.loadContext(userContent, includeFileDetails)
				userContent = parsedUserContent
				userContent.push({ type: "text", text: environmentDetails })
			}
		} else {
			const useCompactPrompt = customPrompt === "compact" && isLocalModel(this.getCurrentProviderInfo())
			const [parsedUserContent, environmentDetails] = await this.loadContext(
				userContent,
				includeFileDetails,
				useCompactPrompt,
			)
			userContent = parsedUserContent
			userContent.push({ type: "text", text: environmentDetails })
		}

		return userContent
	}

	/**
	 * Check if should compact context
	 * @private
	 */
	private shouldCompactContext(previousApiReqIndex: number): boolean {
		if (this.taskState.currentlySummarizing) {
			this.taskState.currentlySummarizing = false

			if (this.taskState.conversationHistoryDeletedRange) {
				const [start, end] = this.taskState.conversationHistoryDeletedRange
				const apiHistory = this.messageStateHandler.getApiConversationHistory()
				const safeEnd = Math.min(end + 2, apiHistory.length - 1)

				if (end + 2 <= safeEnd) {
					this.taskState.conversationHistoryDeletedRange = [start, end + 2]
					this.messageStateHandler.saveClineMessagesAndUpdateHistory()
				}
			}
			return false
		}

		const autoCondenseThreshold = this.stateManager.getGlobalSettingsKey("autoCondenseThreshold") as number | undefined
		const shouldCompact = this.contextManager.shouldCompactContextWindow(
			this.messageStateHandler.getClineMessages(),
			this.api,
			previousApiReqIndex,
			autoCondenseThreshold,
		)

		if (shouldCompact && this.taskState.conversationHistoryDeletedRange) {
			const apiHistory = this.messageStateHandler.getApiConversationHistory()
			const activeMessageCount = apiHistory.length - this.taskState.conversationHistoryDeletedRange[1] - 1

			if (activeMessageCount <= 2) {
				return false
			}
		}

		return shouldCompact
	}

	/**
	 * Handle assistant response after streaming completes
	 * @private
	 */
	private async handleAssistantResponse(
		assistantMessage: string,
		reasoningMessage: string,
		antThinkingContent: Array<Anthropic.Messages.RedactedThinkingBlock | Anthropic.Messages.ThinkingBlock>,
		usage: any,
		lastApiReqIndex: number,
		providerId: string,
		modelId: string,
	): Promise<boolean> {
		if (assistantMessage.length === 0) {
			return await this.handleEmptyAssistantMessage()
		}

		// Parse assistant message
		this.taskState.assistantMessageContent = parseAssistantMessageV2(assistantMessage)

		// Present content to user
		this.presentAssistantMessage()

		// Wait for presentation to complete
		await pWaitFor(() => this.taskState.userMessageContentReady)

		// Update API request message with final usage
		await updateApiReqMsg({
			messageStateHandler: this.messageStateHandler,
			lastApiReqIndex,
			...usage,
			api: this.api,
		})
		await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
		await this.postStateToWebview()

		// Add to conversation history
		telemetryService.captureConversationTurnEvent(this.ulid, providerId, modelId, "assistant", {
			tokensIn: usage.inputTokens,
			tokensOut: usage.outputTokens,
			...usage,
		})

		await this.messageStateHandler.addToApiConversationHistory({
			role: "assistant",
			content: [
				...antThinkingContent,
				{
					type: "text",
					text: assistantMessage,
				},
			] as Array<
				Anthropic.Messages.RedactedThinkingBlock | Anthropic.Messages.ThinkingBlock | Anthropic.Messages.TextBlock
			>,
		})

		// Check if model used tools
		const didToolUse = this.taskState.assistantMessageContent.some((block) => block.type === "tool_use")

		if (!didToolUse) {
			this.taskState.userMessageContent.push({
				type: "text",
				text: formatResponse.noToolsUsed(),
			})
			this.limitManager.incrementMistakeCount()
		}

		// Recurse
		return await this.recursivelyMakeClineRequests(this.taskState.userMessageContent)
	}

	/**
	 * Handle empty assistant message error
	 * @private
	 */
	private async handleEmptyAssistantMessage(): Promise<boolean> {
		const { model, providerId } = this.getCurrentProviderInfo()
		const reqId = this.getApiRequestIdSafe()

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
			content: [{ type: "text", text: "Failure: I did not provide a response." }],
		})

		const { response } = await this.ask(
			"api_req_failed",
			"No assistant message was received. Would you like to retry the request?",
		)

		if (response === "yesButtonClicked") {
			return false // Continue loop
		}

		return true // End loop
	}
}
