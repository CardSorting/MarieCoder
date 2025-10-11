/**
 * Block validation utilities for diff parsing
 * Validates SEARCH/REPLACE block markers and state transitions
 */

import {
	LEGACY_REPLACE_BLOCK_CHAR,
	LEGACY_REPLACE_BLOCK_END_REGEX,
	LEGACY_SEARCH_BLOCK_CHAR,
	LEGACY_SEARCH_BLOCK_START_REGEX,
	ProcessingState,
	REPLACE_BLOCK_CHAR,
	REPLACE_BLOCK_END_REGEX,
	SEARCH_BLOCK_CHAR,
	SEARCH_BLOCK_END_REGEX,
	SEARCH_BLOCK_START_REGEX,
} from "../types/diff_types"

/**
 * Validates and identifies diff block markers
 * Handles both standard and legacy formats
 */
export class BlockValidator {
	/**
	 * Check if line is a SEARCH block start marker
	 * Supports both standard (------- SEARCH) and legacy (<<<<<<< SEARCH) formats
	 */
	static isSearchBlockStart(line: string): boolean {
		return SEARCH_BLOCK_START_REGEX.test(line) || LEGACY_SEARCH_BLOCK_START_REGEX.test(line)
	}

	/**
	 * Check if line is a SEARCH block end marker (=======)
	 */
	static isSearchBlockEnd(line: string): boolean {
		return SEARCH_BLOCK_END_REGEX.test(line)
	}

	/**
	 * Check if line is a REPLACE block end marker
	 * Supports both standard (+++++++ REPLACE) and legacy (>>>>>>> REPLACE) formats
	 */
	static isReplaceBlockEnd(line: string): boolean {
		return REPLACE_BLOCK_END_REGEX.test(line) || LEGACY_REPLACE_BLOCK_END_REGEX.test(line)
	}

	/**
	 * Check if line appears to be a partial/incomplete marker
	 * Used to detect and remove incomplete markers at end of streaming chunks
	 */
	static isPartialMarker(line: string): boolean {
		const markerChars = [SEARCH_BLOCK_CHAR, LEGACY_SEARCH_BLOCK_CHAR, "=", REPLACE_BLOCK_CHAR, LEGACY_REPLACE_BLOCK_CHAR]

		// Line starts with marker character but isn't recognized as complete marker
		return (
			markerChars.some((char) => line.startsWith(char)) &&
			!BlockValidator.isSearchBlockStart(line) &&
			!BlockValidator.isSearchBlockEnd(line) &&
			!BlockValidator.isReplaceBlockEnd(line)
		)
	}

	/**
	 * Validate state transition in processing state machine
	 * Ensures only valid transitions occur during diff parsing
	 *
	 * Valid transitions:
	 * - Idle → StateSearch (start new block)
	 * - StateSearch → StateReplace (move to replace section)
	 *
	 * @throws Error if transition is invalid
	 */
	static validateStateTransition(currentState: ProcessingState, newState: ProcessingState): void {
		const isValid =
			(currentState === ProcessingState.Idle && newState === ProcessingState.StateSearch) ||
			(currentState === ProcessingState.StateSearch && newState === ProcessingState.StateReplace)

		if (!isValid) {
			throw new Error(
				`Invalid state transition.\n` +
					"Valid transitions are:\n" +
					"- Idle → StateSearch\n" +
					"- StateSearch → StateReplace",
			)
		}
	}

	/**
	 * Remove partial markers from the end of a line array
	 * Used during streaming to clean up incomplete markers
	 *
	 * @param lines Array of lines to process
	 * @returns Modified array with partial marker removed if found
	 */
	static removePartialMarkerFromEnd(lines: string[]): string[] {
		if (lines.length === 0) {
			return lines
		}

		const lastLine = lines[lines.length - 1]
		if (BlockValidator.isPartialMarker(lastLine)) {
			return lines.slice(0, -1)
		}

		return lines
	}
}
