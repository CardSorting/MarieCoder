import { McpDisplayMode } from "@shared/McpDisplayMode"
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react"
import React, { useCallback, useEffect, useState } from "react"
import ChatErrorBoundary from "@/components/chat/ChatErrorBoundary"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import MarkdownBlock from "@/components/common/MarkdownBlock"
import { DropdownContainer } from "@/components/settings/ApiOptions"
import { updateSetting } from "@/components/settings/utils/settingsHandlers"
import { useSettingsState } from "@/context/SettingsContext"
import { debug } from "@/utils/debug_logger"
import ImagePreview from "./ImagePreview"
import LinkPreview from "./LinkPreview"
import McpDisplayModeDropdown from "./McpDisplayModeDropdown"
import { buildDisplaySegments, DisplaySegment, processResponseUrls, UrlMatch } from "./utils/mcpRichUtil"

// Maximum number of URLs to process in total, per response
export const MAX_URLS = 50

interface McpResponseDisplayProps {
	responseText: string
}

const McpResponseDisplay: React.FC<McpResponseDisplayProps> = ({ responseText }) => {
	const { mcpResponsesCollapsed, mcpDisplayMode } = useSettingsState() // Get setting from context
	const [isExpanded, setIsExpanded] = useState(!mcpResponsesCollapsed) // Initialize with context setting
	const [isLoading, setIsLoading] = useState(false) // Initial loading state for rich content

	const [urlMatches, setUrlMatches] = useState<UrlMatch[]>([])
	const [error, setError] = useState<string | null>(null)

	const handleDisplayModeChange = useCallback((newMode: McpDisplayMode) => {
		updateSetting("mcpDisplayMode", newMode)
	}, [])

	const toggleExpand = useCallback(() => {
		setIsExpanded((prev) => !prev)
	}, [])

	// Effect to update isExpanded if mcpResponsesCollapsed changes from context
	useEffect(() => {
		setIsExpanded(!mcpResponsesCollapsed)
	}, [mcpResponsesCollapsed])

	// Find all URLs in the text and determine if they're images
	useEffect(() => {
		// Skip all processing if in plain mode or markdown mode
		if (!isExpanded || mcpDisplayMode === "plain" || mcpDisplayMode === "markdown") {
			setIsLoading(false)
			if (urlMatches.length > 0) {
				setUrlMatches([]) // Clear any existing matches when not in rich mode
			}
			return
		}

		debug.log("Processing MCP response for URL extraction")
		setIsLoading(true)
		setError(null)

		// Use the orchestrator function from mcpRichUtil
		const cleanup = processResponseUrls(
			responseText || "",
			MAX_URLS,
			(matches) => {
				setUrlMatches(matches)
				setIsLoading(false)
			},
			(updatedMatches) => {
				setUrlMatches(updatedMatches)
			},
			(errorMessage) => {
				setError(errorMessage)
				setIsLoading(false)
			},
		)

		return cleanup
	}, [responseText, mcpDisplayMode, isExpanded])

	// Helper function to render a display segment
	const renderSegment = (segment: DisplaySegment): JSX.Element => {
		switch (segment.type) {
			case "text":
			case "url":
				return (
					<div
						className="whitespace-pre-wrap break-all overflow-wrap-break-word font-[var(--vscode-editor-font-family,monospace)] text-[var(--vscode-editor-font-size,12px)]"
						key={segment.key}>
						{segment.content}
					</div>
				)

			case "image":
				return (
					<div key={segment.key}>
						<ImagePreview url={segment.url!} />
					</div>
				)

			case "link":
				return (
					<div key={segment.key} style={{ margin: "10px 0" }}>
						<LinkPreview url={segment.url!} />
					</div>
				)

			case "error":
				return (
					<div
						key={segment.key}
						style={{
							margin: "10px 0",
							padding: "8px",
							color: "var(--vscode-errorForeground)",
							border: "1px solid var(--vscode-editorError-foreground)",
							borderRadius: "4px",
							height: "128px",
							overflow: "auto",
						}}>
						{segment.content}
					</div>
				)

			default:
				return <React.Fragment key={segment.key} />
		}
	}

	// Function to render content based on display mode
	const renderContent = () => {
		if (!isExpanded) {
			return null
		}

		if (isLoading && mcpDisplayMode === "rich") {
			return (
				<div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50px" }}>
					<VSCodeProgressRing />
				</div>
			)
		}

		if (mcpDisplayMode === "plain") {
			return (
				<div className="whitespace-pre-wrap break-all overflow-wrap-break-word font-[var(--vscode-editor-font-family,monospace)] text-[var(--vscode-editor-font-size,12px)]">
					{responseText}
				</div>
			)
		}

		if (mcpDisplayMode === "markdown") {
			return <MarkdownBlock markdown={responseText} />
		}

		if (error) {
			return (
				<>
					<div style={{ color: "var(--vscode-errorForeground)", marginBottom: "10px" }}>{error}</div>
					<div className="whitespace-pre-wrap break-all overflow-wrap-break-word font-[var(--vscode-editor-font-family,monospace)] text-[var(--vscode-editor-font-size,12px)]">
						{responseText}
					</div>
				</>
			)
		}

		if (mcpDisplayMode === "rich") {
			const segments = buildDisplaySegments(responseText, urlMatches)
			return <>{segments.map(renderSegment)}</>
		}

		return null
	}

	try {
		return (
			<div
				className="relative rounded-[3px] border border-[var(--vscode-editorGroup-border)] overflow-hidden z-0"
				style={{
					fontFamily: "var(--vscode-editor-font-family, monospace)",
					fontSize: "var(--vscode-editor-font-size, 12px)",
					backgroundColor: CODE_BLOCK_BG_COLOR,
					color: "var(--vscode-editor-foreground, #d4d4d4)",
				}}>
				<div
					className="flex justify-between items-center p-[9px_10px] text-[var(--vscode-descriptionForeground)] cursor-pointer select-none border-b border-dashed border-[var(--vscode-editorGroup-border)]"
					onClick={toggleExpand}
					style={{
						borderBottom: isExpanded ? "1px dashed var(--vscode-editorGroup-border)" : "none",
						marginBottom: isExpanded ? "8px" : "0px",
					}}>
					<div className="flex items-center whitespace-nowrap overflow-hidden text-ellipsis mr-2">
						<span className={`codicon codicon-chevron-${isExpanded ? "down" : "right"} mr-1.5`}></span>
						Response
					</div>
					<DropdownContainer
						style={{ minWidth: isExpanded ? "auto" : "0", visibility: isExpanded ? "visible" : "hidden" }}>
						<McpDisplayModeDropdown
							onChange={handleDisplayModeChange}
							onClick={(e) => e.stopPropagation()}
							style={{ minWidth: "120px" }}
							value={mcpDisplayMode}
						/>
					</DropdownContainer>
				</div>

				{isExpanded && <div className="overflow-x-auto overflow-y-hidden max-w-full p-2.5">{renderContent()}</div>}
			</div>
		)
	} catch (_error) {
		debug.log("Error rendering MCP response - falling back to plain text") // Restored comment
		// Fallback for critical rendering errors
		return (
			<div
				className="relative rounded-[3px] border border-[var(--vscode-editorGroup-border)] overflow-hidden z-0"
				style={{
					fontFamily: "var(--vscode-editor-font-family, monospace)",
					fontSize: "var(--vscode-editor-font-size, 12px)",
					backgroundColor: CODE_BLOCK_BG_COLOR,
					color: "var(--vscode-editor-foreground, #d4d4d4)",
				}}>
				<div
					className="flex justify-between items-center p-[9px_10px] text-[var(--vscode-descriptionForeground)] cursor-pointer select-none border-b border-dashed border-[var(--vscode-editorGroup-border)]"
					onClick={toggleExpand}>
					<div className="flex items-center whitespace-nowrap overflow-hidden text-ellipsis mr-2">
						<span className={`codicon codicon-chevron-${isExpanded ? "down" : "right"} mr-1.5`}></span>
						Response (Error)
					</div>
				</div>
				{isExpanded && (
					<div className="overflow-x-auto overflow-y-hidden max-w-full p-2.5">
						<div style={{ color: "var(--vscode-errorForeground)" }}>Error parsing response:</div>
						<div className="whitespace-pre-wrap break-all overflow-wrap-break-word font-[var(--vscode-editor-font-family,monospace)] text-[var(--vscode-editor-font-size,12px)]">
							{responseText}
						</div>
					</div>
				)}
			</div>
		)
	}
}

// Wrap the entire McpResponseDisplay component with an error boundary
const McpResponseDisplayWithErrorBoundary: React.FC<McpResponseDisplayProps> = (props) => {
	return (
		<ChatErrorBoundary>
			<McpResponseDisplay {...props} />
		</ChatErrorBoundary>
	)
}

export default McpResponseDisplayWithErrorBoundary
