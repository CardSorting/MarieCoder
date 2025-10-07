import { Anthropic } from "@anthropic-ai/sdk"
import { ApiHandler } from "@core/api"
import { formatResponse } from "@core/prompts/response_formatters"
import { ClineApiReqInfo, ClineMessage } from "@shared/ExtensionMessage"
import { ContextHistoryStorage } from "./context_history_storage"
import { ContextHistoryMap, ContextUpdate, TruncationStrategy } from "./context_types"
import { ContextUpdateApplicator } from "./context_update_applicator"
import { getContextWindowInfo } from "./context_window_utils"
import { FileReadOptimizer } from "./file_read_optimizer"
import { OptimizationMetrics } from "./optimization_metrics"
import { TruncationCalculator } from "./truncation_calculator"

/**
 * Orchestrates context window optimization and history tracking for conversation management
 *
 * This class serves as the main coordinator for the context management system, delegating
 * responsibilities to specialized modules:
 *
 * - **ContextHistoryStorage**: Handles persistence to/from disk
 * - **TruncationCalculator**: Calculates which messages to remove
 * - **FileReadOptimizer**: Finds and replaces duplicate file reads
 * - **ContextUpdateApplicator**: Applies updates to messages
 * - **OptimizationMetrics**: Measures impact of optimizations
 *
 * The ContextManager maintains the central context history and coordinates these modules
 * to provide an efficient, optimized conversation context for the AI.
 */
export class ContextManager {
	/**
	 * Central storage of all context history updates
	 * Format: { messageIndex => [EditType, { blockIndex => [[timestamp, updateType, update, metadata], ...] }] }
	 */
	private contextHistory: ContextHistoryMap

	/**
	 * Specialized modules for different aspects of context management
	 */
	private readonly storage: ContextHistoryStorage
	private readonly truncationCalculator: TruncationCalculator
	private readonly fileReadOptimizer: FileReadOptimizer
	private readonly updateApplicator: ContextUpdateApplicator
	private readonly metrics: OptimizationMetrics

	constructor() {
		this.contextHistory = new Map()
		this.storage = new ContextHistoryStorage()
		this.truncationCalculator = new TruncationCalculator()
		this.fileReadOptimizer = new FileReadOptimizer()
		this.updateApplicator = new ContextUpdateApplicator()
		this.metrics = new OptimizationMetrics()
	}

	/**
	 * Initializes context history from disk if it exists
	 * @param taskDirectory - Directory where task data is stored
	 */
	async initializeContextHistory(taskDirectory: string): Promise<void> {
		this.contextHistory = await this.storage.loadFromDisk(taskDirectory)
	}

	/**
	 * Determines whether context window should be compacted based on token usage
	 * @param clineMessages - All conversation messages
	 * @param api - API handler containing model context window info
	 * @param previousApiReqIndex - Index of the previous API request
	 * @param thresholdPercentage - Optional custom threshold (0-1) of context window to trigger compaction
	 * @returns True if context should be compacted
	 */
	shouldCompactContextWindow(
		clineMessages: ClineMessage[],
		api: ApiHandler,
		previousApiReqIndex: number,
		thresholdPercentage?: number,
	): boolean {
		if (previousApiReqIndex >= 0) {
			const previousRequest = clineMessages[previousApiReqIndex]
			if (previousRequest?.text) {
				const { tokensIn, tokensOut, cacheWrites, cacheReads }: ClineApiReqInfo = JSON.parse(previousRequest.text)
				const totalTokens = (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0)

				const { contextWindow, maxAllowedSize } = getContextWindowInfo(api)
				const roundedThreshold = thresholdPercentage ? Math.floor(contextWindow * thresholdPercentage) : maxAllowedSize
				const thresholdTokens = Math.min(roundedThreshold, maxAllowedSize)
				return totalTokens >= thresholdTokens
			}
		}
		return false
	}

	/**
	 * Gets telemetry data for context management decisions
	 * @param clineMessages - All conversation messages
	 * @param api - API handler containing model info
	 * @param triggerIndex - Optional specific index to check (defaults to second-to-last API request)
	 * @returns Token usage and context window info that drove summarization, or null if not found
	 */
	getContextTelemetryData(
		clineMessages: ClineMessage[],
		api: ApiHandler,
		triggerIndex?: number,
	): {
		tokensUsed: number
		maxContextWindow: number
	} | null {
		const targetIndex = this.determineTelemetryIndex(clineMessages, triggerIndex)

		if (targetIndex >= 0) {
			const targetRequest = clineMessages[targetIndex]
			if (targetRequest?.text) {
				try {
					const { tokensIn, tokensOut, cacheWrites, cacheReads }: ClineApiReqInfo = JSON.parse(targetRequest.text)
					const tokensUsed = (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0)
					const { contextWindow } = getContextWindowInfo(api)

					return {
						tokensUsed,
						maxContextWindow: contextWindow,
					}
				} catch (error) {
					console.error("Error parsing API request info for context telemetry:", error)
				}
			}
		}
		return null
	}

