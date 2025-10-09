import { Empty, StringRequest } from "@shared/proto/cline/common"
import { Controller } from ".."

/**
 * Handles task feedback submission (thumbs up/down)
 * @param controller The controller instance
 * @param request The StringRequest containing the feedback type ("thumbs_up" or "thumbs_down") in the value field
 * @returns Empty response
 */
export async function taskFeedback(_controller: Controller, request: StringRequest): Promise<Empty> {
	if (!request.value) {
		return Empty.create()
	}

	return Empty.create()
}
