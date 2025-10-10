/**
 * Skip Navigation Component
 *
 * Provides a skip link that allows keyboard users to bypass repetitive navigation
 * and jump directly to the main content area. The link is visually hidden until
 * it receives focus via Tab key.
 *
 * @module components/common/SkipNavigation
 */

import React from "react"

/**
 * Skip Navigation Link
 *
 * Appears at the very top of the page when a keyboard user presses Tab.
 * Allows users to skip repetitive navigation elements and jump to main content.
 *
 * @example
 * <SkipNavigation />
 * // Later in the DOM:
 * <main id="main-content" tabIndex={-1}>
 *   {/ * Main content * /}
 * </main>
 */
export const SkipNavigation: React.FC = () => {
	const handleSkipClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		e.preventDefault()
		const mainContent = document.getElementById("main-content")
		if (mainContent) {
			mainContent.focus()
			mainContent.scrollIntoView({ behavior: "smooth", block: "start" })
		}
	}

	return (
		<a
			className="sr-only"
			href="#main-content"
			onClick={handleSkipClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault()
					handleSkipClick(e as any)
				}
			}}>
			Skip to main content
		</a>
	)
}

export default SkipNavigation
