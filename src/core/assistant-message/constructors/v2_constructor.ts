/**
 * V2 diff constructor implementation
 * Advanced state machine with error recovery and malformed block handling
 */

import { MatchCoordinator } from "../coordinators/match_coordinator"
import { ProcessingState, REPLACE_BLOCK_END, SEARCH_BLOCK_END, SEARCH_BLOCK_START } from "../types/diff_types"
import { BlockValidator } from "../validators/block_validator"

/**
 * State machine-based constructor for robust diff parsing
 * Handles malformed blocks and provides error recovery
 */
class NewFileContentConstructor {
	private originalContent: string
	private isFinal: boolean
	private state: number
	private pendingNonStandardLines: string[]
	private result: string
	private lastProcessedIndex: number
	private currentSearchContent: string
	private searchMatchIndex: number
	private searchEndIndex: number

	constructor(originalContent: string, isFinal: boolean) {
		this.originalContent = originalContent
		this.isFinal = isFinal
		this.pendingNonStandardLines = []
		this.result = ""
		this.lastProcessedIndex = 0
		this.state = ProcessingState.Idle
		this.currentSearchContent = ""
		this.searchMatchIndex = -1
		this.searchEndIndex = -1
	}

	private resetForNextBlock(): void {
		this.state = ProcessingState.Idle
		this.currentSearchContent = ""
		this.searchMatchIndex = -1
		this.searchEndIndex = -1
	}

	private findLastMatchingLineIndex(regx: RegExp, lineLimit: number): number {
		for (let i = lineLimit; i > 0; ) {
			i--
			if (this.pendingNonStandardLines[i].match(regx)) {
				return i
			}
		}
		return -1
	}

	private updateProcessingState(newState: ProcessingState): void {
		BlockValidator.validateStateTransition(this.state, newState)
		this.state |= newState
	}

	private isStateActive(state: ProcessingState): boolean {
		return (this.state & state) === state
	}

	private activateReplaceState(): void {
		this.updateProcessingState(ProcessingState.StateReplace)
	}

	private activateSearchState(): void {
		this.updateProcessingState(ProcessingState.StateSearch)
		this.currentSearchContent = ""
	}

	private isSearchingActive(): boolean {
		return this.isStateActive(ProcessingState.StateSearch)
	}

	private isReplacingActive(): boolean {
		return this.isStateActive(ProcessingState.StateReplace)
	}

	private hasPendingNonStandardLines(pendingNonStandardLineLimit: number): boolean {
		return this.pendingNonStandardLines.length - pendingNonStandardLineLimit < this.pendingNonStandardLines.length
	}

	public processLine(line: string): void {
		this.internalProcessLine(line, true, this.pendingNonStandardLines.length)
	}

	public getResult(): string {
		// If this is the final chunk, append any remaining original content
		if (this.isFinal && this.lastProcessedIndex < this.originalContent.length) {
			this.result += this.originalContent.slice(this.lastProcessedIndex)
		}
		if (this.isFinal && this.state !== ProcessingState.Idle) {
			throw new Error("File processing incomplete - SEARCH/REPLACE operations still active during finalization")
		}
		return this.result
	}

	private internalProcessLine(
		line: string,
		canWritePendingNonStandardLines: boolean,
		pendingNonStandardLineLimit: number,
	): number {
		let removeLineCount = 0

		if (BlockValidator.isSearchBlockStart(line)) {
			removeLineCount = this.trimPendingNonStandardTrailingEmptyLines(pendingNonStandardLineLimit)
			if (removeLineCount > 0) {
				pendingNonStandardLineLimit = pendingNonStandardLineLimit - removeLineCount
			}
			if (this.hasPendingNonStandardLines(pendingNonStandardLineLimit)) {
				this.tryFixSearchReplaceBlock(pendingNonStandardLineLimit)
				if (canWritePendingNonStandardLines) {
					this.pendingNonStandardLines.length = 0
				}
			}
			this.activateSearchState()
		} else if (BlockValidator.isSearchBlockEnd(line)) {
			// Validate non-standard content
			if (!this.isSearchingActive()) {
				this.tryFixSearchBlock(pendingNonStandardLineLimit)
				if (canWritePendingNonStandardLines) {
					this.pendingNonStandardLines.length = 0
				}
			}
			this.activateReplaceState()
			this.beforeReplace()
		} else if (BlockValidator.isReplaceBlockEnd(line)) {
			if (!this.isReplacingActive()) {
				this.tryFixReplaceBlock(pendingNonStandardLineLimit)
				if (canWritePendingNonStandardLines) {
					this.pendingNonStandardLines.length = 0
				}
			}
			this.lastProcessedIndex = this.searchEndIndex
			this.resetForNextBlock()
		} else {
			// Accumulate content for search or replace
			if (this.isReplacingActive()) {
				// Output replacement lines immediately if we know the insertion point
				if (this.searchMatchIndex !== -1) {
					this.result += line + "\n"
				}
			} else if (this.isSearchingActive()) {
				this.currentSearchContent += line + "\n"
			} else {
				if (canWritePendingNonStandardLines) {
					// Handle non-standard content
					this.pendingNonStandardLines.push(line)
				}
			}
		}
		return removeLineCount
	}

