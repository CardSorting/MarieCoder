/**
 * Hook for context button (@-mention trigger) functionality
 */

import { useCallback } from "react"

export interface UseContextButtonOptions {
	inputValue: string
	textAreaRef: React.RefObject<HTMLTextAreaElement | null>
	handleInputChange: (newValue: string, newCursorPosition: number) => void
	updateHighlights: () => void
}

export const useContextButton = ({ inputValue, textAreaRef, handleInputChange, updateHighlights }: UseContextButtonOptions) => {
	const handleContextButtonClick = useCallback(() => {
		textAreaRef.current?.focus()

		if (!inputValue.trim()) {
			const _event = {
				target: { value: "@", selectionStart: 1 },
			} as React.ChangeEvent<HTMLTextAreaElement>
			handleInputChange("@", 1)
			updateHighlights()
			return
		}

		if (inputValue.endsWith(" ")) {
			const newValue = inputValue + "@"
			handleInputChange(newValue, newValue.length)
			updateHighlights()
			return
		}

		const newValue = inputValue + " @"
		handleInputChange(newValue, newValue.length)
		updateHighlights()
	}, [inputValue, handleInputChange, updateHighlights, textAreaRef])

	return { handleContextButtonClick }
}
