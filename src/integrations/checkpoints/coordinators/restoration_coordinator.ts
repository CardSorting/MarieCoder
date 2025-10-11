import { ContextManager } from "@core/context/context-management/context_manager"
import type { FileContextTracker } from "@core/context/context-tracking"
import { ensureTaskDirectoryExists } from "@core/storage/disk"
import { combineApiRequests } from "@shared/combineApiRequests"
import { combineCommandSequences } from "@shared/combineCommandSequences"
import type { ClineApiReqInfo, ClineMessage, ClineSay } from "@shared/ExtensionMessage"
import { getApiMetrics } from "@shared/getApiMetrics"
import type { ClineCheckpointRestore } from "@shared/WebviewMessage"
import type { MessageStateCoordinator } from "./message_state_coordinator"
import type { CheckpointUICoordinator } from "./ui_coordinator"

/**
 * Callback type for say function
 */
type SayFunction = (
	type: ClineSay,
	text?: string,
	images?: string[],
	files?: string[],
	partial?: boolean,
) => Promise<number | undefined>

/**
 * Callback type for task cancellation
 */
type CancelTaskFunction = () => Promise<void>

/**
 * Configuration for restoration operations
 */
export interface RestorationCoordinatorConfig {
	readonly taskId: string
}

/**
 * Coordinates complex restoration operations
 * Manages conversation history, context, messages, and file tracking during checkpoint restoration
 */
export class RestorationCoordinator {
	constructor(
		private readonly config: RestorationCoordinatorConfig,
		private readonly messageCoordinator: MessageStateCoordinator,
		private readonly uiCoordinator: CheckpointUICoordinator,
		private readonly fileContextTracker: FileContextTracker,
		private readonly say: SayFunction,
		private readonly cancelTask: CancelTaskFunction,
	) {}

	/**
	 * Handle successful restoration of a checkpoint
	 * Performs all necessary cleanup and state updates
	 */
	async handleSuccessfulRestore(
		restoreType: ClineCheckpointRestore,
		message: ClineMessage,
		messageIndex: number,
		messageTs: number,
	): Promise<[number, number] | undefined> {
		// Execute restore operations based on type
		if (restoreType === "task" || restoreType === "taskAndWorkspace") {
			await this.restoreTaskState(restoreType, message, messageIndex, messageTs)
		}

		// Show success message
		this.uiCoordinator.showRestoreSuccess(restoreType)

		// Update checkpoint flags if workspace was restored
		if (restoreType !== "task") {
			this.messageCoordinator.updateCheckpointFlags(messageTs)
		}

		// Save messages and cancel task
		await this.messageCoordinator.saveMessagesAndUpdateHistory()
		await this.cancelTask()

		// Return conversation history deleted range if set
		return message.conversationHistoryDeletedRange
	}

	/**
	 * Restore task state (conversation history, context, messages)
	 */
	private async restoreTaskState(
		restoreType: ClineCheckpointRestore,
		message: ClineMessage,
		messageIndex: number,
		messageTs: number,
	): Promise<void> {
		// Truncate API conversation history
		await this.truncateApiConversationHistory(message)

		// Truncate context history
		await this.truncateContextHistory(message.ts)

		// Get messages being deleted
		const deletedMessages = this.messageCoordinator.getMessagesAfterIndex(messageIndex)

		// Aggregate deleted API request metrics
		await this.aggregateDeletedApiMetrics(deletedMessages)

		// Handle file context warnings for task-only restore
		if (restoreType === "task") {
			await this.handleFileContextWarnings(messageTs, deletedMessages)
		}

		// Truncate Cline messages
		await this.truncateClineMessages(messageIndex)
	}

	/**
	 * Truncate API conversation history to the message's index
	 */
	private async truncateApiConversationHistory(message: ClineMessage): Promise<void> {
		const apiConversationHistory = this.messageCoordinator.getApiConversationHistory()
		// +1 since this index corresponds to the last user message, and another +1 since slice end index is exclusive
		const newConversationHistory = apiConversationHistory.slice(0, (message.conversationHistoryIndex || 0) + 2)
		await this.messageCoordinator.overwriteApiConversationHistory(newConversationHistory)
	}

	/**
	 * Truncate context history to the message timestamp
	 */
	private async truncateContextHistory(messageTs: number): Promise<void> {
		const contextManager = new ContextManager()
		await contextManager.truncateContextHistory(messageTs, await ensureTaskDirectoryExists(this.config.taskId))
	}

	/**
	 * Aggregate deleted API request metrics and add to chat
	 */
	private async aggregateDeletedApiMetrics(deletedMessages: ClineMessage[]): Promise<void> {
		const deletedApiReqsMetrics = getApiMetrics(combineApiRequests(combineCommandSequences(deletedMessages)))

		await this.say(
			"deleted_api_reqs",
			JSON.stringify({
				tokensIn: deletedApiReqsMetrics.totalTokensIn,
				tokensOut: deletedApiReqsMetrics.totalTokensOut,
				cacheWrites: deletedApiReqsMetrics.totalCacheWrites,
				cacheReads: deletedApiReqsMetrics.totalCacheReads,
				cost: deletedApiReqsMetrics.totalCost,
			} satisfies ClineApiReqInfo),
		)
	}

	/**
	 * Handle file context warnings for task-only restore
	 * Detects files edited after the restored message
	 */
	private async handleFileContextWarnings(messageTs: number, deletedMessages: ClineMessage[]): Promise<void> {
		const filesEditedAfterMessage = await this.fileContextTracker.detectFilesEditedAfterMessage(messageTs, deletedMessages)

		if (filesEditedAfterMessage.length > 0) {
			await this.fileContextTracker.storePendingFileContextWarning(filesEditedAfterMessage)
		}
	}

	/**
	 * Truncate Cline messages to the specified index
	 */
	private async truncateClineMessages(messageIndex: number): Promise<void> {
		const clineMessages = this.messageCoordinator.getClineMessages()
		const newClineMessages = clineMessages.slice(0, messageIndex + 1)
		await this.messageCoordinator.overwriteClineMessages(newClineMessages)
	}
}
