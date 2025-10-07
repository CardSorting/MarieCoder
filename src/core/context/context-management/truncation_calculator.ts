import { Anthropic } from "@anthropic-ai/sdk"
import { TruncationStrategy } from "./context_types"

/**
 * Calculates truncation ranges for context window management
 *
 * This module is responsible for:
 * - Determining which messages to remove when context is too large
 * - Maintaining conversation structure (user-assistant pairs)
 * - Supporting different truncation strategies (keep half, quarter, etc.)
 */
export class TruncationCalculator {
	/**
	 * Calculates the next truncation range for context compaction
	 *
	 * Always keeps the first user-assistant pair (indices 0-1) to maintain context.
	 * Truncates an even number of messages to preserve user-assistant structure.
	 *
	 * @param apiMessages - Current API messages
	 * @param currentDeletedRange - Current deleted range, if any
	 * @param strategy - Strategy for how much to keep: "none", "lastTwo", "half", or "quarter"
	 * @returns Inclusive range [start, end] to be removed from conversation history
	 */
	calculateRange(
		apiMessages: Anthropic.Messages.MessageParam[],
		currentDeletedRange: [number, number] | undefined,
		strategy: TruncationStrategy,
	): [number, number] {
		// Always keep the first user-assistant pairing
		const rangeStartIndex = 2 // indices 0 and 1 are kept
		const startOfRemainingMessages = currentDeletedRange ? currentDeletedRange[1] + 1 : 2

		const messagesToRemove = this.calculateMessagesToRemove(apiMessages.length, startOfRemainingMessages, strategy)

		let rangeEndIndex = startOfRemainingMessages + messagesToRemove - 1

		// Ensure last message being removed is an assistant message to preserve user-assistant structure
		if (apiMessages[rangeEndIndex]?.role !== "assistant") {
			rangeEndIndex -= 1
		}

		return [rangeStartIndex, rangeEndIndex]
	}

	/**
	 * Calculates how many messages to remove based on the truncation strategy
	 *
	 * @param totalMessages - Total number of messages
	 * @param startOfRemaining - Index where remaining messages start
	 * @param strategy - Truncation strategy to apply
	 * @returns Number of messages to remove (always even to preserve pairs)
	 */
	private calculateMessagesToRemove(totalMessages: number, startOfRemaining: number, strategy: TruncationStrategy): number {
		switch (strategy) {
			case "none":
				// Remove all messages beyond the first core user/assistant message pair
				return Math.max(totalMessages - startOfRemaining, 0)

			case "lastTwo":
				// Keep the last user-assistant pair in addition to the first pair
				return Math.max(totalMessages - startOfRemaining - 2, 0)

			case "half":
				// Remove half of remaining user-assistant pairs (always even number)
				// Divide by 4 to get half the pairs, then multiply by 2 to get messages
				return Math.floor((totalMessages - startOfRemaining) / 4) * 2

			case "quarter":
				// Remove 3/4 of remaining user-assistant pairs (always even number)
				// Calculate 3/4 of messages, divide by 2 for pairs, then multiply by 2 for messages
				return Math.floor(((totalMessages - startOfRemaining) * 3) / 4 / 2) * 2

			default:
				return 0
		}
	}
}
