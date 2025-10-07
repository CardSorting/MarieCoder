import { Anthropic } from "@anthropic-ai/sdk"
import cloneDeep from "clone-deep"
import { ContextHistoryMap } from "./context_types"

/**
 * Applies context history updates to message arrays
 *
 * This module is responsible for:
 * - Applying saved context updates to messages
 * - Handling truncation ranges (deleted message ranges)
 * - Managing the first user-assistant pair that's always kept
 * - Deep copying messages when modifications are needed
 */
export class ContextUpdateApplicator {
	/**
	 * Applies all context history updates to messages, respecting the deleted range
	 *
	 * Always keeps the first user-assistant pair (indices 0-1) and applies updates.
	 * Then includes messages after the deleted range with their updates.
	 *
	 * @param messages - Original messages
	 * @param contextHistory - Map of context updates to apply
	 * @param deletedRange - Range to delete, if any
	 * @returns Messages with all context history updates applied
	 */
	applyUpdates(
		messages: Anthropic.Messages.MessageParam[],
		contextHistory: ContextHistoryMap,
		deletedRange: [number, number] | undefined,
	): Anthropic.Messages.MessageParam[] {
		if (messages.length <= 1) {
			return messages
		}

		const startFromIndex = deletedRange ? deletedRange[1] + 1 : 2

		// Keep first user-assistant pair and remaining messages within context
		const firstChunk = messages.slice(0, 2)
		const secondChunk = messages.slice(startFromIndex)
		const messagesToUpdate = [...firstChunk, ...secondChunk]

		// Map local indices in messagesToUpdate to global indices in contextHistory
		const originalIndices = this.buildOriginalIndicesMap(secondChunk.length, startFromIndex)

		return this.applyUpdatesToMessages(messagesToUpdate, contextHistory, originalIndices)
	}

	/**
	 * Builds a mapping from array positions to original message indices
	 *
	 * @param secondChunkLength - Length of the second chunk
	 * @param startFromIndex - Index where second chunk starts in original array
	 * @returns Array mapping positions to original indices
	 */
	private buildOriginalIndicesMap(secondChunkLength: number, startFromIndex: number): number[] {
		return [
			...Array(2).keys(), // First two indices (0, 1)
			...Array(secondChunkLength)
				.fill(0)
				.map((_, index) => index + startFromIndex), // Remaining indices after gap
		]
	}

	/**
	 * Applies context updates to the messages array
	 *
	 * @param messagesToUpdate - Messages to update
	 * @param contextHistory - Map of context updates
	 * @param originalIndices - Mapping from array positions to original indices
	 * @returns Updated messages
	 */
	private applyUpdatesToMessages(
		messagesToUpdate: Anthropic.Messages.MessageParam[],
		contextHistory: ContextHistoryMap,
		originalIndices: number[],
	): Anthropic.Messages.MessageParam[] {
		for (let arrayIndex = 0; arrayIndex < messagesToUpdate.length; arrayIndex++) {
			const messageIndex = originalIndices[arrayIndex]
			const contextUpdate = contextHistory.get(messageIndex)

			if (!contextUpdate) {
				continue
			}

			// Deep copy since we're modifying the message
			messagesToUpdate[arrayIndex] = cloneDeep(messagesToUpdate[arrayIndex])

			const [_editType, innerMap] = contextUpdate
			for (const [blockIndex, changes] of innerMap) {
				// Apply the latest change (last in the array)
				const latestChange = changes[changes.length - 1]

				this.applyChangeToMessage(messagesToUpdate[arrayIndex], blockIndex, latestChange)
			}
		}

		return messagesToUpdate
	}

	/**
	 * Applies a single change to a message block
	 *
	 * @param message - Message to update
	 * @param blockIndex - Index of the block to update
	 * @param change - Change to apply [timestamp, updateType, content, metadata]
	 */
	private applyChangeToMessage(
		message: Anthropic.Messages.MessageParam,
		blockIndex: number,
		change: [number, string, string[], string[][]],
	): void {
		const [_timestamp, updateType, content, _metadata] = change

		if (updateType === "text") {
			if (Array.isArray(message.content)) {
				const block = message.content[blockIndex]
				if (block?.type === "text") {
					block.text = content[0]
				}
			}
		}
	}

	/**
	 * Removes all context history updates that occurred after the specified timestamp
	 *
	 * Used for checkpoint restoration - removes any updates made after a certain point.
	 * Cleans up empty blocks and message indices after removal.
	 *
	 * @param contextHistory - Context history to modify
	 * @param timestamp - Timestamp cutoff point
	 */
	removeUpdatesAfterTimestamp(contextHistory: ContextHistoryMap, timestamp: number): void {
		for (const [messageIndex, [_editType, innerMap]] of contextHistory) {
			const blockIndicesToDelete: number[] = []

			for (const [blockIndex, updates] of innerMap) {
				// Updates are ordered by timestamp, find cutoff point from right to left
				let cutoffIndex = updates.length - 1
				while (cutoffIndex >= 0 && updates[cutoffIndex][0] > timestamp) {
					cutoffIndex--
				}

				// If we found updates to remove
				if (cutoffIndex < updates.length - 1) {
					// Keep only updates up to cutoffIndex
					updates.length = cutoffIndex + 1

					// Mark block for deletion if no updates remain
					if (updates.length === 0) {
						blockIndicesToDelete.push(blockIndex)
					}
				}
			}

			// Remove empty blocks
			for (const blockIndex of blockIndicesToDelete) {
				innerMap.delete(blockIndex)
			}

			// Remove message index if no blocks remain
			if (innerMap.size === 0) {
				contextHistory.delete(messageIndex)
			}
		}
	}
}
