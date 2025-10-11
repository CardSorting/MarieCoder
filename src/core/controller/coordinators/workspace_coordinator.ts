import { StateManager } from "@core/storage/StateManager"
import { detectWorkspaceRoots } from "@core/workspace/detection"
import { setupWorkspaceManager } from "@core/workspace/setup"
import { WorkspaceRootManager } from "@core/workspace/WorkspaceRootManager"
import { Logger } from "@services/logging/Logger"
import type * as vscode from "vscode"
import { ControllerEventType } from "../events/controller_events"
import { ControllerEventEmitter } from "../events/event_emitter"

/**
 * Coordinates workspace management and multi-root support
 * Handles workspace initialization, detection, and CWD resolution
 */
export class WorkspaceCoordinator {
	private workspaceManager?: WorkspaceRootManager

	constructor(
		_context: vscode.ExtensionContext,
		private stateManager: StateManager,
		private eventEmitter: ControllerEventEmitter,
	) {}

	/**
	 * Initialize workspace manager with detected roots
	 */
	async initialize(): Promise<void> {
		try {
			this.workspaceManager = await setupWorkspaceManager({
				stateManager: this.stateManager,
				detectRoots: detectWorkspaceRoots,
			})

			const roots = this.workspaceManager?.getRoots() || []
			const rootCount = roots.length
			const primaryIndex = this.workspaceManager?.getPrimaryIndex() || 0

			if (rootCount > 0) {
				Logger.info(`[WorkspaceCoordinator] Workspace initialized with ${rootCount} root(s)`)

				// Emit workspace initialized event
				await this.eventEmitter.emit(ControllerEventType.WORKSPACE_INITIALIZED, {
					rootCount,
					roots,
					primaryIndex,
				})
			}
		} catch (error) {
			Logger.error(
				"[WorkspaceCoordinator] Failed to setup workspace manager",
				error instanceof Error ? error : new Error(String(error)),
			)
			// Continue without workspace manager - will use fallback CWD
		}
	}

	/**
	 * Handle workspace folder changes
	 */
	async handleWorkspaceChange(event: vscode.WorkspaceFoldersChangeEvent): Promise<void> {
		Logger.info(`[WorkspaceCoordinator] Workspace changed: +${event.added.length} -${event.removed.length}`)

		// Emit workspace change event
		await this.eventEmitter.emit(ControllerEventType.WORKSPACE_CHANGED, {
			added: event.added.length,
			removed: event.removed.length,
		})

		await this.reinitializeWorkspace()
	}

	/**
	 * Reinitialize workspace manager
	 */
	async reinitializeWorkspace(): Promise<void> {
		await this.cleanup()
		await this.initialize()
	}

	/**
	 * Get current working directory from workspace manager or fallback
	 */
	getCwd(): string | undefined {
		return this.workspaceManager?.getPrimaryRoot()?.path
	}

	/**
	 * Get workspace manager instance
	 */
	getWorkspaceManager(): WorkspaceRootManager | undefined {
		return this.workspaceManager
	}

	/**
	 * Cleanup workspace manager resources
	 */
	async cleanup(): Promise<void> {
		// WorkspaceRootManager doesn't require cleanup
		this.workspaceManager = undefined
	}
}
