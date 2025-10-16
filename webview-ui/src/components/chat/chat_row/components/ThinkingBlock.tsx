import { useEffect, useRef, useState } from "react"
import { CopyButton } from "@/components/common/CopyButton"

interface ThinkingBlockProps {
	text: string
	isExpanded: boolean
	onToggle: () => void
}

/**
 * Enhanced thinking/reasoning block component
 * Features:
 * - Copy button for easy text copying
 * - Smooth collapse/expand animations
 * - Visual separation with gradients and badges
 */
export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ text, isExpanded, onToggle }) => {
	const contentRef = useRef<HTMLDivElement>(null)
	const [contentHeight, setContentHeight] = useState<number | undefined>(undefined)

	// Calculate content height for smooth animation
	useEffect(() => {
		if (contentRef.current) {
			setContentHeight(contentRef.current.scrollHeight)
		}
	}, [text, isExpanded])

	return (
		<div
			className="thinking-block-hover"
			style={{
				overflow: "visible",
				background:
					"linear-gradient(135deg, color-mix(in srgb, var(--vscode-charts-purple, #c678dd) 8%, var(--vscode-textBlockQuote-background)) 0%, var(--vscode-textBlockQuote-background) 100%)",
				border: "1.5px solid color-mix(in srgb, var(--vscode-charts-purple, #c678dd) 30%, var(--vscode-textSeparator-foreground, rgba(255, 255, 255, 0.1)))",
				borderLeft: "4px solid var(--vscode-charts-purple, #c678dd)",
				borderRadius: "6px",
				padding: isExpanded ? "12px 16px" : "10px 14px",
				margin: "12px 0",
				boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
				transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
				position: "relative" as const,
			}}>
			{/* Corner badge for extra distinction */}
			<div
				style={{
					position: "absolute" as const,
					top: "-6px",
					right: "12px",
					backgroundColor: "var(--vscode-charts-purple, #c678dd)",
					color: "white",
					fontSize: "9px",
					fontWeight: "700",
					padding: "2px 6px",
					borderRadius: "3px",
					letterSpacing: "0.5px",
					textTransform: "uppercase" as const,
					boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
					opacity: 0.9,
					pointerEvents: "none" as const,
				}}>
				AI
			</div>

			{/* Header - always visible, clickable for expand/collapse */}
			<div
				onClick={onToggle}
				style={{
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					marginBottom: isExpanded ? "10px" : "0",
					paddingBottom: isExpanded ? "10px" : "0",
					borderBottom: isExpanded
						? "2px solid color-mix(in srgb, var(--vscode-charts-purple, #c678dd) 20%, var(--vscode-textSeparator-foreground, rgba(255, 255, 255, 0.1)))"
						: "none",
					transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
				}}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: isExpanded ? "24px" : "22px",
						height: isExpanded ? "24px" : "22px",
						borderRadius: "4px",
						backgroundColor: "color-mix(in srgb, var(--vscode-charts-purple, #c678dd) 15%, transparent)",
						marginRight: isExpanded ? "8px" : "10px",
						flexShrink: 0,
						transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
					}}>
					<span
						className="codicon codicon-lightbulb"
						style={{
							fontSize: isExpanded ? "14px" : "13px",
							color: "var(--vscode-charts-purple, #c678dd)",
						}}
					/>
				</div>
				{isExpanded ? (
					<>
						<span
							style={{
								fontWeight: "700",
								fontSize: "11px",
								color: "var(--vscode-foreground)",
								letterSpacing: "0.5px",
								textTransform: "uppercase" as const,
							}}>
							Thinking Process
						</span>
						<span
							className="codicon codicon-chevron-down"
							style={{
								marginLeft: "auto",
								fontSize: "16px",
								opacity: 0.6,
								color: "var(--vscode-charts-purple, #c678dd)",
							}}
						/>
					</>
				) : (
					<>
						<span
							style={{
								fontWeight: "700",
								fontSize: "11px",
								color: "var(--vscode-foreground)",
								flexShrink: 0,
								textTransform: "uppercase" as const,
								letterSpacing: "0.5px",
							}}>
							Thinking:
						</span>
						<span
							className="ph-no-capture"
							style={{
								fontFamily: "var(--vscode-editor-font-family, monospace)",
								fontSize: "11px",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
								direction: "rtl",
								textAlign: "left",
								flex: 1,
								color: "var(--vscode-descriptionForeground)",
								opacity: 0.85,
							}}>
							{text + "\u200E"}
						</span>
						<span
							className="codicon codicon-chevron-right"
							style={{
								marginLeft: "4px",
								flexShrink: 0,
								fontSize: "14px",
								opacity: 0.6,
								color: "var(--vscode-charts-purple, #c678dd)",
							}}
						/>
					</>
				)}
			</div>

			{/* Animated collapsible content */}
			<div
				style={{
					maxHeight: isExpanded ? `${contentHeight}px` : "0px",
					overflow: "hidden",
					transition: "max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-in-out",
					opacity: isExpanded ? 1 : 0,
				}}>
				<div ref={contentRef} style={{ position: "relative" }}>
					{/* Copy button - only visible when expanded */}
					{isExpanded && (
						<div
							onClick={(e) => e.stopPropagation()}
							style={{
								position: "absolute" as const,
								top: "4px",
								right: "4px",
								zIndex: 10,
							}}>
							<CopyButton ariaLabel="Copy thinking process" textToCopy={text} />
						</div>
					)}
					<div
						className="ph-no-capture"
						style={{
							fontFamily: "var(--vscode-editor-font-family, monospace)",
							fontSize: "12px",
							lineHeight: "1.7",
							color: "var(--vscode-descriptionForeground)",
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
							opacity: 0.95,
							backgroundColor: "color-mix(in srgb, var(--vscode-editor-background) 30%, transparent)",
							padding: "8px",
							paddingRight: "40px",
							borderRadius: "4px",
						}}>
						{text}
					</div>
				</div>
			</div>
		</div>
	)
}
