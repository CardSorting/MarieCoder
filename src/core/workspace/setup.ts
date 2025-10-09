import { HostProvider } from "@/hosts/host-provider"
import type { HistoryItem } from "@/shared/HistoryItem"
import { ShowMessageType } from "@/shared/proto/host/window"
import { getCwd, getDesktopDir } from "@/utils/path"
import { StateManager } from "../storage/StateManager"
import { isMultiRootEnabled } from "./multi-root-utils"
import type { WorkspaceRoot } from "./WorkspaceRoot"
import { WorkspaceRootManager } from "./WorkspaceRootManager"

type DetectRoots = () => Promise<WorkspaceRoot[]>

/**
 * Initializes and persists the WorkspaceRootManager (multi-root or single-root),
 * emits telemetry, and handles fallback on error.
 *
 * The caller injects detectRoots to avoid tight coupling to Controller.
 */
export async function setupWorkspaceManager({
	stateManager,
	detectRoots,
}: {
	stateManager: StateManager
	historyItem?: HistoryItem
	detectRoots: DetectRoots
}): Promise<WorkspaceRootManager> {
	const cwd = await getCwd(getDesktopDir())
	const _startTime = performance.now()
	const multiRootEnabled = isMultiRootEnabled(stateManager)
	try {
		let manager: WorkspaceRootManager
		// Multi-root mode condition - requires both feature flag and user setting to be enabled
		if (multiRootEnabled) {
			// Multi-root: detect workspace folders
			const roots = await detectRoots()
			manager = new WorkspaceRootManager(roots, 0)

			// Persist
			stateManager.setGlobalState("workspaceRoots", manager.getRoots())
			stateManager.setGlobalState("primaryRootIndex", manager.getPrimaryIndex())
			return manager
		}

		// Single-root mode code for when we actually start using workspacerootmanager
		// if (historyItem) {
		// 	const savedRoots = stateManager.getWorkspaceRoots()
		// 	if (savedRoots && savedRoots.length > 0) {
		// 		const primaryIndex = stateManager.getPrimaryRootIndex()
		// 		manager = new WorkspaceRootManager(savedRoots, primaryIndex)
		// 		console.log(`[WorkspaceManager] Restored ${savedRoots.length} roots from state`)
		// 	} else {
		// 		manager = await WorkspaceRootManager.fromLegacyCwd(cwd)
		// 	}
		// }

		manager = await WorkspaceRootManager.fromLegacyCwd(cwd)

		const roots = manager.getRoots()
		stateManager.setGlobalState("workspaceRoots", roots)
		stateManager.setGlobalState("primaryRootIndex", manager.getPrimaryIndex())
		return manager
	} catch (error) {
		// Telemetry + graceful fallback to single-root from cwd
		const _workspaceCount = (await HostProvider.workspace.getWorkspacePaths({})).paths?.length

		const manager = await WorkspaceRootManager.fromLegacyCwd(cwd)
		const roots = manager.getRoots()
		stateManager.setGlobalState("workspaceRoots", roots)
		stateManager.setGlobalState("primaryRootIndex", manager.getPrimaryIndex())

		HostProvider.window.showMessage({
			type: ShowMessageType.WARNING,
			message: "Failed to initialize workspace. Using single folder mode.",
		})
		return manager
	}
}
