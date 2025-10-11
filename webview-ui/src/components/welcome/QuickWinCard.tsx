import React from "react"
import { QuickWinTask } from "./quickWinTasks"

interface QuickWinCardProps {
	task: QuickWinTask
	onExecute: () => void
}

const renderIcon = (iconName?: string) => {
	if (!iconName) {
		return <span className="codicon codicon-rocket !text-[28px] !leading-[1]"></span>
	}

	let iconClass = "codicon-rocket"
	switch (iconName) {
		case "WebAppIcon":
			iconClass = "codicon-dashboard"
			break
		case "TerminalIcon":
			iconClass = "codicon-terminal"
			break
		case "GameIcon":
			iconClass = "codicon-game"
			break
		default:
			break
	}
	return <span className={`codicon ${iconClass} !text-[28px] !leading-[1]`}></span>
}

const QuickWinCard: React.FC<QuickWinCardProps> = ({ task, onExecute }) => {
	return (
		<div
			className="marie-card branded flex items-center mb-2 py-2 px-5 space-x-3 rounded-full cursor-pointer group"
			onClick={() => onExecute()}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault()
					onExecute()
				}
			}}
			role="button"
			tabIndex={0}>
			<div className="flex-shrink-0 flex items-center justify-center w-6 h-6 text-brand-purple">
				{renderIcon(task.icon)}
			</div>

			<div className="flex-grow min-w-0">
				<h3 className="text-sm font-medium truncate text-foreground leading-tight mb-0 mt-0">{task.title}</h3>
				<p className="text-xs truncate text-description leading-tight mt-[1px] mb-1">{task.description}</p>
			</div>
		</div>
	)
}

export default QuickWinCard
