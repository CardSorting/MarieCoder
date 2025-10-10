import React from "react"

interface MarieCoderCardProps {
	children: React.ReactNode
	className?: string
	variant?: "default" | "subtle" | "accent"
	onClick?: () => void
	disabled?: boolean
}

const MarieCoderCard: React.FC<MarieCoderCardProps> = ({
	children,
	className = "",
	variant = "default",
	onClick,
	disabled = false,
}) => {
	const getVariantStyles = () => {
		switch (variant) {
			case "subtle":
				return "marie-coder-subtle"
			case "accent":
				return "marie-coder-accent"
			default:
				return "bg-[var(--vscode-editor-background)] border border-[var(--vscode-input-border)]"
		}
	}

	const getCursorStyle = () => {
		if (disabled) {
			return "cursor-not-allowed opacity-50"
		}
		if (onClick) {
			return "cursor-pointer"
		}
		return ""
	}

	return (
		<div
			className={`
				${getVariantStyles()}
				${getCursorStyle()}
				rounded-lg p-4 marie-kondo-clean
				${className}
			`.trim()}
			onClick={disabled ? undefined : onClick}>
			{children}
		</div>
	)
}

export default MarieCoderCard
