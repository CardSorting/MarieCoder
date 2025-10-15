import { sendPartialMessageEvent } from "@core/controller/ui/subscribeToPartialMessage"
import { formatResponse } from "@core/prompts/response_formatters"
import { ClineAsk, ClineSay } from "@shared/ExtensionMessage"
import { convertClineMessageToProto } from "@shared/proto-conversions/cline-message"
import { ClineDefaultTool } from "@shared/tools"
import { ClineAskResponse } from "@shared/WebviewMessage"
import pWaitFor from "p-wait-for"
import type { MessageStateHandler } from "../message-state"
import type { TaskState } from "../TaskState"

/**
 * Handles all message communication between Task and the UI webview.
 *
 * This service manages the bidirectional communication between the AI agent
 * and the user interface. It handles both streaming (partial) and complete
 * messages, ensuring proper state management and persistence.
 *
 * Responsibilities:
 * - Send questions to user (ask) and wait for responses
 * - Send notifications to user (say) for status updates
 * - Handle partial/streaming message updates
 * - Manage message state and persistence
 * - Coordinate with webview for real-time updates
 *
 * @example
 * ```typescript
 * const messageService = new TaskMessageService(taskState, messageHandler, postToWebview)
 * const response = await messageService.ask("tool", "Approve this change?")
 * await messageService.say("text", "Change applied successfully")
 * ```
 */
export class TaskMessageService {
	constructor(
		private readonly taskState: TaskState,
		private readonly messageStateHandler: MessageStateHandler,
		private readonly postStateToWebview: () => Promise<void>,
	) {}

