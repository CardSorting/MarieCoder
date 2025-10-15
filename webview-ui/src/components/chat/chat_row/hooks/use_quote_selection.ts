import type { MouseEvent } from "react"
import { useCallback, useRef, useState } from "react"

/**
 * State for the quote button position and visibility
 */
export interface QuoteButtonState {
	visible: boolean
	top: number
	left: number
	selectedText: string
}

/**
 * Custom hook for handling text selection and quote button functionality
 * @param onSetQuote - Callback to handle when text is quoted
 * @returns Object containing quote button state, content ref, and event handlers
 */
export const useQuoteSelection = (onSetQuote: (text: string) => void) => {
	const [quoteButtonState, setQuoteButtonState] = useState<QuoteButtonState>({
		visible: false,
		top: 0,
		left: 0,
		selectedText: "",
	})
	const contentRef = useRef<HTMLDivElement>(null)

	// Use ref to track selected text without causing callback recreation
	const selectedTextRef = useRef<string>("")

	// Sync state to ref whenever quoteButtonState changes
	selectedTextRef.current = quoteButtonState.selectedText

	/**
	 * Handles the quote button click
	 */
	const handleQuoteClick = useCallback(() => {
		// Use ref value instead of state to avoid circular dependency
		onSetQuote(selectedTextRef.current)
		window.getSelection()?.removeAllRanges() // Clear the browser selection
		setQuoteButtonState({ visible: false, top: 0, left: 0, selectedText: "" })
	}, [onSetQuote])

	/**
	 * Handles mouse up events to show/hide the quote button
	 */
	const handleMouseUp = useCallback((event: MouseEvent<HTMLDivElement>) => {
		// Get the target element immediately, before the timeout
		const targetElement = event.target as Element
		const isClickOnButton = !!targetElement.closest(".quote-button-class")

		// Delay the selection check slightly
		setTimeout(() => {
			// Now, check the selection state *after* the browser has likely updated it
			const selection = window.getSelection()
			const selectedText = selection?.toString().trim() ?? ""

			let shouldShowButton = false
			let buttonTop = 0
			let buttonLeft = 0
			let textToQuote = ""

			// Condition 1: Check if there's a valid, non-collapsed selection within bounds
			// Ensure contentRef.current still exists in case component unmounted during timeout
			if (selectedText && contentRef.current && selection && selection.rangeCount > 0 && !selection.isCollapsed) {
				const range = selection.getRangeAt(0)
				const rangeRect = range.getBoundingClientRect()
				// Re-check ref inside timeout and ensure containerRect is valid
				const containerRect = contentRef.current?.getBoundingClientRect()

				if (containerRect) {
					// Check if containerRect was successfully obtained
					const tolerance = 5 // Allow for a small pixel overflow (e.g., for margins)
					const isSelectionWithin =
						rangeRect.top >= containerRect.top &&
						rangeRect.left >= containerRect.left &&
						rangeRect.bottom <= containerRect.bottom + tolerance && // Added tolerance
						rangeRect.right <= containerRect.right

					if (isSelectionWithin) {
						shouldShowButton = true // Mark that we should show the button
						const buttonHeight = 30
						// Calculate the raw top position relative to the container, placing it above the selection
						const calculatedTop = rangeRect.top - containerRect.top - buttonHeight - 5 // Subtract button height and a small margin
						// Allow the button to potentially have a negative top value
						buttonTop = calculatedTop
						buttonLeft = Math.max(0, rangeRect.left - containerRect.left) // Still prevent going left of container
						textToQuote = selectedText
					}
				}
			}

			// Decision: Set the state based on whether we should show or hide
			if (shouldShowButton) {
				// Scenario A: Valid selection exists -> Show button
				setQuoteButtonState({
					visible: true,
					top: buttonTop,
					left: buttonLeft,
					selectedText: textToQuote,
				})
			} else if (!isClickOnButton) {
				// Scenario B: No valid selection AND click was NOT on button -> Hide button
				setQuoteButtonState({ visible: false, top: 0, left: 0, selectedText: "" })
			}
			// Scenario C (Click WAS on button): Do nothing here, handleQuoteClick takes over.
		}, 0) // Delay of 0ms pushes execution after current event cycle
	}, []) // Dependencies remain empty

	return {
		quoteButtonState,
		contentRef,
		handleQuoteClick,
		handleMouseUp,
	}
}
