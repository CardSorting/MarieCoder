/**
 * Utility functions for message filtering, grouping, and manipulation
 */

import { combineApiRequests } from "@shared/combineApiRequests"
import { combineCommandSequences } from "@shared/combineCommandSequences"
import { ClineMessage, ClineSayBrowserAction } from "@shared/ExtensionMessage"

/**
 * Combine API requests and command sequences in messages
 */
export function processMessages(messages: ClineMessage[]): ClineMessage[] {
	return combineApiRequests(combineCommandSequences(messages))
}

/**
 * Filter messages that should be visible in the chat
 *
 * Simplified logic:
 * - Filters out internal/system messages
 * - Filters out empty messages
 * - Filters out partial/streaming messages (except ask messages that need user interaction)
 * - completion_result say messages are handled by state deduplication (converted to ask)
 */
export function filterVisibleMessages(messages: ClineMessage[]): ClineMessage[] {
	return messages.filter((message) => {
		// Filter out partial/streaming messages UNLESS they need user interaction
		// This hides all streaming content until it's complete
		// But keeps approval prompts visible immediately
		if (message.partial === true && message.type !== "ask") {
			return false
		}

		// Filter ask messages
		if (message.type === "ask") {
			switch (message.ask) {
				case "completion_result":
					// Only show completion_result ask messages that have text
					// Empty ones are used for internal control flow (e.g., executing commands)
					return message.text !== ""
				case "api_req_failed": // Updates latest api_req_started with failure status
				case "resume_task": // Internal resume signals
				case "resume_completed_task": // Internal resume signals
					return false
			}
		}

		// Filter say messages
		if (message.type === "say") {
			switch (message.say) {
				case "completion_result":
					// Say completion_result messages are converted to ask in state management
					// If we see one here, it means it hasn't been converted yet (should be rare)
					// Don't show it to avoid duplication
					return false
				case "api_req_finished": // combineApiRequests handles this
				case "api_req_retried": // Updates api_req_started with retry info
				case "deleted_api_reqs": // Aggregated metrics
				case "task_progress": // Displayed in TaskHeader, not chat
				case "mcp_server_request_started": // Internal MCP tracking
					return false
				case "text":
					// Filter empty text messages (but keep if images are present)
					if ((message.text ?? "") === "" && (message.images?.length ?? 0) === 0) {
						return false
					}
					break
			}
		}

		return true
	})
}

/**
 * Check if a message is part of a browser session
 */
export function isBrowserSessionMessage(message: ClineMessage): boolean {
	if (message.type === "ask") {
		return ["browser_action_launch"].includes(message.ask!)
	}
	if (message.type === "say") {
		return [
			"browser_action_launch",
			"api_req_started",
			"text",
			"browser_action",
			"browser_action_result",
			"checkpoint_created",
			"reasoning",
		].includes(message.say!)
	}
	return false
}

/**
 * Group messages, combining browser session messages into arrays
 */
export function groupMessages(visibleMessages: ClineMessage[]): (ClineMessage | ClineMessage[])[] {
	const result: (ClineMessage | ClineMessage[])[] = []
	let currentGroup: ClineMessage[] = []
	let isInBrowserSession = false

	const endBrowserSession = () => {
		if (currentGroup.length > 0) {
			result.push([...currentGroup])
			currentGroup = []
			isInBrowserSession = false
		}
	}

	visibleMessages.forEach((message) => {
		if (message.ask === "browser_action_launch" || message.say === "browser_action_launch") {
			// complete existing browser session if any
			endBrowserSession()
			// start new
			isInBrowserSession = true
			currentGroup.push(message)
		} else if (isInBrowserSession) {
			// end session if api_req_started is cancelled
			if (message.say === "api_req_started") {
				// get last api_req_started in currentGroup to check if it's cancelled
				const lastApiReqStarted = [...currentGroup].reverse().find((m) => m.say === "api_req_started")
				if (lastApiReqStarted?.text != null) {
					const info = JSON.parse(lastApiReqStarted.text)
					const isCancelled = info.cancelReason != null
					if (isCancelled) {
						endBrowserSession()
						result.push(message)
						return
					}
				}
			}

			if (isBrowserSessionMessage(message)) {
				currentGroup.push(message)

				// Check if this is a close action
				if (message.say === "browser_action") {
					const browserAction = JSON.parse(message.text || "{}") as ClineSayBrowserAction
					if (browserAction.action === "close") {
						endBrowserSession()
					}
				}
			} else {
				// complete existing browser session if any
				endBrowserSession()
				result.push(message)
			}
		} else {
			result.push(message)
		}
	})

	// Handle case where browser session is the last group
	if (currentGroup.length > 0) {
		result.push([...currentGroup])
	}

	return result
}

/**
 * Get the task message from the messages array
 */
export function getTaskMessage(messages: ClineMessage[]): ClineMessage | undefined {
	return messages.at(0)
}

/**
 * Check if we should show the scroll to bottom button
 */
export function shouldShowScrollButton(disableAutoScroll: boolean, isAtBottom: boolean): boolean {
	return disableAutoScroll && !isAtBottom
}
