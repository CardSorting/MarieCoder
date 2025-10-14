/**
 * Tests for Chat Message State Machine
 *
 * Validates the chat message flow state machine functionality including:
 * - Initial state and context
 * - State transitions
 * - Guards and actions
 * - Helper functions
 */

import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useStateMachine } from "../../use_state_machine"
import {
	type ChatMessageContext,
	canSendMessage,
	createChatMessageStateMachine,
	getChatMessageStatus,
	getElapsedTime,
	isBusy,
} from "../chat_message_state_machine"

describe("ChatMessageStateMachine", () => {
	describe("Initial State", () => {
		it("should start in idle state with default context", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			expect(result.current.state.value).toBe("idle")
			expect(result.current.state.context.messageText).toBe("")
			expect(result.current.state.context.images).toEqual([])
			expect(result.current.state.context.files).toEqual([])
			expect(result.current.state.context.isNewTask).toBe(false)
			expect(result.current.state.context.retryCount).toBe(0)
			expect(result.current.state.context.errorMessage).toBeUndefined()
		})

		it("should accept initial context overrides", () => {
			const initialContext: Partial<ChatMessageContext> = {
				messageText: "Hello",
				images: ["image1.png"],
				files: ["file1.ts"],
				isNewTask: true,
			}

			const config = createChatMessageStateMachine(initialContext)
			const { result } = renderHook(() => useStateMachine(config))

			expect(result.current.state.context.messageText).toBe("Hello")
			expect(result.current.state.context.images).toEqual(["image1.png"])
			expect(result.current.state.context.files).toEqual(["file1.ts"])
			expect(result.current.state.context.isNewTask).toBe(true)
		})
	})

	describe("State Transitions - Happy Path", () => {
		it("should transition from idle to validating on SEND event", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			expect(result.current.state.value).toBe("validating")
			expect(result.current.state.context.messageText).toBe("Test message")
			expect(result.current.state.context.sentAt).toBeDefined()
		})

		it("should transition from validating to sending on VALIDATION_SUCCESS with content", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			expect(result.current.state.value).toBe("sending")
		})

		it("should transition from sending to waiting on SENT_SUCCESS", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "SENT_SUCCESS" })
			})

			expect(result.current.state.value).toBe("waiting")
		})

		it("should transition from waiting to streaming on STREAMING_STARTED", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "SENT_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "STREAMING_STARTED" })
			})

			expect(result.current.state.value).toBe("streaming")
			expect(result.current.state.context.streamingStartedAt).toBeDefined()
		})

		it("should stay in streaming state on STREAMING_CHUNK", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "SENT_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "STREAMING_STARTED" })
			})

			act(() => {
				result.current.send({ type: "STREAMING_CHUNK", payload: { chunk: "Hello" } })
			})

			expect(result.current.state.value).toBe("streaming")
		})

		it("should transition from streaming to complete on STREAMING_COMPLETE", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "SENT_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "STREAMING_STARTED" })
			})

			act(() => {
				result.current.send({ type: "STREAMING_COMPLETE" })
			})

			expect(result.current.state.value).toBe("complete")
		})

		it("should transition from complete back to idle on RESET", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "SENT_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "STREAMING_STARTED" })
			})

			act(() => {
				result.current.send({ type: "STREAMING_COMPLETE" })
			})

			act(() => {
				result.current.send({ type: "RESET" })
			})

			expect(result.current.state.value).toBe("idle")
			expect(result.current.state.context.messageText).toBe("")
			expect(result.current.state.context.errorMessage).toBeUndefined()
		})
	})

	describe("Error Handling", () => {
		it("should transition to error on VALIDATION_FAILED", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({
					type: "VALIDATION_FAILED",
					payload: { error: "Message too long" },
				})
			})

			expect(result.current.state.value).toBe("error")
			expect(result.current.state.context.errorMessage).toBe("Message too long")
		})

		it("should transition to error on SENT_FAILED", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			act(() => {
				result.current.send({
					type: "SENT_FAILED",
					payload: { error: "Network error" },
				})
			})

			expect(result.current.state.value).toBe("error")
			expect(result.current.state.context.errorMessage).toBe("Network error")
		})

		it("should transition to error on ERROR during waiting", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "SENT_SUCCESS" })
			})

			act(() => {
				result.current.send({
					type: "ERROR",
					payload: { error: "Connection lost" },
				})
			})

			expect(result.current.state.value).toBe("error")
			expect(result.current.state.context.errorMessage).toBe("Connection lost")
		})

		it("should transition to error on ERROR during streaming", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "SENT_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "STREAMING_STARTED" })
			})

			act(() => {
				result.current.send({
					type: "ERROR",
					payload: { error: "Streaming interrupted" },
				})
			})

			expect(result.current.state.value).toBe("error")
			expect(result.current.state.context.errorMessage).toBe("Streaming interrupted")
		})

		it("should reset from error to idle on RESET", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({
					type: "VALIDATION_FAILED",
					payload: { error: "Validation error" },
				})
			})

			act(() => {
				result.current.send({ type: "RESET" })
			})

			expect(result.current.state.value).toBe("idle")
			expect(result.current.state.context.errorMessage).toBeUndefined()
			expect(result.current.state.context.messageText).toBe("")
		})
	})

	describe("Retry Logic", () => {
		it("should retry from error state and increment retry count", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			act(() => {
				result.current.send({
					type: "SENT_FAILED",
					payload: { error: "Network error" },
				})
			})

			expect(result.current.state.context.retryCount).toBe(0)

			act(() => {
				result.current.send({ type: "RETRY" })
			})

			expect(result.current.state.value).toBe("sending")
			expect(result.current.state.context.retryCount).toBe(1)
		})

		it("should block retry after 3 attempts", () => {
			const config = createChatMessageStateMachine({ retryCount: 3 })
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test message", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			act(() => {
				result.current.send({
					type: "SENT_FAILED",
					payload: { error: "Network error" },
				})
			})

			act(() => {
				result.current.send({ type: "RETRY" })
			})

			// Should stay in error state because retry count is 3
			expect(result.current.state.value).toBe("error")
			expect(result.current.state.context.retryCount).toBe(3)
		})
	})

	describe("Guards", () => {
		it("should block VALIDATION_SUCCESS if no content (empty message)", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			// Should stay in validating state because no content
			expect(result.current.state.value).toBe("validating")
		})

		it("should allow VALIDATION_SUCCESS with text content", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Hello", images: [], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			expect(result.current.state.value).toBe("sending")
		})

		it("should allow VALIDATION_SUCCESS with images", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "", images: ["image1.png"], files: [] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			expect(result.current.state.value).toBe("sending")
		})

		it("should allow VALIDATION_SUCCESS with files", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "", images: [], files: ["file1.ts"] },
				})
			})

			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})

			expect(result.current.state.value).toBe("sending")
		})
	})

	describe("Helper Functions", () => {
		describe("getChatMessageStatus", () => {
			it("should return correct status for idle state", () => {
				const context: ChatMessageContext = {
					messageText: "",
					images: [],
					files: [],
					isNewTask: false,
					retryCount: 0,
				}
				expect(getChatMessageStatus("idle", context)).toBe("Ready to send")
			})

			it("should return correct status for validating state", () => {
				const context: ChatMessageContext = {
					messageText: "Test",
					images: [],
					files: [],
					isNewTask: false,
					retryCount: 0,
				}
				expect(getChatMessageStatus("validating", context)).toBe("Validating message...")
			})

			it("should return correct status for sending state", () => {
				const context: ChatMessageContext = {
					messageText: "Test",
					images: [],
					files: [],
					isNewTask: false,
					retryCount: 0,
				}
				expect(getChatMessageStatus("sending", context)).toBe("Sending message...")
			})

			it("should return correct status for waiting state", () => {
				const context: ChatMessageContext = {
					messageText: "Test",
					images: [],
					files: [],
					isNewTask: false,
					retryCount: 0,
				}
				expect(getChatMessageStatus("waiting", context)).toBe("Waiting for response...")
			})

			it("should return correct status for streaming state", () => {
				const context: ChatMessageContext = {
					messageText: "Test",
					images: [],
					files: [],
					isNewTask: false,
					retryCount: 0,
				}
				expect(getChatMessageStatus("streaming", context)).toBe("Receiving response...")
			})

			it("should return correct status for complete state", () => {
				const context: ChatMessageContext = {
					messageText: "Test",
					images: [],
					files: [],
					isNewTask: false,
					retryCount: 0,
				}
				expect(getChatMessageStatus("complete", context)).toBe("Complete")
			})

			it("should return error message for error state", () => {
				const context: ChatMessageContext = {
					messageText: "Test",
					images: [],
					files: [],
					isNewTask: false,
					retryCount: 0,
					errorMessage: "Network error",
				}
				expect(getChatMessageStatus("error", context)).toBe("Network error")
			})

			it("should return default error for error state without message", () => {
				const context: ChatMessageContext = {
					messageText: "Test",
					images: [],
					files: [],
					isNewTask: false,
					retryCount: 0,
				}
				expect(getChatMessageStatus("error", context)).toBe("An error occurred")
			})
		})

		describe("getElapsedTime", () => {
			it("should return undefined if no timestamp", () => {
				const context: ChatMessageContext = {
					messageText: "",
					images: [],
					files: [],
					isNewTask: false,
					retryCount: 0,
				}
				expect(getElapsedTime("idle", context)).toBeUndefined()
			})

			it("should calculate elapsed time from sentAt", () => {
				const now = Date.now()
				const context: ChatMessageContext = {
					messageText: "",
					images: [],
					files: [],
					isNewTask: false,
					retryCount: 0,
					sentAt: now - 1000, // 1 second ago
				}
				const elapsed = getElapsedTime("sending", context)
				expect(elapsed).toBeGreaterThanOrEqual(1000)
			})

			it("should calculate elapsed time from streamingStartedAt in streaming state", () => {
				const now = Date.now()
				const context: ChatMessageContext = {
					messageText: "",
					images: [],
					files: [],
					isNewTask: false,
					retryCount: 0,
					sentAt: now - 5000,
					streamingStartedAt: now - 2000, // 2 seconds ago
				}
				const elapsed = getElapsedTime("streaming", context)
				expect(elapsed).toBeGreaterThanOrEqual(2000)
			})
		})

		describe("isBusy", () => {
			it("should return true for validating state", () => {
				expect(isBusy("validating")).toBe(true)
			})

			it("should return true for sending state", () => {
				expect(isBusy("sending")).toBe(true)
			})

			it("should return true for waiting state", () => {
				expect(isBusy("waiting")).toBe(true)
			})

			it("should return true for streaming state", () => {
				expect(isBusy("streaming")).toBe(true)
			})

			it("should return false for idle state", () => {
				expect(isBusy("idle")).toBe(false)
			})

			it("should return false for complete state", () => {
				expect(isBusy("complete")).toBe(false)
			})

			it("should return false for error state", () => {
				expect(isBusy("error")).toBe(false)
			})
		})

		describe("canSendMessage", () => {
			it("should return true for idle state", () => {
				expect(canSendMessage("idle")).toBe(true)
			})

			it("should return true for complete state", () => {
				expect(canSendMessage("complete")).toBe(true)
			})

			it("should return true for error state", () => {
				expect(canSendMessage("error")).toBe(true)
			})

			it("should return false for validating state", () => {
				expect(canSendMessage("validating")).toBe(false)
			})

			it("should return false for sending state", () => {
				expect(canSendMessage("sending")).toBe(false)
			})

			it("should return false for waiting state", () => {
				expect(canSendMessage("waiting")).toBe(false)
			})

			it("should return false for streaming state", () => {
				expect(canSendMessage("streaming")).toBe(false)
			})
		})
	})

	describe("Message Content Handling", () => {
		it("should handle message with text only", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Hello world", images: [], files: [] },
				})
			})

			expect(result.current.state.context.messageText).toBe("Hello world")
			expect(result.current.state.context.images).toEqual([])
			expect(result.current.state.context.files).toEqual([])
		})

		it("should handle message with images", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: {
						text: "Check this out",
						images: ["img1.png", "img2.jpg"],
						files: [],
					},
				})
			})

			expect(result.current.state.context.images).toEqual(["img1.png", "img2.jpg"])
		})

		it("should handle message with files", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: {
						text: "Here are the files",
						images: [],
						files: ["file1.ts", "file2.tsx"],
					},
				})
			})

			expect(result.current.state.context.files).toEqual(["file1.ts", "file2.tsx"])
		})

		it("should handle message with text, images, and files", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "SEND",
					payload: {
						text: "Complete message",
						images: ["screenshot.png"],
						files: ["code.ts"],
					},
				})
			})

			expect(result.current.state.context.messageText).toBe("Complete message")
			expect(result.current.state.context.images).toEqual(["screenshot.png"])
			expect(result.current.state.context.files).toEqual(["code.ts"])
		})
	})

	describe("Complete Flow Integration", () => {
		it("should handle complete message flow from idle to complete", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			// Start
			expect(result.current.state.value).toBe("idle")

			// Send message
			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Hello", images: [], files: [] },
				})
			})
			expect(result.current.state.value).toBe("validating")

			// Validate
			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})
			expect(result.current.state.value).toBe("sending")

			// Send success
			act(() => {
				result.current.send({ type: "SENT_SUCCESS" })
			})
			expect(result.current.state.value).toBe("waiting")

			// Start streaming
			act(() => {
				result.current.send({ type: "STREAMING_STARTED" })
			})
			expect(result.current.state.value).toBe("streaming")

			// Complete streaming
			act(() => {
				result.current.send({ type: "STREAMING_COMPLETE" })
			})
			expect(result.current.state.value).toBe("complete")
		})

		it("should handle sending new message from complete state", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			// Complete first message
			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "First", images: [], files: [] },
				})
			})
			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})
			act(() => {
				result.current.send({ type: "SENT_SUCCESS" })
			})
			act(() => {
				result.current.send({ type: "STREAMING_STARTED" })
			})
			act(() => {
				result.current.send({ type: "STREAMING_COMPLETE" })
			})

			// Send second message directly from complete
			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Second", images: [], files: [] },
				})
			})

			expect(result.current.state.value).toBe("validating")
			expect(result.current.state.context.messageText).toBe("Second")
		})

		it("should handle error recovery flow", () => {
			const config = createChatMessageStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			// Error during sending
			act(() => {
				result.current.send({
					type: "SEND",
					payload: { text: "Test", images: [], files: [] },
				})
			})
			act(() => {
				result.current.send({ type: "VALIDATION_SUCCESS" })
			})
			act(() => {
				result.current.send({
					type: "SENT_FAILED",
					payload: { error: "Network error" },
				})
			})

			expect(result.current.state.value).toBe("error")

			// Retry
			act(() => {
				result.current.send({ type: "RETRY" })
			})

			expect(result.current.state.value).toBe("sending")

			// Success after retry
			act(() => {
				result.current.send({ type: "SENT_SUCCESS" })
			})
			act(() => {
				result.current.send({ type: "STREAMING_STARTED" })
			})
			act(() => {
				result.current.send({ type: "STREAMING_COMPLETE" })
			})

			expect(result.current.state.value).toBe("complete")
		})
	})
})
