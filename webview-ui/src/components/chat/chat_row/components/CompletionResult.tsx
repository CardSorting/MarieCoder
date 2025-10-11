import { COMPLETION_RESULT_CHANGES_FLAG } from "@shared/ExtensionMessage"
import { Int64Request } from "@shared/proto/cline/common"
import { memo, useEffect, useState } from "react"
import QuoteButton from "@/components/chat/QuoteButton"
import TaskFeedbackButtons from "@/components/chat/TaskFeedbackButtons"
import { Button } from "@/components/common/Button"
import { WithCopyButton } from "@/components/common/CopyButton"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { TaskServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import { Markdown } from "./Markdown"
import { MessageHeader } from "./MessageHeader"

/**
 * Props for CompletionResult component
 */
interface CompletionResultProps {
	text: string
	messageTs: number
	icon: JSX.Element | null
	title: JSX.Element | null
	isPartial?: boolean
	isLast?: boolean
	lastModifiedMessage?: any
	// Quote selection
	quoteButtonState: {
		visible: boolean
		left: number
		top: number
	}
	contentRef: React.RefObject<HTMLDivElement>
	onQuoteClick: () => void
	onMouseUp: (e: React.MouseEvent) => void
}

/**
 * Completion result component
 * Displays task completion message with optional "See new changes" button and feedback
 *
 * Features:
 * - Detects if there are changes to view
 * - Shows "See new changes" button when applicable
 * - Includes task feedback UI for completed tasks
 * - Supports quote selection
 * - Copy to clipboard functionality
 */
export const CompletionResult = memo(
	({
		text,
		messageTs,
		icon,
		title,
		isPartial,
		isLast,
		lastModifiedMessage,
		quoteButtonState,
		contentRef,
		onQuoteClick,
		onMouseUp,
	}: CompletionResultProps) => {
		const { onRelinquishControl } = useExtensionState()
		const [seeNewChangesDisabled, setSeeNewChangesDisabled] = useState(false)

		// Reset see changes button when control is relinquished
		useEffect(() => {
			return onRelinquishControl(() => {
				setSeeNewChangesDisabled(false)
			})
		}, [onRelinquishControl])

		const hasChanges = text.endsWith(COMPLETION_RESULT_CHANGES_FLAG)
		const displayText = hasChanges ? text.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length) : text

		const handleSeeChanges = () => {
			setSeeNewChangesDisabled(true)
			TaskServiceClient.taskCompletionViewChanges(Int64Request.create({ value: messageTs })).catch((err) =>
				debug.error("Failed to show task completion view changes:", err),
			)
		}

		// Determine if this is from history
		const isFromHistory =
			!isLast || lastModifiedMessage?.ask === "resume_completed_task" || lastModifiedMessage?.ask === "resume_task"

		return (
			<div>
				{/* Header with feedback buttons for ask messages */}
				<div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
					<MessageHeader icon={icon} showChevron={false} style={{ marginBottom: 0, flex: 1 }} title={title} />
					{/* Show feedback buttons only on ask:completion_result */}
					{!isFromHistory && lastModifiedMessage?.ask === "completion_result" && (
						<TaskFeedbackButtons isFromHistory={isFromHistory} messageTs={messageTs} style={{ marginLeft: "auto" }} />
					)}
				</div>

				{/* Content with copy and quote */}
				<WithCopyButton
					onMouseUp={onMouseUp}
					position="bottom-right"
					ref={contentRef}
					style={{ color: "var(--vscode-charts-green)", paddingTop: 10 }}
					textToCopy={displayText}>
					<Markdown markdown={displayText} />
					{quoteButtonState.visible && (
						<QuoteButton left={quoteButtonState.left} onClick={onQuoteClick} top={quoteButtonState.top} />
					)}
				</WithCopyButton>

				{/* See new changes button */}
				{isPartial !== true && hasChanges && (
					<div style={{ marginTop: 15 }}>
						<Button
							disabled={seeNewChangesDisabled}
							icon={<i className="codicon codicon-new-file" />}
							onClick={handleSeeChanges}
							style={{ cursor: seeNewChangesDisabled ? "wait" : "pointer", width: "100%" }}
							variant="success">
							See new changes
						</Button>
					</div>
				)}
			</div>
		)
	},
)

CompletionResult.displayName = "CompletionResult"
