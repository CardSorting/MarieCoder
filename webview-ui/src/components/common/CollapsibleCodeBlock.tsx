import { memo, useEffect, useRef, useState } from "react"
import { CODE_BLOCK_BG_COLOR } from "./CodeBlock"

interface CollapsibleCodeBlockProps {
	children: React.ReactNode
	maxHeight?: number // in pixels
}

/**
 * CollapsibleCodeBlock component
 *
 * Wraps code blocks with collapse/expand functionality to prevent chat overflow.
 * Shows expand/collapse button when content exceeds maxHeight.
 *
 * Features:
 * - Automatic height detection
 * - Smooth expand/collapse animations
 * - Visual fade gradient when collapsed
 * - Respects streaming content updates
 */
export const CollapsibleCodeBlock = memo(({ children, maxHeight = 400 }: CollapsibleCodeBlockProps) => {
	const contentRef = useRef<HTMLDivElement>(null)
	const [isExpanded, setIsExpanded] = useState(false)
	const [needsCollapse, setNeedsCollapse] = useState(false)
	const [contentHeight, setContentHeight] = useState<number | undefined>(undefined)

	// Check if content exceeds max height
	useEffect(() => {
		if (contentRef.current) {
			const height = contentRef.current.scrollHeight
			setContentHeight(height)
			setNeedsCollapse(height > maxHeight)
		}
	}, [children, maxHeight])

	const handleToggle = () => {
		setIsExpanded(!isExpanded)
	}

	if (!needsCollapse) {
		// Content fits within maxHeight, no need for collapse functionality
		return <>{children}</>
	}

	return (
		<div style={{ position: "relative" }}>
			<div
				ref={contentRef}
				style={{
					maxHeight: isExpanded ? `${contentHeight}px` : `${maxHeight}px`,
					overflow: "hidden",
					transition: "max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
					position: "relative",
				}}>
				{children}

				{/* Fade gradient overlay when collapsed */}
				{!isExpanded && (
					<div
						style={{
							position: "absolute",
							bottom: 0,
							left: 0,
							right: 0,
							height: "60px",
							background: `linear-gradient(to bottom, transparent, ${CODE_BLOCK_BG_COLOR} 70%)`,
							pointerEvents: "none",
						}}
					/>
				)}
			</div>

			{/* Expand/Collapse button */}
			<div
				onClick={handleToggle}
				onMouseEnter={(e) => {
					e.currentTarget.style.backgroundColor = "var(--vscode-list-hoverBackground)"
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.backgroundColor = CODE_BLOCK_BG_COLOR
				}}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "6px",
					padding: "6px 12px",
					marginTop: "4px",
					cursor: "pointer",
					userSelect: "none",
					backgroundColor: CODE_BLOCK_BG_COLOR,
					border: "1px solid var(--vscode-editorGroup-border)",
					borderRadius: "3px",
					fontSize: "12px",
					color: "var(--vscode-descriptionForeground)",
					transition: "all 0.2s",
				}}>
				<span className={`codicon codicon-chevron-${isExpanded ? "up" : "down"}`}></span>
				<span>{isExpanded ? "Show less" : "Show more"}</span>
				{!isExpanded && contentHeight && (
					<span style={{ opacity: 0.7 }}>({Math.ceil((contentHeight - maxHeight) / 20)} more lines)</span>
				)}
			</div>
		</div>
	)
})

CollapsibleCodeBlock.displayName = "CollapsibleCodeBlock"
