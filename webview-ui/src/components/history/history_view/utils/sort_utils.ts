/**
 * Sorting utilities for history items
 */

export type SortOption = "newest" | "oldest" | "mostExpensive" | "mostTokens" | "mostRelevant"

/**
 * Sort task history based on the selected sort option
 * @param results - Array of task history items
 * @param sortOption - Sort method to apply
 * @param hasSearchQuery - Whether there's an active search query
 * @returns Sorted array (mutates in place for performance)
 */
export const sortTaskHistory = (results: any[], sortOption: SortOption, hasSearchQuery: boolean): any[] => {
	results.sort((a, b) => {
		switch (sortOption) {
			case "oldest":
				return a.ts - b.ts
			case "mostExpensive":
				return (b.totalCost || 0) - (a.totalCost || 0)
			case "mostTokens":
				return (
					(b.tokensIn || 0) +
					(b.tokensOut || 0) +
					(b.cacheWrites || 0) +
					(b.cacheReads || 0) -
					((a.tokensIn || 0) + (a.tokensOut || 0) + (a.cacheWrites || 0) + (a.cacheReads || 0))
				)
			case "mostRelevant":
				// NOTE: you must never sort directly on object since it will cause members to be reordered
				return hasSearchQuery ? 0 : b.ts - a.ts // Keep fuse order if searching, otherwise sort by newest
			case "newest":
			default:
				return b.ts - a.ts
		}
	})

	return results
}
