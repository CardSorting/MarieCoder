/**
 * SkeletonList - List skeleton loader
 *
 * Displays skeleton loaders for list views.
 * Better UX than spinners - shows the structure while loading.
 */

import { Skeleton } from "./SkeletonLoader"

export interface SkeletonListProps {
	/** Number of items to show */
	count?: number
	/** Show avatar/icon */
	showAvatar?: boolean
	/** Show action buttons */
	showActions?: boolean
	/** Item height */
	itemHeight?: string
	/** Gap between items */
	gap?: string
}

/**
 * SkeletonList - for lists with optional avatars and actions
 */
export function SkeletonList({
	count = 3,
	showAvatar = false,
	showActions = false,
	itemHeight = "60px",
	gap = "8px",
}: SkeletonListProps): React.ReactElement {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap,
				padding: "16px",
			}}>
			{Array.from({ length: count }).map((_, i) => (
				<div
					key={i}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "12px",
						height: itemHeight,
						padding: "8px",
						opacity: 1 - i * 0.1, // Subtle fade effect
					}}>
					{/* Avatar */}
					{showAvatar && <Skeleton borderRadius="50%" height="40px" width="40px" />}

					{/* Content */}
					<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
						<Skeleton height="16px" width="60%" />
						<Skeleton height="12px" width="90%" />
					</div>

					{/* Actions */}
					{showActions && (
						<div style={{ display: "flex", gap: "6px" }}>
							<Skeleton borderRadius="4px" height="28px" width="28px" />
							<Skeleton borderRadius="4px" height="28px" width="28px" />
						</div>
					)}
				</div>
			))}
		</div>
	)
}

/**
 * SkeletonTable - for table views
 */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }): React.ReactElement {
	return (
		<div style={{ padding: "16px" }}>
			{/* Header */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: `repeat(${columns}, 1fr)`,
					gap: "12px",
					marginBottom: "16px",
					paddingBottom: "8px",
					borderBottom: "1px solid var(--vscode-panel-border)",
				}}>
				{Array.from({ length: columns }).map((_, i) => (
					<Skeleton height="14px" key={i} width="80%" />
				))}
			</div>

			{/* Rows */}
			{Array.from({ length: rows }).map((_, rowIndex) => (
				<div
					key={rowIndex}
					style={{
						display: "grid",
						gridTemplateColumns: `repeat(${columns}, 1fr)`,
						gap: "12px",
						marginBottom: "12px",
						opacity: 1 - rowIndex * 0.08,
					}}>
					{Array.from({ length: columns }).map((_, colIndex) => (
						<Skeleton height="12px" key={colIndex} width="90%" />
					))}
				</div>
			))}
		</div>
	)
}

export default SkeletonList
