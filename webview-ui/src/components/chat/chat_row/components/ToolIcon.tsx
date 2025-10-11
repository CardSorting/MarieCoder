import React from "react"

/**
 * Color mapping for tool icons
 */
const colorMap = {
	red: "var(--vscode-errorForeground)",
	yellow: "var(--vscode-editorWarning-foreground)",
	green: "var(--vscode-charts-green)",
} as const

/**
 * Props for the ToolIcon component
 */
interface ToolIconProps {
	name: string
	color?: string | keyof typeof colorMap
	rotation?: number
	title?: string
}

/**
 * Renders a codicon with optional color, rotation, and title
 * @param name - The codicon name (without "codicon-" prefix)
 * @param color - Either a color key from colorMap or a direct CSS color value
 * @param rotation - Rotation angle in degrees
 * @param title - Tooltip text
 */
export const ToolIcon: React.FC<ToolIconProps> = ({ name, color, rotation, title }) => {
	const resolvedColor = color
		? (colorMap[color as keyof typeof colorMap] as string | undefined) || color
		: "var(--vscode-foreground)"

	return (
		<span
			className={`codicon codicon-${name} ph-no-capture`}
			style={{
				color: resolvedColor,
				marginBottom: "-1.5px",
				transform: rotation ? `rotate(${rotation}deg)` : undefined,
			}}
			title={title}
		/>
	)
}
