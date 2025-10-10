/**
 * ErrorDisplay - Error state with action buttons
 *
 * Displays error messages with actionable buttons (retry, etc.).
 * Provides helpful, user-friendly error messages.
 */

import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"

export interface ErrorDisplayProps {
	/** Error title */
	title?: string
	/** Error message */
	message: string
	/** Retry handler */
	onRetry?: () => void
	/** Custom retry button text */
	retryText?: string
	/** Additional action */
	secondaryAction?: {
		label: string
		onClick: () => void
	}
	/** Show icon */
	showIcon?: boolean
}

/**
 * ErrorDisplay component
 */
export function ErrorDisplay({
	title = "Something went wrong",
	message,
	onRetry,
	retryText = "Retry",
	secondaryAction,
	showIcon = true,
}: ErrorDisplayProps): React.ReactElement {
	return (
		<div
			aria-live="assertive"
			role="alert"
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: "16px",
				padding: "40px 20px",
				maxWidth: "500px",
				textAlign: "center",
			}}>
			{/* Error Icon */}
			{showIcon && (
				<div
					aria-hidden="true"
					style={{
						fontSize: "48px",
						color: "var(--vscode-errorForeground)",
					}}>
					<span className="codicon codicon-error" />
				</div>
			)}

			{/* Error Title */}
			<div
				style={{
					fontSize: "16px",
					fontWeight: 500,
					color: "var(--vscode-foreground)",
				}}>
				{title}
			</div>

			{/* Error Message */}
			<div
				style={{
					fontSize: "13px",
					color: "var(--vscode-descriptionForeground)",
					lineHeight: "1.5",
				}}>
				{message}
			</div>

			{/* Action Buttons */}
			{(onRetry || secondaryAction) && (
				<div
					style={{
						display: "flex",
						gap: "8px",
						marginTop: "8px",
					}}>
					{onRetry && (
						<VSCodeButton onClick={onRetry}>
							<span className="codicon codicon-refresh" style={{ marginRight: "6px" }} />
							{retryText}
						</VSCodeButton>
					)}
					{secondaryAction && (
						<VSCodeButton appearance="secondary" onClick={secondaryAction.onClick}>
							{secondaryAction.label}
						</VSCodeButton>
					)}
				</div>
			)}
		</div>
	)
}

export default ErrorDisplay
