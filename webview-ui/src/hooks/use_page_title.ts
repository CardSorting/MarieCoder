import { useEffect } from "react"

/**
 * Custom hook for managing dynamic page titles
 * Updates document.title and announces changes to screen readers
 *
 * @example
 * ```tsx
 * usePageTitle("Settings") // Sets title to "Settings - NormieDev"
 * ```
 */
export function usePageTitle(title: string) {
	useEffect(() => {
		const appName = "NormieDev"
		const fullTitle = title ? `${title} - ${appName}` : appName

		// Update document title
		document.title = fullTitle

		// Announce to screen readers
		// This helps screen reader users know when the view has changed
		const announcement = `Now viewing ${title}`
		const liveRegion = document.getElementById("page-title-announcer")
		if (liveRegion) {
			liveRegion.textContent = announcement
		}

		// Clean up
		return () => {
			document.title = appName
		}
	}, [title])
}

/**
 * Gets appropriate page title based on current view and context
 *
 * @param view - The current view name
 * @param context - Optional context (e.g., current task title)
 * @returns Formatted page title
 */
export function getPageTitle(view: string, context?: string): string {
	if (context) {
		return `${view}: ${context}`
	}
	return view
}
