import { refreshAllToggles } from "@core/context/instructions/user-instructions/rule_loader"
import { EmptyRequest } from "@shared/proto/cline/common"
import { RefreshedRules } from "@shared/proto/cline/file"
import { getCwd, getDesktopDir } from "@/utils/path"
import type { Controller } from "../index"

/**
 * Refreshes all rule toggles (Cline, External, and Workflows)
 * @param controller The controller instance
 * @param _request The empty request
 * @returns RefreshedRules containing updated toggles for all rule types
 */
export async function refreshRules(controller: Controller, _request: EmptyRequest): Promise<RefreshedRules> {
	try {
		const cwd = await getCwd(getDesktopDir())
		const allToggles = await refreshAllToggles(controller, cwd)

		return RefreshedRules.create({
			globalClineRulesToggles: { toggles: allToggles.globalClineRules },
			localClineRulesToggles: { toggles: allToggles.localClineRules },
			localCursorRulesToggles: { toggles: allToggles.cursorRules },
			localWindsurfRulesToggles: { toggles: allToggles.windsurfRules },
			localWorkflowToggles: { toggles: allToggles.localWorkflows },
			globalWorkflowToggles: { toggles: allToggles.globalWorkflows },
		})
	} catch (error) {
		console.error("Failed to refresh rules:", error)
		throw error
	}
}
