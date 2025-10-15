import { ClineMessage } from "@shared/ExtensionMessage"
import { useRef, useState } from "react"
import { ChatState } from "../types/chatTypes"

/**
 * @deprecated This hook is deprecated and will be removed in a future version.
 * Use the focused hooks instead:
 * - useInputStateHook() for input, quote, and sending disabled state
 * - useAttachmentsHook() for selected images and files
 * - useMessageUIHook() for expanded rows
 * - Derive button state from getButtonConfig(lastMessage, mode)
 * - Keep textAreaRef in parent component and forward to ChatTextArea
 * - Keep focus state internal to ChatTextArea
 *
 * See: docs/refactoring/chat_state_duplication_analysis.md
 *
 * Custom hook for managing chat state (DEPRECATED)
 * Handles input values, selection states, and UI state
 */
export function useChatState(_messages: ClineMessage[]): ChatState {
	// Input and selection state
	const [inputValue, setInputValue] = useState("")
	const [activeQuote, setActiveQuote] = useState<string | null>(null)
	const [selectedImages, setSelectedImages] = useState<string[]>([])
	const [selectedFiles, setSelectedFiles] = useState<string[]>([])

	// UI state
	const [sendingDisabled, setSendingDisabled] = useState(false)
	const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

	// Refs
	const textAreaRef = useRef<HTMLTextAreaElement>(null)

	return {
		// State values
		inputValue,
		setInputValue,
		activeQuote,
		setActiveQuote,
		selectedImages,
		setSelectedImages,
		selectedFiles,
		setSelectedFiles,
		sendingDisabled,
		setSendingDisabled,
		expandedRows,
		setExpandedRows,

		// Refs
		textAreaRef,
	}
}
