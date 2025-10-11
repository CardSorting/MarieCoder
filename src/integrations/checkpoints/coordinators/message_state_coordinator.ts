import type { Anthropic } from "@anthropic-ai/sdk"
import type { MessageStateHandler } from "@core/task/message-state"
import type { ClineMessage, ClineSay } from "@shared/ExtensionMessage"
import type CheckpointTracker from "../CheckpointTracker"

/**
 * Callback type for say function
 */
type SayFunction = (
	type: ClineSay,
	text?: string,
	images?: string[],
	files?: string[],
	partial?: boolean,
) => Promise<number | undefined>

/**
 * Coordinates all message state operations for checkpoints
 * Abstracts MessageStateHandler interactions
 */
export class MessageStateCoordinator {
	constructor(
		private readonly messageStateHandler: MessageStateHandler,
		private readonly say: SayFunction,
	) {}

	/**
	 * Get all Cline messages
	 */
	getClineMessages(): ClineMessage[] {
		return this.messageStateHandler.getClineMessages()
	}

	/**
	 * Get API conversation history
	 */
	getApiConversationHistory(): Anthropic.MessageParam[] {
		return this.messageStateHandler.getApiConversationHistory()
	}

	/**
	 * Set checkpoint tracker in message state handler
	 */
	setCheckpointTracker(tracker: CheckpointTracker): void {
		this.messageStateHandler.setCheckpointTracker(tracker)
	}

	/**
	 * Update isCheckpointCheckedOut flags for checkpoint messages
	 * Sets the flag to true for the message at messageTs, false for all others
	 */
	updateCheckpointFlags(messageTs: number): void {
		const checkpointMessages = this.getClineMessages().filter((m) => m.say === "checkpoint_created")
		const currentMessageIndex = checkpointMessages.findIndex((m) => m.ts === messageTs)

		checkpointMessages.forEach((m, i) => {
			m.isCheckpointCheckedOut = i === currentMessageIndex
		})
	}

	/**
	 * Clear isCheckpointCheckedOut flag for all checkpoint messages
	 */
	clearAllCheckpointFlags(): void {
		const clineMessages = this.getClineMessages()
		clineMessages.forEach((message) => {
			if (message.say === "checkpoint_created") {
				message.isCheckpointCheckedOut = false
			}
		})
	}

	/**
	 * Add a checkpoint_created message
	 * @returns The timestamp of the created message, or undefined if failed
	 */
	async addCheckpointMessage(): Promise<number | undefined> {
		return await this.say("checkpoint_created")
	}

	/**
	 * Update a message with a checkpoint hash
	 */
	async updateMessageWithHash(messageTs: number, hash: string): Promise<void> {
		const messages = this.getClineMessages()
		const targetMessage = messages.find((m) => m.ts === messageTs)

		if (targetMessage) {
			targetMessage.lastCheckpointHash = hash
			await this.saveMessagesAndUpdateHistory()
		}
	}

	/**
	 * Overwrite Cline messages (truncate to new messages)
	 */
	async overwriteClineMessages(newMessages: ClineMessage[]): Promise<void> {
		await this.messageStateHandler.overwriteClineMessages(newMessages)
	}

	/**
	 * Overwrite API conversation history
	 */
	async overwriteApiConversationHistory(newHistory: Anthropic.MessageParam[]): Promise<void> {
		await this.messageStateHandler.overwriteApiConversationHistory(newHistory)
	}

	/**
	 * Save messages and update history
	 */
	async saveMessagesAndUpdateHistory(): Promise<void> {
		await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
	}

	/**
	 * Find the last message before messageIndex that has a checkpoint hash
	 * @returns [lastHashIndex, lastMessageWithHash] or [-1, undefined] if not found
	 */
	findLastCheckpointBeforeIndex(messageIndex: number): [number, ClineMessage | undefined] {
		const clineMessages = this.getClineMessages()
		const messagesBeforeIndex = clineMessages.slice(0, messageIndex)

		for (let i = messagesBeforeIndex.length - 1; i >= 0; i--) {
			if (messagesBeforeIndex[i].lastCheckpointHash !== undefined) {
				return [i, messagesBeforeIndex[i]]
			}
		}

		return [-1, undefined]
	}

	/**
	 * Get messages after a certain index
	 */
	getMessagesAfterIndex(messageIndex: number): ClineMessage[] {
		const clineMessages = this.getClineMessages()
		return clineMessages.slice(messageIndex + 1)
	}
}
