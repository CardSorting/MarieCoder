/**
 * Chat Message Flow State Machine
 *
 * Manages the complex state transitions of chat message sending and streaming.
 *
 * States:
 * - idle: Ready to send a message
 * - validating: Checking message before sending
 * - sending: Sending message to server
 * - waiting: Waiting for AI response
 * - streaming: Receiving streamed response
 * - complete: Message flow complete
 * - error: Error occurred
 *
 * Flow:
 * idle -> validating -> sending -> waiting -> streaming -> complete -> idle
 *                                                     \-> error -> idle
 */

import type { ClineAsk } from "@shared/ExtensionMessage"
import type { StateMachineConfig } from "../use_state_machine"

// ============================================================================
// Types
// ============================================================================

export interface ChatMessageContext {
	/** Current message text */
	messageText: string
	/** Selected images */
	images: string[]
	/** Selected files */
	files: string[]
	/** Current ask state */
	clineAsk?: ClineAsk
	/** Whether this is a new task */
	isNewTask: boolean
	/** Error message if any */
	errorMessage?: string
	/** Timestamp when message was sent */
	sentAt?: number
	/** Timestamp when streaming started */
	streamingStartedAt?: number
	/** Number of retry attempts */
	retryCount: number
}

export type ChatMessageEvent =
	| { type: "SEND"; payload: { text: string; images: string[]; files: string[] } }
	| { type: "VALIDATION_SUCCESS" }
	| { type: "VALIDATION_FAILED"; payload: { error: string } }
	| { type: "SENT_SUCCESS" }
	| { type: "SENT_FAILED"; payload: { error: string } }
	| { type: "RESPONSE_RECEIVED" }
	| { type: "STREAMING_STARTED" }
	| { type: "STREAMING_CHUNK"; payload: { chunk: string } }
	| { type: "STREAMING_COMPLETE" }
	| { type: "ERROR"; payload: { error: string } }
	| { type: "RETRY" }
	| { type: "RESET" }

// ============================================================================
// Guards
// ============================================================================

/**
 * Check if message has content to send
 */
const hasContent = (context: ChatMessageContext): boolean => {
	return context.messageText.trim().length > 0 || context.images.length > 0 || context.files.length > 0
}

/**
 * Check if retry limit not exceeded (max 3 retries)
 */
const canRetry = (context: ChatMessageContext): boolean => {
	return context.retryCount < 3
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Prepare message for sending
 */
const prepareMessage = (_context: ChatMessageContext, event: ChatMessageEvent): Partial<ChatMessageContext> => {
	if (event.type !== "SEND") {
		return {}
	}

	return {
		messageText: event.payload.text,
		images: event.payload.images,
		files: event.payload.files,
		errorMessage: undefined,
		sentAt: Date.now(),
	}
}

/**
 * Record streaming start time
 */
const recordStreamingStart = (_context: ChatMessageContext): Partial<ChatMessageContext> => {
	return {
		streamingStartedAt: Date.now(),
	}
}

/**
 * Store error message
 */
const storeError = (_context: ChatMessageContext, event: ChatMessageEvent): Partial<ChatMessageContext> => {
	if (event.type !== "ERROR" && event.type !== "SENT_FAILED" && event.type !== "VALIDATION_FAILED") {
		return {}
	}

	return {
		errorMessage: event.payload.error,
	}
}

/**
 * Increment retry count
 */
const incrementRetry = (context: ChatMessageContext): Partial<ChatMessageContext> => {
	return {
		retryCount: context.retryCount + 1,
	}
}

/**
 * Reset context for new message
 */
const resetContext = (): Partial<ChatMessageContext> => {
	return {
		messageText: "",
		images: [],
		files: [],
		errorMessage: undefined,
		sentAt: undefined,
		streamingStartedAt: undefined,
		retryCount: 0,
	}
}

// ============================================================================
// State Machine Configuration
// ============================================================================

export const createChatMessageStateMachine = (
	initialContext?: Partial<ChatMessageContext>,
): StateMachineConfig<ChatMessageContext, ChatMessageEvent> => ({
	id: "chatMessage",
	initial: "idle",
	context: {
		messageText: "",
		images: [],
		files: [],
		isNewTask: false,
		retryCount: 0,
		...initialContext,
	},
	states: {
		idle: {
			on: {
				SEND: {
					target: "validating",
					actions: [prepareMessage],
				},
			},
			onEnter: () => {
				// Ready to send a new message
				return undefined
			},
		},

		validating: {
			on: {
				VALIDATION_SUCCESS: {
					target: "sending",
					guard: hasContent,
				},
				VALIDATION_FAILED: {
					target: "error",
					actions: [storeError],
				},
			},
			onEnter: () => {
				// Validate message content
				// This is typically handled by the component
				return undefined
			},
		},

		sending: {
			on: {
				SENT_SUCCESS: "waiting",
				SENT_FAILED: {
					target: "error",
					actions: [storeError],
				},
			},
			onEnter: () => {
				// Send message to server
				// This is handled by the component via TaskServiceClient
				return undefined
			},
		},

		waiting: {
			on: {
				RESPONSE_RECEIVED: "streaming",
				STREAMING_STARTED: "streaming",
				ERROR: {
					target: "error",
					actions: [storeError],
				},
			},
			onEnter: () => {
				// Waiting for AI response to start
				return undefined
			},
		},

		streaming: {
			on: {
				STREAMING_CHUNK: "streaming", // Stay in streaming state
				STREAMING_COMPLETE: "complete",
				ERROR: {
					target: "error",
					actions: [storeError],
				},
			},
			onEnter: recordStreamingStart,
		},

		complete: {
			on: {
				RESET: {
					target: "idle",
					actions: [resetContext],
				},
				SEND: {
					target: "validating",
					actions: [prepareMessage],
				},
			},
			onEnter: () => {
				// Message flow complete
				// Can now send another message
				return undefined
			},
		},

		error: {
			on: {
				RETRY: {
					target: "sending",
					guard: canRetry,
					actions: [incrementRetry],
				},
				RESET: {
					target: "idle",
					actions: [resetContext],
				},
				SEND: {
					target: "validating",
					actions: [prepareMessage, resetContext],
				},
			},
			onEnter: () => {
				// Handle error state
				// Show error message to user
				return undefined
			},
		},
	},
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user-friendly status message based on current state
 */
export function getChatMessageStatus(state: string, context: ChatMessageContext): string {
	switch (state) {
		case "idle":
			return "Ready to send"
		case "validating":
			return "Validating message..."
		case "sending":
			return "Sending message..."
		case "waiting":
			return "Waiting for response..."
		case "streaming":
			return "Receiving response..."
		case "complete":
			return "Complete"
		case "error":
			return context.errorMessage || "An error occurred"
		default:
			return ""
	}
}

/**
 * Calculate elapsed time for current operation
 */
export function getElapsedTime(state: string, context: ChatMessageContext): number | undefined {
	if (state === "streaming" && context.streamingStartedAt) {
		return Date.now() - context.streamingStartedAt
	}
	if (context.sentAt) {
		return Date.now() - context.sentAt
	}
	return undefined
}

/**
 * Check if machine is in a "busy" state (user should not send another message)
 */
export function isBusy(state: string): boolean {
	return ["validating", "sending", "waiting", "streaming"].includes(state)
}

/**
 * Check if machine can accept a new message
 */
export function canSendMessage(state: string): boolean {
	return state === "idle" || state === "complete" || state === "error"
}
