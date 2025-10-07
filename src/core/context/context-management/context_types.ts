/**
 * Shared types for context management system
 *
 * This file contains all type definitions used across the context management modules.
 * Centralizing types improves maintainability and ensures consistency.
 */

/**
 * Enum defining the types of edits/updates that can be tracked in context history
 */
export enum EditType {
	UNDEFINED = 0,
	NO_FILE_READ = 1,
	READ_FILE_TOOL = 2,
	ALTER_FILE_TOOL = 3,
	FILE_MENTION = 4,
}

/**
 * Content of a message (array of strings to support various message formats)
 */
export type MessageContent = string[]

/**
 * Metadata associated with message updates (nested array for flexibility)
 */
export type MessageMetadata = string[][]

/**
 * Represents a single context update with timestamp, type, content, and metadata
 * Format: [timestamp, updateType, update, metadata]
 */
export type ContextUpdate = [number, string, MessageContent, MessageMetadata]

/**
 * Inner map structure for context history updates
 * Maps block indices to their context updates
 */
export type ContextHistoryInnerMap = Map<number, ContextUpdate[]>

/**
 * Complete context history structure
 * Maps message index to [EditType, inner map of block updates]
 */
export type ContextHistoryMap = Map<number, [number, ContextHistoryInnerMap]>

/**
 * Serialized format for persisting context history to disk
 * Structure: Array of [messageIndex, [EditType, Array of [blockIndex, ContextUpdate[]]]]
 */
export type SerializedContextHistory = Array<
	[
		number, // messageIndex
		[
			number, // EditType (message type)
			Array<
				[
					number, // blockIndex
					ContextUpdate[], // updates array (now with 4 elements including metadata)
				]
			>,
		],
	]
>

/**
 * Strategy for truncation - how much context to keep
 */
export type TruncationStrategy = "none" | "lastTwo" | "half" | "quarter"

/**
 * Information about file reads in messages
 * Maps file path to array of [messageIndex, EditType, searchText, replaceText]
 */
export type FileReadIndices = Map<string, [number, number, string, string][]>

/**
 * Maps message indices to the file paths they contain
 */
export type MessageFilePaths = Map<number, string[]>

/**
 * Result of character counting in a range
 */
export interface CharacterCountResult {
	totalCharacters: number
	charactersSaved: number
}
