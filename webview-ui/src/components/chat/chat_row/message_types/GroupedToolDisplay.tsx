import type { ClineSayTool } from "@shared/ExtensionMessage"
import { StringRequest } from "@shared/proto/cline/common"
import { memo, useCallback, useState } from "react"
import { cleanPathPrefix } from "@/components/common/CodeAccordian"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import { FileServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import { ToolIcon } from "../components/ToolIcon"

interface GroupedToolDisplayProps {
	tools: Array<{
		tool: ClineSayTool
		isStreaming: boolean
		isOutsideWorkspace?: boolean
	}>
	isCollapsed?: boolean
}

/**
 * Grouped display for multiple file operations
 *
 * Shows a compact summary when multiple files are being edited simultaneously.
 * Users can expand to see individual files or collapse for clean overview.
 */
export const GroupedToolDisplay = memo(({ tools, isCollapsed: initialCollapsed = false }: GroupedToolDisplayProps) => {
	const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)

	const handleViewAll = useCallback(() => {
		// Open all files in editor
		tools.forEach(({ tool }) => {
			if (tool.path) {
				FileServiceClient.openFile(StringRequest.create({ value: tool.path })).catch((err) =>
					debug.error("Failed to open file in editor:", err),
				)
			}
		})
	}, [tools])

	const handleViewFile = useCallback((filePath: string) => {
		FileServiceClient.openFile(StringRequest.create({ value: filePath })).catch((err) =>
			debug.error("Failed to open file in editor:", err),
		)
	}, [])

	const streamingCount = tools.filter((t) => t.isStreaming).length
	const completedCount = tools.length - streamingCount
	const editCount = tools.filter((t) => t.tool.tool === "editedExistingFile").length
	const newCount = tools.filter((t) => t.tool.tool === "newFileCreated").length

	// Build summary text
	const getSummaryText = () => {
		const parts: string[] = []
		if (editCount > 0) parts.push(`${editCount} edited`)
		if (newCount > 0) parts.push(`${newCount} created`)
		return parts.join(", ")
	}

	return (
		<div
			style={{
				padding: "10px 12px",
				backgroundColor: CODE_BLOCK_BG_COLOR,
				borderRadius: "4px",
				border: "1px solid var(--vscode-editorGroup-border)",
				fontSize: "13px",
			}}>
			{/* Header */}
			<div
				onClick={() => setIsCollapsed(!isCollapsed)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					cursor: "pointer",
					userSelect: "none",
					marginBottom: isCollapsed ? 0 : "10px",
					transition: "margin 0.2s cubic-bezier(0.4, 0, 0.2, 1)", // Smooth expansion
				}}>
				{/* Icon */}
				<span className={`codicon codicon-chevron-${isCollapsed ? "right" : "down"}`} style={{ fontSize: "14px" }} />
				<ToolIcon name="files" />

				{/* Summary */}
				<div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
					<span style={{ color: "var(--vscode-textLink-foreground)", fontWeight: 500 }}>Marie is editing files</span>
					<span style={{ color: "var(--vscode-descriptionForeground)" }}>({getSummaryText()})</span>
					{streamingCount > 0 && (
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

				{/* Badge */}
				<div
					style={{
						backgroundColor: "var(--vscode-badge-background)",
						color: "var(--vscode-badge-foreground)",
						padding: "2px 6px",
						borderRadius: "10px",
						fontSize: "11px",
						fontWeight: 500,
					}}>
					{tools.length}
				</div>
			</div>

			{/* Expanded file list */}
			{!isCollapsed && (
				<div
					style={{
						marginTop: "8px",
						animation: "contentReveal 0.3s cubic-bezier(0.4, 0, 0.2, 1)", // Smooth expand
					}}>
					{tools.map(({ tool, isStreaming, isOutsideWorkspace }, index) => {
						const fileName = tool.path ? cleanPathPrefix(tool.path) : "file"
						const icon = tool.tool === "newFileCreated" ? "new-file" : "edit"

						return (
							<div
								key={index}
								onClick={() => tool.path && handleViewFile(tool.path)}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = "var(--vscode-list-activeSelectionBackground)"
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = "var(--vscode-list-hoverBackground)"
								}}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									padding: "6px 8px",
									marginBottom: index < tools.length - 1 ? "4px" : 0,
									backgroundColor: "var(--vscode-list-hoverBackground)",
									borderRadius: "3px",
									cursor: "pointer",
									transition: "background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)", // Smoother hover
								}}>
								<ToolIcon name={icon} />
								{isOutsideWorkspace && (
									<ToolIcon color="yellow" name="sign-out" rotation={-90} title="Outside workspace" />
								)}
								<span
									className="ph-no-capture"
									style={{
										flex: 1,
										color: "var(--vscode-foreground)",
										whiteSpace: "nowrap",
										overflow: "hidden",
										textOverflow: "ellipsis",
									}}>
									{fileName}
								</span>
								{isStreaming ? (
									<span style={{ color: "var(--vscode-descriptionForeground)", fontSize: "11px" }}>
										streaming...
									</span>
								) : (
									<span
										className="codicon codicon-check"
										style={{ color: "var(--vscode-testing-iconPassed)", fontSize: "13px" }}
									/>
								)}
							</div>
						)
					})}

					{/* View All button */}
					{completedCount === tools.length && (
						<button
							onClick={handleViewAll}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = "var(--vscode-button-secondaryHoverBackground)"
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = "var(--vscode-button-secondaryBackground)"
							}}
							style={{
								width: "100%",
								marginTop: "8px",
								padding: "6px 8px",
								backgroundColor: "var(--vscode-button-secondaryBackground)",
								color: "var(--vscode-button-secondaryForeground)",
								border: "1px solid var(--vscode-button-border)",
								borderRadius: "3px",
								fontSize: "12px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "4px",
							}}
							type="button">
							<span>View All in Editor</span>
							<span className="codicon codicon-link-external" style={{ fontSize: "12px" }} />
						</button>
					)}
				</div>
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

GroupedToolDisplay.displayName = "GroupedToolDisplay"
