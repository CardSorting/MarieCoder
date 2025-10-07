import chokidar, { FSWatcher } from "chokidar"
import * as path from "path"
import { getCwd } from "@/utils/path"

/**
 * Manages file system watchers for detecting external file modifications
 *
 * This module is responsible for:
 * - Creating and configuring chokidar watchers for specific files
 * - Detecting when files are modified outside of Cline
 * - Disposing watchers when no longer needed
 */
export class FileWatcher {
	/** Map of file paths to their active watchers */
	private watchers = new Map<string, FSWatcher>()

	/**
	 * Sets up a file watcher for a specific file
	 *
	 * Creates a chokidar watcher configured to detect file changes with
	 * appropriate debouncing and atomic write handling.
	 *
	 * @param filePath - Relative path to the file to watch
	 * @param onChange - Callback when file changes are detected
	 * @returns True if watcher was created, false if already exists
	 */
	async setupWatcher(filePath: string, onChange: (filePath: string) => void): Promise<boolean> {
		// Only setup watcher if it doesn't already exist
		if (this.watchers.has(filePath)) {
			return false
		}

		const cwd = await getCwd()
		if (!cwd) {
			console.info("No workspace folder available - cannot determine current working directory")
			return false
		}

		// Create a chokidar file watcher for this specific file
		const resolvedFilePath = path.resolve(cwd, filePath)
		const watcher = chokidar.watch(resolvedFilePath, {
			persistent: true, // Keep process alive while watching
			ignoreInitial: true, // Don't emit events for existing files on startup
			atomic: true, // Handle atomic writes (editors that use temp files)
			awaitWriteFinish: {
				// Wait for writes to finish before emitting events
				stabilityThreshold: 100, // Wait 100ms for file size to stabilize
				pollInterval: 100, // Check every 100ms while waiting
			},
		})

		// Track file changes
		watcher.on("change", () => {
			onChange(filePath)
		})

		// Store the watcher so we can dispose it later
		this.watchers.set(filePath, watcher)
		return true
	}

	/**
	 * Checks if a watcher exists for a specific file
	 * @param filePath - File path to check
	 * @returns True if watcher exists
	 */
	hasWatcher(filePath: string): boolean {
		return this.watchers.has(filePath)
	}

	/**
	 * Disposes all file watchers
	 *
	 * Closes all active watchers and clears the internal map.
	 */
	async dispose(): Promise<void> {
		const closePromises = Array.from(this.watchers.values()).map((watcher) => watcher.close())
		await Promise.all(closePromises)
		this.watchers.clear()
	}

	/**
	 * Gets the count of active watchers
	 * @returns Number of active watchers
	 */
	getWatcherCount(): number {
		return this.watchers.size
	}
}
