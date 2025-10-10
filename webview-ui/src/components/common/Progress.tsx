/**
 * Lightweight progress component to replace @heroui/react Progress
 */
import { cn } from "@/utils/classnames"

interface ProgressProps {
	value?: number
	size?: "sm" | "md" | "lg"
	color?: "primary" | "success" | "warning" | "danger"
	className?: string
	showValueLabel?: boolean
	label?: string
	isIndeterminate?: boolean
}

export function Progress({
	value = 0,
	size = "md",
	color = "primary",
	className,
	showValueLabel = false,
	label,
	isIndeterminate = false,
}: ProgressProps) {
	const sizeStyles = {
		sm: "h-1",
		md: "h-2",
		lg: "h-3",
	}

	const colorStyles = {
		primary: "bg-[var(--vscode-progressBar-background)]",
		success: "bg-[var(--vscode-testing-iconPassed)]",
		warning: "bg-[var(--vscode-testing-iconQueued)]",
		danger: "bg-[var(--vscode-testing-iconFailed)]",
	}

	const clampedValue = Math.max(0, Math.min(100, value))

	return (
		<div className={cn("w-full", className)}>
			{(label || showValueLabel) && (
				<div className="flex justify-between mb-1 text-sm">
					{label && <span>{label}</span>}
					{showValueLabel && <span>{Math.round(clampedValue)}%</span>}
				</div>
			)}
			<div
				aria-valuemax={100}
				aria-valuemin={0}
				aria-valuenow={isIndeterminate ? undefined : clampedValue}
				className={cn(
					"w-full bg-[var(--vscode-progressBar-background)] bg-opacity-20 rounded-full overflow-hidden",
					sizeStyles[size],
				)}
				role="progressbar">
				<div
					className={cn("h-full transition-all duration-300", colorStyles[color], isIndeterminate && "animate-pulse")}
					style={{
						width: isIndeterminate ? "100%" : `${clampedValue}%`,
					}}
				/>
			</div>
		</div>
	)
}
