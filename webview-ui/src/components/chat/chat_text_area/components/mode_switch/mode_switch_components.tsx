/**
 * Styled components for ModeSwitch
 */

import type React from "react"
import { ACT_MODE_COLOR, PLAN_MODE_COLOR } from "../../utils/constants"

export const SwitchOption = ({
	isActive,
	children,
	...props
}: {
	isActive: boolean
	children: React.ReactNode
	[key: string]: any
}) => (
	<div
		className={`p-[2px_8px] z-[1] transition-colors duration-200 text-xs w-1/2 text-center select-none ${isActive ? "text-[var(--vscode-button-foreground)]" : "text-[var(--vscode-input-foreground)]"} ${!isActive ? "hover:bg-[var(--vscode-toolbar-hoverBackground)]" : ""}`}
		{...props}>
		{children}
	</div>
)

export const SwitchContainer = ({
	disabled,
	children,
	...props
}: {
	disabled: boolean
	children: React.ReactNode
	[key: string]: any
}) => (
	<div
		className={`flex items-center bg-[var(--vscode-editor-background)] border border-[var(--vscode-input-border)] rounded-xl overflow-hidden scale-85 origin-right -ml-2.5 select-none ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
		{...props}>
		{children}
	</div>
)

export const Slider = ({ isAct, isPlan, ...props }: { isAct: boolean; isPlan?: boolean; [key: string]: any }) => (
	<div
		className="absolute h-full w-1/2 transition-transform duration-200"
		style={{
			backgroundColor: isPlan ? PLAN_MODE_COLOR : ACT_MODE_COLOR,
			transform: `translateX(${isAct ? "100%" : "0%"})`,
		}}
		{...props}
	/>
)
