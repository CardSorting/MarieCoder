/**
 * Exact string matching for diff search blocks
 * First-tier matching strategy (fastest, most precise)
 */

import type { MatchResult } from "../types/diff_types"

/**
 * Performs exact string matching for search content
 * This is the primary matching strategy - fast and precise
 */
export class ExactMatcher {
	/**
	 * Find exact match of search content in original content
	 *
	 * @param originalContent - The original file content
	 * @param searchContent - The content to search for
	 * @param startIndex - Character index to start searching from
	 * @returns [startIndex, endIndex] if match found, false otherwise
	 */
	static findMatch(originalContent: string, searchContent: string, startIndex: number): MatchResult {
		const exactIndex = originalContent.indexOf(searchContent, startIndex)

		if (exactIndex === -1) {
			return false
		}

		return [exactIndex, exactIndex + searchContent.length]
	}

	/**
	 * Find exact match anywhere in the file (for out-of-order handling)
	 * Used as fallback when sequential matching fails
	 *
	 * @param originalContent - The original file content
	 * @param searchContent - The content to search for
	 * @returns [startIndex, endIndex] if match found, false otherwise
	 */
	static findMatchAnywhere(originalContent: string, searchContent: string): MatchResult {
		return ExactMatcher.findMatch(originalContent, searchContent, 0)
	}
}
