/**
 * LoadingDisplay - Loading state with optional skeleton
 *
 * Displays a loading state with either a message or skeleton loader.
 * Skeleton loaders are preferred over spinners for better UX.
 */

import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react"
import type React from "react"

export interface LoadingDisplayProps {
	/** Loading message to display */
	message?: string
	/** Whether to show skeleton loader */
	showSkeleton?: boolean
	/** Custom skeleton component */
	skeleton?: React.ReactNode
}

/**
 * LoadingDisplay component
 */
export function LoadingDisplay({
	message = "Loading...",
	showSkeleton = true,
	skeleton,
}: LoadingDisplayProps): React.ReactElement {
	// If skeleton is provided, use it
	if (skeleton) {
		return <>{skeleton}</>
	}

	// If showSkeleton is false, show spinner with message
	if (!showSkeleton) {
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					gap: "12px",
					padding: "40px 20px",
				}}>
				<VSCodeProgressRing />
				<div
					style={{
						color: "var(--vscode-descriptionForeground)",
						fontSize: "13px",
					}}>
					{message}
				</div>
			</div>
		)
	}

	// Default: show generic skeleton loader
	return (
		<div
			style={{
				padding: "16px",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
			}}>
			{/* Show 3 skeleton rows */}
			{[1, 2, 3].map((i) => (
				<div
					className="skeleton-loader"
					key={i}
					style={{
						height: "48px",
						background: "var(--vscode-input-background)",
						borderRadius: "4px",
						opacity: 1 - i * 0.15, // Fade effect
						animation: "pulse 1.5s ease-in-out infinite",
					}}
				/>
			))}
			<style>
				{`
					@keyframes pulse {
						0%, 100% { opacity: 1; }
						50% { opacity: 0.6; }
					}
				`}
			</style>
		</div>
	)
}

export default LoadingDisplay