	private beforeReplace(): void {
		if (!this.currentSearchContent) {
			// Empty search block
			;[this.searchMatchIndex, this.searchEndIndex] = MatchCoordinator.handleEmptySearch(this.originalContent)
		} else {
			// Find match using coordinator
			;[this.searchMatchIndex, this.searchEndIndex] = MatchCoordinator.findMatch(
				this.originalContent,
				this.currentSearchContent,
				this.lastProcessedIndex,
			)
		}

		if (this.searchMatchIndex < this.lastProcessedIndex) {
			throw new Error(
				`The SEARCH block:\n${this.currentSearchContent.trimEnd()}\n...matched an incorrect content in the file.`,
			)
		}

		// Output everything up to the match location
		this.result += this.originalContent.slice(this.lastProcessedIndex, this.searchMatchIndex)
	}

	private tryFixSearchBlock(lineLimit: number): number {
		let removeLineCount = 0
		if (lineLimit < 0) {
			lineLimit = this.pendingNonStandardLines.length
		}
		if (!lineLimit) {
			throw new Error("Invalid SEARCH/REPLACE block structure - no lines available to process")
		}

		const searchTagRegexp = /^([-]{3,}|[<]{3,}) SEARCH$/
		const searchTagIndex = this.findLastMatchingLineIndex(searchTagRegexp, lineLimit)
		if (searchTagIndex !== -1) {
			const fixLines = this.pendingNonStandardLines.slice(searchTagIndex, lineLimit)
			fixLines[0] = SEARCH_BLOCK_START
			for (const line of fixLines) {
				removeLineCount += this.internalProcessLine(line, false, searchTagIndex)
			}
		} else {
			throw new Error(
				`Invalid REPLACE marker detected - could not find matching SEARCH block starting from line ${searchTagIndex + 1}`,
			)
		}
		return removeLineCount
	}

	private tryFixReplaceBlock(lineLimit: number): number {
		let removeLineCount = 0
		if (lineLimit < 0) {
			lineLimit = this.pendingNonStandardLines.length
		}
		if (!lineLimit) {
			throw new Error("Malformed REPLACE block - no lines available to process")
		}

		const replaceBeginTagRegexp = /^[=]{3,}$/
		const replaceBeginTagIndex = this.findLastMatchingLineIndex(replaceBeginTagRegexp, lineLimit)
		if (replaceBeginTagIndex !== -1) {
			const fixLines = this.pendingNonStandardLines.slice(
				replaceBeginTagIndex - removeLineCount,
				lineLimit - removeLineCount,
			)
			fixLines[0] = SEARCH_BLOCK_END
			for (const line of fixLines) {
				removeLineCount += this.internalProcessLine(line, false, replaceBeginTagIndex - removeLineCount)
			}
		} else {
			throw new Error(`Malformed REPLACE block - missing valid separator after line ${replaceBeginTagIndex + 1}`)
		}
		return removeLineCount
	}

	private tryFixSearchReplaceBlock(lineLimit: number): number {
		let removeLineCount = 0
		if (lineLimit < 0) {
			lineLimit = this.pendingNonStandardLines.length
		}
		if (!lineLimit) {
			throw new Error("Malformed SEARCH/REPLACE block - no lines available to process")
		}

		const replaceEndTagRegexp = /^([+]{3,}|[>]{3,}) REPLACE$/
		const replaceEndTagIndex = this.findLastMatchingLineIndex(replaceEndTagRegexp, lineLimit)
		const likeReplaceEndTag = replaceEndTagIndex === lineLimit - 1
		if (likeReplaceEndTag) {
			const fixLines = this.pendingNonStandardLines.slice(replaceEndTagIndex - removeLineCount, lineLimit - removeLineCount)
			fixLines[fixLines.length - 1] = REPLACE_BLOCK_END
			for (const line of fixLines) {
				removeLineCount += this.internalProcessLine(line, false, replaceEndTagIndex - removeLineCount)
			}
		} else {
			throw new Error("Malformed SEARCH/REPLACE block structure: Missing valid closing REPLACE marker")
		}
		return removeLineCount
	}

	/**
	 * Removes trailing empty lines from the pendingNonStandardLines array
	 */
	private trimPendingNonStandardTrailingEmptyLines(lineLimit: number): number {
		let removedCount = 0
		let i = Math.min(lineLimit, this.pendingNonStandardLines.length) - 1

		while (i >= 0 && this.pendingNonStandardLines[i].trim() === "") {
			this.pendingNonStandardLines.pop()
			removedCount++
			i--
		}

		return removedCount
	}
}

/**
 * Constructs new file content by applying streamed diff (V2 implementation)
 * Uses state machine for robust error recovery
 *
 * @param diffContent - The diff content (may be partial or complete)
 * @param originalContent - The original file content
 * @param isFinal - Whether this is the final chunk
 * @returns Reconstructed file content
 */
export async function constructNewFileContentV2(diffContent: string, originalContent: string, isFinal: boolean): Promise<string> {
	const newFileContentConstructor = new NewFileContentConstructor(originalContent, isFinal)

	// Split into lines and remove partial markers
	let lines = diffContent.split("\n")
	lines = BlockValidator.removePartialMarkerFromEnd(lines)

	for (const line of lines) {
		newFileContentConstructor.processLine(line)
	}

	const result = newFileContentConstructor.getResult()
	return result
}
