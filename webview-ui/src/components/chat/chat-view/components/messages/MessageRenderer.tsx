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

// Memoize to prevent unnecessary re-renders
// Only re-render if the message data or expansion state changes
export const MessageRenderer = React.memo(MessageRendererComponent, (prevProps, nextProps) => {
	// Check if the message itself has changed
	const messageKey = Array.isArray(prevProps.messageOrGroup) ? prevProps.messageOrGroup[0]?.ts : prevProps.messageOrGroup.ts
	const nextMessageKey = Array.isArray(nextProps.messageOrGroup) ? nextProps.messageOrGroup[0]?.ts : nextProps.messageOrGroup.ts

	if (messageKey !== nextMessageKey) {
		return false
	}

	// Check if expansion state has changed for this message
	if (prevProps.expandedRows[messageKey] !== nextProps.expandedRows[nextMessageKey]) {
		return false
	}

	// Check if input value changed (affects quote feature)
	if (prevProps.inputValue !== nextProps.inputValue) {
		return false
	}

	// Check if last modified message changed (affects status display)
	const prevLastTs = prevProps.modifiedMessages.at(-1)?.ts
	const nextLastTs = nextProps.modifiedMessages.at(-1)?.ts
	if (prevLastTs !== nextLastTs) {
		return false
	}

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
