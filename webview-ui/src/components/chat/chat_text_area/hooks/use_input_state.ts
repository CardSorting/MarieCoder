/**
 * Consolidated hook for managing input state and cursor position
 */

import { useCallback, useLayoutEffect, useRef, useState } from "react"

export const useInputState = () => {
	const [cursorPosition, setCursorPosition] = useState(0)
	const [intendedCursorPosition, setIntendedCursorPosition] = useState<number | null>(null)
	const [isTextAreaFocused, setIsTextAreaFocused] = useState(false)
	const [thumbnailsHeight, setThumbnailsHeight] = useState(0)
	const [textAreaBaseHeight, setTextAreaBaseHeight] = useState<number | undefined>(undefined)
	const textAreaRef = useRef<HTMLTextAreaElement | null>(null)

	// Effect to set cursor position after state updates
	useLayoutEffect(() => {
		if (intendedCursorPosition !== null && textAreaRef.current) {
			textAreaRef.current.setSelectionRange(intendedCursorPosition, intendedCursorPosition)
			setIntendedCursorPosition(null)
		}
	}, [intendedCursorPosition])

	const updateCursorPosition = useCallback(() => {
		if (textAreaRef.current) {
			setCursorPosition(textAreaRef.current.selectionStart)
		}
	}, [])

	const handleThumbnailsHeightChange = useCallback((height: number) => {
		setThumbnailsHeight(height)
	}, [])

	return {
		cursorPosition,
		setCursorPosition,
		intendedCursorPosition,
		setIntendedCursorPosition,
		isTextAreaFocused,
		setIsTextAreaFocused,
		thumbnailsHeight,
		setThumbnailsHeight,
		textAreaBaseHeight,
		setTextAreaBaseHeight,
		textAreaRef,
		updateCursorPosition,
		handleThumbnailsHeightChange,
	}
}
