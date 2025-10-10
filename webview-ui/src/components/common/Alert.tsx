/**
 * Lightweight alert component to replace @heroui/react Alert
 */
import { type ReactNode } from "react"
import { cn } from "@/utils/classnames"

interface AlertProps {
	children: ReactNode
	variant?: "info" | "success" | "warning" | "error"
	className?: string
	title?: string
}

export function Alert({ children, variant = "info", className, title }: AlertProps) {
	const variantStyles = {
		info: "bg-[var(--vscode-editorInfo-background)] text-[var(--vscode-editorInfo-foreground)] border-[var(--vscode-editorInfo-border)]",
		success:
			"bg-[var(--vscode-testing-iconPassed)] bg-opacity-10 text-[var(--vscode-testing-iconPassed)] border-[var(--vscode-testing-iconPassed)]",
		warning:
			"bg-[var(--vscode-editorWarning-background)] text-[var(--vscode-editorWarning-foreground)] border-[var(--vscode-editorWarning-border)]",
		error: "bg-[var(--vscode-editorError-background)] text-[var(--vscode-editorError-foreground)] border-[var(--vscode-editorError-border)]",
	}

	return (
		<div className={cn("rounded border p-3", variantStyles[variant], className)} role="alert">
			{title && <div className="font-semibold mb-1">{title}</div>}
			<div>{children}</div>
		</div>
	)
}
