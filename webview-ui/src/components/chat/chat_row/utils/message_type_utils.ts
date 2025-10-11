import type { ClineMessage } from "@shared/ExtensionMessage"

/**
 * Utility functions for message type detection and handling
 */

/**
 * Gets the message type from a ClineMessage
 * @param message - The message to analyze
 * @returns The message type string (or empty string if undefined)
 */
export const getMessageType = (message: ClineMessage): string => {
	if (message.type === "ask") {
		return message.ask || ""
	}
	return message.say || ""
}

/**
 * Determines if a progress indicator should be shown for a message
 * @param message - The message to check
 * @param isLast - Whether this is the last message
 * @returns true if a progress indicator should be shown
 */
export const shouldShowProgressIndicator = (message: ClineMessage, isLast: boolean): boolean => {
	if (!isLast) {
		return false
	}

	// Show progress for command execution
	if (message.ask === "command" || message.say === "command") {
		return true
	}

	// Show progress for MCP server requests
	if (message.say === "mcp_server_request_started") {
		return true
	}

	return false
}