	/**
	 * Determines which message index to use for telemetry
	 */
	private determineTelemetryIndex(clineMessages: ClineMessage[], triggerIndex?: number): number {
		if (triggerIndex !== undefined) {
			return triggerIndex
		}

		// Find all API request indices
		const apiRequestIndices = clineMessages
			.map((message, index) => (message.say === "api_req_started" ? index : -1))
			.filter((index) => index !== -1)

		// Use second-to-last API request (the one that caused summarization)
		return apiRequestIndices.length >= 2 ? apiRequestIndices[apiRequestIndices.length - 2] : -1
	}

	/**
	 * Primary entry point for getting up-to-date context messages and metadata
	 *
	 * This method coordinates the entire context management workflow:
	 * 1. Checks if context window is approaching limits
	 * 2. Attempts optimization (removing duplicate file reads)
	 * 3. Determines if truncation is needed
	 * 4. Applies updates and returns optimized context
	 *
	 * @param apiConversationHistory - Current API conversation history
	 * @param clineMessages - All conversation messages
	 * @param api - API handler
	 * @param conversationHistoryDeletedRange - Current deleted range, if any
	 * @param previousApiReqIndex - Index of previous API request
	 * @param taskDirectory - Directory for persisting updates
	 * @param useAutoCondense - Whether to use auto-condense (true) or programmatic context management (false)
	 * @returns Updated conversation info including deleted range and truncated history
	 */
	async getNewContextMessagesAndMetadata(
		apiConversationHistory: Anthropic.Messages.MessageParam[],
		clineMessages: ClineMessage[],
		api: ApiHandler,
		conversationHistoryDeletedRange: [number, number] | undefined,
		previousApiReqIndex: number,
		taskDirectory: string,
		useAutoCondense: boolean,
	) {
		let updatedConversationHistoryDeletedRange = false

		if (!useAutoCondense) {
			const result = await this.handleContextOptimization(
				apiConversationHistory,
				clineMessages,
				api,
				conversationHistoryDeletedRange,
				previousApiReqIndex,
				taskDirectory,
			)

			if (result) {
				conversationHistoryDeletedRange = result.deletedRange
				updatedConversationHistoryDeletedRange = result.wasUpdated
			}
		}

		const truncatedConversationHistory = this.updateApplicator.applyUpdates(
			apiConversationHistory,
			this.contextHistory,
			conversationHistoryDeletedRange,
		)

		return {
			conversationHistoryDeletedRange,
			updatedConversationHistoryDeletedRange,
			truncatedConversationHistory,
		}
	}

	/**
	 * Handles context optimization when approaching token limits
	 */
	private async handleContextOptimization(
		apiConversationHistory: Anthropic.Messages.MessageParam[],
		clineMessages: ClineMessage[],
		api: ApiHandler,
		conversationHistoryDeletedRange: [number, number] | undefined,
		previousApiReqIndex: number,
		taskDirectory: string,
	): Promise<{ deletedRange: [number, number]; wasUpdated: boolean } | null> {
		if (previousApiReqIndex < 0) {
			return null
		}

		const previousRequest = clineMessages[previousApiReqIndex]
		if (!previousRequest?.text) {
			return null
		}

		const timestamp = previousRequest.ts
		const { tokensIn, tokensOut, cacheWrites, cacheReads }: ClineApiReqInfo = JSON.parse(previousRequest.text)
		const totalTokens = (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0)
		const { maxAllowedSize } = getContextWindowInfo(api)

		// Check if we're close to hitting the context window
		if (totalTokens < maxAllowedSize) {
			return null
		}

		// Determine truncation strategy
		const strategy: TruncationStrategy = totalTokens / 2 > maxAllowedSize ? "quarter" : "half"

		// Try context optimizations first
		const [hasOptimizations, optimizedIndices] = this.applyContextOptimizations(
			apiConversationHistory,
			conversationHistoryDeletedRange ? conversationHistoryDeletedRange[1] + 1 : 2,
			timestamp,
		)

		let shouldTruncate = true
		if (hasOptimizations) {
			// Check if optimizations saved enough space to avoid truncation
			const impact = this.metrics.calculateImpact(
				apiConversationHistory,
				this.contextHistory,
				conversationHistoryDeletedRange,
				optimizedIndices,
			)

			if (impact >= 0.3) {
				shouldTruncate = false
			}
		}

		if (shouldTruncate) {
			// Apply truncation notices
			const hasNotice = this.addTruncationNotice(timestamp)
			const hasUserUpdate = this.updateFirstUserMessage(timestamp, apiConversationHistory)
			const hasContextUpdates = hasOptimizations || hasNotice || hasUserUpdate

			// Calculate next truncation range
			const deletedRange = this.truncationCalculator.calculateRange(
				apiConversationHistory,
				conversationHistoryDeletedRange,
				strategy,
			)

			// Save context history if we made any changes
			if (hasContextUpdates) {
				await this.storage.saveToDisk(taskDirectory, this.contextHistory)
			}

			return { deletedRange, wasUpdated: true }
		} else if (hasOptimizations) {
			// Save optimizations even if not truncating
			await this.storage.saveToDisk(taskDirectory, this.contextHistory)
		}

		return null
	}

