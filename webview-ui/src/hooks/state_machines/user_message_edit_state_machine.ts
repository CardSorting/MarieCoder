/**
 * UserMessage Edit Mode State Machine
 *
 * Manages the state transitions when a user edits a previous message.
 * Includes checkpoint restoration and workspace rollback functionality.
 *
 * States:
 * - viewing: Normal view mode (default)
 * - editing: User is editing the message text
 * - confirming: User is choosing restore options
 * - restoring: Performing checkpoint restore
 * - restored: Restore complete, preparing to resend
 * - error: Error during restore
 *
 * Flow:
 * viewing -> editing -> confirming -> restoring -> restored -> viewing
 *                            \-> canceling -> viewing
 *                                      \-> error -> editing
 */

import type { ClineCheckpointRestore } from "@shared/WebviewMessage"
import type { StateMachineConfig } from "../use_state_machine"

// ============================================================================
// Types
// ============================================================================

export interface UserMessageEditContext {
	/** Original message text */
	originalText: string
	/** Currently edited text */
	editedText: string
	/** Message timestamp (for checkpoint restore) */
	messageTs?: number
	/** Whether text has been modified */
	isDirty: boolean
	/** Error message if any */
	errorMessage?: string
	/** Selected restore type */
	restoreType?: ClineCheckpointRestore
	/** Whether checkpoint restore is available */
	canRestore: boolean
	/** Images attached to message */
	images: string[]
	/** Files attached to message */
	files: string[]
}

export type UserMessageEditEvent =
	| { type: "START_EDIT" }
	| { type: "TEXT_CHANGED"; payload: { text: string } }
	| { type: "CONFIRM_RESTORE"; payload: { restoreType: ClineCheckpointRestore } }
	| { type: "CANCEL_EDIT" }
	| { type: "RESTORE_SUCCESS" }
	| { type: "RESTORE_ERROR"; payload: { error: string } }
	| { type: "COMPLETED" }
	| { type: "BLUR"; payload?: { relatedTarget?: EventTarget | null } }
	| { type: "KEY_ESCAPE" }
	| { type: "KEY_ENTER"; payload?: { metaKey?: boolean } }

// ============================================================================
// Guards
// ============================================================================

/**
 * Check if text has been modified
 */
const hasChanges = (context: UserMessageEditContext): boolean => {
	return context.editedText !== context.originalText
}

/**
 * Check if checkpoint restore is available
 */
const canPerformRestore = (context: UserMessageEditContext): boolean => {
	return context.canRestore && context.messageTs !== undefined
}

/**
 * Check if user can restore with workspace changes
 */
const canRestoreWorkspace = (context: UserMessageEditContext): boolean => {
	return canPerformRestore(context) && !hasCheckpointError(context)
}

/**
 * Check if there's a checkpoint error
 */
const hasCheckpointError = (context: UserMessageEditContext): boolean => {
	// This would check the extension state for checkpoint errors
	// For now, we assume no errors
	return false
}

/**
 * Check if blur event should cancel edit
 * (i.e., focus is not moving to a restore button)
 */
