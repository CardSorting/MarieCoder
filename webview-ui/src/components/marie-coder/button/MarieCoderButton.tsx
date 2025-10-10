import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import React from "react"

interface MarieCoderButtonProps {
	children: React.ReactNode
	onClick?: () => void
	variant?: "primary" | "secondary" | "accent" | "ghost"
	size?: "sm" | "md" | "lg"
	disabled?: boolean
	className?: string
	icon?: React.ReactNode
}

const MarieCoderButton: React.FC<MarieCoderButtonProps> = ({
	children,
	onClick,
	variant = "primary",
	size = "md",
	disabled = false,
	className = "",
	icon,
}) => {
	const getAppearance = (): "primary" | "secondary" => {
		switch (variant) {
			case "secondary":
			case "ghost":
				return "secondary"
			default:
				return "primary"
		}
	}

	const getVariantClasses = () => {
		switch (variant) {
			case "accent":
				return "marie-coder-accent"
			case "ghost":
				return "bg-transparent border-transparent hover:marie-coder-subtle"
			default:
				return ""
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
			appearance={getAppearance()}
			className={`${getSizeStyles()} ${getVariantClasses()} marie-kondo-clean ${className}`}
			disabled={disabled}
			onClick={onClick}>
			{icon && <span className="mr-2">{icon}</span>}
			{children}
		</VSCodeButton>
	)
}

export default MarieCoderButton
