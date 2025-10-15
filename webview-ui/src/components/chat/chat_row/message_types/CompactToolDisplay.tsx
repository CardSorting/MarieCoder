import type { ClineSayTool } from "@shared/ExtensionMessage"
import { StringRequest } from "@shared/proto/cline/common"
import { memo, useCallback } from "react"
import { cleanPathPrefix } from "@/components/common/CodeAccordian"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import { FileServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import { ToolIcon } from "../components/ToolIcon"

interface CompactToolDisplayProps {
	tool: ClineSayTool
	isStreaming: boolean
	isOutsideWorkspace?: boolean
}

/**
 * Compact display for tool operations
 *
 * Shows minimal status in chat while code is being edited in the editor.
 * Design philosophy: Chat for conversation, editor for code.
 */
export const CompactToolDisplay = memo(({ tool, isStreaming, isOutsideWorkspace }: CompactToolDisplayProps) => {
	const handleViewInEditor = useCallback(() => {
		if (tool.path) {
			// Open the file in editor and focus it
			FileServiceClient.openFile(StringRequest.create({ value: tool.path })).catch((err) =>
				debug.error("Failed to open file in editor:", err),
			)
		}
	}, [tool.path])

	// Get display info based on tool type
	const getToolInfo = () => {
		switch (tool.tool) {
			case "editedExistingFile":
				return {
					icon: <ToolIcon name="edit" />,
					action: "Editing",
					color: "var(--vscode-textLink-foreground)",
				}
			case "newFileCreated":
				return {
					icon: <ToolIcon name="new-file" />,
					action: "Creating",
					color: "var(--vscode-editorInfo-foreground)",
				}
			default:
				return {
					icon: <ToolIcon name="file-code" />,
					action: "Processing",
					color: "var(--vscode-descriptionForeground)",
				}
		}
	}

	const { icon, action, color } = getToolInfo()
	const fileName = tool.path ? cleanPathPrefix(tool.path) : "file"

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "10px 12px",
				backgroundColor: CODE_BLOCK_BG_COLOR,
				borderRadius: "4px",
				border: "1px solid var(--vscode-editorGroup-border)",
				fontSize: "13px",
			}}>
			{/* Icon */}
			<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
				{icon}
				{isOutsideWorkspace && (
					<ToolIcon color="yellow" name="sign-out" rotation={-90} title="This file is outside of your workspace" />
				)}
			</div>

			{/* Status text */}
			<div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
				<span style={{ color, fontWeight: 500 }}>{action}</span>
				<span
					className="ph-no-capture"
					style={{
						color: "var(--vscode-foreground)",
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
					}}>
					{fileName}
				</span>
				{isStreaming && (
					<span
						style={{
							color: "var(--vscode-descriptionForeground)",
							fontSize: "12px",
							animation: "pulse 1.5s ease-in-out infinite",
						}}>
						...
					</span>
				)}
			</div>

			{/* View in Editor button */}
			{!isStreaming && tool.path && (
				<button
					onClick={handleViewInEditor}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = "var(--vscode-button-secondaryHoverBackground)"
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = "var(--vscode-button-secondaryBackground)"
					}}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "4px",
						padding: "4px 8px",
						backgroundColor: "var(--vscode-button-secondaryBackground)",
						color: "var(--vscode-button-secondaryForeground)",
						border: "1px solid var(--vscode-button-border)",
						borderRadius: "3px",
						fontSize: "12px",
						cursor: "pointer",
						whiteSpace: "nowrap",
						transition: "background-color 0.1s",
					}}
					type="button">
					<span>View in Editor</span>
					<span className="codicon codicon-link-external" style={{ fontSize: "12px" }} />
				</button>
			)}

			{/* Inline style for pulse animation */}
			<style>
				{`
					@keyframes pulse {
						0%, 100% { opacity: 1; }
						50% { opacity: 0.4; }
					}
				`}
			</style>
		</div>
	)
})

CompactToolDisplay.displayName = "CompactToolDisplay"
