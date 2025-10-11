/**
 * Block anchor matching for diff search blocks
 * Third-tier fallback matching strategy - uses first/last lines as anchors
 */

import type { MatchResult } from "../types/diff_types"

/**
 * Performs block matching using first and last lines as anchors
 * Useful for matching blocks where exact content differs but structure remains
 *
 * Strategy:
 * 1. Only attempts blocks of 3+ lines to avoid false positives
 * 2. Matches first line as "start anchor"
 * 3. Matches last line as "end anchor" at expected offset
 * 4. Returns block if both anchors match
 */
export class BlockMatcher {
	private static readonly MIN_BLOCK_SIZE = 3

	/**
	 * Find match using first and last line as anchors
	 * Only works for blocks of 3+ lines to ensure reliable matching
	 *
	 * @param originalContent - The original file content
	 * @param searchContent - The content to search for
	 * @param startIndex - Character index to start searching from
	 * @returns [startIndex, endIndex] if match found, false otherwise
	 */
	static findBlockAnchorMatch(originalContent: string, searchContent: string, startIndex: number): MatchResult {
		const originalLines = originalContent.split("\n")
		const searchLines = BlockMatcher.prepareSearchLines(searchContent)

		// Only use this approach for blocks of 3+ lines
		if (searchLines.length < BlockMatcher.MIN_BLOCK_SIZE) {
			return false
		}

		const anchors = BlockMatcher.extractAnchors(searchLines)
		const startLineNum = BlockMatcher.findStartLineNumber(originalLines, startIndex)

		return BlockMatcher.findMatchUsingAnchors(originalLines, searchLines.length, anchors, startLineNum)
	}

	/**
	 * Prepare search lines by removing trailing empty line
	 */
	private static prepareSearchLines(searchContent: string): string[] {
		const lines = searchContent.split("\n")
		if (lines.length > 0 && lines[lines.length - 1] === "") {
			lines.pop()
		}
		return lines
	}

	/**
	 * Extract first and last lines as anchors (trimmed for comparison)
	 */
	private static extractAnchors(searchLines: string[]): { first: string; last: string } {
		return {
			first: searchLines[0].trim(),
			last: searchLines[searchLines.length - 1].trim(),
		}
	}

	/**
	 * Find the line number where startIndex falls in the content
	 */
	private static findStartLineNumber(originalLines: string[], startIndex: number): number {
		let startLineNum = 0
		let currentIndex = 0
		while (currentIndex < startIndex && startLineNum < originalLines.length) {
			currentIndex += originalLines[startLineNum].length + 1 // +1 for \n
			startLineNum++
		}
		return startLineNum
	}

	/**
	 * Search for matching block using anchors
	 * Checks if first and last lines match at expected positions
	 */
	private static findMatchUsingAnchors(
		originalLines: string[],
		blockSize: number,
		anchors: { first: string; last: string },
		startLineNum: number,
	): MatchResult {
		// Look for matching start and end anchors
		for (let i = startLineNum; i <= originalLines.length - blockSize; i++) {
			// Check if first line matches
			if (originalLines[i].trim() !== anchors.first) {
				continue
			}

			// Check if last line matches at expected position
			if (originalLines[i + blockSize - 1].trim() !== anchors.last) {
				continue
			}

			// Both anchors match - calculate exact character positions
			return BlockMatcher.calculatePositions(originalLines, i, blockSize)
		}

		return false
	}

	/**
	 * Calculate exact character positions for matched block
	 */
	private static calculatePositions(originalLines: string[], startLine: number, blockSize: number): [number, number] {
		// Calculate start character index
		let matchStartIndex = 0
		for (let k = 0; k < startLine; k++) {
			matchStartIndex += originalLines[k].length + 1 // +1 for \n
		}

		// Calculate end character index
		let matchEndIndex = matchStartIndex
		for (let k = 0; k < blockSize; k++) {
			matchEndIndex += originalLines[startLine + k].length + 1 // +1 for \n
		}

		return [matchStartIndex, matchEndIndex]
	}
}
