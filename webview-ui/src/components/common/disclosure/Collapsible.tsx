/**
 * Collapsible - Progressive disclosure component
 *
 * Hides content behind a trigger, revealing it on demand.
 * Reduces cognitive load by showing only essential information initially.
 *
 * Features:
 * - Smooth animations
 * - Accessible (ARIA attributes)
 * - Keyboard navigation
 * - Customizable trigger and icon
 *
 * @example
 * ```typescript
 * <Collapsible
 *   title="Advanced Options"
 *   defaultIsOpen={false}
 *   icon="chevron-down"
 * >
 *   <AdvancedSettings />
 * </Collapsible>
 * ```
 */

import type React from "react"
import { useCallback, useEffect, useRef } from "react"
import { useDisclosure } from "@/hooks/use_disclosure"

// ============================================================================
// Types
// ============================================================================

export interface CollapsibleProps {
	/** Trigger text or element */
	title: React.ReactNode
	/** Content to show/hide */
	children: React.ReactNode
	/** Initial open state */
	defaultIsOpen?: boolean
	/** Icon to show (codicon name) */
	icon?: string
	/** Icon position */
	iconPosition?: "left" | "right"
	/** Custom trigger component */
	trigger?: React.ReactNode
	/** Callback when toggled */
	onToggle?: (isOpen: boolean) => void
	/** Additional className */
	className?: string
	/** Content padding */
	contentPadding?: string
	/** Animation duration (ms) */
	animationDuration?: number
	/** Test ID */
	testId?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Collapsible component for progressive disclosure
 */
export function Collapsible({
	title,
	children,
	defaultIsOpen = false,
	icon = "chevron-down",
	iconPosition = "right",
	trigger,
	onToggle: onToggleProp,
	className,
	contentPadding = "12px 0 0 0",
	animationDuration = 200,
	testId,
}: CollapsibleProps): React.ReactElement {
	const contentRef = useRef<HTMLDivElement>(null)
	const { isOpen, onToggle, getButtonProps, getContentProps } = useDisclosure({
		defaultIsOpen,
		onToggle: onToggleProp,
	})

	// Animate height when toggling
	useEffect(() => {
		if (contentRef.current) {
			if (isOpen) {
				const height = contentRef.current.scrollHeight
				contentRef.current.style.maxHeight = `${height}px`
			} else {
				contentRef.current.style.maxHeight = "0"
			}
		}
	}, [isOpen, children])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault()
				onToggle()
			}
		},
		[onToggle],
	)

	return (
		<div className={className} data-testid={testId}>
			{/* Trigger */}
			{trigger || (
				<button
					type="button"
					{...getButtonProps()}
					onKeyDown={handleKeyDown}
					style={{
						all: "unset",
						display: "flex",
						alignItems: "center",
						gap: "8px",
						cursor: "pointer",
						userSelect: "none",
						padding: "4px 0",
						width: "100%",
						...(iconPosition === "left" ? { flexDirection: "row" } : { flexDirection: "row" }),
					}}>
					{/* Icon left */}
					{iconPosition === "left" && icon && (
						<span
							aria-hidden="true"
							className={`codicon codicon-${icon}`}
							style={{
								fontSize: "14px",
								transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
								transition: `transform ${animationDuration}ms ease-in-out`,
							}}
						/>
					)}

					{/* Title */}
					<span
						style={{
							flex: 1,
							fontSize: "13px",
							fontWeight: 500,
							color: "var(--vscode-foreground)",
						}}>
						{title}
					</span>

					{/* Icon right */}
					{iconPosition === "right" && icon && (
						<span
							aria-hidden="true"
							className={`codicon codicon-${icon}`}
							style={{
								fontSize: "14px",
								transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
								transition: `transform ${animationDuration}ms ease-in-out`,
							}}
						/>
					)}
				</button>
			)}

			{/* Content */}
			<div
				ref={contentRef}
				{...getContentProps()}
				style={{
					overflow: "hidden",
					maxHeight: isOpen ? "none" : "0",
					transition: `max-height ${animationDuration}ms ease-in-out`,
					padding: isOpen ? contentPadding : "0",
				}}>
				{children}
			</div>
		</div>
	)
}

export default Collapsible
