import { Anthropic } from "@anthropic-ai/sdk"
import { formatResponse } from "@core/prompts/response_formatters"
import {
	ContextHistoryInnerMap,
	ContextHistoryMap,
	ContextUpdate,
	EditType,
	FileReadIndices,
	MessageFilePaths,
} from "./context_types"

/**
 * Optimizes context by detecting and replacing duplicate file reads
 *
 * This module is responsible for:
 * - Finding duplicate file reads across tool calls and file mentions
 * - Replacing duplicate content with compact notices
 * - Tracking which files have been replaced to avoid re-processing
 * - Handling multiple file mentions within the same message
 */
export class FileReadOptimizer {
	/**
	 * Finds and saves updates for duplicate file reads
	 *
	 * Scans messages for duplicate file reads from various sources (read_file tool,
	 * write_to_file tool, file mentions) and creates updates to replace duplicates
	 * with compact notices.
	 *
	 * @param apiMessages - API messages to analyze
	 * @param contextHistory - Current context history (to check existing updates)
	 * @param startFromIndex - Index to start analysis from
	 * @param timestamp - Timestamp for updates
	 * @returns Tuple of [whether updates were made, set of updated message indices]
	 */
	findAndSaveDuplicates(
		apiMessages: Anthropic.Messages.MessageParam[],
		contextHistory: ContextHistoryMap,
		startFromIndex: number,
		timestamp: number,
	): [boolean, Set<number>] {
		const [fileReadIndices, messageFilePaths] = this.findDuplicateFileReads(apiMessages, contextHistory, startFromIndex)

		return this.saveFileReadUpdates(fileReadIndices, messageFilePaths, apiMessages, contextHistory, timestamp)
	}

	/**
	 * Generates mapping of unique file reads from multiple tool calls to their positions
	 *
	 * Tracks three types of file reads:
	 * 1. read_file tool calls
	 * 2. write_to_file/replace_in_file tool calls (which include file content)
	 * 3. File mentions in user messages
	 *
	 * @param apiMessages - API messages to analyze
	 * @param contextHistory - Current context history
	 * @param startFromIndex - Index to start from
	 * @returns Tuple of [file read indices map, message file paths map]
	 */
	private findDuplicateFileReads(
		apiMessages: Anthropic.Messages.MessageParam[],
		contextHistory: ContextHistoryMap,
		startFromIndex: number,
	): [FileReadIndices, MessageFilePaths] {
		const fileReadIndices: FileReadIndices = new Map()
		const messageFilePaths: MessageFilePaths = new Map()

		for (let messageIndex = startFromIndex; messageIndex < apiMessages.length; messageIndex++) {
			const existingFileReads = this.getExistingFileReads(contextHistory, messageIndex)

			// Skip if all files already replaced or message already processed
			if (existingFileReads === null) {
				continue
			}

			this.processMessage(apiMessages[messageIndex], messageIndex, fileReadIndices, messageFilePaths, existingFileReads)
		}

		return [fileReadIndices, messageFilePaths]
	}

	/**
	 * Gets existing file reads that have been replaced in a message
	 *
	 * @param contextHistory - Current context history
	 * @param messageIndex - Index of message to check
	 * @returns Array of replaced file paths, null if message fully processed, or empty array if none
	 */
	private getExistingFileReads(contextHistory: ContextHistoryMap, messageIndex: number): string[] | null {
		if (!contextHistory.has(messageIndex)) {
			return []
		}

		const contextUpdate = contextHistory.get(messageIndex)
		if (!contextUpdate) {
			return []
		}

		const [editType, innerMap] = contextUpdate

		if (editType === EditType.FILE_MENTION) {
			const blockIndex = 1 // file mention blocks assumed to be at index 1
			const blockUpdates = innerMap.get(blockIndex)

			if (blockUpdates && blockUpdates.length > 0) {
				const latestUpdate = blockUpdates[blockUpdates.length - 1]
				const [replacedFiles, allFiles] = latestUpdate[3]

				// If all files replaced, skip this message
				if (replacedFiles.length === allFiles.length) {
					return null
				}

				// Return which files we've already replaced
				return replacedFiles
			}
		} else {
			// For other edit types, we don't need to check again
			return null
		}

		return []
	}

