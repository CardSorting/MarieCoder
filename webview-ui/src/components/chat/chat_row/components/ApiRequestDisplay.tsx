import type { ClineMessage } from "@shared/ExtensionMessage"
import { VSCodeBadge } from "@vscode/webview-ui-toolkit/react"
import { memo } from "react"
import { ErrorBlockTitle } from "@/components/chat/ErrorBlockTitle"
import ErrorRow from "@/components/chat/ErrorRow"
import CodeAccordian from "@/components/common/CodeAccordian"
import { headerStyle } from "../utils/style_constants"

/**
 * Props for ApiRequestDisplay component
 */
interface ApiRequestDisplayProps {
	message: ClineMessage
	cost: number
	isExpanded: boolean
	apiReqCancelReason?: string
	apiRequestFailedMessage?: string
	apiReqStreamingFailedMessage?: string
	retryStatus?: {
		attempt: number
		maxAttempts: number
		delaySec?: number
		errorSnippet?: string
	}
	onToggle: () => void
}

/**
 * API request display component
 * Shows API request information including cost, status, and request details
 *
 * Features:
 * - Displays API cost badge
 * - Shows error states (cancellation, failures)
 * - Expandable request details
 * - Retry status indication
 */
export const ApiRequestDisplay = memo(
	({
		message,
		cost,
		isExpanded,
		apiReqCancelReason,
		apiRequestFailedMessage,
		apiReqStreamingFailedMessage,
		retryStatus,
		onToggle,
	}: ApiRequestDisplayProps) => {
		const [icon, title] = ErrorBlockTitle({
			cost,
			apiReqCancelReason,
			apiRequestFailedMessage,
			retryStatus,
		})

		return (
			<>
				<div
					onClick={onToggle}
					style={{
						...headerStyle,
						marginBottom: (cost == null && apiRequestFailedMessage) || apiReqStreamingFailedMessage ? 10 : 0,
						justifyContent: "space-between",
						cursor: "pointer",
						userSelect: "none",
						WebkitUserSelect: "none",
						MozUserSelect: "none",
						msUserSelect: "none",
					}}>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						{icon && icon}
						{title && title}
						<VSCodeBadge style={{ opacity: cost != null && cost > 0 ? 1 : 0 }}>
							${Number(cost || 0)?.toFixed(4)}
						</VSCodeBadge>
					</div>
					<span className={`codicon codicon-chevron-${isExpanded ? "up" : "down"}`} />
				</div>

				{/* Error display */}
				{((cost == null && apiRequestFailedMessage) || apiReqStreamingFailedMessage) && (
					<ErrorRow
						apiReqStreamingFailedMessage={apiReqStreamingFailedMessage}
						apiRequestFailedMessage={apiRequestFailedMessage}
						errorType="error"
						message={message}
					/>
				)}

				{/* Expanded request details */}
				{isExpanded && (
					<div style={{ marginTop: "10px" }}>
						<CodeAccordian
							code={JSON.parse(message.text || "{}").request}
							isExpanded={true}
							language="markdown"
							onToggleExpand={onToggle}
						/>
					</div>
				)}
			</>
		)
	},
)

ApiRequestDisplay.displayName = "ApiRequestDisplay"
