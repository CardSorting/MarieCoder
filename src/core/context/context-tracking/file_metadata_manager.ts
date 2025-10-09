import { getTaskMetadata, saveTaskMetadata } from "@core/storage/disk"
import type { FileMetadataEntry, FileOperation } from "./context_tracker_types"

/**
 * Manages file metadata tracking in task metadata
 *
 * This module is responsible for:
 * - Adding new file tracking entries
 * - Updating file state (active/stale)
 * - Managing read/edit timestamps
 * - Persisting metadata to disk
 */
export class FileMetadataManager {
	private readonly taskId: string

	constructor(taskId: string) {
		this.taskId = taskId
	}

	/**
	 * Adds a file to the metadata tracker
	 *
	 * This handles the business logic of determining if the file is new, stale, or active.
	 * When a new entry is added, existing entries for the same file are marked as stale.
	 * Timestamps are preserved from previous entries and updated based on the operation type.
	 *
	 * @param filePath - Relative path to the file
	 * @param operation - Type of operation that triggered this tracking
	 */
	async addFileEntry(filePath: string, operation: FileOperation): Promise<void> {
		try {
			const metadata = await getTaskMetadata(this.taskId)
			const now = Date.now()

			// Mark existing entries for this file as stale
			this.markExistingEntriesAsStale(metadata.files_in_context, filePath)

			// Create new entry with latest timestamps
			const newEntry = this.createFileEntry(filePath, operation, metadata.files_in_context, now)

			metadata.files_in_context.push(newEntry)
			await saveTaskMetadata(this.taskId, metadata)
		} catch {
			// Silently fail - metadata is not critical
		}
	}

	/**
	 * Marks all active entries for a file as stale
	 *
	 * @param entries - Array of file metadata entries
	 * @param filePath - Path of the file to mark as stale
	 */
	private markExistingEntriesAsStale(entries: FileMetadataEntry[], filePath: string): void {
		entries.forEach((entry) => {
			if (entry.path === filePath && entry.record_state === "active") {
				entry.record_state = "stale"
			}
		})
	}

	/**
	 * Creates a new file metadata entry
	 *
	 * Preserves timestamps from previous entries and updates them based on the operation type.
	 *
	 * @param filePath - Relative path to the file
	 * @param operation - Type of operation
	 * @param existingEntries - Existing entries to extract timestamps from
	 * @param now - Current timestamp
	 * @returns New file metadata entry
	 */
	private createFileEntry(
		filePath: string,
		operation: FileOperation,
		existingEntries: FileMetadataEntry[],
		now: number,
	): FileMetadataEntry {
		const entry: FileMetadataEntry = {
			path: filePath,
			record_state: "active",
			record_source: operation,
			cline_read_date: this.getLatestTimestamp(existingEntries, filePath, "cline_read_date"),
			cline_edit_date: this.getLatestTimestamp(existingEntries, filePath, "cline_edit_date"),
			user_edit_date: this.getLatestTimestamp(existingEntries, filePath, "user_edit_date"),
		}

		// Update timestamps based on operation type
		switch (operation) {
			case "user_edited":
				entry.user_edit_date = now
				break

			case "cline_edited":
				entry.cline_read_date = now
				entry.cline_edit_date = now
				break

			case "read_tool":
			case "file_mentioned":
				entry.cline_read_date = now
				break
		}

		return entry
	}

	/**
	 * Gets the latest timestamp for a specific field from existing entries
	 *
	 * @param entries - Array of file metadata entries
	 * @param filePath - Path of the file
	 * @param field - Field to get timestamp from
	 * @returns Latest timestamp or null if none exists
	 */
	private getLatestTimestamp(entries: FileMetadataEntry[], filePath: string, field: keyof FileMetadataEntry): number | null {
		const relevantEntries = entries
			.filter((entry) => entry.path === filePath && entry[field])
			.sort((a, b) => (b[field] as number) - (a[field] as number))

		return relevantEntries.length > 0 ? (relevantEntries[0][field] as number) : null
	}

	/**
	 * Gets all file metadata entries for the task
	 * @returns Array of file metadata entries
	 */
	async getAllFileEntries(): Promise<FileMetadataEntry[]> {
		try {
			const metadata = await getTaskMetadata(this.taskId)
			return metadata.files_in_context || []
		} catch {
			return []
		}
	}
}
