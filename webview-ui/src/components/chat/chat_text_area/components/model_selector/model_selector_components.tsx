/**
 * Styled components for ModelSelector
 */

import type React from "react"
import { forwardRef } from "react"
import { cn } from "@/utils/classnames"
import type { ModelSelectorTooltipProps } from "../../types"

export const ButtonGroup = ({ children, className }: { children: React.ReactNode; className?: string }) => (
	<div className={cn("flex items-center gap-2 flex-1 min-w-0", className)}>{children}</div>
)

export const ButtonContainer = ({ children }: { children: React.ReactNode }) => (
	<div className="flex items-center gap-[3px] text-[10px] whitespace-nowrap min-w-0 w-full">{children}</div>
)

export const ModelSelectorTooltip = ({
	menuPosition,
	arrowPosition,
	children,
	...props
}: ModelSelectorTooltipProps & { children: React.ReactNode; [key: string]: any }) => (
	<div
		className="fixed left-[20px] right-[20px] border-2 border-[var(--vscode-focusBorder)] p-5 rounded-xl z-[1000] overscroll-contain"
		style={{
			bottom: "calc(100% + 16px)",
			minHeight: "400px",
			maxHeight: "calc(100vh - 140px)",
			overflowY: "auto",
			background: "var(--vscode-editor-background)",
			boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
		}}
		{...props}>
		<style>{`
			.model-selector-tooltip::before {
				content: "";
				position: fixed;
				bottom: calc(100vh - ${menuPosition}px - 2px);
				left: 0;
				right: 0;
				height: 8px;
			}
			.model-selector-tooltip::after {
				content: "";
				position: fixed;
				bottom: calc(100vh - ${menuPosition}px - 2px);
				right: ${arrowPosition}px;
				width: 14px;
				height: 14px;
				background: var(--vscode-editor-background);
				border-right: 2px solid var(--vscode-focusBorder);
				border-bottom: 2px solid var(--vscode-focusBorder);
				transform: rotate(45deg);
				z-index: 1001;
			}
		`}</style>
		{children}
	</div>
)

export const ModelContainer = forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => (
	<div
		className="relative flex flex-1 min-w-[120px] max-w-[200px] sm:max-w-[250px] md:max-w-[300px] px-2.5 py-1.5 rounded-md bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)]"
		ref={ref}
		style={{
			boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
		}}>
		{children}
	</div>
))
ModelContainer.displayName = "ModelContainer"

export const ModelButtonWrapper = forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => (
	<div className="flex flex-1 min-w-0 w-full" ref={ref}>
		{children}
	</div>
))
ModelButtonWrapper.displayName = "ModelButtonWrapper"

export const ModelDisplayButton = ({
	isActive,
	disabled,
	children,
	...props
}: {
	isActive?: boolean
	disabled?: boolean
	children: React.ReactNode
	[key: string]: any
}) => (
	<button
		className={`
			px-3 py-1.5 h-auto min-h-[24px] w-full min-w-0 
			flex items-center justify-start text-xs
			rounded-md
			outline-none select-none transition-all duration-200
			font-medium
			${disabled ? "cursor-not-allowed opacity-50 pointer-events-none" : "cursor-pointer"}
			${
				isActive
					? "bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] shadow-sm"
					: "bg-transparent text-[var(--vscode-foreground)] hover:bg-[var(--vscode-list-hoverBackground)]"
			}
			${!disabled && !isActive ? "hover:shadow-sm active:scale-[0.98]" : ""}
			${!disabled && isActive ? "active:opacity-90" : ""}
		`}
		disabled={disabled}
		type="button"
		{...props}>
		{children}
	</button>
)

export const ModelButtonContent = ({ children }: { children: React.ReactNode }) => (
	<div className="w-full min-w-0 flex items-center gap-1.5">
		<span className="codicon codicon-symbol-method text-xs opacity-70 flex-shrink-0" />
		<span className="overflow-hidden text-ellipsis whitespace-nowrap min-w-0">{children}</span>
	</div>
)
