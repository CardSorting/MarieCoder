/**
 * Hook for managing error message display with auto-dismiss
 */

import { useCallback, useRef, useState } from "react"
import { ERROR_MESSAGE_DURATION } from "../utils/constants"

export const useErrorMessages = () => {
	const [showUnsupportedFileError, setShowUnsupportedFileError] = useState(false)
	const [showDimensionError, setShowDimensionError] = useState(false)
	const unsupportedFileTimerRef = useRef<NodeJS.Timeout | null>(null)
	const dimensionErrorTimerRef = useRef<NodeJS.Timeout | null>(null)

	const showDimensionErrorMessage = useCallback(() => {
		setShowDimensionError(true)
		if (dimensionErrorTimerRef.current) {
			clearTimeout(dimensionErrorTimerRef.current)
		}
		dimensionErrorTimerRef.current = setTimeout(() => {
			setShowDimensionError(false)
			dimensionErrorTimerRef.current = null
		}, ERROR_MESSAGE_DURATION)
	}, [])

	const showUnsupportedFileErrorMessage = useCallback(() => {
		setShowUnsupportedFileError(true)
		if (unsupportedFileTimerRef.current) {
			clearTimeout(unsupportedFileTimerRef.current)
		}
		unsupportedFileTimerRef.current = setTimeout(() => {
			setShowUnsupportedFileError(false)
			unsupportedFileTimerRef.current = null
		}, ERROR_MESSAGE_DURATION)
	}, [])

	return {
		showUnsupportedFileError,
		showDimensionError,
		showDimensionErrorMessage,
		showUnsupportedFileErrorMessage,
	}
}
