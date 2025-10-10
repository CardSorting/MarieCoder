/**
 * InlineHelp - Expandable help text
 *
 * Shows help text inline when clicked. Perfect for providing
 * contextual help without cluttering the UI.
 *
 * @example
 * ```typescript
 * <InlineHelp
 *   text="Learn more about this feature"
 *   helpContent="This feature allows you to..."
 * />
 * ```
 */

import type React from "react"
import { useDisclosure } from "@/hooks/use_disclosure"

// ============================================================================
// Types
// ============================================================================

export interface InlineHelpProps {
	/** Text to show as trigger */
	text?: string
	/** Help content to reveal */
	helpContent: React.ReactNode
	/** Icon to show (codicon name) */
	icon?: string
	/** Initial open state */
	defaultIsOpen?: boolean
	/** Style variant */
	variant?: "subtle" | "prominent"
	/** Additional className */
	className?: string
	/** Test ID */
	testId?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * InlineHelp - Collapsible help text
 */
export function InlineHelp({
	text = "Learn more",
	helpContent,
	icon = "question",
	defaultIsOpen = false,
	variant = "subtle",
	className,
	testId,
}: InlineHelpProps): React.ReactElement {
	const { isOpen, getButtonProps, getContentProps } = useDisclosure({
		defaultIsOpen,
	})

	return (
		<div className={className} data-testid={testId} style={{ display: "inline-block" }}>
			{/* Trigger */}
			<button
				type="button"
				{...getButtonProps()}
				onMouseEnter={(e) => {
					e.currentTarget.style.color = "var(--vscode-textLink-activeForeground)"
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.color =
						variant === "prominent" ? "var(--vscode-textLink-foreground)" : "var(--vscode-descriptionForeground)"
				}}
				style={{
					all: "unset",
					display: "inline-flex",
					alignItems: "center",
					gap: "4px",
					cursor: "pointer",
					fontSize: "12px",
					color: variant === "prominent" ? "var(--vscode-textLink-foreground)" : "var(--vscode-descriptionForeground)",
					textDecoration: isOpen ? "none" : "underline",
					textDecorationStyle: "dotted",
				}}>
				<span aria-hidden="true" className={`codicon codicon-${icon}`} style={{ fontSize: "12px" }} />
				<span>{text}</span>
				<span
					aria-hidden="true"
					className="codicon codicon-chevron-down"
					style={{
						fontSize: "10px",
						transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
						transition: "transform 150ms ease-in-out",
					}}
				/>
			</button>

			{/* Help Content */}
			{isOpen && (
				<div
					{...getContentProps()}
					style={{
						marginTop: "8px",
						padding: "12px",
						backgroundColor: "var(--vscode-textBlockQuote-background)",
						border: "1px solid var(--vscode-textBlockQuote-border)",
						borderLeft: "3px solid var(--vscode-textLink-foreground)",
						borderRadius: "4px",
						fontSize: "12px",
						lineHeight: "1.6",
						color: "var(--vscode-foreground)",
					}}>
					{helpContent}
				</div>
			)}
		</div>
	)
}

export default InlineHelp
