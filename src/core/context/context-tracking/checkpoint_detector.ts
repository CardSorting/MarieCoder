import { getTaskMetadata } from "@core/storage/disk"
import type { ClineMessage } from "@shared/ExtensionMessage"

/**
 * Detects files edited after checkpoint timestamps
 *
 * This module is responsible for:
 * - Finding files edited after a specific message timestamp
 * - Checking both task metadata and deleted messages
 * - Supporting checkpoint/history restoration warnings
 */
export class CheckpointDetector {
	private readonly taskId: string

	constructor(taskId: string) {
		this.taskId = taskId
	}

	/**
	 * Detects files that were edited by Cline or users after a specific message timestamp
	 *
	 * This is used when restoring checkpoints to warn about potential file content mismatches.
	 * It checks both the task metadata for tracked edits and the deleted messages for
	 * file operations that occurred after the checkpoint.
	 *
	 * @param messageTimestamp - Timestamp of the checkpoint message
	 * @param deletedMessages - Messages that will be deleted during restoration
	 * @returns Array of file paths that were edited after the timestamp
	 */
	async detectEditedFiles(messageTimestamp: number, deletedMessages: ClineMessage[]): Promise<string[]> {
		const editedFiles: string[] = []

		// Check task metadata for files edited after timestamp
		const metadataFiles = await this.checkMetadataForEdits(messageTimestamp)
		editedFiles.push(...metadataFiles)

		// Check deleted messages for file operations
		const messageFiles = this.checkMessagesForEdits(deletedMessages)
		editedFiles.push(...messageFiles)

		// Return unique file paths
		return [...new Set(editedFiles)]
	}

	/**
	 * Checks task metadata for files edited after the timestamp
	 *
	 * @param messageTimestamp - Timestamp to check against
	 * @returns Array of file paths edited after timestamp
	 */
	private async checkMetadataForEdits(messageTimestamp: number): Promise<string[]> {
		const editedFiles: string[] = []

		try {
			const taskMetadata = await getTaskMetadata(this.taskId)

			if (taskMetadata?.files_in_context) {
				for (const fileEntry of taskMetadata.files_in_context) {
					const clineEditedAfter = fileEntry.cline_edit_date && fileEntry.cline_edit_date > messageTimestamp
					const userEditedAfter = fileEntry.user_edit_date && fileEntry.user_edit_date > messageTimestamp

					if (clineEditedAfter || userEditedAfter) {
						editedFiles.push(fileEntry.path)
					}
				}
			}
		} catch {
			// Silently fail - metadata check is not critical
		}

		return editedFiles
	}

	/**
	 * Checks deleted messages for file edit operations
	 *
	 * Scans through messages that will be deleted to find any file edits or creations.
	 *
	 * @param deletedMessages - Messages to scan
	 * @returns Array of file paths found in messages
	 */
	private checkMessagesForEdits(deletedMessages: ClineMessage[]): string[] {
		const editedFiles: string[] = []

		for (const message of deletedMessages) {
			if (message.say === "tool" && message.text) {
				try {
					const toolData = JSON.parse(message.text)
					if ((toolData.tool === "editedExistingFile" || toolData.tool === "newFileCreated") && toolData.path) {
						if (!editedFiles.includes(toolData.path)) {
							editedFiles.push(toolData.path)
						}
					}
				} catch {
					// Silently fail - parsing error not critical
				}
			}
		}

		return editedFiles
	}

	/**
	 * Checks if a specific file was edited after a timestamp
	 *
	 * @param filePath - Path to check
	 * @param messageTimestamp - Timestamp to check against
	 * @returns True if file was edited after timestamp
	 */
	async wasFileEditedAfter(filePath: string, messageTimestamp: number): Promise<boolean> {
		try {
			const taskMetadata = await getTaskMetadata(this.taskId)

			if (taskMetadata?.files_in_context) {
				for (const fileEntry of taskMetadata.files_in_context) {
					if (fileEntry.path === filePath) {
						const clineEditedAfter = fileEntry.cline_edit_date && fileEntry.cline_edit_date > messageTimestamp
						const userEditedAfter = fileEntry.user_edit_date && fileEntry.user_edit_date > messageTimestamp

						if (clineEditedAfter || userEditedAfter) {
							return true
						}
					}
				}
			}
		} catch {
			// Silently fail - timestamp check not critical
		}

		return false
	}
}
