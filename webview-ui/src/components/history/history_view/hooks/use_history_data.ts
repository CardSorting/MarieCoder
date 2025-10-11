import { BooleanRequest, EmptyRequest, StringArrayRequest, StringRequest } from "@shared/proto/cline/common"
import { GetTaskHistoryRequest, TaskFavoriteRequest } from "@shared/proto/cline/task"
import { useCallback, useEffect, useState } from "react"
import { TaskServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import type { SortOption } from "../utils/sort_utils"

/**
 * Hook for managing history data fetching and operations
 */
export const useHistoryData = (
	showFavoritesOnly: boolean,
	showCurrentWorkspaceOnly: boolean,
	searchQuery: string,
	sortOption: SortOption,
	onRelinquishControl: (callback: () => void) => () => void,
	setTotalTasksSize?: (size: number) => void,
) => {
	const [tasks, setTasks] = useState<any[]>([])
	const [deleteAllDisabled, setDeleteAllDisabled] = useState(false)
	const [pendingFavoriteToggles, setPendingFavoriteToggles] = useState<Record<string, boolean>>({})

	// Load task history from gRPC
	const loadTaskHistory = useCallback(async () => {
		try {
			const response = await TaskServiceClient.getTaskHistory(
				GetTaskHistoryRequest.create({
					favoritesOnly: showFavoritesOnly,
					searchQuery: searchQuery || undefined,
					sortBy: sortOption,
					currentWorkspaceOnly: showCurrentWorkspaceOnly,
				}),
			)
			setTasks(response.tasks || [])
		} catch (error) {
			debug.error("Error loading task history:", error)
		}
	}, [showFavoritesOnly, showCurrentWorkspaceOnly, searchQuery, sortOption])

	// Load when filters change
	useEffect(() => {
		// Force a complete refresh when both filters are active
		if (showFavoritesOnly && showCurrentWorkspaceOnly) {
			setTasks([])
		}
		loadTaskHistory()
	}, [loadTaskHistory, showFavoritesOnly, showCurrentWorkspaceOnly])

	// Fetch total tasks size
	const fetchTotalTasksSize = useCallback(async () => {
		try {
			const response = await TaskServiceClient.getTotalTasksSize(EmptyRequest.create({}))
			if (response && typeof response.value === "number") {
				setTotalTasksSize?.(response.value || 0)
			}
		} catch (error) {
			debug.error("Error getting total tasks size:", error)
		}
	}, [setTotalTasksSize])

	// Request total tasks size on mount
	useEffect(() => {
		fetchTotalTasksSize()
	}, [fetchTotalTasksSize])

	// Reset delete all button on control release
	useEffect(() => {
		return onRelinquishControl(() => {
			setDeleteAllDisabled(false)
		})
	}, [onRelinquishControl])

	// Toggle favorite status
	const toggleFavorite = useCallback(
		async (taskId: string, currentValue: boolean) => {
			// Optimistic UI update
			setPendingFavoriteToggles((prev) => ({ ...prev, [taskId]: !currentValue }))

			try {
				await TaskServiceClient.toggleTaskFavorite(
					TaskFavoriteRequest.create({
						taskId,
						isFavorited: !currentValue,
					}),
				)

				// Refresh if either filter is active
				if (showFavoritesOnly || showCurrentWorkspaceOnly) {
					loadTaskHistory()
				}
			} catch (err) {
				debug.error(`[FAVORITE_TOGGLE_UI] Error for task ${taskId}:`, err)
				// Revert optimistic update
				setPendingFavoriteToggles((prev) => {
					const updated = { ...prev }
					delete updated[taskId]
					return updated
				})
			} finally {
				// Clean up pending state after 1 second
				setTimeout(() => {
					setPendingFavoriteToggles((prev) => {
						const updated = { ...prev }
						delete updated[taskId]
						return updated
					})
				}, 1000)
			}
		},
		[showFavoritesOnly, showCurrentWorkspaceOnly, loadTaskHistory],
	)

	// Show task by ID
	const handleShowTaskWithId = useCallback((id: string) => {
		TaskServiceClient.showTaskWithId(StringRequest.create({ value: id })).catch((error) =>
			debug.error("Error showing task:", error),
		)
	}, [])

	// Delete single history item
	const handleDeleteHistoryItem = useCallback(
		(id: string) => {
			TaskServiceClient.deleteTasksWithIds(StringArrayRequest.create({ value: [id] }))
				.then(() => fetchTotalTasksSize())
				.catch((error) => debug.error("Error deleting task:", error))
		},
		[fetchTotalTasksSize],
	)

	// Delete selected items
	const handleDeleteSelectedHistoryItems = useCallback(
		(ids: string[]) => {
			if (ids.length > 0) {
				TaskServiceClient.deleteTasksWithIds(StringArrayRequest.create({ value: ids }))
					.then(() => fetchTotalTasksSize())
					.catch((error) => debug.error("Error deleting tasks:", error))
			}
		},
		[fetchTotalTasksSize],
	)

	// Delete all history
	const handleDeleteAllHistory = useCallback(async () => {
		setDeleteAllDisabled(true)
		try {
			await TaskServiceClient.deleteAllTaskHistory(BooleanRequest.create({}))
			await fetchTotalTasksSize()
		} catch (error) {
			debug.error("Error deleting task history:", error)
		} finally {
			setDeleteAllDisabled(false)
		}
	}, [fetchTotalTasksSize])

	return {
		tasks,
		deleteAllDisabled,
		pendingFavoriteToggles,
		toggleFavorite,
		handleShowTaskWithId,
		handleDeleteHistoryItem,
		handleDeleteSelectedHistoryItems,
		handleDeleteAllHistory,
	}
}
