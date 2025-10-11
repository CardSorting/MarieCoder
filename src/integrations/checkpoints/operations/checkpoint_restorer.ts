import type { ClineMessage } from "@shared/ExtensionMessage"
import type { ClineCheckpointRestore } from "@shared/WebviewMessage"
import { Logger } from "@/services/logging/Logger"
import CheckpointTracker from "../CheckpointTracker"
import type { MessageStateCoordinator } from "../coordinators/message_state_coordinator"
import type { RestorationCoordinator } from "../coordinators/restoration_coordinator"
import type { CheckpointUICoordinator } from "../coordinators/ui_coordinator"
import type { WorkspaceResolver } from "../initialization/workspace_resolver"
import type { CheckpointRestoreStateUpdate } from "../utils/checkpoint_state_manager"

/**
 * Configuration for checkpoint restoration operations
 */
export interface CheckpointRestorerConfig {
	readonly taskId: string
	readonly enableCheckpoints: boolean
}

/**
 * Handles checkpoint restoration operations
 * Manages different restore types (task, workspace, both) and error recovery
 */
export class CheckpointRestorer {
	constructor(
		private readonly config: CheckpointRestorerConfig,
		private readonly messageCoordinator: MessageStateCoordinator,
		private readonly uiCoordinator: CheckpointUICoordinator,
		private readonly restorationCoordinator: RestorationCoordinator,
		private readonly workspaceResolver: WorkspaceResolver,
		private readonly getTracker: () => CheckpointTracker | undefined,
		private readonly setTracker: (tracker: CheckpointTracker | undefined) => void,
		private readonly setErrorMessage: (message: string | undefined) => void,
	) {}

	/**
	 * Restore a checkpoint
	 * @param messageTs - Timestamp of the message to restore to
	 * @param restoreType - Type of restoration (task, workspace, or both)
	 * @param offset - Optional offset for the message index
	 * @returns State update with any changes that need to be applied
	 */
	async restore(
		messageTs: number,
		restoreType: ClineCheckpointRestore,
		offset?: number,
	): Promise<CheckpointRestoreStateUpdate> {
		try {
			// Find the message to restore to
			const { message, messageIndex } = this.findRestoreMessage(messageTs, offset)
			if (!message) {
				return {}
			}

			let didWorkspaceRestoreFail = false

			// Execute restore based on type
			switch (restoreType) {
				case "task":
					// Task-only restore doesn't need workspace operations
					break

				case "taskAndWorkspace":
				case "workspace":
					didWorkspaceRestoreFail = await this.restoreWorkspace(message, messageTs, offset)
					break
			}

			// Handle results
			if (!didWorkspaceRestoreFail) {
				return await this.handleSuccessfulRestore(restoreType, message, messageIndex, messageTs)
			} else {
				return this.handleFailedRestore()
			}
		} catch (error) {
			return this.handleRestoreError(error)
		}
	}

	/**
	 * Find the message to restore to
	 */
	private findRestoreMessage(messageTs: number, offset?: number): { message: ClineMessage | undefined; messageIndex: number } {
		const clineMessages = this.messageCoordinator.getClineMessages()
		const messageIndex = clineMessages.findIndex((m) => m.ts === messageTs) - (offset || 0)
		const message = clineMessages[messageIndex]

		if (!message) {
			Logger.error(`[CheckpointRestorer] Message not found for timestamp ${messageTs} in task ${this.config.taskId}`)
		}

		return { message, messageIndex }
	}

	/**
	 * Restore workspace to a checkpoint
	 * Returns true if restore failed, false if succeeded
	 */
	private async restoreWorkspace(message: ClineMessage, messageTs: number, offset?: number): Promise<boolean> {
		// Validate checkpoints are enabled
		if (!this.config.enableCheckpoints) {
			this.uiCoordinator.showCheckpointNotAvailableError()
			Logger.error(`[CheckpointRestorer] Checkpoints disabled for task ${this.config.taskId}`)
			return true
		}

		// Initialize tracker if needed
		const initSuccess = await this.ensureTrackerInitialized()
		if (!initSuccess) {
			return true
		}

		// Find the checkpoint hash to restore
		const checkpointHash = this.findCheckpointHash(message, messageTs, offset)
		if (!checkpointHash) {
			this.uiCoordinator.showError("Failed to restore checkpoint: No valid checkpoint hash found")
			Logger.error(`[CheckpointRestorer] No valid checkpoint hash found for task ${this.config.taskId}`)
			return true
		}

		// Execute the restore
		return await this.executeWorkspaceRestore(checkpointHash)
	}

