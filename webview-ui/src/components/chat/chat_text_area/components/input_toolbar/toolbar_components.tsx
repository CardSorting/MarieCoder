/**
 * Unified toolbar components for consistent visual hierarchy
 */

import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import type React from "react"
import { forwardRef } from "react"
import HeroTooltip from "@/components/common/HeroTooltip"

/**
 * Toolbar constants for consistency
 */
export const TOOLBAR_CONSTANTS = {
	buttonHeight: 20,
	iconSize: 12,
	fontSize: 11,
	gap: 4,
	borderRadius: 3,
} as const

/**
 * Toolbar container with consistent spacing
 */
export const ToolbarContainer = ({ children }: { children: React.ReactNode }) => (
	<div className="flex-1 min-w-0 mr-2">
		<div className="flex items-center gap-1 h-5">{children}</div>
	</div>
)

/**
 * Toolbar button group for visual separation
 */
export const ToolbarGroup = ({ children, className }: { children: React.ReactNode; className?: string }) => (
	<div className={`flex items-center gap-1 ${className || ""}`}>{children}</div>
)

/**
 * Toolbar divider for visual separation
 */
export const ToolbarDivider = () => (
	<div className="h-3 w-px bg-[var(--vscode-panel-border)] opacity-50 mx-0.5" style={{ alignSelf: "center" }} />
)

/**
 * Base toolbar button with consistent styling
 */
interface ToolbarButtonProps {
	icon?: React.ReactNode
	label?: string
	tooltip: string
	isActive?: boolean
	disabled?: boolean
	onClick: () => void
	"aria-label": string
	"data-testid"?: string
	tooltipDisabled?: boolean
}

export const ToolbarButton = forwardRef<HTMLDivElement, ToolbarButtonProps>(
	({ icon, label, tooltip, isActive = false, disabled = false, onClick, tooltipDisabled = false, ...props }, ref) => (
		<div className="inline-flex" ref={ref}>
			<HeroTooltip content={tooltip} disabled={tooltipDisabled} placement="top">
				<VSCodeButton
					appearance="icon"
					disabled={disabled}
					onClick={onClick}
					style={{
						padding: 0,
						margin: 0,
						height: `${TOOLBAR_CONSTANTS.buttonHeight}px`,
						minWidth: label ? "auto" : `${TOOLBAR_CONSTANTS.buttonHeight}px`,
					}}
					{...props}>
					<div
						className={`
							flex items-center justify-center gap-1
							px-1 min-w-0
							transition-colors duration-150
							${isActive ? "text-[var(--vscode-list-activeSelectionForeground)]" : ""}
						`}
						style={{
							fontSize: `${TOOLBAR_CONSTANTS.iconSize}px`,
							height: `${TOOLBAR_CONSTANTS.buttonHeight}px`,
						}}>
						{icon}
						{label && (
							<span
								className="whitespace-nowrap overflow-hidden text-ellipsis"
								style={{ fontSize: `${TOOLBAR_CONSTANTS.fontSize}px` }}>
								{label}
							</span>
						)}
					</div>
				</VSCodeButton>
			</HeroTooltip>
		</div>
	),
)
ToolbarButton.displayName = "ToolbarButton"

/**
 * Icon-only toolbar button (simplified version)
 */
interface IconButtonProps {
	iconClass: string
	tooltip: string
	isActive?: boolean
	disabled?: boolean
	onClick: () => void
	"aria-label": string
	"data-testid"?: string
	tooltipDisabled?: boolean
}

export const IconButton = forwardRef<HTMLDivElement, IconButtonProps>(
	({ iconClass, tooltip, isActive = false, disabled = false, onClick, tooltipDisabled = false, ...props }, ref) => (
		<ToolbarButton
			icon={<span className={iconClass} />}
			isActive={isActive}
			onClick={onClick}
			tooltip={tooltip}
			tooltipDisabled={tooltipDisabled}
			{...props}
			ref={ref}
		/>
	),
)
IconButton.displayName = "IconButton"
