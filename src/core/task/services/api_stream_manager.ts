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
							await this.messageService.say("reasoning", reasoningMessage, undefined, undefined, true)
						}
						break

					case "reasoning_details":
						// For cline/openrouter providers
						reasoningDetails.push(chunk.reasoning_details)
						break

					case "ant_thinking":
						// For anthropic providers
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

					case "text":
						if (reasoningMessage && assistantMessage.length === 0) {
							// Complete reasoning message
							await this.messageService.say("reasoning", reasoningMessage, undefined, undefined, false)
						}
						assistantMessage += chunk.text

						// Parse and present accumulated text incrementally for real-time streaming
						if (!this.taskState.abort) {
							await this.parseAndPresentStreamingText(assistantMessage)
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
		modelId: string,
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
