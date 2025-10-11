import type { ClineAskUseMcpServer, ClineMessage } from "@shared/ExtensionMessage"
import { useMemo } from "react"
import { getMcpServerDisplayName } from "@/utils/mcp"
import { ProgressIndicator } from "../components/ProgressIndicator"
import { errorColor, normalColor, successColor } from "../utils/style_constants"

/**
 * Message header configuration
 * Includes icon, title, and display color
 */
export interface MessageHeaderConfig {
	icon: JSX.Element | null
	title: JSX.Element | null
	color: string
}

/**
 * Hook to determine message header (icon and title) based on message type
 * Extracted from ChatRowContent to improve reusability and testability
 *
 * @param message - The message to render header for
 * @param isCommandExecuting - Whether a command is currently executing
 * @param isMcpServerResponding - Whether an MCP server is currently responding
 * @param cost - API request cost (if applicable)
 * @param apiReqCancelReason - Reason for API request cancellation (if applicable)
 * @param apiRequestFailedMessage - API request failure message (if applicable)
 * @param retryStatus - Retry status message (if applicable)
 * @param mcpMarketplaceCatalog - MCP marketplace catalog for display names
 * @returns Header configuration with icon, title, and color
 */
export function useMessageHeader(
	message: ClineMessage,
	isCommandExecuting: boolean,
	isMcpServerResponding: boolean,
	cost: number,
	apiReqCancelReason: string | undefined,
	apiRequestFailedMessage: string | undefined,
	retryStatus: any,
	mcpMarketplaceCatalog: any,
): MessageHeaderConfig {
	const type = message.type === "ask" ? message.ask : message.say

	return useMemo(() => {
		switch (type) {
			case "error":
				return {
					icon: <span className="codicon codicon-error" style={{ color: errorColor, marginBottom: "-1.5px" }} />,
					title: <span style={{ color: errorColor, fontWeight: "bold" }}>Error</span>,
					color: errorColor,
				}

			case "mistake_limit_reached":
				return {
					icon: <span className="codicon codicon-error" style={{ color: errorColor, marginBottom: "-1.5px" }} />,
					title: <span style={{ color: errorColor, fontWeight: "bold" }}>Marie is having trouble...</span>,
					color: errorColor,
				}

			case "auto_approval_max_req_reached":
				return {
					icon: <span className="codicon codicon-warning" style={{ color: errorColor, marginBottom: "-1.5px" }} />,
					title: <span style={{ color: errorColor, fontWeight: "bold" }}>Maximum Requests Reached</span>,
					color: errorColor,
				}

			case "command":
				return {
					icon: isCommandExecuting ? (
						<ProgressIndicator />
					) : (
						<span className="codicon codicon-terminal" style={{ color: normalColor, marginBottom: "-1.5px" }} />
					),
					title: <span style={{ color: normalColor, fontWeight: "bold" }}>Marie wants to execute this command:</span>,
					color: normalColor,
				}

			case "use_mcp_server": {
				const mcpServerUse = JSON.parse(message.text || "{}") as ClineAskUseMcpServer
				return {
					icon: isMcpServerResponding ? (
						<ProgressIndicator />
					) : (
						<span className="codicon codicon-server" style={{ color: normalColor, marginBottom: "-1.5px" }} />
					),
					title: (
						<span
							className="ph-no-capture"
							style={{ color: normalColor, fontWeight: "bold", wordBreak: "break-word" }}>
							Marie wants to {mcpServerUse.type === "use_mcp_tool" ? "use a tool" : "access a resource"} on the{" "}
							<code style={{ wordBreak: "break-all" }}>
								{getMcpServerDisplayName(mcpServerUse.serverName, mcpMarketplaceCatalog)}
							</code>{" "}
							MCP server:
						</span>
					),
					color: normalColor,
				}
			}

			case "completion_result":
				return {
					icon: <span className="codicon codicon-check" style={{ color: successColor, marginBottom: "-1.5px" }} />,
					title: <span style={{ color: successColor, fontWeight: "bold" }}>Task Completed</span>,
					color: successColor,
				}

			case "api_req_started": {
				// Import ErrorBlockTitle for API request header
				// Note: This is a special case that returns title/icon from ErrorBlockTitle
				// We'll handle this separately in the component
				return {
					icon: null,
					title: null,
					color: normalColor,
				}
			}

			case "followup":
				return {
					icon: <span className="codicon codicon-question" style={{ color: normalColor, marginBottom: "-1.5px" }} />,
					title: <span style={{ color: normalColor, fontWeight: "bold" }}>Marie has a question:</span>,
					color: normalColor,
				}

			case "new_task":
				return {
					icon: <span className="codicon codicon-new-file" style={{ color: normalColor, marginBottom: "-1.5px" }} />,
					title: <span style={{ color: normalColor, fontWeight: "bold" }}>Marie wants to start a new task:</span>,
					color: normalColor,
				}

			case "condense":
				return {
					icon: <span className="codicon codicon-new-file" style={{ color: normalColor, marginBottom: "-1.5px" }} />,
					title: (
						<span style={{ color: normalColor, fontWeight: "bold" }}>Marie wants to condense your conversation:</span>
					),
					color: normalColor,
				}

			case "report_bug":
				return {
					icon: <span className="codicon codicon-new-file" style={{ color: normalColor, marginBottom: "-1.5px" }} />,
					title: <span style={{ color: normalColor, fontWeight: "bold" }}>Marie wants to create a Github issue:</span>,
					color: normalColor,
				}

			default:
				return {
					icon: null,
					title: null,
					color: normalColor,
				}
		}
	}, [
		type,
		cost,
		apiRequestFailedMessage,
		isCommandExecuting,
		apiReqCancelReason,
		isMcpServerResponding,
		message.text,
		mcpMarketplaceCatalog,
		retryStatus,
	])
}
