/**
 * SkeletonLoader - Base skeleton loader component
 *
 * Provides base skeleton animation and styling.
 * Used by specialized skeleton components.
 */

import type React from "react"

export interface SkeletonProps {
	/** Width of the skeleton */
	width?: string | number
	/** Height of the skeleton */
	height?: string | number
	/** Border radius */
	borderRadius?: string
	/** Animation duration (ms) */
	animationDuration?: number
	/** Additional CSS class */
	className?: string
	/** Inline styles */
	style?: React.CSSProperties
}

/**
 * Base Skeleton component
 */
export function Skeleton({
	width = "100%",
	height = "16px",
	borderRadius = "4px",
	animationDuration = 1500,
	className,
	style,
}: SkeletonProps): React.ReactElement {
	return (
		<>
			<div
				aria-busy="true"
				aria-label="Loading"
				aria-live="polite"
				className={`skeleton-base ${className || ""}`}
				style={{
					width,
					height,
					borderRadius,
					background: "var(--vscode-input-background)",
					animation: `skeleton-pulse ${animationDuration}ms ease-in-out infinite`,
					...style,
				}}
			/>
			<style>
				{`
					@keyframes skeleton-pulse {
						0%, 100% { opacity: 1; }
						50% { opacity: 0.5; }
					}
				`}
			</style>
		</>
	)
}

/**
 * Skeleton Circle - for avatars, icons, etc.
 */
export function SkeletonCircle({
	size = 40,
	...props
}: Omit<SkeletonProps, "width" | "height" | "borderRadius"> & { size?: number }): React.ReactElement {
	return <Skeleton borderRadius="50%" height={size} width={size} {...props} />
}

/**
 * Skeleton Text - for text lines
 */
export function SkeletonText({
	lines = 3,
	lastLineWidth = "70%",
	gap = "8px",
	...props
}: Omit<SkeletonProps, "height"> & {
	lines?: number
	lastLineWidth?: string
	gap?: string
}): React.ReactElement {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap }}>
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton height="14px" key={i} width={i === lines - 1 ? lastLineWidth : "100%"} {...props} />
			))}
		</div>
	)
}

/**
 * Skeleton Button
 */
export function SkeletonButton({ width = "100px", ...props }: Omit<SkeletonProps, "height">): React.ReactElement {
	return <Skeleton height="32px" width={width} {...props} />
}

export default Skeleton
