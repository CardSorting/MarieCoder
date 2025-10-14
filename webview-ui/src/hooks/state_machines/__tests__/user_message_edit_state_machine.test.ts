/**
 * User Message Edit State Machine Tests
 *
 * Tests for the user message editing state machine
 */

import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useStateMachine } from "../../use_state_machine"
import {
	canCancel,
	canSave,
	createUserMessageEditStateMachine,
	getEditStatus,
	getKeyboardShortcuts,
	getRestoreDelay,
	type UserMessageEditContext,
} from "../user_message_edit_state_machine"

describe("UserMessageEdit State Machine", () => {
	describe("Initial State", () => {
		it("should start in viewing state", () => {
			const config = createUserMessageEditStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			expect(result.current.state.value).toBe("viewing")
			expect(result.current.state.context.isDirty).toBe(false)
		})

		it("should initialize with custom context", () => {
			const customContext: Partial<UserMessageEditContext> = {
				originalText: "Hello world",
				canRestore: false,
			}
			const config = createUserMessageEditStateMachine(customContext)
			const { result } = renderHook(() => useStateMachine(config))

			expect(result.current.state.context.originalText).toBe("Hello world")
			expect(result.current.state.context.canRestore).toBe(false)
		})
	})

	describe("State Transitions", () => {
		it("should transition from viewing to editing on START_EDIT", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			expect(result.current.state.value).toBe("editing")
			expect(result.current.state.context.editedText).toBe("Original text")
			expect(result.current.state.context.isDirty).toBe(false)
		})

		it("should update text while editing", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			expect(result.current.state.value).toBe("editing")
			expect(result.current.state.context.editedText).toBe("Modified text")
			expect(result.current.state.context.isDirty).toBe(true)
		})

		it("should transition to confirming on KEY_ENTER when text has changed", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			act(() => {
				result.current.send({ type: "KEY_ENTER" })
			})

			expect(result.current.state.value).toBe("confirming")
		})

		it("should not transition to confirming on KEY_ENTER when text has not changed", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({ type: "KEY_ENTER" })
			})

			expect(result.current.state.value).toBe("editing")
		})

		it("should reset to viewing on KEY_ESCAPE from editing", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			act(() => {
				result.current.send({ type: "KEY_ESCAPE" })
			})

			expect(result.current.state.value).toBe("viewing")
			expect(result.current.state.context.editedText).toBe("Original text")
			expect(result.current.state.context.isDirty).toBe(false)
		})

		it("should reset to viewing on CANCEL_EDIT", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			act(() => {
				result.current.send({ type: "CANCEL_EDIT" })
			})

			expect(result.current.state.value).toBe("viewing")
			expect(result.current.state.context.editedText).toBe("Original text")
		})

		it("should handle BLUR event and cancel edit when not focused on button", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			act(() => {
				result.current.send({
					type: "BLUR",
					payload: { relatedTarget: null },
				})
			})

			expect(result.current.state.value).toBe("viewing")
			expect(result.current.state.context.editedText).toBe("Original text")
		})

		it("should not cancel edit on BLUR when focus moves to button", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			const button = document.createElement("button")
			act(() => {
				result.current.send({
					type: "BLUR",
					payload: { relatedTarget: button },
				})
			})

			expect(result.current.state.value).toBe("editing")
		})
	})

	describe("Restore Flow", () => {
		it("should transition from confirming to restoring on CONFIRM_RESTORE when canRestore is true", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
				canRestore: true,
				messageTs: 12345,
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			act(() => {
				result.current.send({ type: "KEY_ENTER" })
			})

			act(() => {
				result.current.send({
					type: "CONFIRM_RESTORE",
					payload: { restoreType: "task" },
				})
			})

			expect(result.current.state.value).toBe("restoring")
			expect(result.current.state.context.restoreType).toBe("task")
		})

		it("should not transition to restoring when canRestore is false", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
				canRestore: false,
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			act(() => {
				result.current.send({ type: "KEY_ENTER" })
			})

			act(() => {
				result.current.send({
					type: "CONFIRM_RESTORE",
					payload: { restoreType: "task" },
				})
			})

			expect(result.current.state.value).toBe("confirming")
		})

		it("should transition to restored on RESTORE_SUCCESS", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
				canRestore: true,
				messageTs: 12345,
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			act(() => {
				result.current.send({ type: "KEY_ENTER" })
			})

			act(() => {
				result.current.send({
					type: "CONFIRM_RESTORE",
					payload: { restoreType: "task" },
				})
			})

			act(() => {
				result.current.send({ type: "RESTORE_SUCCESS" })
			})

			expect(result.current.state.value).toBe("restored")
		})

		it("should transition to error on RESTORE_ERROR", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
				canRestore: true,
				messageTs: 12345,
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			act(() => {
				result.current.send({ type: "KEY_ENTER" })
			})

			act(() => {
				result.current.send({
					type: "CONFIRM_RESTORE",
					payload: { restoreType: "task" },
				})
			})

			act(() => {
				result.current.send({
					type: "RESTORE_ERROR",
					payload: { error: "Failed to restore" },
				})
			})

			expect(result.current.state.value).toBe("error")
			expect(result.current.state.context.errorMessage).toBe("Failed to restore")
		})

		it("should transition from restored to viewing on COMPLETED", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
				canRestore: true,
				messageTs: 12345,
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			act(() => {
				result.current.send({ type: "KEY_ENTER" })
			})

			act(() => {
				result.current.send({
					type: "CONFIRM_RESTORE",
					payload: { restoreType: "task" },
				})
			})

			act(() => {
				result.current.send({ type: "RESTORE_SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "COMPLETED" })
			})

			expect(result.current.state.value).toBe("viewing")
		})

		it("should allow retry from error state", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
				canRestore: true,
				messageTs: 12345,
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			act(() => {
				result.current.send({ type: "KEY_ENTER" })
			})

			act(() => {
				result.current.send({
					type: "CONFIRM_RESTORE",
					payload: { restoreType: "task" },
				})
			})

			act(() => {
				result.current.send({
					type: "RESTORE_ERROR",
					payload: { error: "Failed to restore" },
				})
			})

			expect(result.current.state.value).toBe("error")

			act(() => {
				result.current.send({
					type: "CONFIRM_RESTORE",
					payload: { restoreType: "taskAndWorkspace" },
				})
			})

			expect(result.current.state.value).toBe("restoring")
			expect(result.current.state.context.errorMessage).toBeUndefined()
			expect(result.current.state.context.restoreType).toBe("taskAndWorkspace")
		})

		it("should allow going back to editing from error state", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
				canRestore: true,
				messageTs: 12345,
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			act(() => {
				result.current.send({ type: "KEY_ENTER" })
			})

			act(() => {
				result.current.send({
					type: "CONFIRM_RESTORE",
					payload: { restoreType: "task" },
				})
			})

			act(() => {
				result.current.send({
					type: "RESTORE_ERROR",
					payload: { error: "Failed to restore" },
				})
			})

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			expect(result.current.state.value).toBe("editing")
			expect(result.current.state.context.errorMessage).toBeUndefined()
		})

		it("should go back to editing from confirming on KEY_ESCAPE", () => {
			const config = createUserMessageEditStateMachine({
				originalText: "Original text",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "START_EDIT" })
			})

			act(() => {
				result.current.send({
					type: "TEXT_CHANGED",
					payload: { text: "Modified text" },
				})
			})

			act(() => {
				result.current.send({ type: "KEY_ENTER" })
			})

			expect(result.current.state.value).toBe("confirming")

			act(() => {
				result.current.send({ type: "KEY_ESCAPE" })
			})

			expect(result.current.state.value).toBe("editing")
		})
	})

	describe("Helper Functions", () => {
		describe("getEditStatus", () => {
			it("should return correct status for viewing state", () => {
				const context: UserMessageEditContext = {
					originalText: "",
					editedText: "",
					isDirty: false,
					canRestore: true,
					images: [],
					files: [],
				}
				expect(getEditStatus("viewing", context)).toBe("Click to edit")
			})

			it("should return correct status for editing state with changes", () => {
				const context: UserMessageEditContext = {
					originalText: "Original",
					editedText: "Modified",
					isDirty: true,
					canRestore: true,
					images: [],
					files: [],
				}
				expect(getEditStatus("editing", context)).toBe("Editing (unsaved changes)")
			})

			it("should return correct status for editing state without changes", () => {
				const context: UserMessageEditContext = {
					originalText: "Original",
					editedText: "Original",
					isDirty: false,
					canRestore: true,
					images: [],
					files: [],
				}
				expect(getEditStatus("editing", context)).toBe("Editing")
			})

			it("should return correct status for error state", () => {
				const context: UserMessageEditContext = {
					originalText: "",
					editedText: "",
					isDirty: false,
					canRestore: true,
					errorMessage: "Something went wrong",
					images: [],
					files: [],
				}
				expect(getEditStatus("error", context)).toBe("Something went wrong")
			})
		})

		describe("getKeyboardShortcuts", () => {
			it("should return shortcuts for editing state", () => {
				const shortcuts = getKeyboardShortcuts("editing")
				expect(shortcuts).toHaveProperty("Escape")
				expect(shortcuts).toHaveProperty("Enter")
			})

			it("should return shortcuts for confirming state", () => {
				const shortcuts = getKeyboardShortcuts("confirming")
				expect(shortcuts).toHaveProperty("Escape")
			})

			it("should return empty object for viewing state", () => {
				const shortcuts = getKeyboardShortcuts("viewing")
				expect(shortcuts).toEqual({})
			})
		})

		describe("canSave", () => {
			it("should return true when editing and dirty", () => {
				const context: UserMessageEditContext = {
					originalText: "Original",
					editedText: "Modified",
					isDirty: true,
					canRestore: true,
					images: [],
					files: [],
				}
				expect(canSave("editing", context)).toBe(true)
			})

			it("should return false when editing but not dirty", () => {
				const context: UserMessageEditContext = {
					originalText: "Original",
					editedText: "Original",
					isDirty: false,
					canRestore: true,
					images: [],
					files: [],
				}
				expect(canSave("editing", context)).toBe(false)
			})

			it("should return false when not editing", () => {
				const context: UserMessageEditContext = {
					originalText: "Original",
					editedText: "Modified",
					isDirty: true,
					canRestore: true,
					images: [],
					files: [],
				}
				expect(canSave("viewing", context)).toBe(false)
			})
		})

		describe("canCancel", () => {
			it("should return true for editing state", () => {
				expect(canCancel("editing")).toBe(true)
			})

			it("should return true for confirming state", () => {
				expect(canCancel("confirming")).toBe(true)
			})

			it("should return false for viewing state", () => {
				expect(canCancel("viewing")).toBe(false)
			})
		})

		describe("getRestoreDelay", () => {
			it("should return 500ms for task restore", () => {
				expect(getRestoreDelay("task")).toBe(500)
			})

			it("should return 1000ms for taskAndWorkspace restore", () => {
				expect(getRestoreDelay("taskAndWorkspace")).toBe(1000)
			})

			it("should return 0ms for undefined restore type", () => {
				expect(getRestoreDelay(undefined)).toBe(0)
			})
		})
	})
})
