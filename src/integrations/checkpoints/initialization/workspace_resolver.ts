import type { WorkspaceRootManager } from "@core/workspace/WorkspaceRootManager"
import { Logger } from "@/services/logging/Logger"

/**
 * Resolves the workspace path for checkpoint operations
 * Attempts to use WorkspaceRootManager first, falls back to legacy implementation
 */
export class WorkspaceResolver {
	constructor(
		private readonly taskId: string,
		private readonly workspaceManager?: WorkspaceRootManager,
	) {}

	/**
	 * Gets the workspace path from WorkspaceRootManager when available,
	 * otherwise falls back to CheckpointUtils
	 */
	async getWorkspacePath(): Promise<string> {
		// Try to use the centralized WorkspaceRootManager first
		if (this.workspaceManager) {
			try {
				const primaryRoot = this.workspaceManager.getPrimaryRoot()
				if (primaryRoot) {
					return primaryRoot.path
				}
				Logger.warn(`[WorkspaceResolver] WorkspaceRootManager returned no primary root for task ${this.taskId}`)
			} catch (error) {
				Logger.warn(
					`[WorkspaceResolver] Failed to get workspace path from WorkspaceRootManager for task ${this.taskId}: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		// Fallback to the legacy CheckpointUtils implementation
		const { getWorkingDirectory: getWorkingDirectoryImpl } = await import("../CheckpointUtils")
		return getWorkingDirectoryImpl()
	}
}
