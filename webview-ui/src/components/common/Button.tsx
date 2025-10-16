/**
 * Lightweight button component to replace @heroui/react Button
 * Uses VSCode styling for consistency
 */
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react"
import { cn } from "@/utils/classnames"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	children: ReactNode
	variant?: "primary" | "secondary" | "ghost" | "danger" | "success"
	size?: "sm" | "md" | "lg"
	isIconOnly?: boolean
	icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ children, variant = "primary", size = "md", isIconOnly = false, icon, className, ...props }, ref) => {
		const baseStyles =
			"inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none"

		const variantStyles = {
			primary:
				"bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)]",
			secondary:
				"bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)]",
			ghost: "hover:bg-[var(--vscode-toolbar-hoverBackground)] text-[var(--vscode-foreground)]",
			danger: "bg-[#c42b2b] text-white hover:bg-[#a82424] active:bg-[#8f1f1f]",
			success: "bg-[#176f2c] text-white hover:bg-[#197f31] active:bg-[#156528]",
		}

		const sizeStyles = {
			sm: isIconOnly ? "h-7 w-7 p-0" : "h-7 px-2 text-sm",
			md: isIconOnly ? "h-9 w-9 p-0" : "h-9 px-3",
			lg: isIconOnly ? "h-11 w-11 p-0" : "h-11 px-4 text-lg",
		}

		return (
			<button
				className={cn(
					baseStyles,
					variantStyles[variant],
					sizeStyles[size],
					isIconOnly ? "rounded" : "rounded-sm",
					className,
				)}
				ref={ref}
				{...props}>
				{icon && <span className="inline-flex items-center mr-1.5">{icon}</span>}
				{children}
			</button>
		)
	},
)

Button.displayName = "Button"
