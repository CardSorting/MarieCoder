/**
 * Hook for managing chat input state
 * Handles input text, active quote, and sending disabled state
 */

import { useCallback, useState } from "react"

export interface InputState {
	inputValue: string
	setInputValue: React.Dispatch<React.SetStateAction<string>>
	activeQuote: string | null
	setActiveQuote: React.Dispatch<React.SetStateAction<string | null>>
	sendingDisabled: boolean
	setSendingDisabled: React.Dispatch<React.SetStateAction<boolean>>
	resetInputState: () => void
}

/**
 * Custom hook for managing input state
 * @returns Input state and setters
 */
export function useInputStateHook(): InputState {
	const [inputValue, setInputValue] = useState("")
	const [activeQuote, setActiveQuote] = useState<string | null>(null)
	const [sendingDisabled, setSendingDisabled] = useState(false)

	const resetInputState = useCallback(() => {
		setInputValue("")
		setActiveQuote(null)
	}, [])

	return {
		inputValue,
		setInputValue,
		activeQuote,
		setActiveQuote,
		sendingDisabled,
		setSendingDisabled,
		resetInputState,
	}
}
