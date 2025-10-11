import { ICheckpointManager } from "@integrations/checkpoints/types"
import { TerminalManager } from "@integrations/terminal/TerminalManager"
import { BrowserSession } from "@services/browser/BrowserSession"
import { Logger } from "@services/logging/Logger"

/**
 * Coordinates resource management across the task lifecycle
 * Manages browser sessions, terminals, and checkpoint cleanup
 *
 * Responsibilities:
 * - Initialize resources when task starts
 * - Coordinate resource lifecycle
 * - Clean up resources when task ends
 * - Handle graceful shutdown
 */
export class ResourceCoordinator {
	constructor(
		private browserSession: BrowserSession,
		private terminalManager: TerminalManager,
		private checkpointManager?: ICheckpointManager,
	) {}

	/**
	 * Initialize all resources for the task
	 * Called during task startup
	 */
	async initialize(): Promise<void> {
		// Resources are initialized in their constructors
		// This method exists for future expansion if needed
		Logger.debug("[ResourceCoordinator] Resources initialized")
	}

	/**
	 * Clean up all resources when task completes or aborts
	 * Ensures proper disposal of browser, terminal, and checkpoint resources
	 */
	async cleanup(): Promise<void> {
		Logger.debug("[ResourceCoordinator] Starting resource cleanup")

		await Promise.all([this.cleanupBrowser(), this.cleanupTerminal(), this.cleanupCheckpoints()])

		Logger.debug("[ResourceCoordinator] Resource cleanup complete")
	}

	/**
	 * Close browser session and release resources
	 */
	private async cleanupBrowser(): Promise<void> {
		try {
			await this.browserSession.close()
			Logger.debug("[ResourceCoordinator] Browser session closed")
		} catch (error) {
			Logger.error(
				"[ResourceCoordinator] Error closing browser session",
				error instanceof Error ? error : new Error(String(error)),
			)
		}
	}

	/**
	 * Dispose terminal manager and cleanup terminals
	 */
	private async cleanupTerminal(): Promise<void> {
		try {
			await this.terminalManager.dispose()
			Logger.debug("[ResourceCoordinator] Terminal manager disposed")
		} catch (error) {
			Logger.error(
				"[ResourceCoordinator] Error disposing terminal manager",
				error instanceof Error ? error : new Error(String(error)),
			)
		}
	}

	/**
	 * Clean up checkpoint manager if present
	 */
	private async cleanupCheckpoints(): Promise<void> {
		if (!this.checkpointManager) {
			return
		}

		try {
			await this.checkpointManager.dispose()
			Logger.debug("[ResourceCoordinator] Checkpoint manager disposed")
		} catch (error) {
			Logger.error(
				"[ResourceCoordinator] Error disposing checkpoint manager",
				error instanceof Error ? error : new Error(String(error)),
			)
		}
	}

	/**
	 * Get browser session (for external access if needed)
	 */
	getBrowserSession(): BrowserSession {
		return this.browserSession
	}

	/**
	 * Get terminal manager (for external access if needed)
	 */
	getTerminalManager(): TerminalManager {
		return this.terminalManager
	}

	/**
	 * Get checkpoint manager (for external access if needed)
	 */
	getCheckpointManager(): ICheckpointManager | undefined {
		return this.checkpointManager
	}
}
