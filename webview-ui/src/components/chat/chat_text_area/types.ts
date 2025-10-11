/**
 * Type definitions for ChatTextArea component
 */

import type { ContextMenuOptionType } from "@/utils/chat"

export interface ChatTextAreaProps {
	inputValue: string
	activeQuote: string | null
	setInputValue: (value: string) => void
	sendingDisabled: boolean
	placeholderText: string
	selectedFiles: string[]
	selectedImages: string[]
	setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>
	setSelectedFiles: React.Dispatch<React.SetStateAction<string[]>>
	onSend: () => void
	onSelectFilesAndImages: () => void
	shouldDisableFilesAndImages: boolean
	onHeightChange?: (height: number) => void
	onFocusChange?: (isFocused: boolean) => void
}

export interface GitCommit {
	type: ContextMenuOptionType.Git
	value: string
	label: string
	description: string
}

export interface ModelSelectorTooltipProps {
	menuPosition: number
	arrowPosition: number
}
