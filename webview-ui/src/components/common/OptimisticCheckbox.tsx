import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { type ReactNode, useState } from "react"

/**
 * Checkbox with optimistic visual feedback
 * Shows immediate feedback when clicked, even if backend update is slow
 *
 * @example
 * ```tsx
 * <OptimisticCheckbox
 *   checked={enableCheckpoints}
 *   onChange={(e) => updateSetting("enableCheckpointsSetting", e.target.checked)}
 * >
 *   Enable Checkpoints
 * </OptimisticCheckbox>
 * ```
 */
interface OptimisticCheckboxProps {
	checked: boolean
	onChange: (e: any) => void | Promise<void>
	children?: ReactNode
	disabled?: boolean
	className?: string
}

export function OptimisticCheckbox({ checked, onChange, children, disabled, className }: OptimisticCheckboxProps) {
	const [isUpdating, setIsUpdating] = useState(false)
	const [optimisticValue, setOptimisticValue] = useState<boolean | null>(null)

	const handleChange = async (e: any) => {
		const newValue = e.target.checked === true

		// Update optimistic state immediately for instant feedback
		setOptimisticValue(newValue)
		setIsUpdating(true)

		try {
			// Call the actual onChange handler
			await onChange(e)
		} finally {
			// Clear optimistic state after a short delay
			// This gives time for the real state to update via subscription
			setTimeout(() => {
				setIsUpdating(false)
				setOptimisticValue(null)
			}, 300)
		}
	}

	// Use optimistic value if available, otherwise use actual value
	const displayValue = optimisticValue !== null ? optimisticValue : checked

	return (
		<div className={`relative ${className || ""}`}>
			<VSCodeCheckbox checked={displayValue} disabled={disabled} onChange={handleChange}>
				{children}
			</VSCodeCheckbox>
			{isUpdating && (
				<span
					aria-live="polite"
					className="ml-2 text-xs text-[var(--vscode-descriptionForeground)] opacity-70"
					role="status">
					Saving...
				</span>
			)}
		</div>
	)
}
