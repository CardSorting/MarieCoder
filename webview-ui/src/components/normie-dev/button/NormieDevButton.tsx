import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import React from "react"

interface NormieDevButtonProps {
	children: React.ReactNode
	onClick?: () => void
	variant?: "primary" | "secondary" | "accent" | "ghost"
	size?: "sm" | "md" | "lg"
	disabled?: boolean
	className?: string
	icon?: React.ReactNode
}

const NormieDevButton: React.FC<NormieDevButtonProps> = ({
	children,
	onClick,
	variant = "primary",
	size = "md",
	disabled = false,
	className = "",
	icon,
}) => {
	const getVariantStyles = () => {
		switch (variant) {
			case "secondary":
				return 'appearance="secondary"'
			case "accent":
				return 'appearance="primary" className="normie-dev-accent"'
			case "ghost":
				return 'appearance="secondary" className="bg-transparent border-transparent hover:normie-dev-subtle"'
			default:
				return 'appearance="primary"'
		}
	}

	const getSizeStyles = () => {
		switch (size) {
			case "sm":
				return "text-xs px-3 py-1"
			case "lg":
				return "text-base px-6 py-3"
			default:
				return "text-sm px-4 py-2"
		}
	}

	return (
		<VSCodeButton
			{...getVariantStyles()}
			className={`${getSizeStyles()} marie-kondo-clean ${className}`}
			disabled={disabled}
			onClick={onClick}>
			{icon && <span className="mr-2">{icon}</span>}
			{children}
		</VSCodeButton>
	)
}

export default NormieDevButton
