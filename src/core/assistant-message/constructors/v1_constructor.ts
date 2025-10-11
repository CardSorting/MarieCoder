/**
 * V1 diff constructor implementation
 * Original streaming diff parser with out-of-order replacement support
 */

import { MatchCoordinator } from "../coordinators/match_coordinator"
import type { Replacement } from "../types/diff_types"
import { BlockValidator } from "../validators/block_validator"

/**
 * Constructs new file content by applying streamed diff (V1 implementation)
 * Supports out-of-order replacements and incremental streaming
 *
 * @param diffContent - The diff content (may be partial or complete)
 * @param originalContent - The original file content
 * @param isFinal - Whether this is the final chunk
 * @returns Reconstructed file content
 */
export async function constructNewFileContentV1(diffContent: string, originalContent: string, isFinal: boolean): Promise<string> {
	let result = ""
	let lastProcessedIndex = 0

	let currentSearchContent = ""
	let currentReplaceContent = ""
	let inSearch = false
	let inReplace = false

	let searchMatchIndex = -1
	let searchEndIndex = -1

	// Track all replacements to handle out-of-order edits
	const replacements: Replacement[] = []
	let pendingOutOfOrderReplacement = false

	// Split into lines and remove partial markers
	let lines = diffContent.split("\n")
	lines = BlockValidator.removePartialMarkerFromEnd(lines)

	for (const line of lines) {
		if (BlockValidator.isSearchBlockStart(line)) {
			inSearch = true
			currentSearchContent = ""
			currentReplaceContent = ""
			continue
		}

		if (BlockValidator.isSearchBlockEnd(line)) {
			inSearch = false
			inReplace = true

			if (!currentSearchContent) {
				// Empty search block
				;[searchMatchIndex, searchEndIndex] = MatchCoordinator.handleEmptySearch(originalContent)
			} else {
				try {
					// Try to find match using three-tier strategy
					;[searchMatchIndex, searchEndIndex] = MatchCoordinator.findMatch(
						originalContent,
						currentSearchContent,
						lastProcessedIndex,
					)
				} catch (error) {
					// Last resort: try finding anywhere in file (out-of-order)
					const anywhereMatch = MatchCoordinator.findMatchAnywhere(originalContent, currentSearchContent)
					if (anywhereMatch) {
						;[searchMatchIndex, searchEndIndex] = anywhereMatch
						if (searchMatchIndex < lastProcessedIndex) {
							pendingOutOfOrderReplacement = true
						}
					} else {
						throw error
					}
				}
			}

			// Check if this is an out-of-order replacement
			if (searchMatchIndex < lastProcessedIndex) {
				pendingOutOfOrderReplacement = true
			}

			// For in-order replacements, output everything up to the match location
			if (!pendingOutOfOrderReplacement) {
				result += originalContent.slice(lastProcessedIndex, searchMatchIndex)
			}
			continue
		}

		if (BlockValidator.isReplaceBlockEnd(line)) {
			// Finished one replace block
			if (searchMatchIndex === -1) {
				throw new Error(`The SEARCH block:\n${currentSearchContent.trimEnd()}\n...is malformatted.`)
			}

			// Store this replacement
			replacements.push({
				start: searchMatchIndex,
				end: searchEndIndex,
				content: currentReplaceContent,
			})

			// If this was an in-order replacement, advance lastProcessedIndex
			if (!pendingOutOfOrderReplacement) {
				lastProcessedIndex = searchEndIndex
			}

			// Reset for next block
			inSearch = false
			inReplace = false
			currentSearchContent = ""
			currentReplaceContent = ""
			searchMatchIndex = -1
			searchEndIndex = -1
			pendingOutOfOrderReplacement = false
			continue
		}

		// Accumulate content for search or replace
		if (inSearch) {
			currentSearchContent += line + "\n"
		} else if (inReplace) {
			currentReplaceContent += line + "\n"
			// Only output replacement lines immediately for in-order replacements
			if (searchMatchIndex !== -1 && !pendingOutOfOrderReplacement) {
				result += line + "\n"
			}
		}
	}

	// If this is the final chunk, we need to apply all replacements and build the final result
	if (isFinal) {
		// Handle the case where we're still in replace mode when processing ends
		// and this is the final chunk - treat it as if we encountered the REPLACE marker
		if (inReplace && searchMatchIndex !== -1) {
			// Store this replacement
			replacements.push({
				start: searchMatchIndex,
				end: searchEndIndex,
				content: currentReplaceContent,
			})

			// If this was an in-order replacement, advance lastProcessedIndex
			if (!pendingOutOfOrderReplacement) {
				lastProcessedIndex = searchEndIndex
			}
		}

		// Sort replacements by start position
		replacements.sort((a, b) => a.start - b.start)

		// Rebuild the entire result by applying all replacements
		result = ""
		let currentPos = 0

		for (const replacement of replacements) {
			// Add original content up to this replacement
			result += originalContent.slice(currentPos, replacement.start)
			// Add the replacement content
			result += replacement.content
			// Move position to after the replaced section
			currentPos = replacement.end
		}

		// Add any remaining original content
		result += originalContent.slice(currentPos)
	}

	return result
}
