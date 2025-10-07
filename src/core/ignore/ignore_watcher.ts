/**
 * Ignore Watcher - File watching functionality for .clineignore
 *
 * Handles:
 * - Setting up file watcher for .clineignore
 * - Handling file change events
 * - Managing watcher lifecycle
 */

import chokidar, { FSWatcher } from "chokidar"
import path from "path"

/**
 * Set up the file watcher for .clineignore changes
 * @param cwd - Current working directory
 * @param onReload - Callback to trigger when .clineignore changes
 * @returns FSWatcher instance
 */
export function setupIgnoreFileWatcher(cwd: string, onReload: () => void): FSWatcher {
	const ignorePath = path.join(cwd, ".clineignore")

	const fileWatcher = chokidar.watch(ignorePath, {
		persistent: true, // Keep the process running as long as files are being watched
		ignoreInitial: true, // Don't fire 'add' events when discovering the file initially
		awaitWriteFinish: {
			// Wait for writes to finish before emitting events (handles chunked writes)
			stabilityThreshold: 100, // Wait 100ms for file size to remain constant
			pollInterval: 100, // Check file size every 100ms while waiting for stability
		},
		atomic: true, // Handle atomic writes where editors write to a temp file then rename
	})

	// Watch for file changes, creation, and deletion
	fileWatcher.on("change", () => {
		onReload()
	})

	fileWatcher.on("add", () => {
		onReload()
	})

	fileWatcher.on("unlink", () => {
		onReload()
	})

	fileWatcher.on("error", (error) => {
		console.error("Error watching .clineignore file:", error)
	})

	return fileWatcher
}

/**
 * Close and cleanup the file watcher
 * @param fileWatcher - FSWatcher instance to close
 */
export async function closeIgnoreFileWatcher(fileWatcher: FSWatcher | undefined): Promise<void> {
	if (fileWatcher) {
		await fileWatcher.close()
	}
}
