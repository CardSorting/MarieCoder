import React from "react"

interface LoadingSkeletonProps {
	type?: "text" | "thinking" | "tool" | "code" | "message"
	/**
	 * Number of lines to show in skeleton
	 */
	lines?: number
	/**
	 * Show progressive reveal animation
	 */
	progressive?: boolean
}

/**
 * Enhanced loading skeleton component for chat messages
 * Provides visual feedback with progressive reveal animations
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type = "text", lines = 3, progressive = true }) => {
	if (type === "thinking") {
		return (
			<div
				className={progressive ? "content-reveal" : "message-streaming"}
				style={{
					background:
						"linear-gradient(135deg, color-mix(in srgb, var(--vscode-charts-purple, #c678dd) 8%, var(--vscode-textBlockQuote-background)) 0%, var(--vscode-textBlockQuote-background) 100%)",
					border: "1.5px solid color-mix(in srgb, var(--vscode-charts-purple, #c678dd) 30%, var(--vscode-textSeparator-foreground, rgba(255, 255, 255, 0.1)))",
					borderLeft: "4px solid var(--vscode-charts-purple, #c678dd)",
					borderRadius: "6px",
					padding: "12px 16px",
					margin: "8px 0",
					boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
				}}>
				<div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: "24px",
							height: "24px",
							borderRadius: "4px",
							backgroundColor: "color-mix(in srgb, var(--vscode-charts-purple, #c678dd) 15%, transparent)",
							marginRight: "8px",
							flexShrink: 0,
						}}>
						<span
							className="codicon codicon-lightbulb skeleton-pulse"
							style={{
								fontSize: "14px",
								color: "var(--vscode-charts-purple, #c678dd)",
							}}
						/>
					</div>
					<span
						style={{
							fontWeight: "700",
							fontSize: "11px",
							color: "var(--vscode-foreground)",
							letterSpacing: "0.5px",
							textTransform: "uppercase" as const,
						}}>
						Thinking...
					</span>
				</div>
				<div className="space-y-1.5">
					{Array.from({ length: lines }).map((_, i) => {
						const widths = ["w-full", "w-4/5", "w-3/4", "w-5/6"]
						return (
							<div
								className={`skeleton-shimmer h-3 ${widths[i % widths.length]} rounded stagger-item`}
								key={i}
								style={{
									animationDelay: `${i * 50}ms`,
									backgroundColor: "var(--vscode-input-background)",
								}}
							/>
						)
					})}
				</div>
			</div>
		)
	}

	if (type === "tool") {
		return (
			<div className={`space-y-2 py-2 ${progressive ? "content-reveal" : "message-streaming"}`}>
				<div className="skeleton-pulse h-4 w-32 rounded" />
				<div className="space-y-1.5">
					<div className="skeleton-shimmer h-3 w-full rounded" />
					<div className="skeleton-shimmer h-3 w-5/6 rounded" />
				</div>
			</div>
		)
	}

	if (type === "code") {
		return (
			<div className={`space-y-2 py-2 ${progressive ? "content-reveal" : "message-streaming"}`}>
				<div className="skeleton-pulse h-4 w-24 rounded mb-2" />
				<div className="space-y-1 rounded p-2" style={{ backgroundColor: "var(--vscode-editor-background)" }}>
					{Array.from({ length: Math.min(lines, 5) }).map((_, i) => {
						const widths = ["w-5/6", "w-full", "w-4/5", "w-11/12", "w-3/4"]
						return (
							<div
								className={`skeleton-shimmer h-3 ${widths[i]} rounded stagger-item`}
								key={i}
								style={{ animationDelay: `${i * 30}ms` }}
							/>
						)
					})}
				</div>
			</div>
		)
	}

	if (type === "message") {
		return (
			<div className={`space-y-2 py-2 ${progressive ? "content-reveal" : "message-streaming"}`}>
				<div className="flex items-center space-x-2 mb-2">
					<div className="skeleton-pulse h-6 w-6 rounded-full" />
					<div className="skeleton-pulse h-4 w-24 rounded" />
				</div>
				<div className="space-y-1.5">
					{Array.from({ length: lines }).map((_, i) => {
						const widths = ["w-full", "w-11/12", "w-4/5", "w-5/6"]
						return (
							<div
								className={`skeleton-shimmer h-3 ${widths[i % widths.length]} rounded stagger-item`}
								key={i}
								style={{ animationDelay: `${i * 50}ms` }}
							/>
						)
					})}
				</div>
			</div>
		)
	}

	// Default text skeleton with progressive loading
	return (
		<div className={`space-y-1.5 py-2 ${progressive ? "content-reveal" : "message-streaming"}`}>
			{Array.from({ length: lines }).map((_, i) => {
				const widths = ["w-full", "w-11/12", "w-4/5", "w-5/6", "w-full", "w-3/4"]
				return (
					<div
						className={`skeleton-shimmer h-3 ${widths[i % widths.length]} rounded stagger-item`}
						key={i}
						style={{ animationDelay: `${i * 50}ms` }}
					/>
				)
			})}
		</div>
	)
}

/**
 * Inline loading dots for subtle feedback
 */
