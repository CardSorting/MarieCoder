/**
 * LiveRegion Component
 *
 * ARIA live region for announcing dynamic content changes to screen readers.
 * Uses aria-live to politely announce status updates or assertively announce alerts.
 *
 * @module components/common/LiveRegion
 */

import React, { useEffect, useState } from "react"

export interface LiveRegionProps {
	/** The message to announce to screen readers */
	message: string
	/** Politeness level for announcements */
	politeness?: "polite" | "assertive"
	/** Clear the message after this many milliseconds (0 to disable) */
	clearAfter?: number
	/** Additional CSS class names */
	className?: string
}

/**
 * LiveRegion component for ARIA live announcements
 *
 * @example
 * // Polite announcement that auto-clears
 * <LiveRegion message="Content loaded successfully" politeness="polite" clearAfter={3000} />
 *
 * @example
 * // Assertive announcement for errors
 * <LiveRegion message="Error: Failed to load data" politeness="assertive" />
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({ message, politeness = "polite", clearAfter = 5000, className = "" }) => {
	const [displayMessage, setDisplayMessage] = useState(message)

	useEffect(() => {
		// Update message when it changes
		if (message) {
			setDisplayMessage(message)

			// Clear after timeout if configured
			if (clearAfter > 0) {
				const timer = setTimeout(() => {
					setDisplayMessage("")
				}, clearAfter)

				return () => clearTimeout(timer)
			}
		} else {
			setDisplayMessage("")
		}
	}, [message, clearAfter])

	// Don't render if no message
	if (!displayMessage) {
		return null
	}

	return (
		<div
			aria-atomic="true"
			aria-live={politeness}
			className={`sr-only ${className}`.trim()}
			role={politeness === "assertive" ? "alert" : "status"}>
			{displayMessage}
		</div>
	)
}

/**
 * Convenience component for success announcements
 */
export const SuccessAnnouncement: React.FC<{ message: string; clearAfter?: number }> = ({ message, clearAfter = 3000 }) => {
	return <LiveRegion clearAfter={clearAfter} message={message} politeness="polite" />
}

/**
 * Convenience component for error announcements
 */
export const ErrorAnnouncement: React.FC<{ message: string; clearAfter?: number }> = ({
	message,
	clearAfter = 0, // Errors don't auto-clear by default
}) => {
	return <LiveRegion clearAfter={clearAfter} message={message} politeness="assertive" />
}

/**
 * Convenience component for loading announcements
 */
export const LoadingAnnouncement: React.FC<{ message: string; isLoading: boolean }> = ({ message, isLoading }) => {
	return <LiveRegion clearAfter={0} message={isLoading ? message : ""} politeness="polite" />
}

export default LiveRegion
