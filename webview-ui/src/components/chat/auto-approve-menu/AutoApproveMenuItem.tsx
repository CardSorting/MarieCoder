import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import HeroTooltip from "@/components/common/HeroTooltip"
import { ActionMetadata } from "./types"

interface AutoApproveMenuItemProps {
	action: ActionMetadata
	isChecked: (action: ActionMetadata) => boolean
	isFavorited?: (action: ActionMetadata) => boolean
	onToggle: (action: ActionMetadata, checked: boolean) => Promise<void>
	onToggleFavorite?: (actionId: string) => Promise<void>
	condensed?: boolean
	showIcon?: boolean
}

const AutoApproveMenuItem = ({
	action,
	isChecked,
	isFavorited,
	onToggle,
	onToggleFavorite,
	condensed = false,
	showIcon = true,
}: AutoApproveMenuItemProps) => {
	const checked = isChecked(action)
	const favorited = isFavorited?.(action)

	const onChange = async (e: React.MouseEvent<HTMLDivElement>) => {
		e.stopPropagation()
		await onToggle(action, !checked)
	}

	const content = (
		<>
			<div className="p-0.5">
				<HeroTooltip content={action.description} delay={500}>
					<div
						className="flex items-center justify-between pl-1 pr-px rounded cursor-pointer transition-all duration-200 hover:bg-[var(--vscode-textBlockQuote-background)]"
						onClick={onChange}>
						<div className="flex items-center gap-2">
							{onToggleFavorite && !condensed && (
								<HeroTooltip
									content={favorited ? "Remove from quick-access menu" : "Add to quick-access menu"}
									delay={500}>
									<span
										className={`p-0.5 codicon codicon-${favorited ? "star-full" : "star-empty"} text-sm cursor-pointer ${favorited ? "text-[var(--vscode-terminal-ansiYellow)] opacity-100" : "text-[var(--vscode-descriptionForeground)] opacity-60"}`}
										onClick={async (e) => {
											e.stopPropagation()
											if (action.id === "enableAll") {
												return
											}
											await onToggleFavorite?.(action.id)
										}}
									/>
								</HeroTooltip>
							)}
							<VSCodeCheckbox checked={checked} />
							{showIcon && (
								<span className={`codicon ${action.icon} text-[var(--vscode-foreground)] text-sm`}></span>
							)}
							<span className="text-[var(--vscode-foreground)] text-xs font-medium">
								{condensed ? action.shortName : action.label}
							</span>
						</div>
					</div>
				</HeroTooltip>
			</div>
			{action.subAction && !condensed && (
				<div
					className={`relative pl-6 overflow-visible transition-transform duration-200 ease-in-out origin-top ${checked ? "scale-y-100 opacity-100 h-auto" : "scale-y-0 opacity-0 h-0"}`}>
					<AutoApproveMenuItem
						action={action.subAction}
						isChecked={isChecked}
						isFavorited={isFavorited}
						onToggle={onToggle}
						onToggleFavorite={onToggleFavorite}
					/>
				</div>
			)}
		</>
	)

	return content
}

export default AutoApproveMenuItem
