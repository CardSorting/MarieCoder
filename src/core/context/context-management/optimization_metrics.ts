import { Anthropic } from "@anthropic-ai/sdk"
import { CharacterCountResult, ContextHistoryMap } from "./context_types"

/**
 * Calculates metrics for context optimization decisions
 *
 * This module is responsible for:
 * - Counting characters in message ranges
 * - Calculating space savings from optimizations
 * - Determining if optimizations were impactful enough to avoid truncation
 */
export class OptimizationMetrics {
	/**
	 * Calculates the impact of context optimizations as a percentage of characters saved
	 *
	 * Analyzes both the first user-assistant pair and the remaining in-range messages
	 * to determine the overall effectiveness of optimizations.
	 *
	 * @param apiMessages - API messages
	 * @param contextHistory - Map of context updates
	 * @param deletedRange - Current deleted range, if any
	 * @param optimizedIndices - Set of message indices that were optimized
	 * @returns Percentage of characters saved (0-1)
	 */
	calculateImpact(
		apiMessages: Anthropic.Messages.MessageParam[],
		contextHistory: ContextHistoryMap,
		deletedRange: [number, number] | undefined,
		optimizedIndices: Set<number>,
	): number {
		// Count for first user-assistant message pair
		const firstChunkResult = this.countCharactersInRange(apiMessages, contextHistory, 0, 2, optimizedIndices)

		// Count for remaining in-range messages
		const startIndex = deletedRange ? deletedRange[1] + 1 : 2
		const secondChunkResult = this.countCharactersInRange(
			apiMessages,
			contextHistory,
			startIndex,
			apiMessages.length,
			optimizedIndices,
		)

		const totalCharacters = firstChunkResult.totalCharacters + secondChunkResult.totalCharacters
		const totalCharactersSaved = firstChunkResult.charactersSaved + secondChunkResult.charactersSaved

		return totalCharacters === 0 ? 0 : totalCharactersSaved / totalCharacters
	}

	/**
	 * Counts total characters and savings in a message range
	 *
	 * Tracks both the original text length and the optimized length to calculate
	 * the space saved by removing duplicate file reads.
	 *
	 * @param apiMessages - API messages
	 * @param contextHistory - Map of context updates
	 * @param startIndex - Start index (inclusive)
	 * @param endIndex - End index (exclusive)
	 * @param optimizedIndices - Set of message indices that were optimized
	 * @returns Object with total characters and characters saved
	 */
	countCharactersInRange(
		apiMessages: Anthropic.Messages.MessageParam[],
		contextHistory: ContextHistoryMap,
		startIndex: number,
		endIndex: number,
		optimizedIndices: Set<number>,
	): CharacterCountResult {
		let totalCharacters = 0
		let charactersSaved = 0

		for (let messageIndex = startIndex; messageIndex < endIndex; messageIndex++) {
			const message = apiMessages[messageIndex]

			if (!message.content) {
				continue
			}

			const hasExistingUpdates = contextHistory.has(messageIndex)
			const hasNewUpdates = optimizedIndices.has(messageIndex)

			if (Array.isArray(message.content)) {
				const result = this.processMessageContent(
					message.content,
					contextHistory,
					messageIndex,
					hasExistingUpdates,
					hasNewUpdates,
				)

				totalCharacters += result.totalCharacters
				charactersSaved += result.charactersSaved
			}
		}

		return { totalCharacters, charactersSaved }
	}

	/**
	 * Processes message content blocks to count characters
	 *
	 * @param content - Message content blocks
	 * @param contextHistory - Map of context updates
	 * @param messageIndex - Index of the message
	 * @param hasExistingUpdates - Whether message has any updates
	 * @param hasNewUpdates - Whether message was just updated
	 * @returns Character count result
	 */
	private processMessageContent(
		content: Array<Anthropic.ContentBlock>,
		contextHistory: ContextHistoryMap,
		messageIndex: number,
		hasExistingUpdates: boolean,
		hasNewUpdates: boolean,
	): CharacterCountResult {
		let totalCharacters = 0
		let charactersSaved = 0

		for (let blockIndex = 0; blockIndex < content.length; blockIndex++) {
			const block = content[blockIndex]

			if (block.type === "text" && block.text) {
				const result = this.processTextBlock(
					block.text,
					contextHistory,
					messageIndex,
					blockIndex,
					hasExistingUpdates,
					hasNewUpdates,
				)

				totalCharacters += result.totalCharacters
				charactersSaved += result.charactersSaved
			} else if (block.type === "image" && block.source?.type === "base64" && block.source.data) {
				totalCharacters += block.source.data.length
			}
		}

		return { totalCharacters, charactersSaved }
	}

	/**
	 * Processes a single text block to count characters
	 *
	 * @param originalText - Original text content
	 * @param contextHistory - Map of context updates
	 * @param messageIndex - Index of the message
	 * @param blockIndex - Index of the block
	 * @param hasExistingUpdates - Whether message has any updates
	 * @param hasNewUpdates - Whether message was just updated
	 * @returns Character count result
	 */
	private processTextBlock(
		originalText: string,
		contextHistory: ContextHistoryMap,
		messageIndex: number,
		blockIndex: number,
		hasExistingUpdates: boolean,
		hasNewUpdates: boolean,
	): CharacterCountResult {
		let totalCharacters = 0
		let charactersSaved = 0

		if (hasExistingUpdates) {
			const contextUpdate = contextHistory.get(messageIndex)
			const updates = contextUpdate?.[1].get(blockIndex)

			if (updates && updates.length > 0) {
				const latestUpdate = updates[updates.length - 1]

				if (hasNewUpdates) {
					// Calculate savings from this update
					let originalTextLength: number
					if (updates.length > 1) {
						// Multiple updates - use previous update's length
						originalTextLength = updates[updates.length - 2][2][0].length
					} else {
						// First update - use original text length
						originalTextLength = originalText.length
					}

					const newTextLength = latestUpdate[2][0].length
					charactersSaved = originalTextLength - newTextLength
					totalCharacters = originalTextLength
				} else {
					// Update exists but wasn't just made
					totalCharacters = latestUpdate[2][0].length
				}
			} else {
				// Different block index has updates
				totalCharacters = originalText.length
			}
		} else {
			// No updates for this message
			totalCharacters = originalText.length
		}

		return { totalCharacters, charactersSaved }
	}
}
