import { ClineMessage } from "@shared/ExtensionMessage"
import React, { useCallback } from "react"
import { Virtuoso } from "react-virtuoso"
import { ChatState, MessageHandlers, ScrollBehavior } from "../../types/chatTypes"
import { createMessageRenderer } from "../messages/MessageRenderer"

interface MessagesAreaProps {
	task: ClineMessage
	groupedMessages: (ClineMessage | ClineMessage[])[]
	modifiedMessages: ClineMessage[]
	scrollBehavior: ScrollBehavior
	chatState: ChatState
	messageHandlers: MessageHandlers
}

/**
 * The scrollable messages area with virtualized list
 * Handles rendering of chat rows and browser sessions
 */
export const MessagesArea: React.FC<MessagesAreaProps> = ({
	task,
	groupedMessages,
	modifiedMessages,
	scrollBehavior,
	chatState,
	messageHandlers,
}) => {
	const {
		virtuosoRef,
		scrollContainerRef,
		toggleRowExpansion,
		handleRowHeightChange,
		setIsAtBottom,
		setShowScrollToBottom,
		disableAutoScrollRef,
	} = scrollBehavior

	const { expandedRows, inputValue, setActiveQuote } = chatState

	const itemContent = useCallback(
		createMessageRenderer(
			groupedMessages,
			modifiedMessages,
			expandedRows,
			toggleRowExpansion,
			handleRowHeightChange,
			setActiveQuote,
			inputValue,
			messageHandlers,
		),
		[
			groupedMessages,
			modifiedMessages,
			expandedRows,
			toggleRowExpansion,
			handleRowHeightChange,
			setActiveQuote,
			inputValue,
			messageHandlers,
		],
	)

	return (
		<div className="overflow-hidden flex flex-col h-full">
			<div className="flex-grow flex" ref={scrollContainerRef}>
				<Virtuoso
					atBottomStateChange={(isAtBottom) => {
						setIsAtBottom(isAtBottom)
						// Don't automatically re-enable auto-scroll just because user is at bottom
						// User must explicitly scroll to bottom or use scroll button to re-enable
						setShowScrollToBottom(disableAutoScrollRef.current && !isAtBottom)
					}}
					// Treat within ~1 line as bottom to avoid jitter when close to the end
					atBottomThreshold={64}
					className="scrollable"
					components={{
						Footer: () => <div style={{ height: 5 }} />, // Add empty padding at the bottom
					}}
					computeItemKey={(index, item) =>
						Array.isArray(item) ? `group-${item[0]?.ts ?? index}` : `msg-${item.ts ?? index}`
					}
					// Keep item identity stable to prevent re-mount flicker on stream updates
					data={groupedMessages}
					// Optimized viewport buffering for better performance
					// Top: 3000px to prevent jumping when user collapses rows
					// Bottom: 10000px provides smooth scroll-to-bottom while using less memory than MAX_SAFE_INTEGER
					followOutput={disableAutoScrollRef.current ? false : "smooth"}
					// Smoothly follow new output when auto-scroll is enabled
					increaseViewportBy={{
						top: 3_000,
						bottom: 10_000,
					}}
					// Only set initial index if there are messages to scroll to
					// This prevents scroll events on initial empty state
					initialTopMostItemIndex={groupedMessages.length > 0 ? groupedMessages.length - 1 : 0}
					itemContent={itemContent}
					key={task.ts}
					ref={virtuosoRef} // anything lower causes issues with followOutput
					style={{
						flexGrow: 1,
						overflowY: "scroll", // always show scrollbar
					}}
				/>
			</div>
		</div>
	)
}
