/**
 * SkeletonForm - Form skeleton loader
 *
 * Displays skeleton loaders for form layouts.
 * Shows the structure of the form while loading.
 */

import { Skeleton, SkeletonButton } from "./SkeletonLoader"

export interface SkeletonFormProps {
	/** Number of fields to show */
	fields?: number
	/** Show submit button */
	showSubmit?: boolean
	/** Field height */
	fieldHeight?: string
}

/**
 * SkeletonForm - for form layouts
 */
export function SkeletonForm({ fields = 4, showSubmit = true, fieldHeight = "32px" }: SkeletonFormProps): React.ReactElement {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "20px",
				padding: "16px",
			}}>
			{Array.from({ length: fields }).map((_, i) => (
				<div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
					{/* Label */}
					<Skeleton height="14px" width="120px" />
					{/* Input field */}
					<Skeleton borderRadius="2px" height={fieldHeight} width="100%" />
				</div>
			))}

			{/* Submit button */}
			{showSubmit && (
				<div style={{ marginTop: "8px" }}>
					<SkeletonButton width="120px" />
				</div>
			)}
		</div>
	)
}

/**
 * SkeletonSettings - for settings pages
 */
export function SkeletonSettings({ sections = 3 }: { sections?: number }): React.ReactElement {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "32px", padding: "16px" }}>
			{Array.from({ length: sections }).map((_, sectionIndex) => (
				<div key={sectionIndex} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					{/* Section title */}
					<Skeleton height="20px" width="200px" />

					{/* Section fields */}
					<div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingLeft: "16px" }}>
						{Array.from({ length: 3 }).map((_, fieldIndex) => (
							<div
								key={fieldIndex}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "12px",
									opacity: 1 - fieldIndex * 0.1,
								}}>
								{/* Checkbox/toggle */}
								<Skeleton borderRadius="2px" height="20px" width="20px" />
								{/* Label and description */}
								<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
									<Skeleton height="14px" width="40%" />
									<Skeleton height="11px" width="80%" />
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	)
}

export default SkeletonForm
