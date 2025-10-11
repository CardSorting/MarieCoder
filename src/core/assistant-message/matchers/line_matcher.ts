/**
 * Line-trimmed matching for diff search blocks
 * Second-tier fallback matching strategy - tolerant to whitespace differences
 */

import type { MatchResult } from "../types/diff_types"

/**
 * Performs line-by-line matching with trimmed whitespace
 * Useful when exact matching fails due to indentation/whitespace differences
 */
export class LineMatcher {
	/**
	 * Find match using line-by-line comparison with trimmed whitespace
	 * Matches are found by comparing trimmed lines but character positions
	 * are calculated from original untrimmed content
	 *
	 * @param originalContent - The original file content
	 * @param searchContent - The content to search for
	 * @param startIndex - Character index to start searching from
	 * @returns [startIndex, endIndex] if match found, false otherwise
	 */
	static findLineTrimmedMatch(originalContent: string, searchContent: string, startIndex: number): MatchResult {
		const originalLines = originalContent.split("\n")
		const searchLines = LineMatcher.prepareSearchLines(searchContent)

		const startLineNum = LineMatcher.findStartLineNumber(originalLines, startIndex)

		// Try each possible starting position
		for (let i = startLineNum; i <= originalLines.length - searchLines.length; i++) {
			const match = LineMatcher.tryMatchAtLine(originalLines, searchLines, i)
			if (match) {
				return LineMatcher.calculateCharacterPositions(originalLines, i, searchLines.length)
			}
		}

		return false
	}

	/**
	 * Prepare search lines by removing trailing empty line from split
	 */
	private static prepareSearchLines(searchContent: string): string[] {
		const lines = searchContent.split("\n")
		// Trim trailing empty line if exists (from the trailing \n in searchContent)
		if (lines.length > 0 && lines[lines.length - 1] === "") {
			lines.pop()
		}
		return lines
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
	 * Try to match all search lines starting at a specific line in original content
	 * Uses trimmed comparison to tolerate whitespace differences
	 */
	private static tryMatchAtLine(originalLines: string[], searchLines: string[], startLine: number): boolean {
		for (let j = 0; j < searchLines.length; j++) {
			const originalTrimmed = originalLines[startLine + j].trim()
			const searchTrimmed = searchLines[j].trim()

			if (originalTrimmed !== searchTrimmed) {
				return false
			}
		}
		return true
	}

	/**
	 * Calculate exact character positions for a matched block
	 * Converts line numbers back to character indices
	 */
	private static calculateCharacterPositions(originalLines: string[], startLine: number, lineCount: number): [number, number] {
		// Calculate start character index
		let matchStartIndex = 0
		for (let k = 0; k < startLine; k++) {
			matchStartIndex += originalLines[k].length + 1 // +1 for \n
		}

		// Calculate end character index
		let matchEndIndex = matchStartIndex
		for (let k = 0; k < lineCount; k++) {
			matchEndIndex += originalLines[startLine + k].length + 1 // +1 for \n
		}

		return [matchStartIndex, matchEndIndex]
	}
}
