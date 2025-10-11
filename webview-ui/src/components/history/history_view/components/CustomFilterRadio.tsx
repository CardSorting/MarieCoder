/**
 * Custom radio button component for workspace and favorites filters
 * Styled to match VSCode theme but works independently of VSCodeRadioGroup
 */

interface CustomFilterRadioProps {
	checked: boolean
	onChange: () => void
	icon: string
	label: string
}

export const CustomFilterRadio = ({ checked, onChange, icon, label }: CustomFilterRadioProps) => {
	return (
		<div
			className="flex items-center cursor-pointer py-[0.3em] px-0 mr-[10px] text-[var(--vscode-font-size)] select-none"
			onClick={onChange}>
			<div
				className={`w-[14px] h-[14px] rounded-full border border-[var(--vscode-checkbox-border)] relative flex justify-center items-center mr-[6px] ${
					checked ? "bg-[var(--vscode-checkbox-background)]" : "bg-transparent"
				}`}>
				{checked && <div className="w-[6px] h-[6px] rounded-full bg-[var(--vscode-checkbox-foreground)]" />}
			</div>
			<span className="flex items-center gap-[3px]">
				<div className={`codicon codicon-${icon} text-[var(--vscode-button-background)] text-base`} />
				{label}
			</span>
		</div>
	)
}
