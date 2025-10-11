import { findLast } from "@shared/array"
import { HostProvider } from "@/hosts/host-provider"
import { Logger } from "@/services/logging/Logger"
import type CheckpointTracker from "../CheckpointTracker"
import type { MessageStateCoordinator } from "../coordinators/message_state_coordinator"
import type { CheckpointUICoordinator } from "../coordinators/ui_coordinator"

/**
 * Configuration for diff presentation
 */
export interface DiffPresenterConfig {
	readonly taskId: string
	readonly enableCheckpoints: boolean
}

/**
 * Changed file information for diff display
 */
export interface ChangedFile {
	relativePath: string
	absolutePath: string
	before: string
	after: string
}

/**
 * Presents multi-file diff views for checkpoint changes
 * Handles showing changes between checkpoints or since last completion
 */
export class CheckpointDiffPresenter {
	constructor(
		private readonly config: DiffPresenterConfig,
		private readonly messageCoordinator: MessageStateCoordinator,
		private readonly uiCoordinator: CheckpointUICoordinator,
		private readonly getTracker: () => CheckpointTracker | undefined,
	) {}

	/**
	 * Present a multi-file diff view
	 * @param messageTs - Timestamp of the message to show diff for
	 * @param seeNewChangesSinceLastTaskCompletion - Whether to show changes since last completion
	 */
	async presentDiff(messageTs: number, seeNewChangesSinceLastTaskCompletion: boolean): Promise<void> {
		try {
			// Validate configuration
			if (!this.config.enableCheckpoints) {
				this.uiCoordinator.showDiffError("Checkpoints are disabled in settings. Cannot show diff.")
				Logger.error(`[DiffPresenter] Checkpoints disabled for task ${this.config.taskId}`)
				this.uiCoordinator.relinquishControl()
				return
			}

			// Find the message and its checkpoint hash
			const hash = this.findCheckpointHash(messageTs)
			if (!hash) {
				this.uiCoordinator.relinquishControl()
				return
			}

			// Get the checkpoint tracker
			const tracker = this.getTracker()
			if (!tracker) {
				Logger.error(`[DiffPresenter] Checkpoint tracker not available for task ${this.config.taskId}`)
				this.uiCoordinator.showError("Checkpoint tracker not available")
				this.uiCoordinator.relinquishControl()
				return
			}

			// Get changed files
			const changedFiles = await this.getChangedFiles(tracker, hash, messageTs, seeNewChangesSinceLastTaskCompletion)

			if (!changedFiles || changedFiles.length === 0) {
				this.uiCoordinator.showInfo("No changes found")
				this.uiCoordinator.relinquishControl()
				return
			}

			// Open the diff view
			await this.openDiffView(changedFiles, seeNewChangesSinceLastTaskCompletion)

			this.uiCoordinator.relinquishControl()
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			Logger.error(
				`[DiffPresenter] Failed to present multifile diff for task ${this.config.taskId}`,
				error instanceof Error ? error : new Error(errorMessage),
			)
			this.uiCoordinator.showError(`Failed to retrieve diff set: ${errorMessage}`)
			this.uiCoordinator.relinquishControl()
		}
	}

	/**
	 * Find the checkpoint hash for a given message
	 */
	private findCheckpointHash(messageTs: number): string | undefined {
		const clineMessages = this.messageCoordinator.getClineMessages()
		const messageIndex = clineMessages.findIndex((m) => m.ts === messageTs)
		const message = clineMessages[messageIndex]

		if (!message) {
			Logger.error(`[DiffPresenter] Message not found for timestamp ${messageTs} in task ${this.config.taskId}`)
			return undefined
		}

		const hash = message.lastCheckpointHash
		if (!hash) {
			Logger.error(`[DiffPresenter] No checkpoint hash found for message ${messageTs} in task ${this.config.taskId}`)
		}

		return hash
	}

	/**
	 * Get changed files for diff display
	 */
	private async getChangedFiles(
		tracker: CheckpointTracker,
		currentHash: string,
		messageTs: number,
		sinceLastCompletion: boolean,
	): Promise<ChangedFile[] | undefined> {
		if (sinceLastCompletion) {
			return await this.getChangesSinceLastCompletion(tracker, currentHash, messageTs)
		} else {
			return await tracker.getDiffSet(currentHash)
		}
	}

	/**
	 * Get changes since last task completion
	 */
	private async getChangesSinceLastCompletion(
		tracker: CheckpointTracker,
		currentHash: string,
		messageTs: number,
	): Promise<ChangedFile[] | undefined> {
		const clineMessages = this.messageCoordinator.getClineMessages()
		const messageIndex = clineMessages.findIndex((m) => m.ts === messageTs)

		// Find the previous completion checkpoint
		const lastTaskCompletedMessageCheckpointHash = findLast(
			clineMessages.slice(0, messageIndex),
			(m) => m.say === "completion_result",
		)?.lastCheckpointHash

		// Fallback to first checkpoint if no previous completion
		const firstCheckpointMessageCheckpointHash = clineMessages.find((m) => m.say === "checkpoint_created")?.lastCheckpointHash

		const previousCheckpointHash = lastTaskCompletedMessageCheckpointHash || firstCheckpointMessageCheckpointHash

		if (!previousCheckpointHash) {
			const errorMessage = "Unexpected error: No checkpoint hash found"
			Logger.error(`[DiffPresenter] ${errorMessage} for task ${this.config.taskId}`)
			this.uiCoordinator.showError(errorMessage)
			return undefined
		}

		// Get changed files between previous and current checkpoint
		return await tracker.getDiffSet(previousCheckpointHash, currentHash)
	}

	/**
	 * Open the multi-file diff view
	 */
	private async openDiffView(changedFiles: ChangedFile[], sinceLastCompletion: boolean): Promise<void> {
		const title = sinceLastCompletion ? "New changes" : "Changes since snapshot"

		const diffs = changedFiles.map((file) => ({
			filePath: file.absolutePath,
			leftContent: file.before,
			rightContent: file.after,
		}))

		await HostProvider.diff.openMultiFileDiff({ title, diffs })
	}
}