	/**
	 * Calculates the next truncation range for context compaction
	 * @param apiMessages - Current API messages
	 * @param currentDeletedRange - Current deleted range, if any
	 * @param strategy - Strategy for how much to keep
	 * @returns Inclusive range [start, end] to be removed from conversation history
	 */
	public calculateTruncationRange(
		apiMessages: Anthropic.Messages.MessageParam[],
		currentDeletedRange: [number, number] | undefined,
		strategy: TruncationStrategy,
	): [number, number] {
		return this.truncationCalculator.calculateRange(apiMessages, currentDeletedRange, strategy)
	}

	/**
	 * Gets truncated messages with all updates applied (external interface for backward compatibility)
	 * @param messages - Messages to truncate
	 * @param deletedRange - Range to delete, if any
	 * @returns Truncated messages with updates applied
	 */
	public getTruncatedMessages(
		messages: Anthropic.Messages.MessageParam[],
		deletedRange: [number, number] | undefined,
	): Anthropic.Messages.MessageParam[] {
		return this.updateApplicator.applyUpdates(messages, this.contextHistory, deletedRange)
	}

	/**
	 * Removes all context history updates after the specified timestamp and saves to disk
	 * Used for checkpoint restoration.
	 *
	 * @param timestamp - Timestamp to truncate from
	 * @param taskDirectory - Directory where context history is stored
	 */
	async truncateContextHistory(timestamp: number, taskDirectory: string): Promise<void> {
		this.updateApplicator.removeUpdatesAfterTimestamp(this.contextHistory, timestamp)
		await this.storage.saveToDisk(taskDirectory, this.contextHistory)
	}

	/**
	 * Applies context optimization steps (e.g., removing duplicate file reads)
	 * @param apiMessages - API messages to optimize
	 * @param startFromIndex - Index to start optimization from
	 * @param timestamp - Timestamp for this optimization
	 * @returns Tuple of [whether any updates were made, set of updated message indices]
	 */
	public applyContextOptimizations(
		apiMessages: Anthropic.Messages.MessageParam[],
		startFromIndex: number,
		timestamp: number,
	): [boolean, Set<number>] {
		return this.fileReadOptimizer.findAndSaveDuplicates(apiMessages, this.contextHistory, startFromIndex, timestamp)
	}

	/**
	 * Triggers application of standard context truncation notice
	 * @param timestamp - Timestamp for this update
	 * @param taskDirectory - Directory where context history is stored
	 * @param apiConversationHistory - Current conversation history
	 */
	async triggerApplyStandardContextTruncationNoticeChange(
		timestamp: number,
		taskDirectory: string,
		apiConversationHistory: Anthropic.Messages.MessageParam[],
	): Promise<void> {
		const assistantUpdated = this.addTruncationNotice(timestamp)
		const userUpdated = this.updateFirstUserMessage(timestamp, apiConversationHistory)

		if (assistantUpdated || userUpdated) {
			await this.storage.saveToDisk(taskDirectory, this.contextHistory)
		}
	}

	/**
	 * Adds truncation notice to first assistant message if not already present
	 * @param timestamp - Timestamp for this update
	 * @returns True if update was applied
	 */
	private addTruncationNotice(timestamp: number): boolean {
		if (!this.contextHistory.has(1)) {
			const innerMap = new Map<number, ContextUpdate[]>()
			innerMap.set(0, [[timestamp, "text", [formatResponse.contextTruncationNotice()], []]])
			this.contextHistory.set(1, [0, innerMap])
			return true
		}
		return false
	}

	/**
	 * Updates the first user message when context window is compacted
	 * @param timestamp - Timestamp for this update
	 * @param apiConversationHistory - Current conversation history
	 * @returns True if update was applied
	 */
	private updateFirstUserMessage(timestamp: number, apiConversationHistory: Anthropic.Messages.MessageParam[]): boolean {
		if (!this.contextHistory.has(0)) {
			try {
				const firstUserMessage = this.extractFirstUserMessage(apiConversationHistory)

				if (firstUserMessage) {
					const processedMessage = formatResponse.processFirstUserMessageForTruncation(firstUserMessage)

					const innerMap = new Map<number, ContextUpdate[]>()
					innerMap.set(0, [[timestamp, "text", [processedMessage], []]])
					this.contextHistory.set(0, [0, innerMap])

					return true
				}
			} catch (error) {
				console.error("updateFirstUserMessage error:", error)
			}
		}
		return false
	}

	/**
	 * Extracts the first user message text from conversation history
	 */
	private extractFirstUserMessage(apiConversationHistory: Anthropic.Messages.MessageParam[]): string {
		const message = apiConversationHistory[0]
		if (Array.isArray(message.content)) {
			const block = message.content[0]
			if (block?.type === "text") {
				return block.text
			}
		}
		return ""
	}
}
