/**
 * StateDisplay - Unified wrapper for loading, error, and empty states
 *
 * This component provides a consistent way to handle different UI states:
 * - Loading: Shows skeleton loaders or loading message
 * - Error: Shows error message with optional retry action
 * - Empty: Shows empty state with call-to-action
 * - Success: Shows children content
 *
 * Benefits:
 * - Consistent UX across the application
 * - Accessible (proper ARIA announcements)
 * - Reduces boilerplate code
 * - Better than spinners (skeleton loaders)
 *
 * @example
 * ```typescript
 * <StateDisplay
 *   isLoading={isLoading}
 *   error={error}
 *   isEmpty={items.length === 0}
 *   emptyState={{
 *     icon: "inbox",
 *     title: "No messages yet",
 *     description: "Start a conversation to see messages here",
 *     action: { label: "New Conversation", onClick: handleNew }
 *   }}
 *   skeleton={<MessageListSkeleton />}
 *   onRetry={handleRetry}
 * >
 *   {items.map(item => <Item key={item.id} {...item} />)}
 * </StateDisplay>
 * ```
 */

import type React from "react"
import { useEffect, useRef } from "react"
import { EmptyStateDisplay } from "./displays/EmptyStateDisplay"
import { ErrorDisplay } from "./displays/ErrorDisplay"
import { LoadingDisplay } from "./displays/LoadingDisplay"
import { ErrorAnnouncement, LoadingAnnouncement } from "./LiveRegion"

// ============================================================================
// Types
// ============================================================================

export interface EmptyStateConfig {
	/** Icon name (codicon) */
	icon?: string
	/** Title for empty state */
	title: string
	/** Description text */
	description?: string
	/** Primary action button */
	action?: {
		label: string
		onClick: () => void
		icon?: string
	}
	/** Secondary action button */
	secondaryAction?: {
		label: string
		onClick: () => void
		icon?: string
	}
}

export interface StateDisplayProps {
	/** Whether data is loading */
	isLoading?: boolean
	/** Error message if any */
	error?: string | Error | null
	/** Whether the data is empty */
	isEmpty?: boolean
	/** Children to render when successful */
	children: React.ReactNode
	/** Empty state configuration */
	emptyState?: EmptyStateConfig
	/** Custom skeleton loader (if not provided, uses default) */
	skeleton?: React.ReactNode
	/** Custom loading message */
	loadingMessage?: string
	/** Retry handler for errors */
	onRetry?: () => void
	/** Minimum height for the container */
	minHeight?: string
	/** Whether to show loading skeleton (default: true) */
	showSkeleton?: boolean
	/** Custom error title */
	errorTitle?: string
	/** Whether to center content vertically */
	centerContent?: boolean
	/** Test ID for testing */
	testId?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * StateDisplay - Unified component for handling loading, error, and empty states
 */
export function StateDisplay({
	isLoading = false,
	error,
	isEmpty = false,
	children,
	emptyState,
	skeleton,
	loadingMessage = "Loading...",
	onRetry,
	minHeight = "200px",
	showSkeleton = true,
	errorTitle = "Something went wrong",
	centerContent = true,
	testId,
}: StateDisplayProps): React.ReactElement {
	const previousLoadingRef = useRef(isLoading)
	const previousErrorRef = useRef(error)

	// Normalize error to string
	const errorMessage = error instanceof Error ? error.message : error

	// Track loading state changes for announcements
	useEffect(() => {
		previousLoadingRef.current = isLoading
	}, [isLoading])

	// Track error state changes for announcements
	useEffect(() => {
		previousErrorRef.current = error
	}, [error])

	// Container styles
	const containerStyle: React.CSSProperties = {
		minHeight,
		width: "100%",
		...(centerContent && {
			display: "flex",
			flexDirection: "column",
			justifyContent: "center",
			alignItems: "center",
		}),
	}

	// Priority: Loading > Error > Empty > Success

	// 1. Loading State
	if (isLoading) {
		return (
			<div data-testid={testId ? `${testId}-loading` : undefined} style={containerStyle}>
				<LoadingAnnouncement isLoading={isLoading} message={loadingMessage} />
				{showSkeleton && skeleton ? skeleton : <LoadingDisplay message={loadingMessage} showSkeleton={showSkeleton} />}
			</div>
		)
	}

	// 2. Error State
	if (errorMessage) {
		return (
			<div data-testid={testId ? `${testId}-error` : undefined} style={containerStyle}>
				<ErrorAnnouncement message={`Error: ${errorMessage}`} />
				<ErrorDisplay message={errorMessage} onRetry={onRetry} title={errorTitle} />
			</div>
		)
	}

	// 3. Empty State
	if (isEmpty && emptyState) {
		return (
			<div data-testid={testId ? `${testId}-empty` : undefined} style={containerStyle}>
				<EmptyStateDisplay {...emptyState} />
			</div>
		)
	}

	// 4. Success State (show children)
	return <div data-testid={testId ? `${testId}-success` : undefined}>{children}</div>
}

export default StateDisplay
