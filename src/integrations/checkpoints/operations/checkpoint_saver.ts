import { findLast } from "@shared/array"
import { Logger } from "@/services/logging/Logger"
import type CheckpointTracker from "../CheckpointTracker"
import type { MessageStateCoordinator } from "../coordinators/message_state_coordinator"

/**
 * Configuration for checkpoint saving operations
 */
export interface CheckpointSaverConfig {
	readonly taskId: string
	readonly enableCheckpoints: boolean
}

/**
 * Handles checkpoint creation and saving operations
 * Manages both regular checkpoints and attempt completion checkpoints
 */
export class CheckpointSaver {
	constructor(
		private readonly config: CheckpointSaverConfig,
		private readonly messageCoordinator: MessageStateCoordinator,
		private readonly getTracker: () => CheckpointTracker | undefined,
		private readonly getErrorMessage: () => string | undefined,
	) {}

	/**
	 * Save a checkpoint
	 * @param isAttemptCompletion - Whether this is an attempt completion checkpoint
	 * @param completionMessageTs - Optional timestamp for completion message to update
	 */
	async save(isAttemptCompletion: boolean = false, completionMessageTs?: number): Promise<void> {
		try {
			// Early return if checkpoints disabled or timed out
			if (!this.config.enableCheckpoints || this.hasTimedOutError()) {
				return
			}

			// Clear checkpoint flags for prior checkpoint_created messages
			this.messageCoordinator.clearAllCheckpointFlags()

			const tracker = this.getTracker()
			if (!tracker) {
				Logger.error(`[CheckpointSaver] Checkpoint tracker not available for task ${this.config.taskId}`)
				return
			}

			if (isAttemptCompletion) {
				await this.saveAttemptCompletion(tracker, completionMessageTs)
			} else {
				await this.saveRegularCheckpoint(tracker)
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			Logger.error(
				`[CheckpointSaver] Failed to save checkpoint for task ${this.config.taskId}`,
				error instanceof Error ? error : new Error(errorMessage),
			)
		}
	}

	/**
	 * Save a regular checkpoint (non-attempt-completion)
	 */
	private async saveRegularCheckpoint(tracker: CheckpointTracker): Promise<void> {
		// Check for duplicate back-to-back checkpoint_created messages
		const clineMessages = this.messageCoordinator.getClineMessages()
		const lastMessage = clineMessages.at(-1)

		if (lastMessage?.say === "checkpoint_created") {
			// Duplicate detected, skip
			return
		}

		// Create a new checkpoint_created message
		const messageTs = await this.messageCoordinator.addCheckpointMessage()

		if (messageTs) {
			// Asynchronously commit and update the message with the hash
			this.commitAndUpdateMessage(tracker, messageTs).catch((error) => {
				Logger.error(
					`[CheckpointSaver] Failed to create checkpoint commit for task ${this.config.taskId}`,
					error instanceof Error ? error : new Error(String(error)),
				)
			})
		}
	}

	/**
	 * Save an attempt completion checkpoint
	 */
	private async saveAttemptCompletion(tracker: CheckpointTracker, completionMessageTs?: number): Promise<void> {
		// Check if we already have a recent completion checkpoint
		const lastFiveMessages = this.messageCoordinator.getClineMessages().slice(-3)
		const lastCompletionResultMessage = findLast(lastFiveMessages, (m) => m.say === "completion_result")

		if (lastCompletionResultMessage?.lastCheckpointHash) {
			// Completion checkpoint already exists, skip duplicate
			return
		}

		// Create the commit
		const commitHash = await tracker.commit()

		// Update the appropriate message with the checkpoint hash
		const messageTsToUpdate: number | undefined =
			typeof completionMessageTs === "number"
				? completionMessageTs
				: typeof lastCompletionResultMessage?.ts === "number"
					? lastCompletionResultMessage.ts
					: undefined

		if (typeof messageTsToUpdate === "number") {
			if (typeof commitHash !== "string") {
				throw new Error(
					"Failed to update checkpoint message: commitHash is missing. " +
						"Please ensure that tracker.commit() returns a valid string commit hash before updating the message.",
				)
			}
			await this.messageCoordinator.updateMessageWithHash(messageTsToUpdate, commitHash)
		}
	}

	/**
	 * Commit checkpoint and update message with hash
	 */
	private async commitAndUpdateMessage(tracker: CheckpointTracker, messageTs: number): Promise<void> {
		const commitHash = await tracker.commit()

		if (commitHash) {
			await this.messageCoordinator.updateMessageWithHash(messageTs, commitHash)
		}
	}

	/**
	 * Check if there was a timeout error in checkpoint initialization
	 */
	private hasTimedOutError(): boolean {
		const errorMessage = this.getErrorMessage()
		return errorMessage?.includes("Checkpoints initialization timed out.") ?? false
	}

	/**
	 * Direct commit operation (used by external callers)
	 */
	async commit(): Promise<string | undefined> {
		try {
			if (!this.config.enableCheckpoints) {
				return undefined
			}

			const tracker = this.getTracker()
			if (!tracker) {
				Logger.error(`[CheckpointSaver] Checkpoint tracker not available for commit in task ${this.config.taskId}`)
				return undefined
			}

			return await tracker.commit()
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			Logger.error(
				`[CheckpointSaver] Failed to create checkpoint commit for task ${this.config.taskId}`,
				error instanceof Error ? error : new Error(errorMessage),
			)
			return undefined
		}
	}
}
