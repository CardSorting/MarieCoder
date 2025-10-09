import { Empty } from "@shared/proto/cline/common"
import { ExecuteQuickWinRequest } from "@shared/proto/cline/task"
import type { Controller } from "../index"

/**
 * Executes a quick win task with command and title
 * @param controller The controller instance
 * @param request The execute quick win request
 * @returns Empty response
 *
 * @example
 * // Usage from webview:
 * import { TaskServiceClient } from "@/services/grpc-client"
 * import { ExecuteQuickWinRequest } from "@shared/proto/cline/task"
 *
 * const request: ExecuteQuickWinRequest = {
 *   command: "npm install",
 *   title: "Install dependencies"
 * }
 */
export async function executeQuickWin(controller: Controller, request: ExecuteQuickWinRequest): Promise<Empty> {
	try {
		const { title } = request
		await controller.initTask(title)
		return Empty.create({})
	} catch (error) {
		throw error
	}
}
