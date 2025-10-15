import { Empty, Int64Request } from "@shared/proto/cline/common"
import { Controller } from ".."

/**
 * Shows task completion changes in a diff view
 * @param controller The controller instance
 * @param request The request containing the timestamp of the message
 * @returns Empty response
 */
export async function taskCompletionViewChanges(controller: Controller, request: Int64Request): Promise<Empty> {
	try {
		if (!request.value) {
			console.warn("[taskCompletionViewChanges] No message timestamp provided")
			return Empty.create()
		}

		if (!controller.task) {
			console.warn("[taskCompletionViewChanges] No active task found")
			return Empty.create()
		}

		if (!controller.task.checkpointManager) {
			console.warn("[taskCompletionViewChanges] No checkpoint manager available")
			return Empty.create()
		}

		if (!controller.task.checkpointManager.presentMultifileDiff) {
			console.warn("[taskCompletionViewChanges] presentMultifileDiff method not available on checkpoint manager")
			return Empty.create()
		}

		// Present the multifile diff for changes since task completion
		await controller.task.checkpointManager.presentMultifileDiff(request.value, true)

		return Empty.create()
	} catch (error) {
		console.error("[taskCompletionViewChanges] Error showing task completion changes:", error)
		throw error
	}
}