	/**
	 * Ask user a question and wait for response
	 *
	 * Handles both partial (streaming) and complete messages. Partial messages
	 * update existing UI elements progressively, while complete messages create
	 * new UI elements or finalize partial ones.
	 *
	 * @param type - Type of question (tool, command, followup, etc.)
	 * @param text - Question text to display
	 * @param partial - Whether this is a partial/streaming update
	 * @returns User's response with optional text/images/files
	 * @throws Error if task was aborted or ask was superseded
	 */
	async ask(
		type: ClineAsk,
		text?: string,
		partial?: boolean,
	): Promise<{
		response: ClineAskResponse
		text?: string
		images?: string[]
		files?: string[]
		askTs?: number
	}> {
		// Check if task was aborted - don't process if instance is terminated
		if (this.taskState.abort) {
			throw new Error("Cline instance aborted")
		}

		let askTs: number

		// Handle partial vs complete messages
		if (partial !== undefined) {
			const clineMessages = this.messageStateHandler.getClineMessages()
			const lastMessage = clineMessages.at(-1)
			const lastMessageIndex = clineMessages.length - 1

			const isUpdatingPreviousPartial =
				lastMessage && lastMessage.partial && lastMessage.type === "ask" && lastMessage.ask === type

			if (partial) {
				// Streaming update to existing or new partial message
				if (isUpdatingPreviousPartial) {
					// Update existing partial message
					await this.messageStateHandler.updateClineMessage(lastMessageIndex, {
						text,
						partial,
					})
					const protoMessage = convertClineMessageToProto(lastMessage)
					await sendPartialMessageEvent(protoMessage)
					throw new Error("Current ask promise was ignored 1")
				} else {
					// Create new partial message
					askTs = Date.now()
					this.taskState.lastMessageTs = askTs
					await this.messageStateHandler.addToClineMessages({
						ts: askTs,
						type: "ask",
						ask: type,
						text,
						partial,
					})
					await this.postStateToWebview()
					throw new Error("Current ask promise was ignored 2")
				}
			} else {
				// Finalize partial message (partial=false)
				if (isUpdatingPreviousPartial) {
					// Complete version of previously partial message
					this.clearAskResponse()

					// Preserve timestamp for stable React keys (prevents flickering)
					askTs = lastMessage.ts
					this.taskState.lastMessageTs = askTs
					await this.messageStateHandler.updateClineMessage(lastMessageIndex, {
						text,
						partial: false,
					})
					const protoMessage = convertClineMessageToProto(lastMessage)
					await sendPartialMessageEvent(protoMessage)
				} else {
					// Check if we should convert a partial say message to a non-partial ask message
					const canConvertPartialSayToAsk =
						lastMessage && lastMessage.partial && lastMessage.type === "say" && lastMessage.say === type

					if (canConvertPartialSayToAsk) {
						// Convert partial say to non-partial ask
						this.clearAskResponse()
						askTs = lastMessage.ts
						this.taskState.lastMessageTs = askTs
						await this.messageStateHandler.updateClineMessage(lastMessageIndex, {
							type: "ask",
							ask: type,
							text: text || lastMessage.text, // Use provided text or keep existing
							partial: false,
						})
						const protoMessage = convertClineMessageToProto(lastMessage)
						await sendPartialMessageEvent(protoMessage)
					} else {
						// New non-partial message (not updating previous partial)
						this.clearAskResponse()
						askTs = Date.now()
						this.taskState.lastMessageTs = askTs
						await this.messageStateHandler.addToClineMessages({
							ts: askTs,
							type: "ask",
							ask: type,
							text,
						})
						await this.postStateToWebview()
					}
				}
			}
		} else {
			// Standard non-partial message
			this.clearAskResponse()

			// Check if the last message is a say message with matching type that we should convert to ask
			const clineMessages = this.messageStateHandler.getClineMessages()
			const lastMessage = clineMessages.at(-1)
			const lastMessageIndex = clineMessages.length - 1
			const canConvertSayToAsk = lastMessage && lastMessage.type === "say" && lastMessage.say === type

			if (canConvertSayToAsk) {
				// Convert the existing say message to an ask message
				askTs = lastMessage.ts
				this.taskState.lastMessageTs = askTs
				await this.messageStateHandler.updateClineMessage(lastMessageIndex, {
					type: "ask",
					ask: type,
					text: text || lastMessage.text, // Use provided text or keep existing
				})
				await this.postStateToWebview()
			} else {
				// Create new ask message
				askTs = Date.now()
				this.taskState.lastMessageTs = askTs
				await this.messageStateHandler.addToClineMessages({
					ts: askTs,
					type: "ask",
					ask: type,
					text,
				})
				await this.postStateToWebview()
			}
		}

		// Wait for user response
		await pWaitFor(() => this.taskState.askResponse !== undefined || this.taskState.lastMessageTs !== askTs, {
			interval: 100,
		})

		// Verify this response is for our question (not superseded by newer message)
		if (this.taskState.lastMessageTs !== askTs) {
			throw new Error("Current ask promise was ignored")
		}

		// Extract and return response
		const result = {
			response: this.taskState.askResponse!,
			text: this.taskState.askResponseText,
			images: this.taskState.askResponseImages,
			files: this.taskState.askResponseFiles,
		}

		this.clearAskResponse()
		return result
	}

	/**
	 * Handle user's response from webview
	 *
	 * Called by controller when user clicks button or submits input.
	 * Sets response data that the waiting ask() promise can retrieve.
	 *
	 * @param askResponse - User's response (button clicked, etc.)
	 * @param text - Optional text input from user
	 * @param images - Optional images attached by user
	 * @param files - Optional files attached by user
	 */
	handleWebviewAskResponse(askResponse: ClineAskResponse, text?: string, images?: string[], files?: string[]): void {
		this.taskState.askResponse = askResponse
		this.taskState.askResponseText = text
		this.taskState.askResponseImages = images
		this.taskState.askResponseFiles = files
	}

