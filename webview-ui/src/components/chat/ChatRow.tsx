import type { ClineMessage } from "@shared/ExtensionMessage"
import { memo, useEffect, useRef } from "react"
import deepEqual from "@/utils/deep_equal"
import { useSize } from "@/utils/hooks"
import { ChatRowContent } from "./chat_row/ChatRowContent"

/**
 * Props for the ChatRow component
 */
interface ChatRowProps {
	message: ClineMessage
	isExpanded: boolean
	onToggleExpand: (ts: number) => void
	lastModifiedMessage?: ClineMessage
	isLast: boolean
	onHeightChange: (isTaller: boolean) => void
	inputValue?: string
	sendMessageFromChatRow?: (text: string, images: string[], files: string[]) => void
	onSetQuote: (text: string) => void
}

/**
 * ChatRow component - handles height tracking and wraps ChatRowContent
 * This is the main container for each message in the chat
 */
const ChatRow = memo(
	(props: ChatRowProps) => {
		const { isLast, onHeightChange, message } = props
		// Store the previous height to compare with the current height
		// This allows us to detect changes without causing re-renders
		const prevHeightRef = useRef(0)

		const chatrowRef = useRef<HTMLDivElement>(null)
		const chatrowSize = useSize(chatrowRef)
		const height = chatrowSize.height

		useEffect(() => {
			// Used for partials command output etc.
			// NOTE: it's important we don't distinguish between partial or complete here
			// since our scroll effects in chatview need to handle height change during partial -> complete
			const isInitialRender = prevHeightRef.current === 0 // prevents scrolling when new element is added since we already scroll for that
			// height starts off at Infinity
			if (isLast && height !== 0 && height !== Infinity && height !== prevHeightRef.current) {
				if (!isInitialRender) {
					onHeightChange(height > prevHeightRef.current)
				}
				prevHeightRef.current = height
			}
		}, [height, isLast, onHeightChange, message])

		return (
			<div className="group py-2.5 pr-1.5 pl-[15px] relative [&:hover_.checkpoint-controls]:opacity-100" ref={chatrowRef}>
				<ChatRowContent {...props} />
			</div>
		)
	},
	// memo does shallow comparison of props, so we need to do deep comparison
	// of arrays/objects whose properties might change
	deepEqual,
)

export default ChatRow

// Re-export ProgressIndicator for backward compatibility
export { ProgressIndicator } from "./chat_row/components/ProgressIndicator"
