/**
 * Action Buttons State Machine
 *
 * Manages the state of approve/reject/action buttons in the chat interface.
 * Prevents double-clicks and provides clear visual feedback during processing.
 *
 * States:
 * - idle: Ready to accept actions
 * - processing: Action is being processed
 * - success: Action completed successfully
 * - error: Action failed
 * - disabled: Buttons are disabled (waiting for AI response, etc.)
 *
 * Flow:
 * idle -> processing -> success -> idle
 *              \-> error -> idle
 */

import type { ClineAsk } from "@shared/ExtensionMessage"
import type { ButtonActionType } from "../../components/chat/chat-view/shared/buttonConfig"
import type { StateMachineConfig } from "../use_state_machine"

// ============================================================================
// Types
// ============================================================================

export interface ActionButtonsContext {
	/** Current action being processed */
	currentAction?: ButtonActionType
	/** Whether buttons are enabled */
	isEnabled: boolean
	/** Whether sending is disabled (waiting for response) */
	sendingDisabled: boolean
	/** Primary button text */
	primaryButtonText?: string
	/** Secondary button text */
	secondaryButtonText?: string
	/** Error message if any */
	errorMessage?: string
	/** Current ask state */
	clineAsk?: ClineAsk
	/** Timestamp when action started */
	actionStartTime?: number
	/** Success message */
	successMessage?: string
	/** Auto-reset timeout (ms) */
	autoResetTimeout: number
}

export type ActionButtonsEvent =
	| { type: "CLICK_PRIMARY" }
	| { type: "CLICK_SECONDARY" }
	| { type: "CLICK_ACTION"; payload: { action: ButtonActionType } }
	| { type: "PROCESSING_STARTED"; payload: { action: ButtonActionType } }
	| { type: "SUCCESS"; payload?: { message?: string } }
	| { type: "ERROR"; payload: { error: string } }
	| { type: "ENABLE" }
	| { type: "DISABLE" }
	| { type: "UPDATE_CONFIG"; payload: { primary?: string; secondary?: string; enabled?: boolean } }
	| { type: "RESET" }
	| { type: "AUTO_RESET" } // Triggered by timeout

// ============================================================================
// Guards
// ============================================================================

/**
 * Check if buttons are enabled
 */
const isEnabled = (context: ActionButtonsContext): boolean => {
	return context.isEnabled && !context.sendingDisabled
}

/**
 * Check if can process actions
 */
const canProcessAction = (context: ActionButtonsContext): boolean => {
	return isEnabled(context) && context.currentAction === undefined
}

/**
 * Check if primary button is available
 */
const hasPrimaryButton = (context: ActionButtonsContext): boolean => {
	return context.primaryButtonText !== undefined
}

/**
 * Check if secondary button is available
 */
