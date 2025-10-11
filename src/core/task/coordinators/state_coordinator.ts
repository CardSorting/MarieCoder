import { StateManager } from "@core/storage/StateManager"
import { Logger } from "@services/logging/Logger"
import { HistoryItem } from "@shared/HistoryItem"
import { TaskState } from "../TaskState"

/**
 * Coordinates state synchronization across components
 * Manages updates, history tracking, and webview synchronization
 *
 * Responsibilities:
 * - Sync task state to history
 * - Update webview with current state
 * - Coordinate state consistency across components
 * - Handle state persistence
 */
export class StateCoordinator {
	constructor(
		private taskState: TaskState,
		private stateManager: StateManager,
		private updateTaskHistory: (item: HistoryItem) => Promise<HistoryItem[]>,
		private postStateToWebview: () => Promise<void>,
	) {}

	/**
	 * Synchronize all state - history and webview
	 * Call this after significant state changes
	 */
	async syncState(): Promise<void> {
		await this.updateHistory()
		await this.syncToWebview()
	}

	/**
	 * Update task history with current state
	 * Persists current task state to history storage
	 * Note: HistoryItem creation is handled by MessageStateHandler.saveClineMessagesAndUpdateHistory()
	 * This method exists for future direct history updates if needed
	 */
	async updateHistory(): Promise<void> {
		try {
			// History updates are handled by MessageStateHandler.saveClineMessagesAndUpdateHistory()
			// which has access to all the necessary data (clineMessages, apiMetrics, etc.)
			// This method is a placeholder for future direct history updates
			Logger.debug("[StateCoordinator] History update delegated to MessageStateHandler")
		} catch (error) {
			Logger.error("[StateCoordinator] Error updating history", error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * Synchronize current state to webview
	 * Updates UI with latest task state
	 */
	async syncToWebview(): Promise<void> {
		try {
			await this.postStateToWebview()
			Logger.debug("[StateCoordinator] State synced to webview")
		} catch (error) {
			Logger.error("[StateCoordinator] Error syncing to webview", error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * Update only webview (without persisting to history)
	 * Use for temporary UI updates
	 */
	async updateWebviewOnly(): Promise<void> {
		await this.syncToWebview()
	}

	/**
	 * Update only history (without updating UI)
	 * Use for background persistence
	 */
	async updateHistoryOnly(): Promise<void> {
		await this.updateHistory()
	}

	/**
	 * Get state manager instance
	 */
	getStateManager(): StateManager {
		return this.stateManager
	}

	/**
	 * Get current task state
	 */
	getTaskState(): TaskState {
		return this.taskState
	}
}
