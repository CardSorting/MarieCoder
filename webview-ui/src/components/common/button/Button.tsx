import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import React from "react"

/**
 * Button variant types
 * - primary: Standard primary button (VSCode default)
 * - secondary: Secondary button style (VSCode secondary)
 * - danger: Destructive actions (delete, remove)
 * - success: Positive confirmations (save, accept)
 * - accent: Special emphasis actions
 * - ghost: Minimal style for subtle actions
 */
export type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "accent" | "ghost"

/**
 * Button size options
 */
export type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps extends Omit<React.ComponentProps<typeof VSCodeButton>, "appearance"> {
	/**
	 * Visual variant of the button
	 * @default "primary"
	 */
	variant?: ButtonVariant

	/**
	 * Size of the button
	 * @default "md"
	 */
	size?: ButtonSize

	/**
	 * If true, button takes full width of container
	 * @default false
	 */
	fullWidth?: boolean

	/**
	 * Icon element to display before button text
	 */
	icon?: React.ReactNode

	/**
	 * Additional CSS classes
	 */
	className?: string
}

/**
 * Get VSCodeButton appearance based on variant
 */
const getAppearance = (variant: ButtonVariant): "primary" | "secondary" => {
	switch (variant) {
		case "secondary":
		case "ghost":
			return "secondary"
		default:
			return "primary"
	}
}

/**
 * Get Tailwind classes for button variant styling
 */
const getVariantClasses = (variant: ButtonVariant): string => {
	switch (variant) {
		case "danger":
			return `
				!bg-[#c42b2b] 
				!border-[#c42b2b] 
				!text-white
				hover:!bg-[#a82424] 
				hover:!border-[#a82424]
				active:!bg-[#8f1f1f] 
				active:!border-[#8f1f1f]
			`
		case "success":
			return `
				!bg-[#176f2c] 
				!border-[#176f2c] 
				!text-white
				hover:!bg-[#197f31] 
				hover:!border-[#197f31]
				active:!bg-[#156528] 
				active:!border-[#156528]
			`
		case "accent":
			return "marie-coder-accent"
		case "ghost":
			return "bg-transparent border-transparent hover:marie-coder-subtle"
		case "secondary":
			// Use VSCode theme variables for secondary style
			return `
				!bg-[var(--vscode-button-secondaryBackground)]
				!border-[var(--vscode-button-secondaryBackground)]
				hover:!bg-[var(--vscode-button-secondaryHoverBackground)]
				hover:!border-[var(--vscode-button-secondaryHoverBackground)]
			`
		default:
			return ""
	}
}

/**
 * Get size-based styling
 */
const getSizeClasses = (size: ButtonSize): string => {
	switch (size) {
		case "sm":
			return "text-xs px-3 py-1"
		case "lg":
			return "text-base px-6 py-3"
		default:
			return "text-sm px-4 py-2"
	}
}

/**
 * Unified Button component
 *
 * Consolidates DangerButton, SuccessButton, SettingsButton, and MarieCoderButton
 * into a single, consistent API.
 *
 * @example
 * ```tsx
 * // Danger button for destructive actions
 * <Button variant="danger" onClick={handleDelete}>Delete</Button>
 *
 * // Success button for positive actions
 * <Button variant="success" onClick={handleSave}>Save Changes</Button>
 *
 * // Secondary button with full width
 * <Button variant="secondary" fullWidth>Configure</Button>
 *
 * // Button with icon
 * <Button icon={<i className="codicon codicon-add" />}>
 *   Add Item
 * </Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
	children,
	variant = "primary",
	size = "md",
	fullWidth = false,
	icon,
	className = "",
	disabled = false,
	...props
}) => {
	const appearance = getAppearance(variant)
	const variantClasses = getVariantClasses(variant)
	const sizeClasses = getSizeClasses(size)
	const widthClass = fullWidth ? "!w-full" : ""

	// Icon styling (matching SettingsButton's codicon styles)
	const iconStyle: React.CSSProperties = icon
		? {
				marginRight: 6,
				flexShrink: 0,
				fontSize: "16px",
			}
		: {}

	return (
		<VSCodeButton
			{...props}
			appearance={appearance}
			className={`
				${variantClasses}
				${sizeClasses}
				${widthClass}
				${className}
			`
				.replace(/\s+/g, " ")
				.trim()}
			disabled={disabled}>
			{icon && (
				<span className="inline-flex items-center" style={iconStyle}>
					{icon}
				</span>
			)}
			{children}
		</VSCodeButton>
	)
}

export default Button
