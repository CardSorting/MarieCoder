import React from "react"

export interface FeaturedModelCardProps {
	modelId: string
	description: string
	onClick: () => void
	isSelected: boolean
	label: string
}

const FeaturedModelCard: React.FC<FeaturedModelCardProps> = ({ modelId, description, onClick, isSelected, label }) => {
	return (
		<div
			className={`p-0.5 px-1 mb-0.5 rounded-sm border border-[var(--vscode-textLink-foreground)] cursor-pointer hover:bg-[var(--vscode-list-hoverBackground)] hover:opacity-100 ${isSelected ? "opacity-100" : "opacity-60"}`}
			onClick={onClick}>
			<div className="flex items-center justify-between">
				<div className="font-medium text-xs leading-tight">{modelId}</div>
				<span className="text-[10px] text-[var(--vscode-textLink-foreground)] uppercase tracking-wide font-medium">
					{label}
				</span>
			</div>
			<div className="mt-0 text-[11px] text-[var(--vscode-descriptionForeground)] leading-tight">{description}</div>
		</div>
	)
}

export default FeaturedModelCard
