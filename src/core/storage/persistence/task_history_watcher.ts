import chokidar, { FSWatcher } from "chokidar"
import { Logger } from "@/services/logging/Logger"
import { getTaskHistoryStateFilePath, readTaskHistoryFromState } from "../disk"
import type { GlobalStateManager } from "../managers/global_state_manager"

/**
 * Watches taskHistory.json for external changes and syncs cache
 * Prevents write loops by only updating cache, not triggering persistence
 */
export class TaskHistoryWatcher {
	private watcher: FSWatcher | null = null
	private isInitialized = false

	// Callback when external changes are synced
	onSyncExternalChange?: () => void | Promise<void>

	constructor(private readonly globalStateManager: GlobalStateManager) {}

	/**
	 * Initialize and start watching the taskHistory.json file
	 */
	async start(): Promise<void> {
		if (this.isInitialized) {
			throw new Error("TaskHistoryWatcher has already been started")
		}

		try {
			const historyFile = await getTaskHistoryStateFilePath()

			// Close any existing watcher before creating a new one
			if (this.watcher) {
				await this.watcher.close()
				this.watcher = null
			}

			this.watcher = chokidar.watch(historyFile, {
				persistent: true,
				ignoreInitial: true,
				atomic: true,
				awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
			})

			this.watcher
				.on("add", () => this.syncTaskHistoryFromDisk())
				.on("change", () => this.syncTaskHistoryFromDisk())
				.on("unlink", async () => {
					this.globalStateManager.set("taskHistory", [])
					await this.onSyncExternalChange?.()
				})
				.on("error", (error) =>
					Logger.error("[TaskHistoryWatcher] Watcher error", error instanceof Error ? error : new Error(String(error))),
				)

			this.isInitialized = true
		} catch (err) {
			Logger.error("[TaskHistoryWatcher] Failed to start watcher", err instanceof Error ? err : new Error(String(err)))
		}
	}

	/**
	 * Stop watching and cleanup
	 */
	async stop(): Promise<void> {
		if (this.watcher) {
			await this.watcher.close()
			this.watcher = null
		}
		this.isInitialized = false
	}

	/**
	 * Sync task history from disk to cache when external changes are detected
	 */
	private async syncTaskHistoryFromDisk(): Promise<void> {
		try {
			const onDisk = await readTaskHistoryFromState()
			const cached = this.globalStateManager.getCachedValue("taskHistory")

			// Only update if changed to avoid unnecessary operations
			if (JSON.stringify(onDisk) !== JSON.stringify(cached)) {
				this.globalStateManager.set("taskHistory", onDisk)
				await this.onSyncExternalChange?.()
			}
		} catch (err) {
			Logger.error(
				"[TaskHistoryWatcher] Failed to reload task history on change",
				err instanceof Error ? err : new Error(String(err)),
			)
		}
	}
}