	/**
	 * Ensure checkpoint tracker is initialized
	 * Returns true if initialization succeeded or tracker already exists
	 */
	private async ensureTrackerInitialized(): Promise<boolean> {
		const existingTracker = this.getTracker()
		if (existingTracker) {
			return true
		}

		try {
			const workspacePath = await this.workspaceResolver.getWorkspacePath()
			const tracker = await CheckpointTracker.create(this.config.taskId, this.config.enableCheckpoints, workspacePath)

			if (tracker) {
				this.setTracker(tracker)
				this.messageCoordinator.setCheckpointTracker(tracker)
			}
			return true
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			Logger.error(
				`[CheckpointRestorer] Failed to initialize checkpoint tracker for task ${this.config.taskId}`,
				error instanceof Error ? error : new Error(errorMessage),
			)
			this.setErrorMessage(errorMessage)
			this.uiCoordinator.showError(errorMessage)
			return false
		}
	}

	/**
	 * Find checkpoint hash for restoration
	 */
	private findCheckpointHash(message: ClineMessage, messageTs: number, offset?: number): string | undefined {
		// Direct hash on the message
		if (message.lastCheckpointHash) {
			return message.lastCheckpointHash
		}

		// Find hash from previous message if using offset
		if (offset) {
			const [, lastMessageWithHash] = this.messageCoordinator.findLastCheckpointBeforeIndex(
				this.messageCoordinator.getClineMessages().findIndex((m) => m.ts === messageTs) - offset,
			)
			if (lastMessageWithHash?.lastCheckpointHash) {
				return lastMessageWithHash.lastCheckpointHash
			}
		}

		// Fallback: find most recent checkpoint before this message
		const clineMessages = this.messageCoordinator.getClineMessages()
		const messageIndex = clineMessages.findIndex((m) => m.ts === messageTs)
		const [, lastMessageWithHash] = this.messageCoordinator.findLastCheckpointBeforeIndex(messageIndex)

		if (lastMessageWithHash?.lastCheckpointHash) {
			Logger.warn(
				`[CheckpointRestorer] Message ${messageTs} has no checkpoint hash, falling back to previous checkpoint for task ${this.config.taskId}`,
			)
			return lastMessageWithHash.lastCheckpointHash
		}

		return undefined
	}

	/**
	 * Execute workspace restore with error handling
	 */
	private async executeWorkspaceRestore(checkpointHash: string): Promise<boolean> {
		const tracker = this.getTracker()
		if (!tracker) {
			return true
		}

		try {
			await tracker.resetHead(checkpointHash)
			return false // Success
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			Logger.error(
				`[CheckpointRestorer] Failed to restore checkpoint for task ${this.config.taskId}`,
				error instanceof Error ? error : new Error(errorMessage),
			)
			this.uiCoordinator.showRestoreError(errorMessage)
			return true // Failure
		}
	}

	/**
	 * Handle successful restore
	 */
	private async handleSuccessfulRestore(
		restoreType: ClineCheckpointRestore,
		message: ClineMessage,
		messageIndex: number,
		messageTs: number,
	): Promise<CheckpointRestoreStateUpdate> {
		const deletedRange = await this.restorationCoordinator.handleSuccessfulRestore(
			restoreType,
			message,
			messageIndex,
			messageTs,
		)

		return deletedRange ? { conversationHistoryDeletedRange: deletedRange } : {}
	}

	/**
	 * Handle failed restore
	 */
	private handleFailedRestore(): CheckpointRestoreStateUpdate {
		this.uiCoordinator.relinquishControl()
		return {}
	}

	/**
	 * Handle restore error
	 */
	private handleRestoreError(error: unknown): CheckpointRestoreStateUpdate {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		Logger.error(
			`[CheckpointRestorer] Failed to restore checkpoint for task ${this.config.taskId}`,
			error instanceof Error ? error : new Error(errorMessage),
		)
		this.uiCoordinator.relinquishControl()
		return { checkpointManagerErrorMessage: errorMessage }
	}
}
