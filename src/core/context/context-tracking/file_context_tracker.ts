import type { ClineMessage } from "@shared/ExtensionMessage"
import { Controller } from "@/core/controller"
import type { StateManager } from "@/core/storage/StateManager"
import { getCwd } from "@/utils/path"
import { CheckpointDetector } from "./checkpoint_detector"
import type { FileOperation } from "./context_tracker_types"
import { FileMetadataManager } from "./file_metadata_manager"
import { FileStateDetector } from "./file_state_detector"
import { FileWatcher } from "./file_watcher"
import { WarningPersistence } from "./warning_persistence"

/**
 * Orchestrates file context tracking to prevent stale context issues
 *
 * This class coordinates multiple specialized modules to track file operations:
 *
 * - **FileWatcher**: Monitors file system changes with chokidar
 * - **FileMetadataManager**: Manages metadata persistence
 * - **FileStateDetector**: Tracks modification state
 * - **CheckpointDetector**: Detects edits after checkpoints
 * - **WarningPersistence**: Stores warnings in workspace state
 *
 * When a user modifies a file outside of Cline, the context may become stale.
 * This system detects these changes and informs Cline to reload files before
 * making edits, preventing diff editing failures.
 */
export class FileContextTracker {
	readonly taskId: string

	// Specialized modules
	private readonly fileWatcher: FileWatcher
	private readonly metadataManager: FileMetadataManager
	private readonly stateDetector: FileStateDetector
	private readonly checkpointDetector: CheckpointDetector
	private readonly warningPersistence: WarningPersistence

	constructor(controller: Controller, taskId: string) {
		this.taskId = taskId

		// Initialize modules
		this.fileWatcher = new FileWatcher()
		this.metadataManager = new FileMetadataManager(taskId)
		this.stateDetector = new FileStateDetector()
		this.checkpointDetector = new CheckpointDetector(taskId)
		this.warningPersistence = new WarningPersistence(controller, taskId)
	}

	/**
	 * Sets up a file watcher for a specific file
	 *
	 * Creates a watcher that detects external modifications and updates
	 * the file state accordingly.
	 *
	 * @param filePath - Relative path to the file to watch
	 */
	async setupFileWatcher(filePath: string): Promise<void> {
		// Only setup watcher if it doesn't already exist
		if (this.fileWatcher.hasWatcher(filePath)) {
			return
		}

		const cwd = await getCwd()
		if (!cwd) {
			// No workspace folder available
			return
		}

		// Setup watcher with change handler
		await this.fileWatcher.setupWatcher(filePath, (changedFilePath) => {
			this.handleFileChange(changedFilePath)
		})
	}

	/**
	 * Handles file change events from watchers
	 *
	 * Distinguishes between Cline edits and user edits to avoid false positives.
	 *
	 * @param filePath - Path of the changed file
	 */
	private handleFileChange(filePath: string): void {
		if (this.stateDetector.wasRecentlyEditedByCline(filePath)) {
			// This was an edit by Cline, no need to inform Cline
			this.stateDetector.clearClineEdit(filePath)
		} else {
			// This was a user edit, we will inform Cline
			this.stateDetector.addModifiedFile(filePath)
			this.trackFileContext(filePath, "user_edited") // Update the task metadata
		}
	}

	/**
	 * Tracks a file operation in metadata and sets up a watcher for the file
	 *
	 * This is the main entry point for FileContextTracker and is called when a file
	 * is passed to Cline via a tool, mention, or edit.
	 *
	 * @param filePath - Relative path to the file
	 * @param operation - Type of file operation
	 */
	async trackFileContext(filePath: string, operation: FileOperation): Promise<void> {
		try {
			const cwd = await getCwd()
			if (!cwd) {
				// No workspace folder available
				return
			}

			// Add file to metadata
			await this.metadataManager.addFileEntry(filePath, operation)

			// Set up file watcher for this file
			await this.setupFileWatcher(filePath)
		} catch (error) {
			// Failed to track file operation
		}
	}

	/**
	 * Returns (and then clears) the set of recently modified files
	 *
	 * @returns Array of file paths that were recently modified by users
	 */
	getAndClearRecentlyModifiedFiles(): string[] {
		return this.stateDetector.getAndClearModifiedFiles()
	}

	/**
	 * Marks a file as edited by Cline to prevent false positives in file watchers
	 *
	 * Call this before Cline edits a file so the subsequent watcher event
	 * is ignored.
	 *
	 * @param filePath - Path of file being edited by Cline
	 */
	markFileAsEditedByCline(filePath: string): void {
		this.stateDetector.markAsEditedByCline(filePath)
	}

	/**
	 * Detects files that were edited by Cline or users after a specific message timestamp
	 *
	 * This is used when restoring checkpoints to warn about potential file content mismatches.
	 *
	 * @param messageTimestamp - Timestamp of the checkpoint message
	 * @param deletedMessages - Messages that will be deleted during restoration
	 * @returns Array of file paths that were edited after the timestamp
	 */
	async detectFilesEditedAfterMessage(messageTimestamp: number, deletedMessages: ClineMessage[]): Promise<string[]> {
		return await this.checkpointDetector.detectEditedFiles(messageTimestamp, deletedMessages)
	}

	/**
	 * Stores pending file context warning in workspace state
	 *
	 * Warnings persist across task reinitialization.
	 *
	 * @param files - Array of file paths to warn about
	 */
	async storePendingFileContextWarning(files: string[]): Promise<void> {
		await this.warningPersistence.storeWarning(files)
	}

	/**
	 * Retrieves pending file context warning from workspace state (without clearing it)
	 *
	 * @returns Array of file paths or undefined if no warning exists
	 */
	async retrievePendingFileContextWarning(): Promise<string[] | undefined> {
		return await this.warningPersistence.retrieveWarning()
	}

	/**
	 * Retrieves and clears pending file context warning from workspace state
	 *
	 * @returns Array of file paths or undefined if no warning exists
	 */
	async retrieveAndClearPendingFileContextWarning(): Promise<string[] | undefined> {
		return await this.warningPersistence.retrieveAndClearWarning()
	}

	/**
	 * Disposes all file watchers
	 *
	 * Call this when the task is closed or the tracker is no longer needed.
	 */
	async dispose(): Promise<void> {
		await this.fileWatcher.dispose()
	}

	/**
	 * Static method to clean up orphaned pending file context warnings at startup
	 *
	 * This removes warnings for tasks that may no longer exist.
	 *
	 * @param stateManager - StateManager instance for accessing workspace state
	 */
	static async cleanupOrphanedWarnings(stateManager: StateManager): Promise<void> {
		await WarningPersistence.cleanupOrphanedWarnings(stateManager)
	}
}
