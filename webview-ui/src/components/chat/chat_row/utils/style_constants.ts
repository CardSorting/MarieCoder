import type { CSSProperties } from "react"

/**
 * Color constants for ChatRow components
 */
export const normalColor = "var(--vscode-foreground)"
export const errorColor = "var(--vscode-errorForeground)"
export const successColor = "var(--vscode-charts-green)"
export const cancelledColor = "var(--vscode-descriptionForeground)"

/**
 * Header style for message sections
 */
export const headerStyle: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "10px",
	marginBottom: "12px",
}

/**
 * Paragraph style for message content
 */
export const pStyle: CSSProperties = {
	margin: 0,
	whiteSpace: "pre-wrap",
	wordBreak: "break-word",
	overflowWrap: "anywhere",
}
