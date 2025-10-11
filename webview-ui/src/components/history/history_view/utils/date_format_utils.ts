/**
 * Date formatting utilities for history items
 */

/**
 * Format a timestamp for display in history
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "DECEMBER 25, 3:45PM")
 */
export const formatHistoryDate = (timestamp: number): string => {
	const date = new Date(timestamp)
	return date
		?.toLocaleString("en-US", {
			month: "long",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		})
		.replace(", ", " ")
		.replace(" at", ",")
		.toUpperCase()
}
