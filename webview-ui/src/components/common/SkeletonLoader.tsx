import { type CSSProperties } from "react"

/**
 * Skeleton loader component for better perceived performance
 * Shows content-shaped placeholders while loading instead of spinners
 *
 * @example
 * ```tsx
 * {isLoading ? (
 *   <SkeletonLoader type="text" lines={3} />
 * ) : (
 *   <div>{content}</div>
 * )}
 * ```
 */

type SkeletonType = "text" | "avatar" | "card" | "list" | "button" | "image" | "custom"

interface SkeletonLoaderProps {
	type?: SkeletonType
	lines?: number
	width?: string | number
	height?: string | number
	circle?: boolean
	className?: string
	count?: number
}

const skeletonBaseStyles: CSSProperties = {
	backgroundColor: "var(--vscode-input-background)",
	borderRadius: "4px",
	animation: "skeleton-pulse 1.5s ease-in-out infinite",
	position: "relative",
	overflow: "hidden",
}

// Add shimmer effect
const shimmerStyles: CSSProperties = {
	...skeletonBaseStyles,
	background: `linear-gradient(
		90deg,
		var(--vscode-input-background) 0%,
		var(--vscode-list-hoverBackground) 20%,
		var(--vscode-input-background) 40%,
		var(--vscode-input-background) 100%
	)`,
	backgroundSize: "200% 100%",
	animation: "skeleton-shimmer 1.5s ease-in-out infinite",
}

export function SkeletonLoader({
	type = "text",
	lines = 1,
	width,
	height,
	circle = false,
	className = "",
	count = 1,
}: SkeletonLoaderProps) {
	const renderSkeleton = () => {
		switch (type) {
			case "text":
				return (
					<div className={className}>
						{Array.from({ length: lines }).map((_, index) => (
							<div
								key={index}
								style={{
									...shimmerStyles,
									width: index === lines - 1 ? "70%" : width || "100%",
									height: height || "16px",
									marginBottom: index < lines - 1 ? "8px" : 0,
								}}
							/>
						))}
					</div>
				)

			case "avatar":
				return (
					<div
						className={className}
						style={{
							...shimmerStyles,
							width: width || "40px",
							height: height || "40px",
							borderRadius: circle ? "50%" : "4px",
						}}
					/>
				)

			case "card":
				return (
					<div
						className={`${className} p-4`}
						style={{
							...shimmerStyles,
							width: width || "100%",
							height: height || "200px",
						}}
					/>
				)

			case "list":
				return (
					<div className={className}>
						{Array.from({ length: count }).map((_, index) => (
							<div className="flex items-center gap-3 mb-3" key={index}>
								<div
									style={{
										...shimmerStyles,
										width: "40px",
										height: "40px",
										borderRadius: "50%",
										flexShrink: 0,
									}}
								/>
								<div style={{ flex: 1 }}>
									<div
										style={{
											...shimmerStyles,
											width: "60%",
											height: "16px",
											marginBottom: "8px",
										}}
									/>
									<div
										style={{
											...shimmerStyles,
											width: "40%",
											height: "14px",
										}}
									/>
								</div>
							</div>
						))}
					</div>
				)

			case "button":
				return (
					<div
						className={className}
						style={{
							...shimmerStyles,
							width: width || "100px",
							height: height || "32px",
						}}
					/>
				)

			case "image":
				return (
					<div
						className={className}
						style={{
							...shimmerStyles,
							width: width || "100%",
							height: height || "200px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--vscode-descriptionForeground)",
							fontSize: "48px",
						}}>
						<svg fill="none" height="48" opacity="0.3" stroke="currentColor" viewBox="0 0 24 24" width="48">
							<rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
							<circle cx="8.5" cy="8.5" r="1.5" />
							<polyline points="21 15 16 10 5 21" />
						</svg>
					</div>
				)

			case "custom":
			default:
				return (
					<div
						className={className}
						style={{
							...shimmerStyles,
							width: width || "100%",
							height: height || "20px",
						}}
					/>
				)
		}
	}

	return (
		<>
			<style>{`
				@keyframes skeleton-shimmer {
					0% {
						background-position: -200% 0;
					}
					100% {
						background-position: 200% 0;
					}
				}
			`}</style>
			{renderSkeleton()}
		</>
	)
}

/**
 * Pre-configured skeleton loaders for common use cases
 */
export const SkeletonText = (props: Omit<SkeletonLoaderProps, "type">) => <SkeletonLoader type="text" {...props} />

export const SkeletonAvatar = (props: Omit<SkeletonLoaderProps, "type">) => <SkeletonLoader type="avatar" {...props} />

export const SkeletonCard = (props: Omit<SkeletonLoaderProps, "type">) => <SkeletonLoader type="card" {...props} />

export const SkeletonList = (props: Omit<SkeletonLoaderProps, "type">) => <SkeletonLoader count={3} type="list" {...props} />

export const SkeletonButton = (props: Omit<SkeletonLoaderProps, "type">) => <SkeletonLoader type="button" {...props} />

export const SkeletonImage = (props: Omit<SkeletonLoaderProps, "type">) => <SkeletonLoader type="image" {...props} />
