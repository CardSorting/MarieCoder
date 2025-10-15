/**
 * Shared types and interfaces for the chat view components
 */

import { ClineAsk, ClineMessage } from "@shared/ExtensionMessage"
import { VirtuosoHandle } from "react-virtuoso"
import { ButtonActionType } from "../shared/buttonConfig"

/**
 * Main ChatView component props
 */
export interface ChatViewProps {
	isHidden: boolean
	showHistoryView: () => void
}

/**
 * Simplified chat state interface
 * Combines input, attachments, and message UI state
 * Note: Button state is now derived, not stored
 * Note: Focus state is internal to ChatTextArea
 * Note: textAreaRef is owned by ChatView and forwarded
 */
export interface ChatState {
	// Input state
	inputValue: string
	setInputValue: React.Dispatch<React.SetStateAction<string>>
	activeQuote: string | null
	setActiveQuote: React.Dispatch<React.SetStateAction<string | null>>
	sendingDisabled: boolean
	setSendingDisabled: React.Dispatch<React.SetStateAction<boolean>>

	// Attachments
	selectedImages: string[]
	setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>
	selectedFiles: string[]
	setSelectedFiles: React.Dispatch<React.SetStateAction<string[]>>

	// Message UI
	expandedRows: Record<number, boolean>
	setExpandedRows: React.Dispatch<React.SetStateAction<Record<number, boolean>>>

	// Refs (forwarded from ChatView)
	textAreaRef: React.RefObject<HTMLTextAreaElement>
}

/**
 * Message handlers interface
 */
export interface MessageHandlers {
	executeButtonAction: (action: ButtonActionType, text?: string, images?: string[], files?: string[]) => Promise<void>
	handleSendMessage: (text: string, images: string[], files: string[]) => Promise<void>
	handleTaskCloseButtonClick: () => void
	startNewTask: () => Promise<void>
}

/**
 * Scroll behavior interface
 */
export interface ScrollBehavior {
	virtuosoRef: React.RefObject<VirtuosoHandle>
	scrollContainerRef: React.RefObject<HTMLDivElement>
	disableAutoScrollRef: React.MutableRefObject<boolean>
	scrollToBottomSmooth: () => void
	scrollToBottomAuto: () => void
	scrollToMessage: (messageIndex: number) => void
	toggleRowExpansion: (ts: number) => void
	handleRowHeightChange: (isTaller: boolean) => void
	showScrollToBottom: boolean
	setShowScrollToBottom: React.Dispatch<React.SetStateAction<boolean>>
	isAtBottom: boolean
	setIsAtBottom: React.Dispatch<React.SetStateAction<boolean>>
	pendingScrollToMessage: number | null
	setPendingScrollToMessage: React.Dispatch<React.SetStateAction<number | null>>
}

/**
 * Button state interface
 */
export interface ButtonState {
	enableButtons: boolean
	primaryButtonText: string | undefined
	secondaryButtonText: string | undefined
}

/**
 * Input state interface
 */
export interface InputState {
	inputValue: string
	selectedImages: string[]
	selectedFiles: string[]
	activeQuote: string | null
	isTextAreaFocused: boolean
}

/**
 * Task section props
 */
export interface TaskSectionProps {
	task: ClineMessage
	messages: ClineMessage[]
	scrollBehavior: ScrollBehavior
	buttonState: ButtonState
	messageHandlers: MessageHandlers
	chatState: ChatState
	apiMetrics: {
		totalTokensIn: number
		totalTokensOut: number
		totalCacheWrites?: number
		totalCacheReads?: number
		totalCost: number
	}
	lastApiReqTotalTokens?: number
	selectedModelInfo: {
		supportsPromptCache: boolean
		supportsImages: boolean
	}
	isStreaming: boolean
	clineAsk?: ClineAsk
	modifiedMessages: ClineMessage[]
}

/**
 * Welcome section props
 */
export interface WelcomeSectionProps {
	showHistoryView: () => void
	version: string
	taskHistory: any[]
}

/**
 * Input section props
 */
export interface InputSectionProps {
	chatState: ChatState
	messageHandlers: MessageHandlers
	textAreaRef: React.RefObject<HTMLTextAreaElement>
	onFocusChange: (isFocused: boolean) => void
	onInputChange: (value: string) => void
	onQuoteChange: (quote: string | null) => void
	onImagesChange: (images: string[]) => void
	onFilesChange: (files: string[]) => void
	placeholderText: string
	shouldDisableFilesAndImages: boolean
	selectFilesAndImages: () => Promise<void>
}