	/**
	 * Processes a single message to find file reads
	 *
	 * @param message - Message to process
	 * @param messageIndex - Index of the message
	 * @param fileReadIndices - Map to store file read information
	 * @param messageFilePaths - Map to store message file paths
	 * @param existingFileReads - Files already replaced in this message
	 */
	private processMessage(
		message: Anthropic.Messages.MessageParam,
		messageIndex: number,
		fileReadIndices: FileReadIndices,
		messageFilePaths: MessageFilePaths,
		existingFileReads: string[],
	): void {
		if (message.role !== "user" || !Array.isArray(message.content) || message.content.length === 0) {
			return
		}

		const firstBlock = message.content[0]
		if (firstBlock.type !== "text") {
			return
		}

		const toolCall = this.parseToolCall(firstBlock.text)
		let foundNormalFileRead = false

		// Check for tool calls first
		if (toolCall) {
			if (toolCall[0] === "read_file") {
				this.trackReadFileToolCall(messageIndex, toolCall[1], fileReadIndices)
				foundNormalFileRead = true
			} else if (toolCall[0] === "replace_in_file" || toolCall[0] === "write_to_file") {
				if (message.content.length > 1) {
					const secondBlock = message.content[1]
					if (secondBlock.type === "text") {
						this.trackFileAlteringToolCall(messageIndex, toolCall[1], secondBlock.text, fileReadIndices)
						foundNormalFileRead = true
					}
				}
			}
		}

		// Check for file mentions if no tool call found
		if (!foundNormalFileRead && message.content.length > 1) {
			const secondBlock = message.content[1]
			if (secondBlock.type === "text") {
				const [hasFileRead, filePaths] = this.trackFileMentions(
					messageIndex,
					secondBlock.text,
					fileReadIndices,
					existingFileReads,
				)
				if (hasFileRead) {
					messageFilePaths.set(messageIndex, filePaths)
				}
			}
		}
	}

	/**
	 * Parses specific tool call formats from text
	 *
	 * @param text - Text to parse
	 * @returns Tuple of [tool name, file path] or null if no match
	 */
	private parseToolCall(text: string): [string, string] | null {
		const match = text.match(/^\[([^\s]+) for '([^']+)'\] Result:$/)
		return match ? [match[1], match[2]] : null
	}

	/**
	 * Tracks read_file tool call (always contains file content)
	 *
	 * @param messageIndex - Index of the message
	 * @param filePath - Path to the file
	 * @param fileReadIndices - Map to store file read information
	 */
	private trackReadFileToolCall(messageIndex: number, filePath: string, fileReadIndices: FileReadIndices): void {
		const indices = fileReadIndices.get(filePath) || []
		indices.push([messageIndex, EditType.READ_FILE_TOOL, "", formatResponse.duplicateFileReadNotice()])
		fileReadIndices.set(filePath, indices)
	}

	/**
	 * Tracks write_to_file and replace_in_file tool calls
	 *
	 * @param messageIndex - Index of the message
	 * @param filePath - Path to the file
	 * @param blockText - Text content to search
	 * @param fileReadIndices - Map to store file read information
	 */
	private trackFileAlteringToolCall(
		messageIndex: number,
		filePath: string,
		blockText: string,
		fileReadIndices: FileReadIndices,
	): void {
		const pattern = /(<final_file_content path="[^"]*">)[\s\S]*?(<\/final_file_content>)/

		// Only process if final_file_content exists (won't exist if user rejected the change)
		if (pattern.test(blockText)) {
			const replacementText = blockText.replace(pattern, `$1 ${formatResponse.duplicateFileReadNotice()} $2`)
			const indices = fileReadIndices.get(filePath) || []
			indices.push([messageIndex, EditType.ALTER_FILE_TOOL, "", replacementText])
			fileReadIndices.set(filePath, indices)
		}
	}