export const LoadingDots: React.FC = () => {
	return (
		<div className="inline-flex space-x-1">
			<div
				className="w-1.5 h-1.5 rounded-full skeleton-pulse"
				style={{
					backgroundColor: "var(--vscode-descriptionForeground)",
					animationDelay: "0ms",
				}}
			/>
			<div
				className="w-1.5 h-1.5 rounded-full skeleton-pulse"
				style={{
					backgroundColor: "var(--vscode-descriptionForeground)",
					animationDelay: "200ms",
				}}
			/>
			<div
				className="w-1.5 h-1.5 rounded-full skeleton-pulse"
				style={{
					backgroundColor: "var(--vscode-descriptionForeground)",
					animationDelay: "400ms",
				}}
			/>
		</div>
	)
}

/**
 * Typing indicator for when assistant is generating response
 */
export const TypingIndicator: React.FC = () => {
	return (
		<div
			className="message-enter inline-flex items-center space-x-2 py-1 px-3 rounded-lg"
			style={{
				backgroundColor: "var(--vscode-input-background)",
				color: "var(--vscode-descriptionForeground)",
			}}>
			<span className="text-xs font-medium">MarieCoder is typing</span>
			<LoadingDots />
		</div>
	)
}

/**
 * Progressive loading bar for optimistic UI updates
 */
interface ProgressBarProps {
	/**
	 * Progress percentage (0-100)
	 */
	progress?: number
	/**
	 * Indeterminate loading (animated)
	 */
	indeterminate?: boolean
	/**
	 * Color variant
	 */
	variant?: "primary" | "success" | "warning"
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress = 0, indeterminate = false, variant = "primary" }) => {
	const colors = {
		primary: "var(--vscode-progressBar-background)",
		success: "var(--vscode-testing-iconPassed)",
		warning: "var(--vscode-testing-iconQueued)",
	}

	return (
		<div
			className="w-full h-1 rounded-full overflow-hidden"
			style={{
				backgroundColor: "var(--vscode-input-background)",
			}}>
			<div
				className={indeterminate ? "optimistic-loader" : ""}
				style={{
					width: indeterminate ? "100%" : `${Math.min(progress, 100)}%`,
					height: "100%",
					backgroundColor: colors[variant],
					transition: indeterminate ? "none" : "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
				}}
			/>
		</div>
	)
}

/**
 * Micro-loading spinner for inline use
 */
export const MicroSpinner: React.FC<{ size?: number }> = ({ size = 12 }) => {
	return (
		<svg
			className="skeleton-pulse"
			fill="none"
			height={size}
			style={{ display: "inline-block" }}
			viewBox="0 0 24 24"
			width={size}>
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeDasharray="60"
				strokeDashoffset="15"
				strokeLinecap="round"
				strokeWidth="3"
				style={{
					animation: "spin 1s linear infinite",
				}}
			/>
		</svg>
	)
}
