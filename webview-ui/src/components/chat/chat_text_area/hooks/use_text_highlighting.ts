/**
 * Custom hook for text highlighting in the input area
 */

import { mentionRegexGlobal } from "@shared/context-mentions"
import { useCallback, useLayoutEffect, useRef } from "react"
import { validateSlashCommand } from "@/utils/chat"

export interface UseTextHighlightingOptions {
	inputValue: string
	textAreaRef: React.RefObject<HTMLTextAreaElement | null>
	localWorkflowToggles: Record<string, boolean>
	globalWorkflowToggles: Record<string, boolean>
}

export const useTextHighlighting = ({
	inputValue,
	textAreaRef,
	localWorkflowToggles,
	globalWorkflowToggles,
}: UseTextHighlightingOptions) => {
	const highlightLayerRef = useRef<HTMLDivElement>(null)

	const updateHighlights = useCallback(() => {
		if (!textAreaRef.current || !highlightLayerRef.current) {
			return
		}

		let processedText = textAreaRef.current.value

		processedText = processedText
			.replace(/\n$/, "\n\n")
			.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] || c)
			// highlight @mentions
			.replace(mentionRegexGlobal, '<mark class="mention-context-textarea-highlight">$&</mark>')

		// check for highlighting /slash-commands
		if (/^\s*\//.test(processedText)) {
			const slashIndex = processedText.indexOf("/")

			// end of command is end of text or first whitespace
			const spaceIndex = processedText.indexOf(" ", slashIndex)
			const endIndex = spaceIndex > -1 ? spaceIndex : processedText.length

			// extract and validate the exact command text
			const commandText = processedText.substring(slashIndex + 1, endIndex)
			const isValidCommand = validateSlashCommand(commandText, localWorkflowToggles, globalWorkflowToggles)

			if (isValidCommand) {
				const fullCommand = processedText.substring(slashIndex, endIndex) // includes slash

				const highlighted = `<mark class="mention-context-textarea-highlight">${fullCommand}</mark>`
				processedText = processedText.substring(0, slashIndex) + highlighted + processedText.substring(endIndex)
			}
		}

		highlightLayerRef.current.innerHTML = processedText
		highlightLayerRef.current.scrollTop = textAreaRef.current.scrollTop
		highlightLayerRef.current.scrollLeft = textAreaRef.current.scrollLeft
	}, [localWorkflowToggles, globalWorkflowToggles, textAreaRef])

	useLayoutEffect(() => {
		updateHighlights()
	}, [inputValue, updateHighlights])

	const updateCursorPosition = useCallback(
		(setCursorPosition: (position: number) => void) => {
			if (textAreaRef.current) {
				setCursorPosition(textAreaRef.current.selectionStart)
			}
		},
		[textAreaRef],
	)

	return {
		highlightLayerRef,
		updateHighlights,
		updateCursorPosition,
	}
}
