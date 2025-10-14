import { ErrorService } from "@core/api/services/error-service"
import type { ContextManager } from "@core/context/context-management/context_manager"
import { checkContextWindowExceededError } from "@core/context/context-management/context-error-handling"
import { ensureTaskDirectoryExists } from "@core/storage/disk"
import { findLastIndex } from "@shared/array"
import type { ClineApiReqInfo } from "@shared/ExtensionMessage"
import type { MessageStateHandler } from "../message-state"
import type { TaskState } from "../TaskState"
import type { TaskMessageService } from "./task_message_service"

/**
 * Handles API request retry logic with automatic context truncation
 *
 * This service manages the retry flow when API requests fail, particularly
 * for context window exceeded errors. It coordinates with the context manager
 * to automatically truncate conversation history and retry once, then presents
 * manual retry options to the user if automatic retry fails.
 *
 * Responsibilities:
 * - Detect and handle context window exceeded errors
 * - Automatically truncate context and retry once
 * - Present retry options to users after automatic retry
 * - Update API request messages with retry status
 * - Clear error states on manual retry
 *
 * @example
 * ```typescript
 * const retryService = new ApiRetryService(...)
 * const shouldRetry = await retryService.handleFirstChunkError(error, previousApiReqIndex)
 * ```
 */
export class ApiRetryService {
	constructor(
		private readonly taskState: TaskState,
		private readonly messageService: TaskMessageService,
		private readonly messageStateHandler: MessageStateHandler,
		private readonly contextManager: ContextManager,
		private readonly taskId: string,
	) {}

	/**
	 * Handle first chunk error with automatic retry logic
	 *
	 * When an API request fails on the first chunk (before streaming begins),
	 * this method determines whether to automatically retry with context truncation
	 * or to ask the user to manually retry.
	 *
	 * Automatic retry happens once per request for context window exceeded errors.
	 * After the automatic retry, users must manually approve any further retries.
	 *
	 * @param error - The error that occurred on first chunk
	 * @param previousApiReqIndex - Index of the previous API request message
	 * @returns Promise<boolean> - True if should retry, false otherwise
	 */
	async handleFirstChunkError(error: unknown, _previousApiReqIndex: number): Promise<boolean> {
		const isContextWindowExceededError = checkContextWindowExceededError(error)
		const clineError = ErrorService.toClineError(error)

		if (isContextWindowExceededError && !this.taskState.didAutomaticallyRetryFailedApiRequest) {
			// Automatically truncate and retry once
			await this.handleContextWindowExceededError()
			return true
		}

		// Request failed after automatic retry or wasn't a context window error
		// Ask user if they want to manually retry

		if (isContextWindowExceededError) {
			const truncatedConversationHistory = this.contextManager.getTruncatedMessages(
				this.messageStateHandler.getApiConversationHistory(),
				this.taskState.conversationHistoryDeletedRange,
			)

			// If conversation has more than 3 messages, we can truncate again
			// Otherwise, the conversation is bricked
			if (truncatedConversationHistory.length > 3) {
				clineError.message = "Context window exceeded. Click retry to truncate the conversation and try again."
				this.taskState.didAutomaticallyRetryFailedApiRequest = false
			}
		}

		const streamingFailedMessage = clineError.serialize()

		// Update the 'api_req_started' message with failure details
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
					...currentApiReqInfo,
					streamingFailedMessage,
				} satisfies ClineApiReqInfo),
			})
		}

		// Ask user if they want to manually retry
		const { response } = await this.messageService.ask("api_req_failed", streamingFailedMessage)

		if (response !== "yesButtonClicked") {
			// User declined retry - task will be cancelled
			return false
		}

		// Clear streamingFailedMessage when user manually retries
		await this.clearRetryErrorMessage()

		await this.messageService.say("api_req_retried")

		// Reset the automatic retry flag so the request can proceed
		this.taskState.didAutomaticallyRetryFailedApiRequest = false

		return true
	}

	/**
	 * Handle context window exceeded error with automatic retry
	 *
	 * Automatically truncates conversation history to 1/4 size and sets up
	 * state for a retry. This is done once per request automatically.
	 *
	 * The truncation range is calculated by the context manager and applied
	 * to the conversation history. A notice is added to inform the user
	 * about the truncation.
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
	 * Clear retry error message from API request
	 *
	 * When user manually retries after a failure, this removes the error
	 * message from the API request info to show a clean retry state.
	 *
	 * @private
	 */
	private async clearRetryErrorMessage(): Promise<void> {
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
	}

	/**
	 * Check if waiting for first chunk response
	 *
	 * @returns True if currently waiting for first chunk
	 */
	isWaitingForFirstChunk(): boolean {
		return this.taskState.isWaitingForFirstChunk
	}

	/**
	 * Set waiting for first chunk state
	 *
	 * @param waiting - Whether currently waiting for first chunk
	 */
	setWaitingForFirstChunk(waiting: boolean): void {
		this.taskState.isWaitingForFirstChunk = waiting
	}
}
