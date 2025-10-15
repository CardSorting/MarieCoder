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
const ChatRow = memo((props: ChatRowProps) => {
	const { isLast, onHeightChange } = props
	const prevHeightRef = useRef(0)
	const chatrowRef = useRef<HTMLDivElement>(null)
	const height = useSize(chatrowRef).height

	useEffect(() => {
		if (!isLast || height === 0 || height === Infinity || height === prevHeightRef.current) {
			return
		}

		const isInitialRender = prevHeightRef.current === 0
		if (!isInitialRender) {
			onHeightChange(height > prevHeightRef.current)
		}
		prevHeightRef.current = height
	}, [height, isLast, onHeightChange])

	return (
		<div className="group py-2.5 pr-1.5 pl-[15px] relative [&:hover_.checkpoint-controls]:opacity-100" ref={chatrowRef}>
			<ChatRowContent {...props} />
		</div>
	)
}, deepEqual)

export default ChatRow

export { ChatRowContent } from "./chat_row/ChatRowContent"
// Re-export components for backward compatibility
export { ProgressIndicator } from "./chat_row/components/ProgressIndicator"
