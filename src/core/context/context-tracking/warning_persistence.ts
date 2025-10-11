import { readTaskHistoryFromState } from "@core/storage/disk"
import type { Controller } from "@/core/controller"
import type { StateManager } from "@/core/storage/StateManager"

/**
 * Manages persistence of file context warnings in workspace state
 *
 * This module is responsible for:
 * - Storing warnings about potentially stale file context
 * - Retrieving warnings that persist across task reinitialization
 * - Cleaning up orphaned warnings from deleted tasks
 */
export class WarningPersistence {
	private controller: Controller
	private taskId: string

	constructor(controller: Controller, taskId: string) {
		this.controller = controller
		this.taskId = taskId
	}

	/**
	 * Stores pending file context warning in workspace state
	 *
	 * Warnings persist across task reinitialization so users are notified
	 * about potentially stale context even if the task is resumed later.
	 *
	 * @param files - Array of file paths to warn about
	 */
	async storeWarning(files: string[]): Promise<void> {
		try {
			const key = this.getWarningKey()
			// NOTE: Using 'as any' because dynamic keys like pendingFileContextWarning_${taskId}
			// are legitimate workspace state keys but don't fit the strict LocalStateKey type system
			this.controller.stateManager.setWorkspaceState(key as any, files)
		} catch {
			// Silently fail - not critical
		}
	}

	/**
	 * Retrieves pending file context warning from workspace state (without clearing it)
	 *
	 * @returns Array of file paths or undefined if no warning exists
	 */
	async retrieveWarning(): Promise<string[] | undefined> {
		try {
			const key = this.getWarningKey()
			const files = this.controller.stateManager.getWorkspaceStateKey(key as any) as string[]
			return files
		} catch {
			// Silently fail - not critical
		}
		return undefined
	}

	/**
	 * Retrieves and clears pending file context warning from workspace state
	 *
	 * Use this when displaying the warning to the user - it ensures the
	 * warning is only shown once.
	 *
	 * @returns Array of file paths or undefined if no warning exists
	 */
	async retrieveAndClearWarning(): Promise<string[] | undefined> {
		try {
			const files = await this.retrieveWarning()
			if (files) {
				await this.clearWarning()
				return files
			}
		} catch {
			// Silently fail - not critical
		}
		return undefined
	}

	/**
	 * Clears the warning from workspace state
	 */
	async clearWarning(): Promise<void> {
		const key = this.getWarningKey()
		this.controller.stateManager.setWorkspaceState(key as any, undefined)
	}

	/**
	 * Gets the workspace state key for this task's warnings
	 *
	 * @returns Workspace state key
	 */
	private getWarningKey(): string {
		return `pendingFileContextWarning_${this.taskId}`
	}

	/**
	 * Static method to clean up orphaned pending file context warnings at startup
	 *
	 * This removes warnings for tasks that may no longer exist, preventing
	 * workspace state from growing indefinitely.
	 *
	 * @param stateManager - StateManager instance for accessing workspace state
	 */
	static async cleanupOrphanedWarnings(stateManager: StateManager): Promise<void> {
		const _startTime = Date.now()

		try {
			const taskHistory = await readTaskHistoryFromState()
			const existingTaskIds = new Set(taskHistory.map((task) => task.id))
			const allStateKeys = stateManager.getAllWorkspaceStateKeys()
			const pendingWarningKeys = allStateKeys.filter((key: string) => key.startsWith("pendingFileContextWarning_"))

			const orphanedKeys: string[] = []
			for (const key of pendingWarningKeys) {
				const taskId = key.replace("pendingFileContextWarning_", "")
				if (!existingTaskIds.has(taskId)) {
					orphanedKeys.push(key)
				}
			}

			if (orphanedKeys.length > 0) {
				for (const key of orphanedKeys) {
					stateManager.clearArbitraryWorkspaceStateKey(key)
				}
			}
		} catch {
			// Silently fail - not critical
		}
	}
}
