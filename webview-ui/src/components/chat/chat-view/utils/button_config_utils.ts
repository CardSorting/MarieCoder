/**
 * Button configuration utilities
 * Derives button state and text from the current ask type
 */

import type { ClineAsk } from "@shared/ExtensionMessage"

export interface ButtonConfig {
	primary: string
	secondary: string
}

/**
 * Get button configuration based on the current ask type
 * @param clineAsk - The current ask type from the last message
 * @returns Button configuration with primary and secondary text, or null if no buttons
 */
export function getButtonConfig(clineAsk: ClineAsk | undefined): ButtonConfig | null {
	if (!clineAsk) {
		return null
	}

	switch (clineAsk) {
		case "tool":
			return { primary: "Approve", secondary: "Reject" }

		case "command":
			return { primary: "Run Command", secondary: "Reject" }

		case "command_output":
			return { primary: "Continue", secondary: "Stop" }

		case "followup":
			return { primary: "Start New Task", secondary: "Resume Task" }

		case "plan_mode_respond":
			return { primary: "Approve Plan", secondary: "Reject" }

		case "completion_result":
			return { primary: "Start New Task", secondary: "Close" }

		case "resume_task":
			return { primary: "Resume", secondary: "Start New Task" }

		case "resume_completed_task":
			return { primary: "Resume", secondary: "Start New Task" }

		case "browser_action_launch":
			return { primary: "Launch Browser", secondary: "Reject" }

		case "use_mcp_server":
			return { primary: "Approve", secondary: "Reject" }

		case "mistake_limit_reached":
			return { primary: "Proceed Anyway", secondary: "Start New Task" }

		case "auto_approval_max_req_reached":
			return { primary: "Continue", secondary: "Start New Task" }

		case "api_req_failed":
			return { primary: "Retry", secondary: "Start New Task" }

		case "new_task":
			return { primary: "Proceed", secondary: "Cancel" }

		case "condense":
			return { primary: "Allow", secondary: "Reject" }

		case "report_bug":
			return { primary: "Submit", secondary: "Cancel" }

		default:
			return { primary: "Approve", secondary: "Reject" }
	}
}

/**
 * Check if buttons should be enabled based on the ask type
 * @param clineAsk - The current ask type from the last message
 * @returns True if buttons should be enabled
 */
export function shouldEnableButtons(clineAsk: ClineAsk | undefined): boolean {
	return clineAsk !== undefined
}

/**
 * Get the button configuration and enabled state
 * @param clineAsk - The current ask type from the last message
 * @returns Object with button config and enabled state
 */
export function getButtonState(clineAsk: ClineAsk | undefined) {
	const config = getButtonConfig(clineAsk)
	const enabled = shouldEnableButtons(clineAsk)

	return {
		enabled,
		primaryText: config?.primary,
		secondaryText: config?.secondary,
	}
}
