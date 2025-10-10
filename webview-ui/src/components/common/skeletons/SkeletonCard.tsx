/**
 * SkeletonCard - Card skeleton loader
 *
 * Displays skeleton loaders for card-based layouts.
 * Great for marketplace, galleries, etc.
 */

import { Skeleton, SkeletonButton, SkeletonText } from "./SkeletonLoader"

export interface SkeletonCardProps {
	/** Number of cards to show */
	count?: number
	/** Show image/thumbnail */
	showImage?: boolean
	/** Show actions/buttons */
	showActions?: boolean
	/** Grid columns */
	columns?: number
	/** Card height */
	cardHeight?: string
}

/**
 * SkeletonCard - for card-based layouts
 */
export function SkeletonCard({
	count = 6,
	showImage = true,
	showActions = true,
	columns = 3,
	cardHeight = "280px",
}: SkeletonCardProps): React.ReactElement {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: `repeat(${columns}, 1fr)`,
				gap: "16px",
				padding: "16px",
			}}>
			{Array.from({ length: count }).map((_, i) => (
				<div
					key={i}
					style={{
						height: cardHeight,
						border: "1px solid var(--vscode-panel-border)",
						borderRadius: "6px",
						padding: "12px",
						display: "flex",
						flexDirection: "column",
						gap: "12px",
						opacity: 1 - i * 0.08,
					}}>
					{/* Image/Thumbnail */}
					{showImage && <Skeleton borderRadius="4px" height="140px" />}

					{/* Title */}
					<Skeleton height="18px" width="80%" />

					{/* Description */}
					<SkeletonText lines={2} />

					{/* Actions */}
					{showActions && (
						<div style={{ marginTop: "auto", display: "flex", gap: "8px" }}>
							<SkeletonButton width="80px" />
							<SkeletonButton width="60px" />
						</div>
					)}
				</div>
			))}
		</div>
	)
}

/**
 * SkeletonCompactCard - for smaller card layouts
 */
export function SkeletonCompactCard({ count = 4 }: { count?: number }): React.ReactElement {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "16px" }}>
			{Array.from({ length: count }).map((_, i) => (
				<div
					key={i}
					style={{
						border: "1px solid var(--vscode-panel-border)",
						borderRadius: "4px",
						padding: "12px",
						display: "flex",
						gap: "12px",
						opacity: 1 - i * 0.1,
					}}>
					<Skeleton borderRadius="6px" height="48px" width="48px" />
					<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
						<Skeleton height="14px" width="70%" />
						<Skeleton height="12px" width="100%" />
						<Skeleton height="10px" width="50%" />
					</div>
				</div>
			))}
		</div>
	)
}

export default SkeletonCard
