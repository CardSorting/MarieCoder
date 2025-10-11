/**
 * Type definitions for diff parsing and construction
 * Extracted from monolithic diff.ts file
 */

// Constants for block markers
export const SEARCH_BLOCK_START = "------- SEARCH"
export const SEARCH_BLOCK_END = "======="
export const REPLACE_BLOCK_END = "+++++++ REPLACE"

export const SEARCH_BLOCK_CHAR = "-"
export const REPLACE_BLOCK_CHAR = "+"
export const LEGACY_SEARCH_BLOCK_CHAR = "<"
export const LEGACY_REPLACE_BLOCK_CHAR = ">"

// Regex patterns for flexible matching
export const SEARCH_BLOCK_START_REGEX = /^[-]{3,} SEARCH>?$/
export const LEGACY_SEARCH_BLOCK_START_REGEX = /^[<]{3,} SEARCH>?$/
export const SEARCH_BLOCK_END_REGEX = /^[=]{3,}$/
export const REPLACE_BLOCK_END_REGEX = /^[+]{3,} REPLACE>?$/
export const LEGACY_REPLACE_BLOCK_END_REGEX = /^[>]{3,} REPLACE>?$/

/**
 * Processing state enum for V2 constructor
 * Uses bitwise flags for efficient state management
 */
export enum ProcessingState {
	Idle = 0,
	StateSearch = 1 << 0,
	StateReplace = 1 << 1,
}

/**
 * Replacement tracking interface for V1 constructor
 * Tracks each search/replace operation with character positions
 */
export interface Replacement {
	start: number
	end: number
	content: string
}

/**
 * Match result type
 * Returns character positions [start, end] if match found, false otherwise
 */
export type MatchResult = [number, number] | false

/**
 * Version types for diff constructors
 */
export type DiffVersion = "v1" | "v2"

/**
 * Constructor function signature
 */
export type DiffConstructor = (diffContent: string, originalContent: string, isFinal: boolean) => Promise<string>