	/**
	 * Handles potential file content mentions in text blocks
	 *
	 * @param messageIndex - Index of the message
	 * @param blockText - Text content to search
	 * @param fileReadIndices - Map to store file read information
	 * @param existingFileReads - Files already replaced in this text
	 * @returns Tuple of [whether file reads found, array of file paths]
	 */
	private trackFileMentions(
		messageIndex: number,
		blockText: string,
		fileReadIndices: FileReadIndices,
		existingFileReads: string[],
	): [boolean, string[]] {
		const pattern = /<file_content path="([^"]*)">([\s\S]*?)<\/file_content>/g

		let foundMatch = false
		const filePaths: string[] = []

		for (const match of blockText.matchAll(pattern)) {
			foundMatch = true

			const filePath = match[1]
			filePaths.push(filePath)

			// Skip if we've already replaced this file read
			if (!existingFileReads.includes(filePath)) {
				const entireMatch = match[0]
				const replacementText = `<file_content path="${filePath}">${formatResponse.duplicateFileReadNotice()}</file_content>`

				const indices = fileReadIndices.get(filePath) || []
				indices.push([messageIndex, EditType.FILE_MENTION, entireMatch, replacementText])
				fileReadIndices.set(filePath, indices)
			}
		}

		return [foundMatch, filePaths]
	}

	/**
	 * Saves updates for all duplicate file read operations
	 *
	 * Only replaces file reads when there are multiple instances of the same file,
	 * keeping the latest instance intact.
	 *
	 * @param fileReadIndices - Map of file reads to update
	 * @param messageFilePaths - Map of message indices to file paths
	 * @param apiMessages - API messages
	 * @param contextHistory - Current context history
	 * @param timestamp - Timestamp for updates
	 * @returns Tuple of [whether updates were made, set of updated message indices]
	 */
	private saveFileReadUpdates(
		fileReadIndices: FileReadIndices,
		messageFilePaths: MessageFilePaths,
		apiMessages: Anthropic.Messages.MessageParam[],
		contextHistory: ContextHistoryMap,
		timestamp: number,
	): [boolean, Set<number>] {
		let didUpdate = false
		const updatedMessageIndices = new Set<number>()
		const fileMentionUpdates = new Map<number, [string, string[]]>()

		for (const [filePath, indices] of fileReadIndices.entries()) {
			// Only process if there are multiple reads of the same file (keep the latest)
			if (indices.length > 1) {
				// Process all but the last index (keep that instance)
				for (let indexPosition = 0; indexPosition < indices.length - 1; indexPosition++) {
					const [messageIndex, editType, searchText, replacementText] = indices[indexPosition]

					didUpdate = true
					updatedMessageIndices.add(messageIndex)

					if (editType === EditType.FILE_MENTION) {
						this.handleFileMentionUpdate(
							messageIndex,
							filePath,
							searchText,
							replacementText,
							fileMentionUpdates,
							contextHistory,
							apiMessages,
						)
					} else {
						this.handleNonFileMentionUpdate(messageIndex, editType, replacementText, timestamp, contextHistory)
					}
				}
			}
		}

		// Apply file mention updates to contextHistory
		this.applyFileMentionUpdates(fileMentionUpdates, messageFilePaths, contextHistory, timestamp)

		return [didUpdate, updatedMessageIndices]
	}

	/**
	 * Handles update for file mention type (may have multiple files in one message)
	 */
	private handleFileMentionUpdate(
		messageIndex: number,
		filePath: string,
		searchText: string,
		replacementText: string,
		fileMentionUpdates: Map<number, [string, string[]]>,
		contextHistory: ContextHistoryMap,
		apiMessages: Anthropic.Messages.MessageParam[],
	): void {
		if (!fileMentionUpdates.has(messageIndex)) {
			let baseText = ""
			let previouslyReplacedFiles: string[] = []

			// Get existing text from updates or original message
			const contextUpdate = contextHistory.get(messageIndex)
			if (contextUpdate) {
				const [_editType, innerMap] = contextUpdate
				const blockUpdates = innerMap.get(1) // index 1 for file mentions
				if (blockUpdates && blockUpdates.length > 0) {
					const latestUpdate = blockUpdates[blockUpdates.length - 1]
					baseText = latestUpdate[2][0]
					previouslyReplacedFiles = latestUpdate[3][0]
				}
			}

			// Fallback to original message content
			const messageContent = apiMessages[messageIndex]?.content
			if (!baseText && Array.isArray(messageContent) && messageContent.length > 1) {
				const contentBlock = messageContent[1]
				if (contentBlock.type === "text") {
					baseText = contentBlock.text
				}
			}

			fileMentionUpdates.set(messageIndex, [baseText, previouslyReplacedFiles])
		}

		// Replace searchText with replacementText
		if (searchText) {
			const [currentText, replacedFiles] = fileMentionUpdates.get(messageIndex) || ["", []]
			if (currentText) {
				const updatedText = currentText.replace(searchText, replacementText)
				replacedFiles.push(filePath)
				fileMentionUpdates.set(messageIndex, [updatedText, replacedFiles])
			}
		}
	}

	/**
	 * Handles update for non-file-mention type (single file per message)
	 */
	private handleNonFileMentionUpdate(
		messageIndex: number,
		editType: number,
		replacementText: string,
		timestamp: number,
		contextHistory: ContextHistoryMap,
	): void {
		const contextUpdate = contextHistory.get(messageIndex)
		let innerMap: ContextHistoryInnerMap

		if (!contextUpdate) {
			innerMap = new Map<number, ContextUpdate[]>()
			contextHistory.set(messageIndex, [editType, innerMap])
		} else {
			innerMap = contextUpdate[1]
		}

		const blockIndex = 1
		const updates = innerMap.get(blockIndex) || []
		updates.push([timestamp, "text", [replacementText], []])
		innerMap.set(blockIndex, updates)
	}

	/**
	 * Applies accumulated file mention updates to context history
	 */
	private applyFileMentionUpdates(
		fileMentionUpdates: Map<number, [string, string[]]>,
		messageFilePaths: MessageFilePaths,
		contextHistory: ContextHistoryMap,
		timestamp: number,
	): void {
		for (const [messageIndex, [updatedText, replacedFiles]] of fileMentionUpdates.entries()) {
			const contextUpdate = contextHistory.get(messageIndex)
			let innerMap: ContextHistoryInnerMap

			if (!contextUpdate) {
				innerMap = new Map<number, ContextUpdate[]>()
				contextHistory.set(messageIndex, [EditType.FILE_MENTION, innerMap])
			} else {
				innerMap = contextUpdate[1]
			}

			const blockIndex = 1
			const updates = innerMap.get(blockIndex) || []

			const allFileReads = messageFilePaths.get(messageIndex)
			if (allFileReads) {
				// Store both replaced files and all files for tracking
				updates.push([timestamp, "text", [updatedText], [replacedFiles, allFileReads]])
				innerMap.set(blockIndex, updates)
			}
		}
	}
}
