import { ensureCheckpointInitialized } from "@integrations/checkpoints/initializer"
import type { ICheckpointManager } from "@integrations/checkpoints/types"
import { Logger } from "@services/logging/Logger"
import { findLastIndex } from "@shared/array"
import type { StateManager } from "@/core/storage/StateManager"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/index.host"
import type { MessageStateHandler } from "../message-state"
import type { TaskState } from "../TaskState"
import type { TaskMessageService } from "./task_message_service"

/**
 * Coordinates checkpoint creation and management for tasks
 *
 * This service handles the initialization and creation of checkpoints when
 * checkpoints are enabled. It ensures the checkpoint manager is initialized
 * before the first API request and creates commits at appropriate times.
 *
 * Checkpoints provide a way to save the state of the workspace at specific
 * points during task execution, allowing users to revert changes if needed.
 *
 * Responsibilities:
 * - Initialize checkpoint manager on first request
 * - Create checkpoint commits
 * - Handle checkpoint errors and timeouts
 * - Track checkpoint hashes in messages
 * - Manage checkpoint-related error state
 *
 * @example
 * ```typescript
 * const coordinator = new TaskCheckpointCoordinator(...)
 * await coordinator.handleFirstRequestCheckpoint(isFirstRequest)
 * ```
 */
export class TaskCheckpointCoordinator {
	constructor(
		private readonly taskState: TaskState,
		private readonly messageService: TaskMessageService,
		private readonly messageStateHandler: MessageStateHandler,
		private readonly stateManager: StateManager,
		private readonly checkpointManager: ICheckpointManager | undefined,
		private readonly taskId: string,
	) {}

	/**
	 * Handle checkpoint logic for the first API request
	 *
	 * On the first request, if checkpoints are enabled and no error has occurred:
	 * 1. Initialize the checkpoint manager (with timeout)
	 * 2. Create a "checkpoint_created" message
	 * 3. Commit the checkpoint and store the hash
	 *
	 * If initialization fails, the error is stored and displayed to the user.
	 *
	 * @param isFirstRequest - Whether this is the first API request in the task
	 */
	async handleFirstRequestCheckpoint(isFirstRequest: boolean): Promise<void> {
		if (!isFirstRequest) {
			return
		}

		const checkpointsEnabled = this.stateManager.getGlobalSettingsKey("enableCheckpointsSetting")

		if (!checkpointsEnabled) {
			return
		}

		if (!this.checkpointManager) {
			return
		}

		if (this.taskState.checkpointManagerErrorMessage) {
			// Error already occurred, don't try again
			return
		}

		// Initialize checkpoint manager first
		try {
			await ensureCheckpointInitialized({ checkpointManager: this.checkpointManager })
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			Logger.error("Failed to initialize checkpoint manager", error instanceof Error ? error : new Error(errorMessage))

			this.taskState.checkpointManagerErrorMessage = errorMessage

			HostProvider.window.showMessage({
				type: ShowMessageType.ERROR,
				message: `Checkpoint initialization timed out: ${errorMessage}`,
			})

			// Return early - error message will be displayed via ExtensionState
			return
		}

		// Create checkpoint message and commit
		await this.createCheckpoint()
	}

	/**
	 * Create a checkpoint commit
	 *
	 * Creates a "checkpoint_created" message in the chat and asynchronously
	 * commits the checkpoint. The commit hash is stored in the message once
	 * the commit completes.
	 *
	 * This method is called on the first API request after initialization
	 * succeeds. The commit happens asynchronously to avoid blocking the
	 * API request flow.
	 *
	 * @private
	 */
	private async createCheckpoint(): Promise<void> {
		await this.messageService.say("checkpoint_created")

		const lastCheckpointMessageIndex = findLastIndex(
			this.messageStateHandler.getClineMessages(),
			(m) => m.say === "checkpoint_created",
		)

		if (lastCheckpointMessageIndex !== -1 && this.checkpointManager) {
			// Commit asynchronously and update message with hash when complete
			this.checkpointManager
				.commit()
				.then(async (commitHash) => {
					if (commitHash) {
						await this.messageStateHandler.updateClineMessage(lastCheckpointMessageIndex, {
							lastCheckpointHash: commitHash,
						})
						// Note: saveClineMessagesAndUpdateHistory will be called later
						// after API response, so no need to call it here
					}
				})
				.catch((error) => {
					Logger.error(
						`[TaskCheckpointManager] Failed to create checkpoint commit for task ${this.taskId}`,
						error instanceof Error ? error : new Error(String(error)),
					)
				})
		}
	}

	/**
	 * Check if checkpoints are enabled
	 *
	 * @returns True if checkpoint feature is enabled in settings
	 */
	isCheckpointsEnabled(): boolean {
		return this.stateManager.getGlobalSettingsKey("enableCheckpointsSetting")
	}

	/**
	 * Get checkpoint error message if any
	 *
	 * @returns The error message from checkpoint initialization, or undefined
	 */
	getCheckpointError(): string | undefined {
		return this.taskState.checkpointManagerErrorMessage
	}
}
