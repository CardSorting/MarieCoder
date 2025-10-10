/**
 * ExpandableSection - Section with collapsible content
 *
 * Perfect for settings pages and forms with many options.
 * Shows title and description, hides detailed content until expanded.
 *
 * @example
 * ```typescript
 * <ExpandableSection
 *   title="Advanced Settings"
 *   description="Configure advanced options for power users"
 *   defaultIsOpen={false}
 * >
 *   <AdvancedOptions />
 * </ExpandableSection>
 * ```
 */

import type React from "react"
import { useDisclosure } from "@/hooks/use_disclosure"

// ============================================================================
// Types
// ============================================================================

export interface ExpandableSectionProps {
	/** Section title */
	title: string
	/** Optional description */
	description?: string
	/** Content to show/hide */
	children: React.ReactNode
	/** Initial open state */
	defaultIsOpen?: boolean
	/** Callback when toggled */
	onToggle?: (isOpen: boolean) => void
	/** Show badge (e.g., "Beta", "New") */
	badge?: string
	/** Badge color */
	badgeColor?: string
	/** Additional className */
	className?: string
	/** Test ID */
	testId?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * ExpandableSection - Collapsible section for settings/forms
 */
export function ExpandableSection({
	title,
	description,
	children,
	defaultIsOpen = false,
	onToggle: onToggleProp,
	badge,
	badgeColor = "var(--vscode-button-background)",
	className,
	testId,
}: ExpandableSectionProps): React.ReactElement {
	const { isOpen, getButtonProps, getContentProps } = useDisclosure({
		defaultIsOpen,
		onToggle: onToggleProp,
	})

	return (
		<div
			className={className}
			data-testid={testId}
			style={{
				border: "1px solid var(--vscode-panel-border)",
				borderRadius: "4px",
				overflow: "hidden",
			}}>
			{/* Header */}
			<button
				type="button"
				{...getButtonProps()}
				onMouseEnter={(e) => {
					if (!isOpen) {
						e.currentTarget.style.backgroundColor = "var(--vscode-list-hoverBackground)"
					}
				}}
				onMouseLeave={(e) => {
					if (!isOpen) {
						e.currentTarget.style.backgroundColor = "var(--vscode-input-background)"
					}
				}}
				style={{
					all: "unset",
					display: "flex",
					alignItems: "flex-start",
					gap: "12px",
					padding: "12px 16px",
					width: "100%",
					cursor: "pointer",
					backgroundColor: isOpen ? "var(--vscode-editor-background)" : "var(--vscode-input-background)",
					transition: "background-color 150ms ease-in-out",
					boxSizing: "border-box",
				}}>
				{/* Chevron Icon */}
				<span
					aria-hidden="true"
					className="codicon codicon-chevron-down"
					style={{
						fontSize: "16px",
						marginTop: "2px",
						transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
						transition: "transform 200ms ease-in-out",
					}}
				/>

				{/* Content */}
				<div style={{ flex: 1, textAlign: "left" }}>
					{/* Title and Badge */}
					<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: description ? "4px" : 0 }}>
						<span
							style={{
								fontSize: "14px",
								fontWeight: 600,
								color: "var(--vscode-foreground)",
							}}>
							{title}
						</span>
						{badge && (
							<span
								style={{
									fontSize: "10px",
									fontWeight: 600,
									padding: "2px 6px",
									borderRadius: "3px",
									backgroundColor: badgeColor,
									color: "var(--vscode-button-foreground)",
									textTransform: "uppercase",
									letterSpacing: "0.5px",
								}}>
								{badge}
							</span>
						)}
					</div>

					{/* Description */}
					{description && (
						<span
							style={{
								fontSize: "12px",
								color: "var(--vscode-descriptionForeground)",
								lineHeight: "1.5",
							}}>
							{description}
						</span>
					)}
				</div>
			</button>

			{/* Collapsible Content */}
			{isOpen && (
				<div
					{...getContentProps()}
					style={{
						padding: "16px",
						borderTop: "1px solid var(--vscode-panel-border)",
						backgroundColor: "var(--vscode-editor-background)",
					}}>
					{children}
				</div>
			)}
		</div>
	)
}

export default ExpandableSection
