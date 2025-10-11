import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import React from "react"

interface QuotedMessagePreviewProps {
	text: string
	onDismiss: () => void
	isFocused?: boolean
}

const QuotedMessagePreview: React.FC<QuotedMessagePreviewProps> = ({ text, onDismiss, isFocused }) => {
	const _cardClassName = `reply-card ${isFocused ? "reply-card--focused" : ""}`

	return (
		<div className="bg-[var(--vscode-input-background)] p-1 mx-[15px] my-0 rounded-t-sm flex relative">
			<div className="bg-[color-mix(in_srgb,var(--vscode-input-background)_70%,white_30%)] rounded-sm p-2 pl-2 pb-2.5 flex items-start justify-between w-full">
				<span className="codicon codicon-reply text-[var(--vscode-descriptionForeground)] mr-0.5 shrink-0 text-[13px]"></span>
				<div
					className="flex-grow mx-0.5 whitespace-pre-wrap break-words overflow-hidden text-ellipsis opacity-90 leading-[1.4] line-clamp-3"
					style={{
						fontSize: "var(--vscode-editor-font-size)",
						maxHeight: "calc(1.4 * var(--vscode-editor-font-size) * 3)",
					}}
					title={text}>
					{text}
				</div>
				<VSCodeButton
					appearance="icon"
					aria-label="Dismiss quote"
					className="shrink-0 min-w-[22px] h-[22px] p-0 flex items-center justify-center"
					onClick={onDismiss}>
					<span className="codicon codicon-close"></span>
				</VSCodeButton>
			</div>
		</div>
	)
}

export default QuotedMessagePreview
