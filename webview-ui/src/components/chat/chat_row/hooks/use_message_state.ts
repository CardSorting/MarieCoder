import { COMMAND_OUTPUT_STRING } from "@shared/combineCommandSequences"
import type { ClineApiReqInfo, ClineMessage } from "@shared/ExtensionMessage"
import { useMemo } from "react"

/**
 * Custom hook for managing message state including cost tracking,
 * API request status, command execution state, and MCP server response state
 * @param message - The current message
 * @param lastModifiedMessage - The last modified message in the conversation
 * @param isLast - Whether this is the last message
 * @returns Object containing derived message state
 */
export const useMessageState = (message: ClineMessage, lastModifiedMessage: ClineMessage | undefined, isLast: boolean) => {
	const [cost, apiReqCancelReason, apiReqStreamingFailedMessage, retryStatus] = useMemo(() => {
		if (message.text != null && message.say === "api_req_started") {
			const info: ClineApiReqInfo = JSON.parse(message.text)
			return [info.cost, info.cancelReason, info.streamingFailedMessage, info.retryStatus]
		}
		return [undefined, undefined, undefined, undefined, undefined]
	}, [message.text, message.say])

	// When resuming task last won't be api_req_failed but a resume_task message
	// so api_req_started will show loading spinner. That's why we just remove
	// the last api_req_started that failed without streaming anything
	const apiRequestFailedMessage = useMemo(
		() =>
			isLast && lastModifiedMessage?.ask === "api_req_failed" // if request is retried then the latest message is a api_req_retried
				? lastModifiedMessage?.text
				: undefined,
		[isLast, lastModifiedMessage?.ask, lastModifiedMessage?.text],
	)

	const isCommandExecuting = useMemo(
		() =>
			isLast &&
			(lastModifiedMessage?.ask === "command" || lastModifiedMessage?.say === "command") &&
			lastModifiedMessage?.text?.includes(COMMAND_OUTPUT_STRING),
		[isLast, lastModifiedMessage?.ask, lastModifiedMessage?.say, lastModifiedMessage?.text],
	)

	const isMcpServerResponding = useMemo(
		() => isLast && lastModifiedMessage?.say === "mcp_server_request_started",
		[isLast, lastModifiedMessage?.say],
	)

	return {
		cost,
		apiReqCancelReason,
		apiReqStreamingFailedMessage,
		retryStatus,
		apiRequestFailedMessage,
		isCommandExecuting,
		isMcpServerResponding,
	}
}
