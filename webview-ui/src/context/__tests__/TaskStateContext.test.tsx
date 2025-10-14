/**
 * Tests for TaskStateContext
 *
 * Validates the task state context functionality including:
 * - Provider initialization
 * - State management
 * - Setters
 * - Hook error handling
 */

import type { ClineMessage } from "@shared/ExtensionMessage"
import type { HistoryItem } from "@shared/HistoryItem"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TaskStateContextProvider, useTaskState } from "../TaskStateContext"

describe("TaskStateContext", () => {
	let _mockStateSubscription: {
		onResponse: (response: any) => void
		onError: (error: Error) => void
		onComplete: () => void
	}

	let _mockPartialMessageSubscription: {
		onResponse: (message: any) => void
		onError: (error: Error) => void
		onComplete: () => void
	}

	beforeEach(() => {
		// Reset subscriptions before each test
		_mockStateSubscription = {
			onResponse: vi.fn(),
			onError: vi.fn(),
			onComplete: vi.fn(),
		}

		_mockPartialMessageSubscription = {
			onResponse: vi.fn(),
			onError: vi.fn(),
			onComplete: vi.fn(),
		}
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("Provider Initialization", () => {
		it("should initialize with default state", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			expect(result.current.clineMessages).toEqual([])
			expect(result.current.taskHistory).toEqual([])
			expect(result.current.currentTaskId).toBeUndefined()
			expect(result.current.totalTasksSize).toBeNull()
		})

		it("should provide setter functions", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			expect(typeof result.current.setClineMessages).toBe("function")
			expect(typeof result.current.setTaskHistory).toBe("function")
			expect(typeof result.current.setCurrentTaskId).toBe("function")
			expect(typeof result.current.setTotalTasksSize).toBe("function")
		})
	})

	describe("Hook Error Handling", () => {
		it("should throw error when used outside provider", () => {
			// Suppress console errors for this test
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			expect(() => {
				renderHook(() => useTaskState())
			}).toThrow("useTaskState must be used within a TaskStateContextProvider")

			consoleSpy.mockRestore()
		})
	})

	describe("State Setters", () => {
		it("should update clineMessages", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const mockMessages: ClineMessage[] = [
				{
					ts: Date.now(),
					type: "say",
					say: "test",
					text: "Hello world",
				},
			]

			act(() => {
				result.current.setClineMessages(mockMessages)
			})

			expect(result.current.clineMessages).toEqual(mockMessages)
		})

		it("should update taskHistory", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const mockHistory: HistoryItem[] = [
				{
					id: "task-1",
					ts: Date.now(),
					task: "Test task",
					tokensIn: 100,
					tokensOut: 50,
					cacheWrites: 0,
					cacheReads: 0,
					totalCost: 0.01,
				},
			]

			act(() => {
				result.current.setTaskHistory(mockHistory)
			})

			expect(result.current.taskHistory).toEqual(mockHistory)
		})

		it("should update currentTaskId", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			act(() => {
				result.current.setCurrentTaskId("task-123")
			})

			expect(result.current.currentTaskId).toBe("task-123")
		})

		it("should update totalTasksSize", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			act(() => {
				result.current.setTotalTasksSize(1024)
			})

			expect(result.current.totalTasksSize).toBe(1024)
		})

		it("should set totalTasksSize to null", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			act(() => {
				result.current.setTotalTasksSize(1024)
			})

			act(() => {
				result.current.setTotalTasksSize(null)
			})

			expect(result.current.totalTasksSize).toBeNull()
		})
	})

	describe("Multiple Updates", () => {
		it("should handle multiple message updates", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const messages1: ClineMessage[] = [
				{
					ts: Date.now(),
					type: "say",
					say: "test",
					text: "Message 1",
				},
			]

			const messages2: ClineMessage[] = [
				{
					ts: Date.now(),
					type: "say",
					say: "test",
					text: "Message 2",
				},
			]

			act(() => {
				result.current.setClineMessages(messages1)
			})

			expect(result.current.clineMessages).toEqual(messages1)

			act(() => {
				result.current.setClineMessages(messages2)
			})

			expect(result.current.clineMessages).toEqual(messages2)
		})

		it("should handle appending to messages", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const message1: ClineMessage = {
				ts: Date.now(),
				type: "say",
				say: "test",
				text: "Message 1",
			}

			const message2: ClineMessage = {
				ts: Date.now() + 1000,
				type: "say",
				say: "test",
				text: "Message 2",
			}

			act(() => {
				result.current.setClineMessages([message1])
			})

			act(() => {
				result.current.setClineMessages([...result.current.clineMessages, message2])
			})

			expect(result.current.clineMessages).toHaveLength(2)
			expect(result.current.clineMessages[0]).toEqual(message1)
			expect(result.current.clineMessages[1]).toEqual(message2)
		})
	})

	describe("State Immutability", () => {
		it("should maintain state immutability for messages", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const originalMessages: ClineMessage[] = [
				{
					ts: Date.now(),
					type: "say",
					say: "test",
					text: "Original",
				},
			]

			act(() => {
				result.current.setClineMessages(originalMessages)
			})

			const retrievedMessages = result.current.clineMessages

			// Modifying retrieved messages should not affect internal state
			const newMessages = [...retrievedMessages]
			newMessages[0] = {
				...newMessages[0],
				text: "Modified",
			}

			// Original should remain unchanged in context
			expect(result.current.clineMessages[0].text).toBe("Original")
		})

		it("should maintain state immutability for history", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const originalHistory: HistoryItem[] = [
				{
					id: "task-1",
					ts: Date.now(),
					task: "Original task",
					tokensIn: 100,
					tokensOut: 50,
					cacheWrites: 0,
					cacheReads: 0,
					totalCost: 0.01,
				},
			]

			act(() => {
				result.current.setTaskHistory(originalHistory)
			})

			const retrievedHistory = result.current.taskHistory

			// Modifying retrieved history should not affect internal state
			const newHistory = [...retrievedHistory]
			newHistory[0] = {
				...newHistory[0],
				task: "Modified task",
			}

			// Original should remain unchanged in context
			expect(result.current.taskHistory[0].task).toBe("Original task")
		})
	})

	describe("Empty State Handling", () => {
		it("should handle clearing messages", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const messages: ClineMessage[] = [
				{
					ts: Date.now(),
					type: "say",
					say: "test",
					text: "Test message",
				},
			]

			act(() => {
				result.current.setClineMessages(messages)
			})

			expect(result.current.clineMessages).toHaveLength(1)

			act(() => {
				result.current.setClineMessages([])
			})

			expect(result.current.clineMessages).toEqual([])
		})

		it("should handle clearing history", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const history: HistoryItem[] = [
				{
					id: "task-1",
					ts: Date.now(),
					task: "Test task",
					tokensIn: 100,
					tokensOut: 50,
					cacheWrites: 0,
					cacheReads: 0,
					totalCost: 0.01,
				},
			]

			act(() => {
				result.current.setTaskHistory(history)
			})

			expect(result.current.taskHistory).toHaveLength(1)

			act(() => {
				result.current.setTaskHistory([])
			})

			expect(result.current.taskHistory).toEqual([])
		})

		it("should handle clearing currentTaskId", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			act(() => {
				result.current.setCurrentTaskId("task-123")
			})

			expect(result.current.currentTaskId).toBe("task-123")

			act(() => {
				result.current.setCurrentTaskId(undefined)
			})

			expect(result.current.currentTaskId).toBeUndefined()
		})
	})

	describe("Complex State Updates", () => {
		it("should handle updating multiple state properties", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const messages: ClineMessage[] = [
				{
					ts: Date.now(),
					type: "say",
					say: "test",
					text: "Test message",
				},
			]

			const history: HistoryItem[] = [
				{
					id: "task-1",
					ts: Date.now(),
					task: "Test task",
					tokensIn: 100,
					tokensOut: 50,
					cacheWrites: 0,
					cacheReads: 0,
					totalCost: 0.01,
				},
			]

			act(() => {
				result.current.setClineMessages(messages)
				result.current.setTaskHistory(history)
				result.current.setCurrentTaskId("task-1")
				result.current.setTotalTasksSize(2048)
			})

			expect(result.current.clineMessages).toEqual(messages)
			expect(result.current.taskHistory).toEqual(history)
			expect(result.current.currentTaskId).toBe("task-1")
			expect(result.current.totalTasksSize).toBe(2048)
		})

		it("should handle large message arrays", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const largeMessageArray: ClineMessage[] = Array.from({ length: 100 }, (_, i) => ({
				ts: Date.now() + i,
				type: "say" as const,
				say: "test" as const,
				text: `Message ${i}`,
			}))

			act(() => {
				result.current.setClineMessages(largeMessageArray)
			})

			expect(result.current.clineMessages).toHaveLength(100)
			expect(result.current.clineMessages[0].text).toBe("Message 0")
			expect(result.current.clineMessages[99].text).toBe("Message 99")
		})

		it("should handle large history arrays", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const largeHistoryArray: HistoryItem[] = Array.from({ length: 50 }, (_, i) => ({
				id: `task-${i}`,
				ts: Date.now() + i * 1000,
				task: `Task ${i}`,
				tokensIn: 100 + i,
				tokensOut: 50 + i,
				cacheWrites: 0,
				cacheReads: 0,
				totalCost: 0.01 * (i + 1),
			}))

			act(() => {
				result.current.setTaskHistory(largeHistoryArray)
			})

			expect(result.current.taskHistory).toHaveLength(50)
			expect(result.current.taskHistory[0].task).toBe("Task 0")
			expect(result.current.taskHistory[49].task).toBe("Task 49")
		})
	})

	describe("Message Type Variations", () => {
		it("should handle different message types", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const messages: ClineMessage[] = [
				{
					ts: Date.now(),
					type: "say",
					say: "task",
					text: "Task message",
				},
				{
					ts: Date.now() + 1000,
					type: "ask",
					ask: "completion_result",
					text: "Ask message",
				},
				{
					ts: Date.now() + 2000,
					type: "say",
					say: "error",
					text: "Error message",
				},
			]

			act(() => {
				result.current.setClineMessages(messages)
			})

			expect(result.current.clineMessages).toHaveLength(3)
			expect(result.current.clineMessages[0].type).toBe("say")
			expect(result.current.clineMessages[1].type).toBe("ask")
			expect(result.current.clineMessages[2].type).toBe("say")
		})
	})

	describe("Task History Variations", () => {
		it("should handle history items with different token counts", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			const history: HistoryItem[] = [
				{
					id: "task-1",
					ts: Date.now(),
					task: "Small task",
					tokensIn: 10,
					tokensOut: 5,
					cacheWrites: 0,
					cacheReads: 0,
					totalCost: 0.001,
				},
				{
					id: "task-2",
					ts: Date.now() + 1000,
					task: "Large task",
					tokensIn: 10000,
					tokensOut: 5000,
					cacheWrites: 1000,
					cacheReads: 500,
					totalCost: 1.5,
				},
			]

			act(() => {
				result.current.setTaskHistory(history)
			})

			expect(result.current.taskHistory).toHaveLength(2)
			expect(result.current.taskHistory[0].tokensIn).toBe(10)
			expect(result.current.taskHistory[1].tokensIn).toBe(10000)
		})
	})

	describe("Performance Considerations", () => {
		it("should handle rapid state updates", () => {
			const { result } = renderHook(() => useTaskState(), {
				wrapper: TaskStateContextProvider,
			})

			act(() => {
				for (let i = 0; i < 10; i++) {
					result.current.setClineMessages([
						{
							ts: Date.now() + i,
							type: "say",
							say: "test",
							text: `Update ${i}`,
						},
					])
				}
			})

			expect(result.current.clineMessages).toHaveLength(1)
			expect(result.current.clineMessages[0].text).toBe("Update 9")
		})
	})
})
