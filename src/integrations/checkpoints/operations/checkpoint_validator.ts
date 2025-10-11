import { findLast, findLastIndex } from "@shared/array"
import { Logger } from "@/services/logging/Logger"
import type CheckpointTracker from "../CheckpointTracker"
import type { MessageStateCoordinator } from "../coordinators/message_state_coordinator"

/**
 * Configuration for checkpoint validation
 */
export interface CheckpointValidatorConfig {
	readonly taskId: string
	readonly enableCheckpoints: boolean
}

/**
 * Validates checkpoint operations and checks for changes
 * Provides validation logic for checkpoint availability and change detection
 */
export class CheckpointValidator {
	constructor(
		private readonly config: CheckpointValidatorConfig,
		private readonly messageCoordinator: MessageStateCoordinator,
		private readonly getTracker: () => CheckpointTracker | undefined,
	) {}

	/**
	 * Check if checkpoints are enabled in configuration
	 */
	isCheckpointsEnabled(): boolean {
		return this.config.enableCheckpoints
	}

	/**
	 * Validate that a checkpoint tracker is available
	 */
	validateTrackerAvailable(): boolean {
		return this.getTracker() !== undefined
	}

	/**
	 * Find checkpoint hash for a given message
	 * @param messageTs - Timestamp of the message
	 * @param offset - Optional offset for searching
	 * @returns The checkpoint hash if found, undefined otherwise
	 */
	findCheckpointForMessage(messageTs: number, offset?: number): string | undefined {
		const clineMessages = this.messageCoordinator.getClineMessages()
		const messageIndex = clineMessages.findIndex((m) => m.ts === messageTs) - (offset || 0)
		const message = clineMessages[messageIndex]

		if (!message) {
			Logger.error(`[CheckpointValidator] Message not found for timestamp ${messageTs} in task ${this.config.taskId}`)
			return undefined
		}

		// Check if message has a checkpoint hash
		if (message.lastCheckpointHash) {
			return message.lastCheckpointHash
		}

		// If not, find the last message before this one that has a checkpoint hash
		const [lastHashIndex, lastMessageWithHash] = this.messageCoordinator.findLastCheckpointBeforeIndex(messageIndex)

		if (lastHashIndex >= 0 && lastMessageWithHash?.lastCheckpointHash) {
			return lastMessageWithHash.lastCheckpointHash
		}

		return undefined
	}

	/**
	 * Checks if the latest task completion has new changes
	 * Compares the completion checkpoint with the previous checkpoint
	 * @returns True if there are new changes since last completion
	 */
	async doesLatestTaskCompletionHaveNewChanges(): Promise<boolean> {
		try {
			if (!this.config.enableCheckpoints) {
				return false
			}

			const clineMessages = this.messageCoordinator.getClineMessages()
			const messageIndex = findLastIndex(clineMessages, (m) => m.say === "completion_result")
			const message = clineMessages[messageIndex]

			if (!message) {
				Logger.error(`[CheckpointValidator] Completion message not found for task ${this.config.taskId}`)
				return false
			}

			const hash = message.lastCheckpointHash
			if (!hash) {
				Logger.error(
					`[CheckpointValidator] No checkpoint hash found for completion message in task ${this.config.taskId}`,
				)
				return false
			}

			const tracker = this.getTracker()
			if (!tracker) {
				Logger.error(`[CheckpointValidator] Checkpoint tracker not available for task ${this.config.taskId}`)
				return false
			}

			// Get the previous checkpoint to compare against
			const previousCheckpointHash = this.findPreviousCompletionCheckpoint(messageIndex)

			if (!previousCheckpointHash) {
				Logger.error(`[CheckpointValidator] No previous checkpoint hash found for task ${this.config.taskId}`)
				return false
			}

			// Get count of changed files between previous checkpoint and current
			const changedFilesCount = (await tracker.getDiffCount(previousCheckpointHash, hash)) || 0
			return changedFilesCount > 0
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			Logger.error(
				`[CheckpointValidator] Failed to check for new changes in task ${this.config.taskId}`,
				error instanceof Error ? error : new Error(errorMessage),
			)
			return false
		}
	}

	/**
	 * Find the previous completion checkpoint hash
	 * Looks for the last completion_result message before the given index
	 * Falls back to the first checkpoint_created message if no previous completion
	 */
	private findPreviousCompletionCheckpoint(beforeIndex: number): string | undefined {
		const clineMessages = this.messageCoordinator.getClineMessages()

		// Get last task completed before this one
		const lastTaskCompletedMessage = findLast(clineMessages.slice(0, beforeIndex), (m) => m.say === "completion_result")

		const lastTaskCompletedMessageCheckpointHash = lastTaskCompletedMessage?.lastCheckpointHash

		// This value *should* always exist as a fallback
		const firstCheckpointMessageCheckpointHash = clineMessages.find((m) => m.say === "checkpoint_created")?.lastCheckpointHash

		return lastTaskCompletedMessageCheckpointHash || firstCheckpointMessageCheckpointHash
	}
}
