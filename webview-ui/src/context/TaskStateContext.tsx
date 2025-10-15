/**
 * TaskStateContext - Manages task and message state
 *
 * This context handles:
 * - Current task and messages (via unified MessageStreamService)
 * - Task history
 * - Message updates (full state sync and partial streaming)
 * - Task size tracking
 *
 * Architecture:
 * - Uses MessageStreamService for coordinated message updates
 * - Eliminates race conditions between full state and partial updates
 * - Backend intelligently merges streams based on streaming state
 *
 * Benefits:
 * - No more competing subscriptions
 * - Cleaner state management
 * - Better performance during streaming
 * - Components only re-render when task/message state changes
 */

import { findLastIndex } from "@shared/array"
import type { ClineMessage } from "@shared/ExtensionMessage"
import type { HistoryItem } from "@shared/HistoryItem"
import { EmptyRequest } from "@shared/proto/cline/common"
import { MessageUpdateType } from "@shared/proto/cline/message_stream"
import { convertProtoToClineMessage } from "@shared/proto-conversions/cline-message"
import type React from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { createContextSelector } from "@/hooks/use_context_selector"
import { debug, logError } from "@/utils/debug_logger"
import { MessageStreamServiceClient, StateServiceClient } from "../services/grpc-client"

export interface TaskStateContextType {
	// Task state
	clineMessages: ClineMessage[]
	taskHistory: HistoryItem[]
	currentTaskId: string | undefined
	totalTasksSize: number | null
	checkpointManagerErrorMessage?: string

	// Setters
	setTotalTasksSize: (value: number | null) => void
	setClineMessages: (messages: ClineMessage[]) => void
	setTaskHistory: (history: HistoryItem[]) => void
	setCurrentTaskId: (id: string | undefined) => void
	setCheckpointManagerErrorMessage: (message: string | undefined) => void
}

const TaskStateContext = createContext<TaskStateContextType | undefined>(undefined)

