import { ANTHROPIC_MAX_THINKING_BUDGET, ANTHROPIC_MIN_THINKING_BUDGET } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { memo, useCallback, useEffect, useState } from "react"
import { useSettingsState } from "@/context/SettingsContext"
import { getModeSpecificFields } from "./utils/providerUtils"
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers"

interface ThinkingBudgetSliderProps {
	maxBudget?: number
	currentMode: Mode
}

const ThinkingBudgetSlider = ({ currentMode }: ThinkingBudgetSliderProps) => {
	const { apiConfiguration } = useSettingsState()
	const { handleModeFieldChange } = useApiConfigurationHandlers()

	const modeFields = getModeSpecificFields(apiConfiguration, currentMode)

	// Add local state for the slider value
	const [localValue, setLocalValue] = useState(modeFields.thinkingBudgetTokens || 0)

	const [isEnabled, setIsEnabled] = useState<boolean>((modeFields.thinkingBudgetTokens || 0) > 0)

	useEffect(() => {
		const newThinkingBudgetValue = modeFields.thinkingBudgetTokens || 0
		const newIsEnabled = newThinkingBudgetValue > 0

		// Check if the value has changed, we could be getting the same value as feedback from the user's action of clicking the enabled checkbox or moving the slider
		if (newThinkingBudgetValue !== localValue) {
			setLocalValue(newThinkingBudgetValue)
		}
		if (newIsEnabled !== isEnabled) {
			setIsEnabled(newIsEnabled)
		}
	}, [modeFields.thinkingBudgetTokens])

	const handleSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(event.target.value, 10)
		const clampedValue = Math.max(value, ANTHROPIC_MIN_THINKING_BUDGET)
		setLocalValue(clampedValue)
	}, [])

	const handleSliderComplete = () => {
		handleModeFieldChange(
			{ plan: "planModeThinkingBudgetTokens", act: "actModeThinkingBudgetTokens" },
			localValue,
			currentMode,
		)
	}

	const handleToggleChange = (event: any) => {
		const isChecked = (event.target as HTMLInputElement).checked
		const newThinkingBudgetValue = isChecked ? ANTHROPIC_MIN_THINKING_BUDGET : 0
		setIsEnabled(isChecked)
		setLocalValue(newThinkingBudgetValue)

		handleModeFieldChange(
			{ plan: "planModeThinkingBudgetTokens", act: "actModeThinkingBudgetTokens" },
			newThinkingBudgetValue,
			currentMode,
		)
	}

	// Calculate gradient for slider background
	const percentage = ((localValue - 0) / (ANTHROPIC_MAX_THINKING_BUDGET - 0)) * 100
	const sliderBackground = `linear-gradient(to right, var(--vscode-progressBar-background) 0%, var(--vscode-progressBar-background) ${percentage}%, var(--vscode-scrollbarSlider-background) ${percentage}%, var(--vscode-scrollbarSlider-background) 100%)`

	return (
		<>
			<VSCodeCheckbox checked={isEnabled} onClick={handleToggleChange}>
				Enable thinking{localValue && localValue > 0 ? ` (${localValue.toLocaleString()} tokens)` : ""}
			</VSCodeCheckbox>

			{isEnabled && (
				<div className="flex flex-col mt-[5px] mb-[10px]">
					<input
						aria-describedby="thinking-budget-description"
						aria-label={`Thinking budget: ${localValue.toLocaleString()} tokens`}
						aria-valuemax={ANTHROPIC_MAX_THINKING_BUDGET}
						aria-valuemin={ANTHROPIC_MIN_THINKING_BUDGET}
						aria-valuenow={localValue}
						className="w-full h-2 appearance-none rounded cursor-pointer mt-[5px] p-0 outline-none
							[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
							[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--vscode-foreground)] 
							[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-0 
							[&::-webkit-slider-thumb]:shadow-[0_2px_4px_rgba(0,0,0,0.2)]
							hover:[&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(0,0,0,0.3)]
							focus:[&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(0,0,0,0.3)]
							focus:outline-none"
						id="thinking-budget-slider"
						max={ANTHROPIC_MAX_THINKING_BUDGET}
						min={0}
						onChange={handleSliderChange}
						onMouseUp={handleSliderComplete}
						onTouchEnd={handleSliderComplete}
						step={1}
						style={{ background: sliderBackground }}
						type="range"
						value={localValue}
					/>
				</div>
			)}
		</>
	)
}

export default memo(ThinkingBudgetSlider)
