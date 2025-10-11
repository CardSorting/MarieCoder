/**
 * Match coordinator - orchestrates three-tier matching strategy
 * Coordinates between exact, line-trimmed, and block anchor matching
 */

import { BlockMatcher } from "../matchers/block_matcher"
import { ExactMatcher } from "../matchers/exact_matcher"
import { LineMatcher } from "../matchers/line_matcher"
import type { MatchResult } from "../types/diff_types"

/**
 * Coordinates matching strategies for finding search blocks
 * Implements three-tier fallback strategy for robust matching
 */
export class MatchCoordinator {
	/**
	 * Attempts to find a match using multiple strategies in order:
	 * 1. Exact match (fastest, most precise)
	 * 2. Line-trimmed match (tolerates whitespace differences)
	 * 3. Block anchor match (for 3+ line blocks with structural similarity)
	 *
	 * @param originalContent - The original file content
	 * @param searchContent - The content to search for
	 * @param startIndex - Character index to start searching from
	 * @returns [startIndex, endIndex] tuple for the match
	 * @throws Error if no match is found using any strategy
	 */
	static findMatch(originalContent: string, searchContent: string, startIndex: number): [number, number] {
		// Strategy 1: Exact match (fastest)
		const exactMatch = ExactMatcher.findMatch(originalContent, searchContent, startIndex)
		if (exactMatch) {
			return exactMatch
		}

		// Strategy 2: Line-trimmed match (whitespace tolerant)
		const lineMatch = LineMatcher.findLineTrimmedMatch(originalContent, searchContent, startIndex)
		if (lineMatch) {
			return lineMatch
		}

		// Strategy 3: Block anchor match (structural matching)
		const blockMatch = BlockMatcher.findBlockAnchorMatch(originalContent, searchContent, startIndex)
		if (blockMatch) {
			return blockMatch
		}

		// All strategies failed - throw descriptive error
		throw new Error(`The SEARCH block:\n${searchContent.trimEnd()}\n...does not match anything in the file.`)
	}

	/**
	 * Attempts to find a match anywhere in the file (for out-of-order handling)
	 * Used when sequential matching fails but we want to check if the block
	 * exists anywhere in the file
	 *
	 * @param originalContent - The original file content
	 * @param searchContent - The content to search for
	 * @returns [startIndex, endIndex] if match found, false otherwise
	 */
	static findMatchAnywhere(originalContent: string, searchContent: string): MatchResult {
		return ExactMatcher.findMatchAnywhere(originalContent, searchContent)
	}

	/**
	 * Handles empty search content scenarios
	 * Two cases:
	 * 1. Empty file + empty search = new file creation
	 * 2. Non-empty file + empty search = complete file replacement
	 *
	 * @param originalContent - The original file content
	 * @returns [0, 0] for new file, [0, length] for replacement
	 */
	static handleEmptySearch(originalContent: string): [number, number] {
		if (originalContent.length === 0) {
			// New file scenario: nothing to match, just start inserting
			return [0, 0]
		} else {
			// Complete file replacement scenario
			return [0, originalContent.length]
		}
	}

	/**
	 * Validates that a match is found after the last processed position
	 * Ensures we're making forward progress through the file
	 *
	 * @param matchIndex - The index where match was found
	 * @param lastProcessedIndex - The last position we processed
	 * @returns true if match is in order, false if out of order
	 */
	static isMatchInOrder(matchIndex: number, lastProcessedIndex: number): boolean {
		return matchIndex >= lastProcessedIndex
	}
}
