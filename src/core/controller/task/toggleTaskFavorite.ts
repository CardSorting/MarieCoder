import { Empty } from "@shared/proto/cline/common"
import { TaskFavoriteRequest } from "@shared/proto/cline/task"
import { Controller } from "../"

export async function toggleTaskFavorite(controller: Controller, request: TaskFavoriteRequest): Promise<Empty> {
	if (!request.taskId || request.isFavorited === undefined) {
		return Empty.create({})
	}

	try {
		// Update in-memory state only
		try {
			const history = controller.stateManager.getGlobalStateKey("taskHistory")

			const taskIndex = history.findIndex((item) => item.id === request.taskId)

			if (taskIndex !== -1) {
				// Create a new array instead of modifying in place to ensure state change
				const updatedHistory = [...history]
				updatedHistory[taskIndex] = {
					...updatedHistory[taskIndex],
					isFavorited: request.isFavorited,
				}

				// Update global state and wait for it to complete
				try {
					controller.stateManager.setGlobalState("taskHistory", updatedHistory)
				} catch {
					// Silently fail - not critical
				}
			}
		} catch {
			// Silently fail - not critical
		}

		// Post to webview
		try {
			await controller.postStateToWebview()
		} catch {
			// Silently fail - not critical
		}
	} catch {
		// Silently fail - not critical
	}

	return Empty.create({})
}
