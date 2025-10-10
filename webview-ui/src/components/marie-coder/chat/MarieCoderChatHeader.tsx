import React from "react"
import MarieCoderBadge from "../badge/MarieCoderBadge"
import MarieCoderHeader from "../header/MarieCoderHeader"

interface MarieCoderChatHeaderProps {
	isActive: boolean
	taskCount?: number
}

const MarieCoderChatHeader: React.FC<MarieCoderChatHeaderProps> = ({ isActive, taskCount = 0 }) => {
	return (
		<div className="flex items-center justify-between p-3 border-b border-[var(--vscode-input-border)]">
			<MarieCoderHeader variant="compact" />

			{isActive && (
				<div className="flex items-center space-x-2">
					<MarieCoderBadge size="sm" variant="info">
						Active Task
					</MarieCoderBadge>
					{taskCount > 0 && (
						<MarieCoderBadge size="sm" variant="default">
							{taskCount}
						</MarieCoderBadge>
					)}
				</div>
			)}
		</div>
	)
}

export default MarieCoderChatHeader
