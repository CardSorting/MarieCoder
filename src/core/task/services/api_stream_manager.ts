import { Anthropic } from "@anthropic-ai/sdk"
import type { ApiStream } from "@core/api/transform/stream"
import { parseAssistantMessageV2 } from "@core/assistant-message/parse-assistant-message"
import type { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import { telemetryService } from "@services/telemetry"
import type { ClineApiReqCancelReason } from "@shared/ExtensionMessage"
import type { ApiHandler } from "@/core/api"
import type { MessageStateHandler } from "../message-state"
import type { TaskState } from "../TaskState"
import { updateApiReqMsg } from "../utils"
import type { TaskMessageService } from "./task_message_service"

/**
 * Token usage tracking data
 */
export interface TokenUsage {
	inputTokens: number
	outputTokens: number
	cacheWriteTokens: number
	cacheReadTokens: number
	totalCost: number | undefined
}

/**
 * Manages API response stream processing and token tracking
 *
 * This service handles the streaming of AI responses, parsing chunks,
 * tracking token usage, and managing stream lifecycle (including abortion).
 * It processes different chunk types (usage, reasoning, text) and coordinates
 * with the message service to present content to the user.
 *
 * Responsibilities:
 * - Read and process API response streams
 * - Track token usage (input, output, cache read/write)
 * - Calculate costs from usage data
 * - Handle stream abortion gracefully
 * - Process reasoning and thinking blocks
 * - Coordinate with diff view provider
 *
 * @example
 * ```typescript
 * const streamManager = new ApiStreamManager(...)
 * const usage = await streamManager.processStream(stream, lastApiReqIndex)
 * ```
 */
export class ApiStreamManager {
	// Throttling for incremental updates
	private lastThinkingUpdateTime = 0
	private lastTextUpdateTime = 0
	private readonly UPDATE_THROTTLE_MS = 50 // Update UI at most every 50ms

	constructor(
		private readonly taskState: TaskState,
		private readonly messageService: TaskMessageService,
		private readonly messageStateHandler: MessageStateHandler,
		private readonly diffViewProvider: DiffViewProvider,
		private readonly api: ApiHandler,
		private readonly ulid: string,
		private readonly presentAssistantMessage?: () => Promise<void>,
	) {}

	/**
	 * Process API response stream and return token usage
	 *
	 * Reads chunks from the API stream, processes different chunk types,
	 * and tracks token usage. Handles stream abortion, reasoning blocks,
	 * and assistant message parsing.
	 *
	 * The stream can be interrupted by:
	 * - User cancellation (taskState.abort)
	 * - Tool rejection (taskState.didRejectTool)
	 * - Already used tool (taskState.didAlreadyUseTool)
	 *
	 * @param stream - The async generator stream from the API
	 * @param lastApiReqIndex - Index of the API request message
	 * @param providerId - The provider ID for telemetry
	 * @param modelId - The model ID for telemetry
	 * @returns Promise<{usage: TokenUsage, assistantMessage: string, reasoningMessage: string, antThinkingContent: array}>
	 */
	async processStream(
		stream: ApiStream,
		lastApiReqIndex: number,
		providerId: string,
		modelId: string,
	): Promise<{
		usage: TokenUsage
		assistantMessage: string
		reasoningMessage: string
		antThinkingContent: Array<Anthropic.Messages.RedactedThinkingBlock | Anthropic.Messages.ThinkingBlock>
		didReceiveUsageChunk: boolean
	}> {
		let inputTokens = 0
		let outputTokens = 0
		let cacheWriteTokens = 0
		let cacheReadTokens = 0
		let totalCost: number | undefined

		let assistantMessage = ""
		let reasoningMessage = ""
		let accumulatedThinkingText = "" // For displaying extended thinking to user
		const reasoningDetails: any[] = []
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
						// Reasoning always comes before assistant message
						reasoningMessage += chunk.reasoning
						// Fixes bug where cancelling task > aborts task > for loop may be in
						// middle of streaming reasoning > say function throws error before we
						// get a chance to properly clean up and cancel the task
						if (!this.taskState.abort) {
							// Throttle reasoning updates for better performance
							await this.throttledThinkingUpdate(reasoningMessage)
						}
						break

					case "reasoning_details":
						// For cline/openrouter providers
						reasoningDetails.push(chunk.reasoning_details)
						break

					case "ant_thinking":
						// For anthropic providers - accumulate for API history
						antThinkingContent.push({
							type: "thinking",
							thinking: chunk.thinking,
							signature: chunk.signature,
						})

						// Also display to user incrementally
						accumulatedThinkingText += chunk.thinking
						if (!this.taskState.abort) {
							// Throttle thinking updates for better performance
							await this.throttledThinkingUpdate(accumulatedThinkingText)
						}
						break

					case "ant_redacted_thinking":
						antThinkingContent.push({
							type: "redacted_thinking",
							data: chunk.data,
						})

						// Display redacted thinking indication to user
						if (!this.taskState.abort && accumulatedThinkingText.length === 0) {
							accumulatedThinkingText = "[Extended thinking in progress...]"
							await this.throttledThinkingUpdate(accumulatedThinkingText)
						}
						break

					case "text":
						if (reasoningMessage && assistantMessage.length === 0) {
							// Complete reasoning message
							await this.messageService.say("reasoning", reasoningMessage, undefined, undefined, false)
						} else if (accumulatedThinkingText && assistantMessage.length === 0) {
							// Complete extended thinking message
							await this.messageService.say("reasoning", accumulatedThinkingText, undefined, undefined, false)
						}
						assistantMessage += chunk.text

						// Parse and present accumulated text incrementally with throttling
						if (!this.taskState.abort) {
							await this.throttledTextUpdate(assistantMessage)
						}
						break
				}

				// Check for abortion conditions
				if (this.taskState.abort) {
					if (!this.taskState.abandoned) {
						// Only gracefully abort if not abandoned
						await this.abortStream(
							lastApiReqIndex,
							assistantMessage,
							{ inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens, totalCost },
							"user_cancelled",
							providerId,
							modelId,
						)
					}
					break
				}

				if (this.taskState.didRejectTool) {
					// Tool was rejected, interrupt the assistant's response
					assistantMessage += "\n\n[Response interrupted by user feedback]"
					break
				}

				if (this.taskState.didAlreadyUseTool) {
					assistantMessage +=
						"\n\n[Response interrupted by a tool use result. Only one tool may be used at a time and should be placed at the end of the message.]"
					break
				}
			}
		} catch (error) {
			// If not abandoned, re-throw for parent to handle
			if (!this.taskState.abandoned) {
				throw error
			}
		} finally {
			this.taskState.isStreaming = false

			// Flush any pending throttled updates
			await this.flushPendingUpdates(reasoningMessage, accumulatedThinkingText, assistantMessage)
		}

		return {
			usage: { inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens, totalCost },
			assistantMessage,
			reasoningMessage,
			antThinkingContent,
			didReceiveUsageChunk,
		}
	}

	/**
	 * Flush any pending throttled updates at the end of streaming
	 *
	 * Ensures the final state is presented even if the last update was throttled.
	 *
	 * @param reasoningMessage - Final reasoning message
	 * @param thinkingMessage - Final extended thinking message
	 * @param assistantMessage - Final assistant message
	 * @private
	 */
	private async flushPendingUpdates(
		reasoningMessage: string,
		thinkingMessage: string,
		assistantMessage: string,
	): Promise<void> {
		try {
			// Flush thinking/reasoning if present
			if (reasoningMessage || thinkingMessage) {
				const finalThinking = reasoningMessage || thinkingMessage
				await this.messageService.say("reasoning", finalThinking, undefined, undefined, false)
			}

			// Flush final text content
			if (assistantMessage) {
				await this.parseAndPresentStreamingText(assistantMessage)
			}
		} catch (error) {
			console.error("Error flushing pending updates:", error)
		}
	}

	/**
	 * Throttled update for thinking/reasoning streams
	 *
	 * Reduces UI update frequency to improve performance during heavy streaming.
	 * Updates at most once every UPDATE_THROTTLE_MS milliseconds.
	 *
	 * @param thinkingText - The accumulated thinking/reasoning text
	 * @private
	 */
	private async throttledThinkingUpdate(thinkingText: string): Promise<void> {
		const now = Date.now()
		if (now - this.lastThinkingUpdateTime >= this.UPDATE_THROTTLE_MS) {
			this.lastThinkingUpdateTime = now
			await this.messageService.say("reasoning", thinkingText, undefined, undefined, true)
		}
	}

	/**
	 * Throttled update for text streams
	 *
	 * Reduces parsing and UI update frequency to improve performance during heavy streaming.
	 * Updates at most once every UPDATE_THROTTLE_MS milliseconds.
	 *
	 * @param assistantMessage - The accumulated assistant message text
	 * @private
	 */
	private async throttledTextUpdate(assistantMessage: string): Promise<void> {
		const now = Date.now()
		if (now - this.lastTextUpdateTime >= this.UPDATE_THROTTLE_MS) {
			this.lastTextUpdateTime = now
			await this.parseAndPresentStreamingText(assistantMessage)
		}
	}

	/**
	 * Parse and present streaming text incrementally
	 *
	 * Parses the accumulated assistant message and updates the task state's
	 * assistantMessageContent array. If presentAssistantMessage is provided,
	 * it triggers UI updates to show content as it streams.
	 *
	 * @param assistantMessage - The accumulated assistant message text
	 * @private
	 */
	private async parseAndPresentStreamingText(assistantMessage: string): Promise<void> {
		try {
			// Parse the accumulated text to extract content blocks (text + tool_use)
			const parsedContent = parseAssistantMessageV2(assistantMessage)

			// Calculate previous content length to detect new blocks
			const previousContentLength = this.taskState.assistantMessageContent.length

			// Update the task state with parsed content
			this.taskState.assistantMessageContent = parsedContent

			// If we have a presentation callback and new content was added, trigger it
			if (this.presentAssistantMessage && parsedContent.length > previousContentLength) {
				// Reset userMessageContentReady when new content arrives
				this.taskState.userMessageContentReady = false
				// Trigger presentation of new content (non-blocking)
				this.presentAssistantMessage().catch((error) => {
					// Silently catch presentation errors to avoid interrupting the stream
					console.error("Error presenting streaming content:", error)
				})
			}
		} catch (error) {
			// Parsing errors shouldn't interrupt the stream
			console.error("Error parsing streaming text:", error)
		}
	}

	/**
	 * Abort the current stream gracefully
	 *
	 * Handles stream abortion by:
	 * - Reverting any pending diff changes
	 * - Completing any partial messages
	 * - Adding interruption notice to conversation history
	 * - Updating API request message with cancellation reason
	 * - Sending telemetry
	 *
	 * @param lastApiReqIndex - Index of the API request message
	 * @param assistantMessage - The partial assistant message
	 * @param usage - Current token usage data
	 * @param cancelReason - Reason for cancellation
	 * @param providerId - Provider ID for telemetry
	 * @param modelId - Model ID for telemetry
	 */
	private async abortStream(
		lastApiReqIndex: number,
		assistantMessage: string,
		usage: TokenUsage,
		cancelReason: ClineApiReqCancelReason,
		providerId: string,
		_modelId: string,
		streamingFailedMessage?: string,
	): Promise<void> {
		// Revert any pending diff changes
		if (this.diffViewProvider.isEditing) {
			await this.diffViewProvider.revertChanges()
		}

		// Complete any partial message
		const lastMessage = this.messageStateHandler.getClineMessages().at(-1)
		if (lastMessage?.partial) {
			lastMessage.partial = false
		}

		// Add interruption notice to conversation history
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

		// Update API request message with cancellation info and cost
		await updateApiReqMsg({
			messageStateHandler: this.messageStateHandler,
			lastApiReqIndex,
			inputTokens: usage.inputTokens,
			outputTokens: usage.outputTokens,
			cacheWriteTokens: usage.cacheWriteTokens,
			cacheReadTokens: usage.cacheReadTokens,
			totalCost: usage.totalCost,
			api: this.api,
			cancelReason,
			streamingFailedMessage,
		})

		await this.messageStateHandler.saveClineMessagesAndUpdateHistory()

		// Send telemetry
		telemetryService.captureConversationTurnEvent(this.ulid, providerId, this.api.getModel().id, "assistant", {
			tokensIn: usage.inputTokens,
			tokensOut: usage.outputTokens,
			cacheWriteTokens: usage.cacheWriteTokens,
			cacheReadTokens: usage.cacheReadTokens,
			totalCost: usage.totalCost,
		})

		// Signal that abort is complete
		this.taskState.didFinishAbortingStream = true
	}

	/**
	 * Fetch usage data from API after stream completes
	 *
	 * Some providers (OpenRouter/Cline) don't return token usage as part of
	 * the stream. This method fetches the usage asynchronously after streaming
	 * completes and updates the API request message in the background.
	 *
	 * @param lastApiReqIndex - Index of the API request message
	 * @param currentUsage - Current usage data to add to
	 */
	async fetchAndUpdateUsageAsync(lastApiReqIndex: number, currentUsage: TokenUsage): Promise<void> {
		const apiStreamUsage = await this.api.getApiStreamUsage?.()

		if (apiStreamUsage) {
			currentUsage.inputTokens += apiStreamUsage.inputTokens
			currentUsage.outputTokens += apiStreamUsage.outputTokens
			currentUsage.cacheWriteTokens += apiStreamUsage.cacheWriteTokens ?? 0
			currentUsage.cacheReadTokens += apiStreamUsage.cacheReadTokens ?? 0
			currentUsage.totalCost = apiStreamUsage.totalCost
		}

		await updateApiReqMsg({
			messageStateHandler: this.messageStateHandler,
			lastApiReqIndex,
			inputTokens: currentUsage.inputTokens,
			outputTokens: currentUsage.outputTokens,
			cacheWriteTokens: currentUsage.cacheWriteTokens,
			cacheReadTokens: currentUsage.cacheReadTokens,
			api: this.api,
			totalCost: currentUsage.totalCost,
		})

		await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
	}

	/**
	 * Reset stream state for new request
	 *
	 * Clears all streaming state variables and resets the diff view provider.
	 * Should be called before starting a new API request stream.
	 */
	async resetStreamState(): Promise<void> {
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
	}

	/**
	 * Mark stream reading as complete
	 *
	 * Sets flags indicating that the stream has finished and any partial
	 * blocks should be completed. This allows the presentation logic to
	 * finish processing all content.
	 */
	markStreamComplete(): void {
		this.taskState.didCompleteReadingStream = true

		// Set all partial blocks to complete
		const partialBlocks = this.taskState.assistantMessageContent.filter((block) => block.partial)
		partialBlocks.forEach((block) => {
			block.partial = false
		})
	}
}
