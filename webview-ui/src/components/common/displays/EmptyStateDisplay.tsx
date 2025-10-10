/**
 * EmptyStateDisplay - Empty state with call-to-action
 *
 * Displays helpful empty states with CTAs to guide users.
 * Makes empty states feel inviting rather than dead ends.
 */

import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"

export interface EmptyStateDisplayProps {
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

/**
 * EmptyStateDisplay component
 */
export function EmptyStateDisplay({
	icon = "inbox",
	title,
	description,
	action,
	secondaryAction,
}: EmptyStateDisplayProps): React.ReactElement {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: "16px",
				padding: "60px 20px",
				maxWidth: "500px",
				textAlign: "center",
			}}>
			{/* Empty State Icon */}
			<div
				aria-hidden="true"
				style={{
					fontSize: "64px",
					color: "var(--vscode-descriptionForeground)",
					opacity: 0.5,
				}}>
				<span className={`codicon codicon-${icon}`} />
			</div>

			{/* Title */}
			<div
				style={{
					fontSize: "16px",
					fontWeight: 500,
					color: "var(--vscode-foreground)",
				}}>
				{title}
			</div>

			{/* Description */}
			{description && (
				<div
					style={{
						fontSize: "13px",
						color: "var(--vscode-descriptionForeground)",
						lineHeight: "1.5",
					}}>
					{description}
				</div>
			)}

			{/* Action Buttons */}
			{(action || secondaryAction) && (
				<div
					style={{
						display: "flex",
						gap: "8px",
						marginTop: "8px",
					}}>
					{action && (
						<VSCodeButton onClick={action.onClick}>
							{action.icon && <span className={`codicon codicon-${action.icon}`} style={{ marginRight: "6px" }} />}
							{action.label}
						</VSCodeButton>
					)}
					{secondaryAction && (
						<VSCodeButton appearance="secondary" onClick={secondaryAction.onClick}>
							{secondaryAction.icon && (
								<span className={`codicon codicon-${secondaryAction.icon}`} style={{ marginRight: "6px" }} />
							)}
							{secondaryAction.label}
						</VSCodeButton>
					)}
				</div>
			)}
		</div>
	)
}

export default EmptyStateDisplay
