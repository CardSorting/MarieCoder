import type Fuse from "fuse.js"
import { useEffect, useMemo, useState } from "react"
import { highlight } from "../utils/highlight_utils"
import { type SortOption, sortTaskHistory } from "../utils/sort_utils"

/**
 * Hook for managing fuzzy search with Fuse.js
 * Lazy loads the library only when needed
 */
export const useHistorySearch = (tasks: any[], searchQuery: string, sortOption: SortOption) => {
	// Lazy load Fuse.js only when needed
	const [FuseConstructor, setFuseConstructor] = useState<typeof Fuse | null>(null)

	useEffect(() => {
		// Only load Fuse.js if there's a search query
		if (searchQuery && !FuseConstructor) {
			import("fuse.js/min-basic").then((module) => {
				setFuseConstructor(() => module.default)
			})
		}
	}, [searchQuery, FuseConstructor])

	// Create Fuse instance
	const fuse = useMemo(() => {
		if (!FuseConstructor) {
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

	// Perform search and sort
	const searchResults = useMemo(() => {
		const results = searchQuery && fuse ? highlight(fuse.search(searchQuery)) : tasks
		return sortTaskHistory(results, sortOption, !!searchQuery)
	}, [tasks, searchQuery, fuse, sortOption])

	return searchResults
}
