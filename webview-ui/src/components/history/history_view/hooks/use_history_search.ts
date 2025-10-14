import type Fuse from "fuse.js"
import { useEffect, useMemo, useState } from "react"
import { useWebWorker, WorkerTasks } from "@/utils/web_worker_manager"
import { getMarkdownWorkerScript } from "@/workers"
import { highlight } from "../utils/highlight_utils"
import { type SortOption, sortTaskHistory } from "../utils/sort_utils"

/**
 * Hook for managing fuzzy search with Fuse.js
 * Automatically delegates to web workers for large datasets (>50 tasks)
 * to keep UI responsive during search operations
 */
export const useHistorySearch = (tasks: any[], searchQuery: string, sortOption: SortOption) => {
	// Lazy load Fuse.js only when needed (for main thread searches)
	const [FuseConstructor, setFuseConstructor] = useState<typeof Fuse | null>(null)

	// Initialize web worker for heavy search operations with bundled dependencies
	const { executeTask } = useWebWorker({
		workerScript: getMarkdownWorkerScript(),
		debug: false,
	})

	useEffect(() => {
		// Only load Fuse.js if there's a search query and small dataset (main thread)
		if (searchQuery && !FuseConstructor && tasks.length <= 50) {
			import("fuse.js/min-basic").then((module) => {
				setFuseConstructor(() => module.default)
			})
		}
	}, [searchQuery, FuseConstructor, tasks.length])

	// Create Fuse instance for main thread searches (small datasets)
	const fuse = useMemo(() => {
		if (!FuseConstructor || tasks.length > 50) {
			return null
		}
		return new FuseConstructor(tasks, {
			keys: ["task"],
			threshold: 0.6,
			shouldSort: true,
			isCaseSensitive: false,
			ignoreLocation: false,
			includeMatches: true,
			minMatchCharLength: 1,
		})
	}, [tasks, FuseConstructor])

	// Perform search with smart worker delegation
	const searchResults = useMemo(() => {
		if (!searchQuery) {
			return sortTaskHistory(tasks, sortOption, false)
		}

		// Use worker for large datasets (>50 tasks) and meaningful queries (>2 chars)
		if (tasks.length > 50 && searchQuery.length > 2) {
			// Async search in worker - we'll handle this in useEffect
			return tasks // Return current tasks while searching
		}

		// Use main thread for small datasets or short queries
		const results = fuse ? highlight(fuse.search(searchQuery)) : tasks
		return sortTaskHistory(results, sortOption, true)
	}, [tasks, searchQuery, fuse, sortOption])

	// Handle worker-based search for large datasets
	const [workerResults, setWorkerResults] = useState<any[] | null>(null)

	useEffect(() => {
		// Only use worker for large datasets with meaningful queries
		if (!searchQuery || tasks.length <= 50 || searchQuery.length <= 2) {
			setWorkerResults(null)
			return
		}

		const performWorkerSearch = async () => {
			try {
				const rawResults = await executeTask(
					WorkerTasks.fuzzySearch(
						`history-search-${Date.now()}`,
						searchQuery,
						tasks,
						["task"],
						{
							threshold: 0.6,
							shouldSort: true,
							isCaseSensitive: false,
						},
						"high",
					),
				)

				// Apply highlighting and sorting
				const highlightedResults = highlight(rawResults as any)
				const sortedResults = sortTaskHistory(highlightedResults, sortOption, true)
				setWorkerResults(sortedResults)
			} catch (error) {
				console.warn("[History Search] Worker search failed, falling back to main thread:", error)
				// Fallback: trigger Fuse.js loading for main thread
				if (!FuseConstructor) {
					import("fuse.js/min-basic").then((module) => {
						setFuseConstructor(() => module.default)
					})
				}
				setWorkerResults(null)
			}
		}

		performWorkerSearch()
	}, [tasks, searchQuery, sortOption, executeTask, FuseConstructor])

	// Return worker results if available, otherwise return main thread results
	return workerResults || searchResults
}
