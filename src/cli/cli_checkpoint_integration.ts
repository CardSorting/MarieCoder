/**
 * CLI Checkpoint Integration
 * Integrates the Git-based checkpoint system with CLI
 * Uses the same checkpoint infrastructure as the extension
 */

import type { ICheckpointManager } from "@integrations/checkpoints/types"
import type { Task } from "@/core/task"
import { output } from "./cli_output"

/**
 * Manages checkpoint operations in CLI mode
 * Delegates to the Task's built-in checkpoint manager
 */
export class CliCheckpointIntegration {
	private verbose: boolean

	constructor(verbose = false) {
		this.verbose = verbose
	}

	/**
	 * Get the checkpoint manager from the current task
	 */
	private getCheckpointManager(task?: Task): ICheckpointManager | undefined {
		if (!task) {
			return undefined
		}
		return task.checkpointManager
	}

	/**
	 * Create a checkpoint manually
	 * In the extension, checkpoints are created automatically, but we allow manual creation too
	 */
	async createCheckpoint(task?: Task, isCompletionMessage = false): Promise<string | undefined> {
		const manager = this.getCheckpointManager(task)
		if (!manager) {
			throw new Error("Checkpoint manager not available. Ensure checkpoints are enabled in settings.")
		}

		try {
			// Save checkpoint state
			await manager.saveCheckpoint(isCompletionMessage)

			// Commit to shadow git
			const commitHash = await manager.commit()

			if (this.verbose && commitHash) {
				output.log(`[Checkpoint] Created with hash: ${commitHash}`)
			}

			return commitHash
		} catch (error) {
			console.error("Failed to create checkpoint:", error)
			throw error
		}
	}

	/**
	 * Restore from a checkpoint
	 */
	async restoreCheckpoint(task: Task | undefined, messageTs: number, restoreType: any, offset?: number): Promise<any> {
		const manager = this.getCheckpointManager(task)
		if (!manager) {
			throw new Error("Checkpoint manager not available")
		}

		try {
			return await manager.restoreCheckpoint(messageTs, restoreType, offset)
		} catch (error) {
			console.error("Failed to restore checkpoint:", error)
			throw error
		}
	}

	/**
	 * Check if there are new changes since last task completion
	 */
	async hasNewChangesSinceCompletion(task?: Task): Promise<boolean> {
		const manager = this.getCheckpointManager(task)
		if (!manager) {
			return false
		}

		try {
			return await manager.doesLatestTaskCompletionHaveNewChanges()
		} catch (error) {
			console.error("Failed to check for new changes:", error)
			return false
		}
	}

	/**
	 * Present a multi-file diff
	 */
	async presentDiff(task: Task | undefined, messageTs: number, showChangesSinceCompletion = false): Promise<void> {
		const manager = this.getCheckpointManager(task)
		if (!manager?.presentMultifileDiff) {
			throw new Error("Diff presentation not available")
		}

		try {
			await manager.presentMultifileDiff(messageTs, showChangesSinceCompletion)
		} catch (error) {
			console.error("Failed to present diff:", error)
			throw error
		}
	}

	/**
	 * Get the last checkpoint message timestamp
	 * Returns the timestamp of the most recent checkpoint_created message
	 */
	getLastCheckpointTimestamp(task?: Task): number | undefined {
		if (!task?.messageStateHandler) {
			return undefined
		}

		const messages = task.messageStateHandler.getClineMessages()

		// Find the last checkpoint_created message
		for (let i = messages.length - 1; i >= 0; i--) {
			const message = messages[i]
			if (message.say === "checkpoint_created" && message.lastCheckpointHash) {
				return message.ts
			}
		}

		return undefined
	}

	/**
	 * Undo changes by restoring to the last checkpoint
	 * Restores both task state and workspace files
	 */
	async undoToLastCheckpoint(
		task?: Task,
		restoreType: "task" | "workspace" | "taskAndWorkspace" = "taskAndWorkspace",
	): Promise<boolean> {
		const manager = this.getCheckpointManager(task)
		if (!manager) {
			throw new Error("Checkpoint manager not available. Ensure checkpoints are enabled in settings.")
		}

		// Get the last checkpoint timestamp
		const lastCheckpointTs = this.getLastCheckpointTimestamp(task)
		if (!lastCheckpointTs) {
			throw new Error("No checkpoint found to restore from. Create a task and make changes first.")
		}

		try {
			await this.restoreCheckpoint(task, lastCheckpointTs, restoreType)

			if (this.verbose) {
				output.log(`[Checkpoint] Restored to checkpoint at ${new Date(lastCheckpointTs).toLocaleString()}`)
			}

			return true
		} catch (error) {
			console.error("Failed to undo changes:", error)
			throw error
		}
	}

	/**
	 * Format checkpoint information for display
	 */
	formatCheckpointInfo(task?: Task): string {
		const manager = this.getCheckpointManager(task)

		if (!manager) {
			return "❌ Checkpoints not available. Enable in settings with 'enableCheckpointsSetting'."
		}

		const lines: string[] = []
		lines.push("\n" + "═".repeat(80))
		lines.push("💾 Checkpoint System Status")
		lines.push("═".repeat(80))
		lines.push("✅ Checkpoint manager active (Git-based)")
		lines.push("📁 Uses shadow Git repository for version control")
		lines.push("🔄 Checkpoints created automatically on first API request")
		lines.push("")
		lines.push("Commands:")
		lines.push("  /checkpoint create    - Create checkpoint manually")
		lines.push("  /checkpoint restore   - Restore from checkpoint (requires timestamp)")
		lines.push("  /checkpoint diff      - Show changes since checkpoint")
		lines.push("  /undo                 - Undo all changes and restore to last checkpoint")
		lines.push("═".repeat(80) + "\n")

		return lines.join("\n")
	}
}