export const TaskStateContextProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	const [clineMessages, setClineMessages] = useState<ClineMessage[]>([])
	const [taskHistory, setTaskHistory] = useState<HistoryItem[]>([])
	const [currentTaskId, setCurrentTaskId] = useState<string | undefined>(undefined)
	const [totalTasksSize, setTotalTasksSize] = useState<number | null>(null)
	const [checkpointManagerErrorMessage, setCheckpointManagerErrorMessage] = useState<string | undefined>(undefined)

	// Subscription refs
	const messageStreamUnsubscribeRef = useRef<(() => void) | null>(null)
	const stateSubscriptionRef = useRef<(() => void) | null>(null)

	// Subscribe to unified message stream
	// Consolidates full state sync and partial message updates into a single coordinated stream
	useEffect(() => {
		messageStreamUnsubscribeRef.current = MessageStreamServiceClient.subscribeToMessageStream(EmptyRequest.create({}), {
			onResponse: (update) => {
				try {
					switch (update.type) {
						case MessageUpdateType.FULL_SYNC:
							// Replace entire message array with full state
							if (update.fullState) {
								const messages = update.fullState
									.map((protoMsg) => convertProtoToClineMessage(protoMsg))
									// Filter out messages that shouldn't be in state
									.filter((msg) => {
										// Filter empty reasoning/thinking blocks
										if (msg.type === "say" && msg.say === "reasoning" && (!msg.text || !msg.text.trim())) {
											debug.log("[DEBUG] Filtering empty reasoning message from full sync")
											return false
										}

										// Filter completion_result say messages (they should be converted to ask)
										// This ensures consistency even if backend sends both
										if (msg.type === "say" && msg.say === "completion_result") {
											// Check if there's a corresponding ask message with same timestamp
											const hasAskVersion = update.fullState.some((otherMsg) => {
												const converted = convertProtoToClineMessage(otherMsg)
												return (
													converted.type === "ask" &&
													converted.ask === "completion_result" &&
													converted.ts === msg.ts
												)
											})

											if (hasAskVersion) {
												debug.log(
													"[DEBUG] Filtering completion_result say from full sync (ask version exists)",
												)
												return false
											}
										}

										return true
									})
								setClineMessages(messages)
								debug.log("[DEBUG] Applied full state sync from unified stream", {
									totalMessages: messages.length,
								})
							}
							break

						case MessageUpdateType.PARTIAL_UPDATE:
							// Update or add single message
							if (update.partialMessage) {
								const partialMessage = convertProtoToClineMessage(update.partialMessage)

								// Validate critical fields
								if (!partialMessage.ts || partialMessage.ts <= 0) {
									logError("Invalid timestamp in partial message:", {
										ts: partialMessage.ts,
										type: partialMessage.type,
									})
									return
								}

								// Filter out empty handshake messages
								if (!partialMessage.ask && !partialMessage.say && !partialMessage.text) {
									debug.log("[DEBUG] Ignoring empty handshake message")
									return
								}

								// Filter out empty reasoning/thinking blocks
								if (
									partialMessage.type === "say" &&
									partialMessage.say === "reasoning" &&
									(!partialMessage.text || !partialMessage.text.trim())
								) {
									debug.log("[DEBUG] Ignoring empty reasoning message")
									return
								}

								setClineMessages((prevMessages) => {
									// Special handling for completion_result conversion (say -> ask)
									// When we receive a completion_result ask, remove any completion_result say with the same timestamp
									if (partialMessage.type === "ask" && partialMessage.ask === "completion_result") {
										debug.log("[DEBUG] Processing completion_result ask - checking for say to replace")

										// Find and remove the corresponding say message
										const sayIndex = findLastIndex(
											prevMessages,
											(msg) => msg.say === "completion_result" && msg.ts === partialMessage.ts,
										)

										if (sayIndex !== -1) {
											debug.log("[DEBUG] Replacing completion_result say with ask at same timestamp")
											const newMessages = [...prevMessages]
											newMessages[sayIndex] = partialMessage
											return newMessages
										}

										// If no say found, check for existing ask with same timestamp
										const askIndex = findLastIndex(
											prevMessages,
											(msg) => msg.ask === "completion_result" && msg.ts === partialMessage.ts,
										)

										if (askIndex !== -1) {
											debug.log("[DEBUG] Updating existing completion_result ask")
											const newMessages = [...prevMessages]
											newMessages[askIndex] = partialMessage
											return newMessages
										}

										// No existing message found - add as new
										debug.log("[DEBUG] Adding new completion_result ask")
										return [...prevMessages, partialMessage]
									}

									// Standard message update logic
									const lastIndex = findLastIndex(prevMessages, (msg) => msg.ts === partialMessage.ts)
									if (lastIndex !== -1) {
										// Update existing message
										const newMessages = [...prevMessages]
										newMessages[lastIndex] = partialMessage
										return newMessages
									} else {
										// Add new message
										return [...prevMessages, partialMessage]
									}
								})
							}
							break

						case MessageUpdateType.STREAM_START:
							debug.log("[DEBUG] Streaming session started")
							break

						case MessageUpdateType.STREAM_END:
							debug.log("[DEBUG] Streaming session ended")
							break
					}
				} catch (error) {
					logError("Error processing message stream update:", error)
				}
			},
			onError: (error) => {
				logError("Error in message stream subscription:", error)
			},
			onComplete: () => {
				debug.log("[DEBUG] Message stream subscription completed")
			},
		})

		return () => {
			if (messageStreamUnsubscribeRef.current) {
				messageStreamUnsubscribeRef.current()
				messageStreamUnsubscribeRef.current = null
			}
		}
	}, [])

	// Subscribe to state updates for non-message data (task history, current task, etc.)
	useEffect(() => {
		stateSubscriptionRef.current = StateServiceClient.subscribeToState(EmptyRequest.create({}), {
			onResponse: (response) => {
				if (response.stateJson) {
					try {
						const stateData = JSON.parse(response.stateJson)

						// Only handle non-message state (messages are handled by MessageStreamService)
						if (stateData.taskHistory) {
							setTaskHistory(stateData.taskHistory)
						}
						if (stateData.currentTaskItem?.id) {
							setCurrentTaskId(stateData.currentTaskItem.id)
						}
						if (stateData.checkpointManagerErrorMessage !== undefined) {
							setCheckpointManagerErrorMessage(stateData.checkpointManagerErrorMessage)
						}
					} catch (error) {
						logError("Error parsing state JSON in TaskStateContext:", error)
					}
				}
			},
			onError: (error) => {
				logError("Error in state subscription:", error)
			},
			onComplete: () => {
				debug.log("[DEBUG] State subscription completed")
			},
		})

		return () => {
			if (stateSubscriptionRef.current) {
				stateSubscriptionRef.current()
				stateSubscriptionRef.current = null
			}
		}
	}, [])

	const contextValue: TaskStateContextType = {
		clineMessages,
		taskHistory,
		currentTaskId,
		totalTasksSize,
		checkpointManagerErrorMessage,
		setTotalTasksSize,
		setClineMessages,
		setTaskHistory,
		setCurrentTaskId,
		setCheckpointManagerErrorMessage,
	}

	return <TaskStateContext.Provider value={contextValue}>{children}</TaskStateContext.Provider>
}

/**
 * Hook to access task state
 *
 * @example
 * ```typescript
 * const { clineMessages, totalTasksSize } = useTaskState()
 * ```
 */
export const useTaskState = () => {
	const context = useContext(TaskStateContext)
	if (context === undefined) {
		throw new Error("useTaskState must be used within a TaskStateContextProvider")
	}
	return context
}

/**
 * Optimized selector hook for task state
 * Reduces re-renders by only updating when selected state changes
 *
 * @example
 * ```typescript
 * // Single value:
 * const messages = useTaskStateSelector(state => state.clineMessages)
 *
 * // Computed value:
 * const messageCount = useTaskStateSelector(
 *   state => state.clineMessages.length
 * )
 *
 * // Multiple values:
 * const { messages, taskId } = useTaskStateSelector(
 *   state => ({
 *     messages: state.clineMessages,
 *     taskId: state.currentTaskId,
 *   })
 * )
 * ```
 */
export const useTaskStateSelector = createContextSelector(useTaskState)
