/**
 * Hook for managing message UI state
 * Handles expanded rows and other message display state
 */

import { useCallback, useState } from "react"

export interface MessageUIState {
	expandedRows: Record<number, boolean>
	setExpandedRows: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
	clearExpandedRows: () => void
}

/**
 * Custom hook for managing message UI state
 * @returns Message UI state and setters
 */
export function useMessageUIHook(): MessageUIState {
	const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

	const clearExpandedRows = useCallback(() => {
		setExpandedRows({})
	}, [])

	return {
		expandedRows,
		setExpandedRows,
		clearExpandedRows,
	}
}
