/**
 * Tests for Action Buttons State Machine
 *
 * Validates the action buttons state machine functionality including:
 * - Initial state and context
 * - State transitions for button actions
 * - Guards and actions
 * - Helper functions
 */

import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useStateMachine } from "../../use_state_machine"
import {
	type ActionButtonsContext,
	canClickButtons,
	createActionButtonsStateMachine,
	getActionIcon,
	getButtonStatus,
	getButtonText,
	getButtonVariant,
	getElapsedTime,
	isProcessing,
	shouldAutoReset,
	shouldShowButtons,
} from "../action_buttons_state_machine"

describe("ActionButtonsStateMachine", () => {
	describe("Initial State", () => {
		it("should start in idle state with default context", () => {
			const config = createActionButtonsStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			expect(result.current.state.value).toBe("idle")
			expect(result.current.state.context.isEnabled).toBe(true)
			expect(result.current.state.context.sendingDisabled).toBe(false)
			expect(result.current.state.context.autoResetTimeout).toBe(2000)
			expect(result.current.state.context.currentAction).toBeUndefined()
		})

		it("should accept initial context overrides", () => {
			const initialContext: Partial<ActionButtonsContext> = {
				isEnabled: false,
				sendingDisabled: true,
				primaryButtonText: "Approve",
				secondaryButtonText: "Reject",
				autoResetTimeout: 5000,
			}

			const config = createActionButtonsStateMachine(initialContext)
			const { result } = renderHook(() => useStateMachine(config))

			expect(result.current.state.context.isEnabled).toBe(false)
			expect(result.current.state.context.sendingDisabled).toBe(true)
			expect(result.current.state.context.primaryButtonText).toBe("Approve")
			expect(result.current.state.context.secondaryButtonText).toBe("Reject")
			expect(result.current.state.context.autoResetTimeout).toBe(5000)
		})
	})

	describe("State Transitions - Button Clicks", () => {
		it("should transition from idle to processing on CLICK_PRIMARY with primary button", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			expect(result.current.state.value).toBe("processing")
			expect(result.current.state.context.currentAction).toBe("proceed")
			expect(result.current.state.context.actionStartTime).toBeDefined()
		})

		it("should not transition on CLICK_PRIMARY without primary button", () => {
			const config = createActionButtonsStateMachine({
				secondaryButtonText: "Reject",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			// Should stay in idle because no primary button
			expect(result.current.state.value).toBe("idle")
		})

		it("should transition from idle to processing on CLICK_SECONDARY with secondary button", () => {
			const config = createActionButtonsStateMachine({
				secondaryButtonText: "Reject",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_SECONDARY" })
			})

			expect(result.current.state.value).toBe("processing")
			expect(result.current.state.context.currentAction).toBe("reject")
		})

		it("should not transition on CLICK_SECONDARY without secondary button", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_SECONDARY" })
			})

			// Should stay in idle because no secondary button
			expect(result.current.state.value).toBe("idle")
		})

		it("should transition on CLICK_ACTION with custom action", () => {
			const config = createActionButtonsStateMachine({
				isEnabled: true,
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "CLICK_ACTION",
					payload: { action: "retry" },
				})
			})

			expect(result.current.state.value).toBe("processing")
			expect(result.current.state.context.currentAction).toBe("retry")
		})

		it("should not transition when buttons are disabled", () => {
			const config = createActionButtonsStateMachine({
				isEnabled: false,
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			// Should stay in idle because buttons disabled
			expect(result.current.state.value).toBe("idle")
		})

		it("should not transition when sending is disabled", () => {
			const config = createActionButtonsStateMachine({
				sendingDisabled: true,
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			// Should stay in idle because sending disabled
			expect(result.current.state.value).toBe("idle")
		})

		it("should not allow click while processing", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			expect(result.current.state.value).toBe("processing")

			// Try to click again while processing
			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			// Should stay in processing, preventing double-click
			expect(result.current.state.value).toBe("processing")
		})
	})

	describe("State Transitions - Success Flow", () => {
		it("should transition from processing to success on SUCCESS", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			act(() => {
				result.current.send({ type: "SUCCESS" })
			})

			expect(result.current.state.value).toBe("success")
			expect(result.current.state.context.errorMessage).toBeUndefined()
		})

		it("should store success message", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			act(() => {
				result.current.send({
					type: "SUCCESS",
					payload: { message: "Operation completed" },
				})
			})

			expect(result.current.state.context.successMessage).toBe("Operation completed")
		})

		it("should transition from success to idle on RESET", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			act(() => {
				result.current.send({ type: "SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "RESET" })
			})

			expect(result.current.state.value).toBe("idle")
			expect(result.current.state.context.currentAction).toBeUndefined()
			expect(result.current.state.context.successMessage).toBeUndefined()
		})

		it("should transition from success to idle on AUTO_RESET", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			act(() => {
				result.current.send({ type: "SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "AUTO_RESET" })
			})

			expect(result.current.state.value).toBe("idle")
		})
	})

	describe("State Transitions - Error Flow", () => {
		it("should transition from processing to error on ERROR", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			act(() => {
				result.current.send({
					type: "ERROR",
					payload: { error: "Action failed" },
				})
			})

			expect(result.current.state.value).toBe("error")
			expect(result.current.state.context.errorMessage).toBe("Action failed")
		})

		it("should recover from error on RESET", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			act(() => {
				result.current.send({
					type: "ERROR",
					payload: { error: "Action failed" },
				})
			})

			act(() => {
				result.current.send({ type: "RESET" })
			})

			expect(result.current.state.value).toBe("idle")
			expect(result.current.state.context.errorMessage).toBeUndefined()
		})

		it("should allow retry from error state", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			act(() => {
				result.current.send({
					type: "ERROR",
					payload: { error: "Action failed" },
				})
			})

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			expect(result.current.state.value).toBe("processing")
		})
	})

	describe("State Transitions - Disabled State", () => {
		it("should transition from idle to disabled on DISABLE", () => {
			const config = createActionButtonsStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "DISABLE" })
			})

			expect(result.current.state.value).toBe("disabled")
		})

		it("should transition from processing to disabled on DISABLE", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			act(() => {
				result.current.send({ type: "DISABLE" })
			})

			expect(result.current.state.value).toBe("disabled")
		})

		it("should transition from success to disabled on DISABLE", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Proceed",
			})
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})

			act(() => {
				result.current.send({ type: "SUCCESS" })
			})

			act(() => {
				result.current.send({ type: "DISABLE" })
			})

			expect(result.current.state.value).toBe("disabled")
		})

		it("should transition from disabled to idle on ENABLE", () => {
			const config = createActionButtonsStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "DISABLE" })
			})

			act(() => {
				result.current.send({ type: "ENABLE" })
			})

			expect(result.current.state.value).toBe("idle")
		})
	})

	describe("Configuration Updates", () => {
		it("should update primary button text", () => {
			const config = createActionButtonsStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "UPDATE_CONFIG",
					payload: { primary: "Approve" },
				})
			})

			expect(result.current.state.context.primaryButtonText).toBe("Approve")
		})

		it("should update secondary button text", () => {
			const config = createActionButtonsStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "UPDATE_CONFIG",
					payload: { secondary: "Deny" },
				})
			})

			expect(result.current.state.context.secondaryButtonText).toBe("Deny")
		})

		it("should update enabled state", () => {
			const config = createActionButtonsStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "UPDATE_CONFIG",
					payload: { enabled: false },
				})
			})

			expect(result.current.state.context.isEnabled).toBe(false)
		})

		it("should update multiple config properties", () => {
			const config = createActionButtonsStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({
					type: "UPDATE_CONFIG",
					payload: {
						primary: "Accept",
						secondary: "Decline",
						enabled: false,
					},
				})
			})

			expect(result.current.state.context.primaryButtonText).toBe("Accept")
			expect(result.current.state.context.secondaryButtonText).toBe("Decline")
			expect(result.current.state.context.isEnabled).toBe(false)
		})

		it("should update config while in disabled state", () => {
			const config = createActionButtonsStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			act(() => {
				result.current.send({ type: "DISABLE" })
			})

			act(() => {
				result.current.send({
					type: "UPDATE_CONFIG",
					payload: { primary: "Updated" },
				})
			})

			expect(result.current.state.value).toBe("disabled")
			expect(result.current.state.context.primaryButtonText).toBe("Updated")
		})
	})

	describe("Helper Functions", () => {
		describe("getButtonStatus", () => {
			it("should return correct status for idle state", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
				}
				expect(getButtonStatus("idle", context)).toBe("Ready")
			})

			it("should return correct status for processing state", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
				}
				expect(getButtonStatus("processing", context)).toBe("Processing...")
			})

			it("should return success message for success state", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
					successMessage: "Done!",
				}
				expect(getButtonStatus("success", context)).toBe("Done!")
			})

			it("should return default success for success state without message", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
				}
				expect(getButtonStatus("success", context)).toBe("Success!")
			})

			it("should return error message for error state", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
					errorMessage: "Failed to process",
				}
				expect(getButtonStatus("error", context)).toBe("Failed to process")
			})

			it("should return default error for error state without message", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
				}
				expect(getButtonStatus("error", context)).toBe("An error occurred")
			})

			it("should return correct status for disabled state", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
				}
				expect(getButtonStatus("disabled", context)).toBe("Waiting for response...")
			})
		})

		describe("getActionIcon", () => {
			it("should return correct icon for proceed action", () => {
				expect(getActionIcon("proceed")).toBe("✓")
			})

			it("should return correct icon for approve action", () => {
				expect(getActionIcon("approve")).toBe("✓")
			})

			it("should return correct icon for reject action", () => {
				expect(getActionIcon("reject")).toBe("✕")
			})

			it("should return correct icon for new_task action", () => {
				expect(getActionIcon("new_task")).toBe("→")
			})

			it("should return correct icon for retry action", () => {
				expect(getActionIcon("retry")).toBe("↻")
			})

			it("should return correct icon for cancel action", () => {
				expect(getActionIcon("cancel")).toBe("⏸")
			})

			it("should return default icon for unknown action", () => {
				expect(getActionIcon(undefined)).toBe("•")
			})
		})

		describe("shouldShowButtons", () => {
			it("should return true when primary button exists", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
					primaryButtonText: "Proceed",
				}
				expect(shouldShowButtons("idle", context)).toBe(true)
			})

			it("should return true when secondary button exists", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
					secondaryButtonText: "Reject",
				}
				expect(shouldShowButtons("idle", context)).toBe(true)
			})

			it("should return false when no buttons exist", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
				}
				expect(shouldShowButtons("idle", context)).toBe(false)
			})

			it("should return false when state is disabled", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
					primaryButtonText: "Proceed",
				}
				expect(shouldShowButtons("disabled", context)).toBe(false)
			})
		})

		describe("isProcessing", () => {
			it("should return true for processing state", () => {
				expect(isProcessing("processing")).toBe(true)
			})

			it("should return false for other states", () => {
				expect(isProcessing("idle")).toBe(false)
				expect(isProcessing("success")).toBe(false)
				expect(isProcessing("error")).toBe(false)
				expect(isProcessing("disabled")).toBe(false)
			})
		})

		describe("canClickButtons", () => {
			const context: ActionButtonsContext = {
				isEnabled: true,
				sendingDisabled: false,
				autoResetTimeout: 2000,
			}

			it("should return true for idle state", () => {
				expect(canClickButtons("idle", context)).toBe(true)
			})

			it("should return true for error state", () => {
				expect(canClickButtons("error", context)).toBe(true)
			})

			it("should return false for processing state", () => {
				expect(canClickButtons("processing", context)).toBe(false)
			})

			it("should return false for success state", () => {
				expect(canClickButtons("success", context)).toBe(false)
			})

			it("should return false for disabled state", () => {
				expect(canClickButtons("disabled", context)).toBe(false)
			})
		})

		describe("getElapsedTime", () => {
			it("should return undefined when no action start time", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
				}
				expect(getElapsedTime(context)).toBeUndefined()
			})

			it("should calculate elapsed time", () => {
				const now = Date.now()
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
					actionStartTime: now - 1000,
				}
				const elapsed = getElapsedTime(context)
				expect(elapsed).toBeGreaterThanOrEqual(1000)
			})
		})

		describe("getButtonVariant", () => {
			it("should return processing variant for processing state", () => {
				expect(getButtonVariant("processing")).toBe("processing")
			})

			it("should return success variant for success state", () => {
				expect(getButtonVariant("success")).toBe("success")
			})

			it("should return error variant for error state", () => {
				expect(getButtonVariant("error")).toBe("error")
			})

			it("should return default variant for other states", () => {
				expect(getButtonVariant("idle")).toBe("default")
				expect(getButtonVariant("disabled")).toBe("default")
			})
		})

		describe("shouldAutoReset", () => {
			it("should return true when in success state with timeout", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
				}
				expect(shouldAutoReset("success", context)).toBe(true)
			})

			it("should return false when not in success state", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
				}
				expect(shouldAutoReset("idle", context)).toBe(false)
			})

			it("should return false when timeout is 0", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 0,
				}
				expect(shouldAutoReset("success", context)).toBe(false)
			})
		})

		describe("getButtonText", () => {
			it("should return base text for idle state", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
					primaryButtonText: "Proceed",
				}
				expect(getButtonText("primary", "idle", context)).toBe("Proceed")
			})

			it("should return processing text for processing state", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
					primaryButtonText: "Proceed",
				}
				expect(getButtonText("primary", "processing", context)).toBe("Proceed...")
			})

			it("should return success text for success state", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
					primaryButtonText: "Proceed",
					successMessage: "Done!",
				}
				expect(getButtonText("primary", "success", context)).toBe("Done!")
			})

			it("should return default success text when no message", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
					primaryButtonText: "Proceed",
				}
				expect(getButtonText("primary", "success", context)).toBe("Proceed ✓")
			})

			it("should return retry text for error state", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
					primaryButtonText: "Proceed",
				}
				expect(getButtonText("primary", "error", context)).toBe("Proceed (retry)")
			})

			it("should return empty string when no button text", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
				}
				expect(getButtonText("primary", "idle", context)).toBe("")
			})

			it("should handle secondary button text", () => {
				const context: ActionButtonsContext = {
					isEnabled: true,
					sendingDisabled: false,
					autoResetTimeout: 2000,
					secondaryButtonText: "Reject",
				}
				expect(getButtonText("secondary", "idle", context)).toBe("Reject")
			})
		})
	})

	describe("Complete Flow Integration", () => {
		it("should handle complete button action flow from idle to success", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Approve",
			})
			const { result } = renderHook(() => useStateMachine(config))

			// Start
			expect(result.current.state.value).toBe("idle")

			// Click button
			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})
			expect(result.current.state.value).toBe("processing")
			expect(result.current.state.context.currentAction).toBe("proceed")

			// Success
			act(() => {
				result.current.send({ type: "SUCCESS" })
			})
			expect(result.current.state.value).toBe("success")

			// Auto-reset to idle
			act(() => {
				result.current.send({ type: "AUTO_RESET" })
			})
			expect(result.current.state.value).toBe("idle")
			expect(result.current.state.context.currentAction).toBeUndefined()
		})

		it("should handle error and retry flow", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Submit",
			})
			const { result } = renderHook(() => useStateMachine(config))

			// Click button
			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})
			expect(result.current.state.value).toBe("processing")

			// Error occurs
			act(() => {
				result.current.send({
					type: "ERROR",
					payload: { error: "Network error" },
				})
			})
			expect(result.current.state.value).toBe("error")

			// Retry
			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})
			expect(result.current.state.value).toBe("processing")

			// Success on retry
			act(() => {
				result.current.send({ type: "SUCCESS" })
			})
			expect(result.current.state.value).toBe("success")
		})

		it("should handle disable during processing flow", () => {
			const config = createActionButtonsStateMachine({
				primaryButtonText: "Process",
			})
			const { result } = renderHook(() => useStateMachine(config))

			// Click button
			act(() => {
				result.current.send({ type: "CLICK_PRIMARY" })
			})
			expect(result.current.state.value).toBe("processing")

			// AI takes over, disable buttons
			act(() => {
				result.current.send({ type: "DISABLE" })
			})
			expect(result.current.state.value).toBe("disabled")

			// Re-enable after AI finishes
			act(() => {
				result.current.send({ type: "ENABLE" })
			})
			expect(result.current.state.value).toBe("idle")
		})

		it("should handle configuration updates during idle", () => {
			const config = createActionButtonsStateMachine()
			const { result } = renderHook(() => useStateMachine(config))

			// Update config
			act(() => {
				result.current.send({
					type: "UPDATE_CONFIG",
					payload: {
						primary: "Accept",
						secondary: "Decline",
					},
				})
			})

			expect(result.current.state.value).toBe("idle")
			expect(result.current.state.context.primaryButtonText).toBe("Accept")
			expect(result.current.state.context.secondaryButtonText).toBe("Decline")

			// Now can click updated buttons
			act(() => {
				result.current.send({ type: "CLICK_SECONDARY" })
			})
			expect(result.current.state.value).toBe("processing")
			expect(result.current.state.context.currentAction).toBe("reject")
		})
	})
})
