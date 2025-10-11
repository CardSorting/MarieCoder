/**
 * Styled components for ModelSelector
 */

import type React from "react"
import { forwardRef } from "react"
import type { ModelSelectorTooltipProps } from "../../types"

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
			height: "400px",
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
	<div className="relative inline-flex min-w-0 max-w-full" ref={ref}>
		{children}
	</div>
))
ModelContainer.displayName = "ModelContainer"

export const ModelButtonWrapper = forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => (
	<div className="inline-flex min-w-0 max-w-full" ref={ref}>
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
			px-1.5 py-0 h-[20px] min-w-0 
			flex items-center justify-center
			rounded
			outline-none select-none transition-colors duration-150
			${disabled ? "cursor-not-allowed opacity-50 pointer-events-none" : "cursor-pointer"}
			${
				isActive
					? "bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)]"
					: "bg-transparent text-[var(--vscode-foreground)] hover:bg-[var(--vscode-list-hoverBackground)]"
			}
		`}
		disabled={disabled}
		style={{
			borderRadius: "3px",
		}}
		type="button"
		{...props}>
		{children}
	</button>
)

export const ModelButtonContent = ({ children }: { children: React.ReactNode }) => (
	<div className="flex items-center gap-1 min-w-0">
		<span className="codicon codicon-symbol-method" style={{ fontSize: "12px", opacity: 0.7 }} />
		<span className="overflow-hidden text-ellipsis whitespace-nowrap min-w-0" style={{ fontSize: "11px" }}>
			{children}
		</span>
	</div>
)