const shouldCancelOnBlur = (context: UserMessageEditContext, event: UserMessageEditEvent): boolean => {
	if (event.type !== "BLUR") return false

	// If blur is moving to a button, don't cancel
	if (event.payload?.relatedTarget) {
		const target = event.payload.relatedTarget as HTMLElement
		if (target.tagName === "BUTTON") {
			return false
		}
	}

	return true
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Initialize edit mode
 */
const startEditing = (context: UserMessageEditContext): Partial<UserMessageEditContext> => {
	return {
		editedText: context.originalText,
		isDirty: false,
		errorMessage: undefined,
	}
}

/**
 * Update edited text
 */
const updateText = (context: UserMessageEditContext, event: UserMessageEditEvent): Partial<UserMessageEditContext> => {
	if (event.type !== "TEXT_CHANGED") return {}

	return {
		editedText: event.payload.text,
		isDirty: event.payload.text !== context.originalText,
	}
}

/**
 * Set restore type
 */
const setRestoreType = (context: UserMessageEditContext, event: UserMessageEditEvent): Partial<UserMessageEditContext> => {
	if (event.type !== "CONFIRM_RESTORE") return {}

	return {
		restoreType: event.payload.restoreType,
	}
}

/**
 * Store error message
 */
const storeError = (context: UserMessageEditContext, event: UserMessageEditEvent): Partial<UserMessageEditContext> => {
	if (event.type !== "RESTORE_ERROR") return {}

	return {
		errorMessage: event.payload.error,
	}
}

/**
 * Reset to original state
 */
const resetToOriginal = (context: UserMessageEditContext): Partial<UserMessageEditContext> => {
	return {
		editedText: context.originalText,
		isDirty: false,
		errorMessage: undefined,
		restoreType: undefined,
	}
}

/**
 * Clear error and stay in edit mode
 */
const clearError = (): Partial<UserMessageEditContext> => {
	return {
		errorMessage: undefined,
	}
}

// ============================================================================
// State Machine Configuration
// ============================================================================

export const createUserMessageEditStateMachine = (
	initialContext?: Partial<UserMessageEditContext>,
): StateMachineConfig<UserMessageEditContext, UserMessageEditEvent> => ({
	id: "userMessageEdit",
	initial: "viewing",
	context: {
		originalText: "",
		editedText: "",
		isDirty: false,
		canRestore: true,
		images: [],
		files: [],
		...initialContext,
	},
	states: {
		viewing: {
			on: {
				START_EDIT: "editing",
			},
			onEnter: () => {
				// Normal viewing mode
			},
		},

		editing: {
			on: {
				TEXT_CHANGED: {
					target: "editing", // Stay in editing state
					actions: [updateText],
				},
				KEY_ESCAPE: {
					target: "viewing",
					actions: [resetToOriginal],
				},
				KEY_ENTER: {
					target: "confirming",
					guard: hasChanges,
				},
				BLUR: {
					target: "viewing",
					guard: shouldCancelOnBlur,
					actions: [resetToOriginal],
				},
				CANCEL_EDIT: {
					target: "viewing",
					actions: [resetToOriginal],
				},
			},
			onEnter: startEditing,
		},

		confirming: {
			on: {
				CONFIRM_RESTORE: {
					target: "restoring",
					guard: canPerformRestore,
					actions: [setRestoreType],
				},
				CANCEL_EDIT: {
					target: "viewing",
					actions: [resetToOriginal],
				},
				KEY_ESCAPE: {
					target: "editing",
				},
			},
			onEnter: () => {
				// Show restore options to user
			},
		},

		restoring: {
			on: {
				RESTORE_SUCCESS: "restored",
				RESTORE_ERROR: {
					target: "error",
					actions: [storeError],
				},
			},
			onEnter: () => {
				// Perform checkpoint restore
				// This is handled by the component via CheckpointsServiceClient
			},
		},

		restored: {
			on: {
				COMPLETED: "viewing",
			},
			onEnter: () => {
				// Restore complete, message will be resent
				// Component handles sending the edited message
			},
		},

		error: {
			on: {
				CONFIRM_RESTORE: {
					target: "restoring",
					guard: canPerformRestore,
					actions: [clearError, setRestoreType],
				},
				CANCEL_EDIT: {
					target: "viewing",
					actions: [resetToOriginal],
				},
				START_EDIT: {
					target: "editing",
					actions: [clearError],
				},
			},
			onEnter: () => {
				// Handle error state
				// Show error message to user
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
export function getEditStatus(state: string, context: UserMessageEditContext): string {
	switch (state) {
		case "viewing":
			return "Click to edit"
		case "editing":
			return context.isDirty ? "Editing (unsaved changes)" : "Editing"
		case "confirming":
			return "Choose restore option"
		case "restoring":
			return "Restoring checkpoint..."
		case "restored":
			return "Restored successfully"
		case "error":
			return context.errorMessage || "An error occurred"
		default:
			return ""
	}
}

/**
 * Get keyboard shortcuts for current state
 */
export function getKeyboardShortcuts(state: string): Record<string, string> {
	switch (state) {
		case "editing":
			return {
				Escape: "Cancel edit",
				Enter: "Confirm and restore",
				"Cmd+Enter": "Restore all (chat + workspace)",
			}
		case "confirming":
			return {
				Escape: "Back to editing",
			}
		default:
			return {}
	}
}

/**
 * Check if save is available
 */
export function canSave(state: string, context: UserMessageEditContext): boolean {
	return state === "editing" && context.isDirty
}

/**
 * Check if cancel is available
 */
export function canCancel(state: string): boolean {
	return ["editing", "confirming"].includes(state)
}

/**
 * Get restore delay based on restore type
 */
export function getRestoreDelay(restoreType?: ClineCheckpointRestore): number {
	switch (restoreType) {
		case "task":
			return 500 // 500ms for task-only restore
		case "taskAndWorkspace":
			return 1000 // 1s for full restore (task + workspace)
		default:
			return 0
	}
}