const hasSecondaryButton = (context: ActionButtonsContext): boolean => {
	return context.secondaryButtonText !== undefined
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Set action from button click
 */
const setActionFromClick = (_context: ActionButtonsContext, event: ActionButtonsEvent): Partial<ActionButtonsContext> => {
	let action: ButtonActionType | undefined

	if (event.type === "CLICK_PRIMARY") {
		action = "proceed" // Default primary action (was messageResponse)
	} else if (event.type === "CLICK_SECONDARY") {
		action = "reject" // Default secondary action
	} else if (event.type === "CLICK_ACTION") {
		action = event.payload.action
	}

	return {
		currentAction: action,
		actionStartTime: Date.now(),
	}
}

/**
 * Store success message
 */
const storeSuccess = (_context: ActionButtonsContext, event: ActionButtonsEvent): Partial<ActionButtonsContext> => {
	if (event.type !== "SUCCESS") {
		return {}
	}

	return {
		successMessage: event.payload?.message,
		errorMessage: undefined,
	}
}

/**
 * Store error message
 */
const storeError = (_context: ActionButtonsContext, event: ActionButtonsEvent): Partial<ActionButtonsContext> => {
	if (event.type !== "ERROR") {
		return {}
	}

	return {
		errorMessage: event.payload.error,
		successMessage: undefined,
	}
}

/**
 * Update button configuration
 */
const updateConfig = (_context: ActionButtonsContext, event: ActionButtonsEvent): Partial<ActionButtonsContext> => {
	if (event.type !== "UPDATE_CONFIG") {
		return {}
	}

	const updates: Partial<ActionButtonsContext> = {}

	if (event.payload.primary !== undefined) {
		updates.primaryButtonText = event.payload.primary
	}
	if (event.payload.secondary !== undefined) {
		updates.secondaryButtonText = event.payload.secondary
	}
	if (event.payload.enabled !== undefined) {
		updates.isEnabled = event.payload.enabled
	}

	return updates
}

/**
 * Reset state
 */
const resetState = (): Partial<ActionButtonsContext> => {
	return {
		currentAction: undefined,
		actionStartTime: undefined,
		errorMessage: undefined,
		successMessage: undefined,
	}
}

// ============================================================================
// State Machine Configuration
// ============================================================================

export const createActionButtonsStateMachine = (
	initialContext?: Partial<ActionButtonsContext>,
): StateMachineConfig<ActionButtonsContext, ActionButtonsEvent> => ({
	id: "actionButtons",
	initial: "idle",
	context: {
		isEnabled: true,
		sendingDisabled: false,
		autoResetTimeout: 2000, // 2 seconds
		...initialContext,
	},
	states: {
		idle: {
			on: {
				CLICK_PRIMARY: {
					target: "processing",
					guard: (ctx) => canProcessAction(ctx) && hasPrimaryButton(ctx),
					actions: [setActionFromClick],
				},
				CLICK_SECONDARY: {
					target: "processing",
					guard: (ctx) => canProcessAction(ctx) && hasSecondaryButton(ctx),
					actions: [setActionFromClick],
				},
				CLICK_ACTION: {
					target: "processing",
					guard: canProcessAction,
					actions: [setActionFromClick],
				},
				DISABLE: "disabled",
				UPDATE_CONFIG: {
					target: "idle",
					actions: [updateConfig],
				},
			},
			onEnter: resetState,
		},

		processing: {
			on: {
				SUCCESS: {
					target: "success",
					actions: [storeSuccess],
				},
				ERROR: {
					target: "error",
					actions: [storeError],
				},
				// Allow disabling during processing (AI takes over)
				DISABLE: "disabled",
			},
			onEnter: () => {
				// Action is being processed
				// Component handles the actual API call
				return undefined
			},
		},

		success: {
			on: {
				AUTO_RESET: "idle",
				RESET: "idle",
				DISABLE: "disabled",
			},
			onEnter: () => {
				// Action completed successfully
				// Auto-reset after timeout
				return undefined
			},
		},

		error: {
			on: {
				RESET: "idle",
				CLICK_PRIMARY: {
					target: "processing",
					guard: (ctx) => canProcessAction(ctx) && hasPrimaryButton(ctx),
					actions: [setActionFromClick],
				},
				CLICK_SECONDARY: {
					target: "processing",
					guard: (ctx) => canProcessAction(ctx) && hasSecondaryButton(ctx),
					actions: [setActionFromClick],
				},
				CLICK_ACTION: {
					target: "processing",
					guard: canProcessAction,
					actions: [setActionFromClick],
				},
			},
			onEnter: () => {
				// Handle error state
				// Show error message to user
				return undefined
			},
		},

		disabled: {
			on: {
				ENABLE: "idle",
				UPDATE_CONFIG: {
					target: "disabled",
					actions: [updateConfig],
				},
			},
			onEnter: () => {
				// Buttons are disabled
				// Usually when waiting for AI response
				return undefined
			},
		},
	},
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user-friendly status message
 */
export function getButtonStatus(state: string, context: ActionButtonsContext): string {
	switch (state) {
		case "idle":
			return "Ready"
		case "processing":
			return "Processing..."
		case "success":
			return context.successMessage || "Success!"
		case "error":
			return context.errorMessage || "An error occurred"
		case "disabled":
			return "Waiting for response..."
		default:
			return ""
	}
}

/**
 * Get action icon based on action type
 */
export function getActionIcon(action?: ButtonActionType): string {
	switch (action) {
		case "proceed":
		case "approve":
			return "✓"
		case "reject":
			return "✕"
		case "new_task":
			return "→"
		case "retry":
			return "↻"
		case "cancel":
			return "⏸"
		default:
			return "•"
	}
}

/**
 * Check if buttons should be shown
 */
export function shouldShowButtons(state: string, context: ActionButtonsContext): boolean {
	return state !== "disabled" && (context.primaryButtonText !== undefined || context.secondaryButtonText !== undefined)
}

/**
 * Check if action is in progress
 */
export function isProcessing(state: string): boolean {
	return state === "processing"
}

/**
 * Check if can click buttons
 */
export function canClickButtons(state: string, _context: ActionButtonsContext): boolean {
	return state === "idle" || state === "error"
}

/**
 * Get elapsed time since action started
 */
export function getElapsedTime(context: ActionButtonsContext): number | undefined {
	if (context.actionStartTime) {
		return Date.now() - context.actionStartTime
	}
	return undefined
}

/**
 * Get button variant based on state
 */
export function getButtonVariant(state: string): "default" | "processing" | "success" | "error" {
	switch (state) {
		case "processing":
			return "processing"
		case "success":
			return "success"
		case "error":
			return "error"
		default:
			return "default"
	}
}

/**
 * Check if should auto-reset after success
 */
export function shouldAutoReset(state: string, context: ActionButtonsContext): boolean {
	return state === "success" && context.autoResetTimeout > 0
}

/**
 * Get appropriate button text based on state and action
 */
export function getButtonText(buttonType: "primary" | "secondary", state: string, context: ActionButtonsContext): string {
	const baseText = buttonType === "primary" ? context.primaryButtonText : context.secondaryButtonText

	if (!baseText) {
		return ""
	}

	switch (state) {
		case "processing":
			return `${baseText}...`
		case "success":
			return context.successMessage || `${baseText} ✓`
		case "error":
			return `${baseText} (retry)`
		default:
			return baseText
	}
}
