/**
 * AdvancedSettings - Wrapper for advanced options
 *
 * Hides advanced settings behind a disclosure.
 * Reduces cognitive load by showing only essential settings initially.
 *
 * Features:
 * - Warning badge (optional)
 * - Customizable title
 * - Auto-collapse on mount
 *
 * @example
 * ```typescript
 * <AdvancedSettings
 *   title="Advanced Options"
 *   warning="Changing these settings may affect performance"
 * >
 *   <DangerZoneSettings />
 * </AdvancedSettings>
 * ```
 */

import type React from "react"
import { useDisclosure } from "@/hooks/use_disclosure"

// ============================================================================
// Types
// ============================================================================

export interface AdvancedSettingsProps {
	/** Title for advanced section */
	title?: string
	/** Warning message */
	warning?: string
	/** Content to show/hide */
	children: React.ReactNode
	/** Initial open state */
	defaultIsOpen?: boolean
	/** Callback when toggled */
	onToggle?: (isOpen: boolean) => void
	/** Show warning icon */
	showWarning?: boolean
	/** Additional className */
	className?: string
	/** Test ID */
	testId?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * AdvancedSettings - Collapsible advanced options
 */
export function AdvancedSettings({
	title = "Advanced Settings",
	warning,
	children,
	defaultIsOpen = false,
	onToggle: onToggleProp,
	showWarning = false,
	className,
	testId,
}: AdvancedSettingsProps): React.ReactElement {
	const { isOpen, getButtonProps, getContentProps } = useDisclosure({
		defaultIsOpen,
		onToggle: onToggleProp,
	})

	return (
		<div className={className} data-testid={testId} style={{ marginTop: "24px" }}>
			{/* Divider */}
			<div
				style={{
					borderTop: "1px solid var(--vscode-panel-border)",
					marginBottom: "16px",
				}}
			/>

			{/* Trigger */}
			<button
				type="button"
				{...getButtonProps()}
				style={{
					all: "unset",
					display: "flex",
					alignItems: "center",
					gap: "8px",
					cursor: "pointer",
					padding: "8px 0",
					width: "100%",
				}}>
				{/* Chevron */}
				<span
					aria-hidden="true"
					className="codicon codicon-chevron-down"
					style={{
						fontSize: "16px",
						transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
						transition: "transform 200ms ease-in-out",
						color: "var(--vscode-descriptionForeground)",
					}}
				/>

				{/* Title */}
				<span
					style={{
						fontSize: "13px",
						fontWeight: 600,
						color: "var(--vscode-foreground)",
					}}>
					{title}
				</span>

				{/* Warning Badge */}
				{showWarning && (
					<span
						aria-hidden="true"
						className="codicon codicon-warning"
						style={{
							fontSize: "14px",
							color: "var(--vscode-editorWarning-foreground)",
							marginLeft: "4px",
						}}
					/>
				)}
			</button>

			{/* Warning Message */}
			{warning && isOpen && (
				<div
					style={{
						marginTop: "12px",
						padding: "10px 12px",
						backgroundColor: "var(--vscode-inputValidation-warningBackground)",
						border: "1px solid var(--vscode-inputValidation-warningBorder)",
						borderRadius: "3px",
						display: "flex",
						gap: "8px",
						alignItems: "flex-start",
					}}>
					<span
						aria-hidden="true"
						className="codicon codicon-warning"
						style={{
							fontSize: "16px",
							color: "var(--vscode-editorWarning-foreground)",
							marginTop: "2px",
						}}
					/>
					<span
						style={{
							flex: 1,
							fontSize: "12px",
							lineHeight: "1.5",
							color: "var(--vscode-foreground)",
						}}>
						{warning}
					</span>
				</div>
			)}

			{/* Content */}
			{isOpen && (
				<div
					{...getContentProps()}
					style={{
						marginTop: warning ? "16px" : "12px",
						paddingLeft: "24px",
					}}>
					{children}
				</div>
			)}
		</div>
	)
}

export default AdvancedSettings
