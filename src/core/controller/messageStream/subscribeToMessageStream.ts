import { EmptyRequest } from "@shared/proto/cline/common"
import { MessageStreamUpdate, MessageUpdateType } from "@shared/proto/cline/message_stream"
import { ClineMessage } from "@shared/proto/cline/ui"
import { convertClineMessageToProto } from "@shared/proto-conversions/cline-message"
import { ExtensionState } from "@/shared/ExtensionMessage"
import { getRequestRegistry, StreamingResponseHandler } from "../grpc-handler"
import { Controller } from "../index"

// Keep track of active message stream subscriptions
const activeMessageStreamSubscriptions = new Set<StreamingResponseHandler<MessageStreamUpdate>>()

// Track streaming state globally
let isStreaming = false
let lastPartialUpdateTime = 0
const STREAMING_TIMEOUT_MS = 2000

/**
 * Subscribe to unified message stream
 * Consolidates full state sync and partial message updates into a single coordinated stream
 * @param controller The controller instance
 * @param request The empty request
 * @param responseStream The streaming response handler
 * @param requestId The ID of the request (passed by the gRPC handler)
 */
export async function subscribeToMessageStream(
	controller: Controller,
	_request: EmptyRequest,
	responseStream: StreamingResponseHandler<MessageStreamUpdate>,
	requestId?: string,
): Promise<void> {
	// Add this subscription to the active subscriptions
	activeMessageStreamSubscriptions.add(responseStream)

	// Register cleanup when the connection is closed
	const cleanup = () => {
		activeMessageStreamSubscriptions.delete(responseStream)
	}

	// Register the cleanup function with the request registry if we have a requestId
	if (requestId) {
		getRequestRegistry().registerRequest(requestId, cleanup, { type: "message_stream_subscription" }, responseStream)
	}

	// Send initial full state
	const initialState = await controller.getStateToPostToWebview()
	try {
		// Convert messages to proto format
		const protoMessages = (initialState.clineMessages || []).map((msg) => convertClineMessageToProto(msg))

		await responseStream(
			MessageStreamUpdate.create({
				type: MessageUpdateType.FULL_SYNC,
				fullState: protoMessages,
				isStreaming: false,
			}),
			false, // Not the last message
		)
	} catch (error) {
		console.error("Error sending initial message stream state:", error)
		activeMessageStreamSubscriptions.delete(responseStream)
	}
}

/**
 * Send a full state update to all active message stream subscribers
 * Only sends if not currently streaming
 * @param state The state to send
 */
export async function sendMessageStreamFullStateUpdate(state: ExtensionState): Promise<void> {
	// Don't send full state updates during active streaming
	if (isStreaming) {
		console.log("[DEBUG MessageStream] Skipping FULL_SYNC - currently streaming")
		return
	}

	// Check if streaming recently occurred (within timeout window)
	const timeSinceLastPartial = Date.now() - lastPartialUpdateTime
	if (timeSinceLastPartial < STREAMING_TIMEOUT_MS) {
		console.log("[DEBUG MessageStream] Skipping FULL_SYNC - within streaming timeout (", timeSinceLastPartial, "ms)")
		return
	}

	console.log("[DEBUG MessageStream] Sending FULL_SYNC with", state.clineMessages?.length, "messages")
	const lastMessage = state.clineMessages?.at(-1)
	console.log("[DEBUG MessageStream] Last message:", {
		type: lastMessage?.type,
		say: lastMessage?.say,
		ask: lastMessage?.ask,
		ts: lastMessage?.ts,
	})

	// Convert messages to proto format
	const protoMessages = (state.clineMessages || []).map((msg) => convertClineMessageToProto(msg))

	// Send full state to all active subscribers
	const promises = Array.from(activeMessageStreamSubscriptions).map(async (responseStream) => {
		try {
			await responseStream(
				MessageStreamUpdate.create({
					type: MessageUpdateType.FULL_SYNC,
					fullState: protoMessages,
					isStreaming: false,
				}),
				false, // Not the last message
			)
		} catch (error) {
			console.error("Error sending message stream full state update:", error)
			activeMessageStreamSubscriptions.delete(responseStream)
		}
	})

	await Promise.all(promises)
}

/**
 * Send a partial message update to all active message stream subscribers
 * Marks streaming as active and sets timeout for streaming end detection
 * @param partialMessage The partial ClineMessage to send
 */
export async function sendMessageStreamPartialUpdate(partialMessage: ClineMessage): Promise<void> {
	// Mark streaming start if not already streaming
	if (!isStreaming) {
		isStreaming = true
		// Send STREAM_START marker
		const startPromises = Array.from(activeMessageStreamSubscriptions).map(async (responseStream) => {
			try {
				await responseStream(
					MessageStreamUpdate.create({
						type: MessageUpdateType.STREAM_START,
						isStreaming: true,
					}),
					false, // Not the last message
				)
			} catch (error) {
				console.error("Error sending stream start marker:", error)
				activeMessageStreamSubscriptions.delete(responseStream)
			}
		})
		await Promise.all(startPromises)
	}

	// Update last partial update time
	lastPartialUpdateTime = Date.now()

	// Send partial update to all active subscribers
	const updatePromises = Array.from(activeMessageStreamSubscriptions).map(async (responseStream) => {
		try {
			await responseStream(
				MessageStreamUpdate.create({
					type: MessageUpdateType.PARTIAL_UPDATE,
					partialMessage,
					isStreaming: true,
				}),
				false, // Not the last message
			)
		} catch (error) {
			console.error("Error sending message stream partial update:", error)
			activeMessageStreamSubscriptions.delete(responseStream)
		}
	})

	await Promise.all(updatePromises)

	// Schedule streaming end detection
	scheduleStreamingEndDetection()
}

/**
 * Schedule detection of streaming end
 * If no partial updates occur within STREAMING_TIMEOUT_MS, mark streaming as complete
 */
function scheduleStreamingEndDetection(): void {
	setTimeout(async () => {
		const timeSinceLastPartial = Date.now() - lastPartialUpdateTime
		if (timeSinceLastPartial >= STREAMING_TIMEOUT_MS && isStreaming) {
			// Streaming has ended
			isStreaming = false

			// Send STREAM_END marker
			const promises = Array.from(activeMessageStreamSubscriptions).map(async (responseStream) => {
				try {
					await responseStream(
						MessageStreamUpdate.create({
							type: MessageUpdateType.STREAM_END,
							isStreaming: false,
						}),
						false, // Not the last message
					)
				} catch (error) {
					console.error("Error sending stream end marker:", error)
					activeMessageStreamSubscriptions.delete(responseStream)
				}
			})
			await Promise.all(promises)
		}
	}, STREAMING_TIMEOUT_MS)
}
