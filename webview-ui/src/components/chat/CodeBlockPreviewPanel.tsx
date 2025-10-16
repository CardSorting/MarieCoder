import { memo, useCallback, useState } from "react"
import { CopyButton } from "@/components/common/CopyButton"
import type { CodeBlock } from "@/utils/chat/extract_code_blocks"

interface CodeBlockPreviewPanelProps {
	codeBlocks: CodeBlock[]
}

/**
 * Stationary code block preview panel
 * Displays extracted code blocks in thumbnail previews without interrupting chat flow
 */
export const CodeBlockPreviewPanel = memo(({ codeBlocks }: CodeBlockPreviewPanelProps) => {
	const [expandedBlock, setExpandedBlock] = useState<string | null>(null)
	const [isMinimized, setIsMinimized] = useState(false)

	const toggleBlock = useCallback((blockId: string) => {
		setExpandedBlock((prev) => (prev === blockId ? null : blockId))
	}, [])

	if (codeBlocks.length === 0) {
		return null
	}

	return (
		<div
			style={{
				position: "fixed",
				right: "16px",
				bottom: "80px",
				width: isMinimized ? "48px" : "320px",
				maxHeight: isMinimized ? "48px" : "60vh",
				backgroundColor: "var(--vscode-editor-background)",
				border: "1px solid var(--vscode-panel-border)",
				borderRadius: "8px",
				boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				zIndex: 1000,
				transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
			}}>
			{/* Header */}
			<div
				onClick={() => setIsMinimized(!isMinimized)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					padding: "10px 12px",
					backgroundColor: "var(--vscode-titleBar-activeBackground)",
					borderBottom: isMinimized ? "none" : "1px solid var(--vscode-panel-border)",
					cursor: "pointer",
					userSelect: "none",
				}}>
				<i
					className="codicon codicon-code"
					style={{
						fontSize: "16px",
						color: "var(--vscode-foreground)",
					}}
				/>
				{!isMinimized && (
					<>
						<span
							style={{
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--vscode-foreground)",
								flex: 1,
							}}>
							Code Blocks ({codeBlocks.length})
						</span>
						<i
							className="codicon codicon-chevron-down"
							style={{
								fontSize: "16px",
								opacity: 0.7,
							}}
						/>
					</>
				)}
			</div>

			{/* Code blocks list */}
			{!isMinimized && (
				<div
					style={{
						overflowY: "auto",
						overflowX: "hidden",
						flex: 1,
						padding: "8px",
					}}>
					{codeBlocks.map((block, index) => {
						const isExpanded = expandedBlock === block.id
						const displayCode = isExpanded ? block.code : block.code.split("\n").slice(0, 3).join("\n")
						const hasMore = block.code.split("\n").length > 3

						return (
							<div
								key={block.id}
								style={{
									marginBottom: "8px",
									backgroundColor: "var(--vscode-textBlockQuote-background)",
									border: "1px solid var(--vscode-textSeparator-foreground)",
									borderRadius: "4px",
									overflow: "hidden",
								}}>
								{/* Block header */}
								<div
									onClick={() => hasMore && toggleBlock(block.id)}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "6px",
										padding: "6px 8px",
										backgroundColor: "color-mix(in srgb, var(--vscode-button-background) 40%, transparent)",
										borderBottom: "1px solid var(--vscode-textSeparator-foreground)",
										cursor: hasMore ? "pointer" : "default",
										fontSize: "11px",
										fontWeight: 600,
									}}>
									<span
										style={{
											color: "var(--vscode-textLink-foreground)",
											textTransform: "uppercase",
											letterSpacing: "0.5px",
										}}>
										{block.language}
									</span>
									<span
										style={{
											marginLeft: "auto",
											opacity: 0.6,
											fontSize: "10px",
										}}>
										#{index + 1}
									</span>
									{hasMore && (
										<i
											className={`codicon codicon-chevron-${isExpanded ? "up" : "down"}`}
											style={{ fontSize: "12px", opacity: 0.7 }}
										/>
									)}
								</div>

								{/* Code preview */}
								<div
									style={{
										position: "relative",
										backgroundColor: "var(--vscode-editor-background)",
									}}>
									<pre
										style={{
											margin: 0,
											padding: "8px",
											fontSize: "10px",
											lineHeight: "1.4",
											fontFamily: "var(--vscode-editor-font-family, monospace)",
											color: "var(--vscode-editor-foreground)",
											overflow: isExpanded ? "auto" : "hidden",
											maxHeight: isExpanded ? "300px" : "60px",
											whiteSpace: "pre-wrap",
											wordBreak: "break-word",
										}}>
										<code>{displayCode}</code>
									</pre>

									{/* Copy button */}
									<div
										onClick={(e) => e.stopPropagation()}
										style={{
											position: "absolute",
											top: "4px",
											right: "4px",
										}}>
										<CopyButton ariaLabel="Copy code" textToCopy={block.code} />
									</div>

									{/* Show more indicator */}
									{!isExpanded && hasMore && (
										<div
											style={{
												position: "absolute",
												bottom: 0,
												left: 0,
												right: 0,
												height: "30px",
												background: "linear-gradient(transparent, var(--vscode-editor-background))",
												pointerEvents: "none",
											}}
										/>
									)}
								</div>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
})

CodeBlockPreviewPanel.displayName = "CodeBlockPreviewPanel"
