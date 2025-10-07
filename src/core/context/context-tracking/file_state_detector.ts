/**
 * Detects and tracks file state changes
 *
 * This module is responsible for:
 * - Tracking recently modified files (by users)
 * - Tracking files recently edited by Cline
 * - Preventing false positives in file change detection
 */
export class FileStateDetector {
	/** Files modified by users (detected by file watchers) */
	private recentlyModifiedFiles = new Set<string>()

	/** Files edited by Cline (to filter out from watcher events) */
	private recentlyEditedByCline = new Set<string>()

	/**
	 * Checks if a file was recently edited by Cline
	 *
	 * This is used to prevent false positives when file watchers detect
	 * changes that were actually made by Cline.
	 *
	 * @param filePath - Path to check
	 * @returns True if file was recently edited by Cline
	 */
	wasRecentlyEditedByCline(filePath: string): boolean {
		return this.recentlyEditedByCline.has(filePath)
	}

	/**
	 * Marks a file as edited by Cline
	 *
	 * When Cline edits a file, we mark it here so that subsequent
	 * file watcher events can be ignored (they're not user edits).
	 *
	 * @param filePath - Path of file edited by Cline
	 */
	markAsEditedByCline(filePath: string): void {
		this.recentlyEditedByCline.add(filePath)
	}

	/**
	 * Removes a file from the "edited by Cline" set
	 *
	 * Called when a watcher event occurs for a file Cline edited,
	 * clearing it so future events are tracked as user edits.
	 *
	 * @param filePath - Path to clear
	 */
	clearClineEdit(filePath: string): void {
		this.recentlyEditedByCline.delete(filePath)
	}

	/**
	 * Adds a file to the recently modified set
	 *
	 * Called when file watchers detect a user edit.
	 *
	 * @param filePath - Path of modified file
	 */
	addModifiedFile(filePath: string): void {
		this.recentlyModifiedFiles.add(filePath)
	}

	/**
	 * Gets and clears the set of recently modified files
	 *
	 * This is typically called when presenting modified files to Cline
	 * or when checking if any files need to be reloaded.
	 *
	 * @returns Array of recently modified file paths
	 */
	getAndClearModifiedFiles(): string[] {
		const files = Array.from(this.recentlyModifiedFiles)
		this.recentlyModifiedFiles.clear()
		return files
	}

	/**
	 * Checks if there are any recently modified files
	 * @returns True if files have been modified
	 */
	hasModifiedFiles(): boolean {
		return this.recentlyModifiedFiles.size > 0
	}

	/**
	 * Gets the count of recently modified files
	 * @returns Number of modified files
	 */
	getModifiedFileCount(): number {
		return this.recentlyModifiedFiles.size
	}

	/**
	 * Clears all state
	 *
	 * Useful for cleanup or resetting the detector.
	 */
	clear(): void {
		this.recentlyModifiedFiles.clear()
		this.recentlyEditedByCline.clear()
	}
}
