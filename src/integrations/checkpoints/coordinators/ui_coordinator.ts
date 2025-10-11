import { sendRelinquishControlEvent } from "@core/controller/ui/subscribeToRelinquishControl"
import type { ClineCheckpointRestore } from "@shared/WebviewMessage"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"

/**
 * Coordinates all user interface interactions for checkpoint operations
 * Centralizes user messages, notifications, and control handling
 */
export class CheckpointUICoordinator {
	/**
	 * Show success message to user
	 */
	showSuccess(message: string): void {
		HostProvider.window.showMessage({
			type: ShowMessageType.INFORMATION,
			message,
		})
	}

	/**
	 * Show error message to user
	 */
	showError(errorOrMessage: Error | string): void {
		const message = errorOrMessage instanceof Error ? errorOrMessage.message : errorOrMessage
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message,
		})
	}

	/**
	 * Show informational message to user
	 */
	showInfo(message: string): void {
		HostProvider.window.showMessage({
			type: ShowMessageType.INFORMATION,
			message,
		})
	}

	/**
	 * Relinquish control back to user
	 */
	relinquishControl(): void {
		sendRelinquishControlEvent()
	}

	/**
	 * Show appropriate success message for restore type
	 */
	showRestoreSuccess(restoreType: ClineCheckpointRestore): void {
		switch (restoreType) {
			case "task":
				this.showSuccess("Task messages have been restored to the checkpoint")
				break
			case "workspace":
				this.showSuccess("Workspace files have been restored to the checkpoint")
				break
			case "taskAndWorkspace":
				this.showSuccess("Task and workspace have been restored to the checkpoint")
				break
		}
	}

	/**
	 * Show checkpoint not available error
	 */
	showCheckpointNotAvailableError(): void {
		this.showError("Checkpoints are disabled in settings.")
	}

	/**
	 * Show checkpoint restore error
	 */
	showRestoreError(error: Error | string): void {
		const message = error instanceof Error ? error.message : error
		this.showError(`Failed to restore checkpoint: ${message}`)
	}

	/**
	 * Show checkpoint diff error
	 */
	showDiffError(message: string): void {
		this.showInfo(message)
	}
}
