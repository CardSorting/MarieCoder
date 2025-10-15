import type { ClineSayTool } from "@shared/ExtensionMessage"
import { StringRequest } from "@shared/proto/cline/common"
import { memo, useCallback, useEffect, useState } from "react"
import { cleanPathPrefix } from "@/components/common/CodeAccordian"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import { FileServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import { ToolIcon } from "../components/ToolIcon"

interface CompactToolDisplayWithProgressProps {
	tool: ClineSayTool
	isStreaming: boolean
	isOutsideWorkspace?: boolean
	estimatedSize?: number // Estimated size in bytes for progress calculation
	currentSize?: number // Current bytes processed
}

/**
 * Compact display with progress indicator for large files
 *
 * Shows progress bar when editing large files to give user feedback
 * about operation completion percentage.
 */
export const CompactToolDisplayWithProgress = memo(
	({ tool, isStreaming, isOutsideWorkspace, estimatedSize, currentSize }: CompactToolDisplayWithProgressProps) => {
		const [progress, setProgress] = useState(0)

		useEffect(() => {
			if (estimatedSize && currentSize) {
				const calculated = Math.min(100, Math.round((currentSize / estimatedSize) * 100))
				setProgress(calculated)
			} else if (isStreaming) {
				// Smooth, gradual progress for indeterminate state
				const interval = setInterval(() => {
					setProgress((prev) => {
						if (prev >= 90) return prev // Cap at 90% until actual completion
						// Smaller increments for smoother visual progress
						return prev + Math.random() * 2 + 1 // 1-3% per tick
					})
				}, 300) // More frequent updates for smoother animation
				return () => clearInterval(interval)
			} else {
				setProgress(100) // Complete
			}
		}, [estimatedSize, currentSize, isStreaming])

		const handleViewInEditor = useCallback(() => {
			if (tool.path) {
				FileServiceClient.openFile(StringRequest.create({ value: tool.path })).catch((err) =>
					debug.error("Failed to open file in editor:", err),
				)
			}
		}, [tool.path])

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
		const showProgress = estimatedSize && estimatedSize > 10000 // Show progress for files > 10KB

		return (
			<div
				style={{
					padding: "10px 12px",
					backgroundColor: CODE_BLOCK_BG_COLOR,
					borderRadius: "4px",
					border: "1px solid var(--vscode-editorGroup-border)",
					fontSize: "13px",
				}}>
				{/* Main content */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						marginBottom: showProgress && isStreaming ? "8px" : 0,
					}}>
					{/* Icon */}
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						{icon}
						{isOutsideWorkspace && (
							<ToolIcon
								color="yellow"
								name="sign-out"
								rotation={-90}
								title="This file is outside of your workspace"
							/>
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
						{isStreaming && !showProgress && (
							<span
								style={{
									color: "var(--vscode-descriptionForeground)",
									fontSize: "12px",
									animation: "pulse 1.5s ease-in-out infinite",
								}}>
								...
							</span>
						)}
						{showProgress && isStreaming && (
							<span style={{ color: "var(--vscode-descriptionForeground)", fontSize: "11px" }}>{progress}%</span>
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
								transition:
									"background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)", // Smooth hover with subtle scale
							}}
							type="button">
							<span>View in Editor</span>
							<span className="codicon codicon-link-external" style={{ fontSize: "12px" }} />
						</button>
					)}
				</div>

				{/* Progress bar */}
				{showProgress && isStreaming && (
					<div
						style={{
							width: "100%",
							height: "3px",
							backgroundColor: "var(--vscode-progressBar-background)",
							borderRadius: "2px",
							overflow: "hidden",
						}}>
						<div
							style={{
								width: `${progress}%`,
								height: "100%",
								backgroundColor: "var(--vscode-progressBar-background)",
								transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)", // Smoother, longer transition
								willChange: "width", // Performance hint
							}}
						/>
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
	},
)

CompactToolDisplayWithProgress.displayName = "CompactToolDisplayWithProgress"
