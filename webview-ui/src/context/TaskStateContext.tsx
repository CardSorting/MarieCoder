/**
 * TaskStateContext - Manages task and message state
 *
 * This context handles:
 * - Current task and messages
 * - Task history
 * - Partial message updates
 * - Task size tracking
 *
 * Benefits:
 * - Components only re-render when task/message state changes
 * - Isolated task-related logic
 * - Better performance for chat interactions
 */

import { findLastIndex } from "@shared/array"
import type { ClineMessage } from "@shared/ExtensionMessage"
import type { HistoryItem } from "@shared/HistoryItem"
import { EmptyRequest } from "@shared/proto/cline/common"
import { convertProtoToClineMessage } from "@shared/proto-conversions/cline-message"
import type React from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { createContextSelector } from "@/hooks/use_context_selector"
import { debug, logError } from "@/utils/debug_logger"
import { StateServiceClient, UiServiceClient } from "../services/grpc-client"

export interface TaskStateContextType {
	// Task state
	clineMessages: ClineMessage[]
	taskHistory: HistoryItem[]
	currentTaskId: string | undefined
	totalTasksSize: number | null

	// Setters
	setTotalTasksSize: (value: number | null) => void
	setClineMessages: (messages: ClineMessage[]) => void
	setTaskHistory: (history: HistoryItem[]) => void
	setCurrentTaskId: (id: string | undefined) => void
}

const TaskStateContext = createContext<TaskStateContextType | undefined>(undefined)

export const TaskStateContextProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	const [clineMessages, setClineMessages] = useState<ClineMessage[]>([])
	const [taskHistory, setTaskHistory] = useState<HistoryItem[]>([])
	const [currentTaskId, setCurrentTaskId] = useState<string | undefined>(undefined)
	const [totalTasksSize, setTotalTasksSize] = useState<number | null>(null)

	// Subscription refs
	const partialMessageUnsubscribeRef = useRef<(() => void) | null>(null)
	const stateSubscriptionRef = useRef<(() => void) | null>(null)

	// Subscribe to state updates to sync full message state
	useEffect(() => {
		stateSubscriptionRef.current = StateServiceClient.subscribeToState(EmptyRequest.create({}), {
			onResponse: (response) => {
				if (response.stateJson) {
					try {
						const stateData = JSON.parse(response.stateJson)
						if (stateData.clineMessages) {
							setClineMessages(stateData.clineMessages)
						}
						if (stateData.taskHistory) {
							setTaskHistory(stateData.taskHistory)
						}
						if (stateData.currentTaskItem?.id) {
							setCurrentTaskId(stateData.currentTaskItem.id)
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
				debug.log("[DEBUG] state subscription completed")
			},
		})

		return () => {
			if (stateSubscriptionRef.current) {
				stateSubscriptionRef.current()
				stateSubscriptionRef.current = null
			}
		}
	}, [])

	// Subscribe to partial message updates
	useEffect(() => {
		partialMessageUnsubscribeRef.current = UiServiceClient.subscribeToPartialMessage(EmptyRequest.create({}), {
			onResponse: (protoMessage) => {
				try {
					// Validate critical fields
					if (!protoMessage.ts || protoMessage.ts <= 0) {
						logError("Invalid timestamp in partial message:", protoMessage)
						return
					}

					const partialMessage = convertProtoToClineMessage(protoMessage)
					setClineMessages((prevMessages) => {
						const lastIndex = findLastIndex(prevMessages, (msg) => msg.ts === partialMessage.ts)
						if (lastIndex !== -1) {
							// Update existing message
							const newMessages = [...prevMessages]
							newMessages[lastIndex] = partialMessage
							return newMessages
						} else {
							// Add new message if it doesn't exist
							// This handles the case where partial messages arrive before
							// the full state sync, ensuring task execution updates are not lost
							return [...prevMessages, partialMessage]
						}
					})
				} catch (error) {
					logError("Failed to process partial message:", error, protoMessage)
				}
			},
			onError: (error) => {
				logError("Error in partialMessage subscription:", error)
			},
			onComplete: () => {
				debug.log("[DEBUG] partialMessage subscription completed")
			},
		})

		// Clean up subscription
		return () => {
			if (partialMessageUnsubscribeRef.current) {
				partialMessageUnsubscribeRef.current()
				partialMessageUnsubscribeRef.current = null
			}
		}
	}, [])

	const contextValue: TaskStateContextType = {
		clineMessages,
		taskHistory,
		currentTaskId,
		totalTasksSize,
		setTotalTasksSize,
		setClineMessages,
		setTaskHistory,
		setCurrentTaskId,
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
