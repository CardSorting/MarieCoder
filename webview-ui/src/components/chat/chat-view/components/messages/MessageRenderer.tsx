import { ClineMessage } from "@shared/ExtensionMessage"
import React from "react"
import BrowserSessionRow from "@/components/chat/BrowserSessionRow"
import ChatRow from "@/components/chat/ChatRow"
import { MessageHandlers } from "../../types/chatTypes"

interface MessageRendererProps {
	index: number
	messageOrGroup: ClineMessage | ClineMessage[]
	groupedMessages: (ClineMessage | ClineMessage[])[]
	modifiedMessages: ClineMessage[]
	expandedRows: Record<number, boolean>
	onToggleExpand: (ts: number) => void
	onHeightChange: (isTaller: boolean) => void
	onSetQuote: (quote: string | null) => void
	inputValue: string
	messageHandlers: MessageHandlers
}

/**
 * Specialized component for rendering different message types
 * Handles browser sessions, regular messages, and checkpoint logic
 */
const MessageRendererComponent: React.FC<MessageRendererProps> = ({
	index,
	messageOrGroup,
	groupedMessages,
	modifiedMessages,
	expandedRows,
	onToggleExpand,
	onHeightChange,
	onSetQuote,
	inputValue,
	messageHandlers,
}) => {
	// Browser session group
	if (Array.isArray(messageOrGroup)) {
		return (
			<BrowserSessionRow
				expandedRows={expandedRows}
				isLast={index === groupedMessages.length - 1}
				key={messageOrGroup[0]?.ts}
				lastModifiedMessage={modifiedMessages.at(-1)}
				messages={messageOrGroup}
				onHeightChange={onHeightChange}
				onSetQuote={onSetQuote}
				onToggleExpand={onToggleExpand}
			/>
		)
	}

	// Determine if this is the last message for status display purposes
	const nextMessage = index < groupedMessages.length - 1 && groupedMessages[index + 1]
	const isNextCheckpoint = !Array.isArray(nextMessage) && nextMessage && nextMessage?.say === "checkpoint_created"
	const isLastMessageGroup = isNextCheckpoint && index === groupedMessages.length - 2
	const isLast = index === groupedMessages.length - 1 || isLastMessageGroup

	// Regular message
	return (
		<ChatRow
			inputValue={inputValue}
			isExpanded={expandedRows[messageOrGroup.ts] || false}
			isLast={isLast}
			key={messageOrGroup.ts}
			lastModifiedMessage={modifiedMessages.at(-1)}
			message={messageOrGroup}
			onHeightChange={onHeightChange}
			onSetQuote={onSetQuote}
			onToggleExpand={onToggleExpand}
			sendMessageFromChatRow={messageHandlers.handleSendMessage}
		/>
	)
}

// Track last render time for silky-smooth, comfortable batching
const lastRenderTimeMap = new Map<number, number>()
// Optimized for human perception - 45fps sweet spot (smoother than 30fps, less jarring than 60fps)
const MIN_RENDER_INTERVAL_MS = 22 // ~45fps for optimal visual comfort during streaming
// Adaptive thresholds for natural, flowing updates
const MIN_TEXT_DELTA = 12 // Smaller batches for smoother, more fluid perception
const MIN_REASONING_DELTA = 6 // More granular reasoning updates for better flow

/**
 * Optimized memoization for message rendering with intelligent batching
 * Intelligently compares message content to minimize re-renders while ensuring
 * streaming updates are displayed smoothly
 *
 * Performance optimizations:
 * - Skip re-renders when content hasn't changed
 * - Time-based batching for smooth, predictable updates (~30fps)
 * - Larger batches for more fluid visual updates
 * - Optimize comparison checks for common scenarios
 */
export const MessageRenderer = React.memo(MessageRendererComponent, (prevProps, nextProps) => {
	// Get message identifiers
	const prevMessage = Array.isArray(prevProps.messageOrGroup) ? prevProps.messageOrGroup[0] : prevProps.messageOrGroup
	const nextMessage = Array.isArray(nextProps.messageOrGroup) ? nextProps.messageOrGroup[0] : nextProps.messageOrGroup

	// Different message entirely - always re-render
	if (prevMessage?.ts !== nextMessage?.ts) {
		return false
	}

	// For streaming messages (partial=true), implement intelligent batching
	if (nextMessage?.partial) {
		const prevText = prevMessage?.text || ""
		const nextText = nextMessage?.text || ""
		const prevReasoning = prevMessage?.reasoning || ""
		const nextReasoning = nextMessage?.reasoning || ""

		// Batch based on both time AND content for smoother perception
		const textDelta = Math.abs(nextText.length - prevText.length)
		const reasoningDelta = Math.abs(nextReasoning.length - prevReasoning.length)

		const now = performance.now()
		const lastRenderTime = lastRenderTimeMap.get(nextMessage.ts) || 0
		const timeSinceLastRender = now - lastRenderTime

		// Content changed during streaming - re-render with time-based batching
		// Only update if enough time has passed OR significant content change OR complete
		const shouldUpdate =
			!nextMessage.partial || // Always update when complete
			textDelta >= MIN_TEXT_DELTA || // Significant text change
			reasoningDelta >= MIN_REASONING_DELTA || // Significant reasoning change
			timeSinceLastRender >= MIN_RENDER_INTERVAL_MS // Enough time passed

		if (shouldUpdate && (prevText !== nextText || prevReasoning !== nextReasoning)) {
			lastRenderTimeMap.set(nextMessage.ts, now)
			return false // Render
		}

		// Batch this update for next interval
		return true // Skip render
	}

	// Check if expansion state changed
	if (prevProps.expandedRows[prevMessage?.ts] !== nextProps.expandedRows[nextMessage?.ts]) {
		return false
	}

	// Determine if this is the last message (computed from index and length)
	const isPrevLast = prevProps.index === prevProps.groupedMessages.length - 1
	const isNextLast = nextProps.index === nextProps.groupedMessages.length - 1

	// Check if input value changed (affects quote feature, but only for last message)
	if (isNextLast && prevProps.inputValue !== nextProps.inputValue) {
		return false
	}

	// Check if last modified message changed (affects status display for last message)
	if (isPrevLast || isNextLast) {
		const prevLastTs = prevProps.modifiedMessages.at(-1)?.ts
		const nextLastTs = nextProps.modifiedMessages.at(-1)?.ts
		if (prevLastTs !== nextLastTs) {
			return false
		}
	}

	// No relevant changes - skip re-render for better performance
	return true
})

/**
 * Factory function to create the itemContent callback for Virtuoso
 * This allows us to encapsulate the rendering logic while maintaining performance
 */
export const createMessageRenderer = (
	groupedMessages: (ClineMessage | ClineMessage[])[],
	modifiedMessages: ClineMessage[],
	expandedRows: Record<number, boolean>,
	onToggleExpand: (ts: number) => void,
	onHeightChange: (isTaller: boolean) => void,
	onSetQuote: (quote: string | null) => void,
	inputValue: string,
	messageHandlers: MessageHandlers,
) => {
	return (index: number, messageOrGroup: ClineMessage | ClineMessage[]) => (
		<MessageRenderer
			expandedRows={expandedRows}
			groupedMessages={groupedMessages}
			index={index}
			inputValue={inputValue}
			messageHandlers={messageHandlers}
			messageOrGroup={messageOrGroup}
			modifiedMessages={modifiedMessages}
			onHeightChange={onHeightChange}
			onSetQuote={onSetQuote}
			onToggleExpand={onToggleExpand}
		/>
	)
}
