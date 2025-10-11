import { useCallback, useMemo, useState } from "react"

/**
 * Hook for managing bulk selection of history items
 */
export const useBulkSelection = (taskHistory: any[]) => {
	const [selectedItems, setSelectedItems] = useState<string[]>([])

	// Calculate total size of selected items
	const selectedItemsSize = useMemo(() => {
		if (selectedItems.length === 0) {
			return 0
		}

		return taskHistory.filter((item) => selectedItems.includes(item.id)).reduce((total, item) => total + (item.size || 0), 0)
	}, [selectedItems, taskHistory])

	// Handle individual item selection
	const handleHistorySelect = useCallback((itemId: string, checked: boolean) => {
		setSelectedItems((prev) => {
			if (checked) {
				return [...prev, itemId]
			}
			return prev.filter((id) => id !== itemId)
		})
	}, [])

	// Select all or none
	const handleBatchHistorySelect = useCallback((selectAll: boolean, searchResults: any[]) => {
		if (selectAll) {
			setSelectedItems(searchResults.map((item) => item.id))
		} else {
			setSelectedItems([])
		}
	}, [])

	// Clear selection after deletion
	const clearSelection = useCallback(() => {
		setSelectedItems([])
	}, [])

	return {
		selectedItems,
		selectedItemsSize,
		handleHistorySelect,
		handleBatchHistorySelect,
		clearSelection,
	}
}
