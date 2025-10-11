import type { FuseResult } from "fuse.js"

/**
 * Fuzzy search highlighting utility functions
 * Based on: https://gist.github.com/evenfrost/1ba123656ded32fb7a0cd4651efd4db0
 */

/**
 * Set a value in a nested object using dot notation
 */
const set = (obj: Record<string, any>, path: string, value: any) => {
	const pathValue = path.split(".")
	let i: number

	for (i = 0; i < pathValue.length - 1; i++) {
		obj = obj[pathValue[i]] as Record<string, any>
	}

	obj[pathValue[i]] = value
}

/**
 * Merge overlapping or adjacent highlight regions
 */
const mergeRegions = (regions: [number, number][]): [number, number][] => {
	if (regions.length === 0) {
		return regions
	}

	// Sort regions by start index
	regions.sort((a, b) => a[0] - b[0])

	const merged: [number, number][] = [regions[0]]

	for (let i = 1; i < regions.length; i++) {
		const last = merged[merged.length - 1]
		const current = regions[i]

		if (current[0] <= last[1] + 1) {
			// Overlapping or adjacent regions
			last[1] = Math.max(last[1], current[1])
		} else {
			merged.push(current)
		}
	}

	return merged
}

/**
 * Generate highlighted text by wrapping regions in HTML spans
 */
const generateHighlightedText = (inputText: string, regions: [number, number][] = [], highlightClassName: string) => {
	if (regions.length === 0) {
		return inputText
	}

	// Sort and merge overlapping regions
	const mergedRegions = mergeRegions(regions)

	let content = ""
	let nextUnhighlightedRegionStartingIndex = 0

	mergedRegions.forEach((region) => {
		const start = region[0]
		const end = region[1]
		const lastRegionNextIndex = end + 1

		content += [
			inputText.substring(nextUnhighlightedRegionStartingIndex, start),
			`<span class="${highlightClassName}">`,
			inputText.substring(start, lastRegionNextIndex),
			"</span>",
		].join("")

		nextUnhighlightedRegionStartingIndex = lastRegionNextIndex
	})

	content += inputText.substring(nextUnhighlightedRegionStartingIndex)

	return content
}

/**
 * Highlight search matches in Fuse.js results
 * @param fuseSearchResult - Search results from Fuse.js
 * @param highlightClassName - CSS class name for highlighted text
 * @returns Array of items with highlighted matches
 */
export const highlight = (fuseSearchResult: FuseResult<any>[], highlightClassName: string = "history-item-highlight") => {
	return fuseSearchResult
		.filter(({ matches }) => matches && matches.length)
		.map(({ item, matches }) => {
			const highlightedItem = { ...item }

			matches?.forEach((match) => {
				if (match.key && typeof match.value === "string" && match.indices) {
					// Merge overlapping regions before generating highlighted text
					const mergedIndices = mergeRegions([...match.indices])
					set(highlightedItem, match.key, generateHighlightedText(match.value, mergedIndices, highlightClassName))
				}
			})

			return highlightedItem
		})
}
