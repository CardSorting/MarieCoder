import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import React from "react"

interface QuoteButtonProps {
	top: number
	left: number
	onClick: () => void
}

const QuoteButton: React.FC<QuoteButtonProps> = ({ top, left, onClick }) => {
	return (
		<div
			className="quote-button-class absolute z-10 bg-[var(--vscode-button-background)] border border-[var(--vscode-button-border)] rounded shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-transform duration-100 hover:scale-105 hover:bg-[var(--vscode-button-hoverBackground)]"
			style={{ top: `${top}px`, left: `${left}px` }}>
			<VSCodeButton
				appearance="icon"
				aria-label="Quote selection"
				onClick={(e) => {
					e.stopPropagation() // Prevent triggering mouseup on the parent
					onClick()
				}}
				style={{ padding: "2px 4px", height: "auto", minWidth: "auto" }}
				title="Quote selection in reply">
				{" "}
				{/* Adjust padding */}
				<span
					className="codicon codicon-quote"
					style={{ fontSize: "12px", color: "var(--vscode-button-foreground)" }}></span>{" "}
				{/* Adjust font size */}
			</VSCodeButton>
		</div>
	)
}

export default QuoteButton
