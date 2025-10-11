import { StateManager } from "@core/storage/StateManager"
import { Logger } from "@services/logging/Logger"
import { HistoryItem } from "@shared/HistoryItem"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"
import { ControllerEventType } from "../events/controller_events"
import { ControllerEventEmitter } from "../events/event_emitter"
import type { Controller } from "../index"

/**
 * Coordinates state synchronization and persistence
 * Handles state updates, webview communication, and error recovery
 */
export class StateCoordinator {
	constructor(
		private stateManager: StateManager,
		private controller: Controller,
		private eventEmitter: ControllerEventEmitter,
	) {}

	/**
	 * Sync state to webview
	 */
	async syncState(): Promise<void> {
		await this.controller.postStateToWebview()

		// Emit state synced event
		await this.eventEmitter.emit(ControllerEventType.STATE_SYNCED, {
			timestamp: Date.now(),
		})
	}

	/**
	 * Handle persistence errors with recovery
	 */
	async handlePersistenceError(error: unknown): Promise<void> {
		const err = error instanceof Error ? error : new Error(String(error))
		Logger.error("[StateCoordinator] Cache persistence failed, recovering", err)

		// Emit persistence error event
		await this.eventEmitter.emit(ControllerEventType.STATE_PERSISTENCE_ERROR, {
			error: err,
		})

		try {
			await this.recoverFromPersistenceError()
			await this.controller.postStateToWebview()

			// Emit recovery success event
			await this.eventEmitter.emit(ControllerEventType.STATE_RECOVERY_SUCCESS, {
				timestamp: Date.now(),
			})

			HostProvider.window.showMessage({
				type: ShowMessageType.WARNING,
				message: "Saving settings to storage failed.",
			})
		} catch (recoveryError) {
			const recoveryErr = recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError))
			Logger.error("[StateCoordinator] Cache recovery failed", recoveryErr)

			// Emit recovery failed event
			await this.eventEmitter.emit(ControllerEventType.STATE_RECOVERY_FAILED, {
				error: recoveryErr,
			})

			HostProvider.window.showMessage({
				type: ShowMessageType.ERROR,
				message: "Failed to save settings. Please restart the extension.",
			})
		}
	}

	/**
	 * Recover from persistence error by reinitializing state
	 */
	async recoverFromPersistenceError(): Promise<void> {
		await this.stateManager.reInitialize(this.controller.task?.taskId)
	}

	/**
	 * Update task history with new or existing item
	 */
	async updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]> {
		const history = this.stateManager.getGlobalStateKey("taskHistory")
		const existingItemIndex = history.findIndex((h) => h.id === item.id)

		if (existingItemIndex !== -1) {
			history[existingItemIndex] = item
		} else {
			history.push(item)
		}

		this.stateManager.setGlobalState("taskHistory", history)

		// Emit task history updated event
		await this.eventEmitter.emit(ControllerEventType.TASK_HISTORY_UPDATED, {
			historyItem: item,
			historyLength: history.length,
		})

		return history
	}
}