	/**
	 * Send message to user (notification, status update, etc.)
	 *
	 * Used for one-way communication to inform user of progress, results,
	 * or status changes. Supports both streaming and complete messages.
	 *
	 * @param type - Type of message (text, api_req_started, tool, error, etc.)
	 * @param text - Message text to display
	 * @param images - Optional images to include
	 * @param files - Optional files to include
	 * @param partial - Whether this is a partial/streaming update
	 * @returns Message timestamp (or undefined for partial updates)
	 */
	async say(
		type: ClineSay,
		text?: string,
		images?: string[],
		files?: string[],
		partial?: boolean,
	): Promise<number | undefined> {
		if (this.taskState.abort) {
			throw new Error("Cline instance aborted")
		}

		if (partial !== undefined) {
			const lastMessage = this.messageStateHandler.getClineMessages().at(-1)
			const isUpdatingPreviousPartial =
				lastMessage && lastMessage.partial && lastMessage.type === "say" && lastMessage.say === type

			if (partial) {
				// Streaming update
				if (isUpdatingPreviousPartial) {
					// Update existing partial message
					lastMessage.text = text
					lastMessage.images = images
					lastMessage.files = files
					lastMessage.partial = partial
					const protoMessage = convertClineMessageToProto(lastMessage)
					await sendPartialMessageEvent(protoMessage)
					return undefined
				} else {
					// Create new partial message
					const sayTs = Date.now()
					this.taskState.lastMessageTs = sayTs
					await this.messageStateHandler.addToClineMessages({
						ts: sayTs,
						type: "say",
						say: type,
						text,
						images,
						files,
						partial,
					})
					await this.postStateToWebview()
					return sayTs
				}
			} else {
				// Finalize partial message (partial=false)
				if (isUpdatingPreviousPartial) {
					// Complete version of previously partial message
					this.taskState.lastMessageTs = lastMessage.ts
					lastMessage.text = text
					lastMessage.images = images
					lastMessage.files = files
					lastMessage.partial = false

					// Persist to disk and notify webview
					await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
					const protoMessage = convertClineMessageToProto(lastMessage)
					await sendPartialMessageEvent(protoMessage)
					return undefined
				} else {
					// New non-partial message (not updating previous partial)
					const sayTs = Date.now()
					this.taskState.lastMessageTs = sayTs
					await this.messageStateHandler.addToClineMessages({
						ts: sayTs,
						type: "say",
						say: type,
						text,
						images,
						files,
					})
					await this.postStateToWebview()
					return sayTs
				}
			}
		} else {
			// Standard non-partial message
			const sayTs = Date.now()
			this.taskState.lastMessageTs = sayTs
			await this.messageStateHandler.addToClineMessages({
				ts: sayTs,
				type: "say",
				say: type,
				text,
				images,
				files,
			})
			await this.postStateToWebview()
			return sayTs
		}
	}

	/**
	 * Convenience method for missing parameter errors
	 *
	 * Creates a standardized error message when a tool is called without
	 * a required parameter. Combines say() for user notification and
	 * formatResponse for API error message.
	 *
	 * @param toolName - Name of the tool with missing parameter
	 * @param paramName - Name of the missing parameter
	 * @param relPath - Optional file path context
	 * @returns Formatted error response for API
	 */
	async sayAndCreateMissingParamError(toolName: ClineDefaultTool, paramName: string, relPath?: string): Promise<string> {
		await this.say(
			"error",
			`Cline tried to use ${toolName}${
				relPath ? ` for '${relPath.toPosix()}'` : ""
			} without value for required parameter '${paramName}'. Retrying...`,
		)
		return formatResponse.toolError(formatResponse.missingToolParameterError(paramName))
	}

	/**
	 * Remove last partial message if it matches criteria
	 *
	 * Used when transitioning between message types or when a partial
	 * message needs to be replaced rather than completed. Ensures clean
	 * message state transitions.
	 *
	 * @param type - Message type to check ("ask" or "say")
	 * @param askOrSay - Specific ask/say subtype to match
	 */
	async removeLastPartialMessageIfExistsWithType(type: "ask" | "say", askOrSay: ClineAsk | ClineSay): Promise<void> {
		const clineMessages = this.messageStateHandler.getClineMessages()
		const lastMessage = clineMessages.at(-1)

		const shouldRemove =
			lastMessage?.partial && lastMessage.type === type && (lastMessage.ask === askOrSay || lastMessage.say === askOrSay)

		if (shouldRemove) {
			this.messageStateHandler.setClineMessages(clineMessages.slice(0, -1))
			await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
		}
	}

	/**
	 * Clear ask response state
	 *
	 * Private helper to reset all ask-related state variables.
	 * Called before waiting for new responses and after retrieving responses.
	 */
	private clearAskResponse(): void {
		this.taskState.askResponse = undefined
		this.taskState.askResponseText = undefined
		this.taskState.askResponseImages = undefined
		this.taskState.askResponseFiles = undefined
	}
}
