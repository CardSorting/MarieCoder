import React from "react"

export type BadgeVariant = "default" | "branded" | "success" | "warning" | "error" | "info"
export type BadgeSize = "sm" | "md" | "lg"

export interface BadgeProps {
	children: React.ReactNode
	variant?: BadgeVariant
	size?: BadgeSize
	className?: string
	icon?: React.ReactNode
}

/**
 * Get Tailwind classes for badge variant styling
 */
const getVariantClasses = (variant: BadgeVariant): string => {
	switch (variant) {
		case "branded":
			return "marie-brand-gradient text-white"
		case "success":
			return "bg-success/20 text-success border border-success/30"
		case "warning":
			return "bg-warning/20 text-warning border border-warning/30"
		case "error":
			return "bg-error/20 text-error border border-error/30"
		case "info":
			return "bg-badge-background text-badge-foreground"
		default:
			return "bg-badge-background text-badge-foreground"
	}
}

/**
 * Get size-based styling
 */
const getSizeClasses = (size: BadgeSize): string => {
	switch (size) {
		case "sm":
			return "text-xxs px-1.5 py-0.5"
		case "lg":
			return "text-sm px-3 py-1"
		default:
			return "text-xs px-2 py-0.5"
	}
}

/**
 * Badge Component
 *
 * Small status indicator or label with various styles
 *
 * @example
 * ```tsx
 * // Default badge
 * <Badge>New</Badge>
 *
 * // Branded badge with Marie gradient
 * <Badge variant="branded">Premium</Badge>
 *
 * // Success badge
 * <Badge variant="success">Active</Badge>
 *
 * // Badge with icon
 * <Badge icon={<span className="codicon codicon-star-full" />}>
 *   Featured
 * </Badge>
 * ```
 */
export const Badge: React.FC<BadgeProps> = ({ children, variant = "default", size = "md", className = "", icon }) => {
	const variantClasses = getVariantClasses(variant)
	const sizeClasses = getSizeClasses(size)

	return (
		<span
			className={`
				inline-flex items-center gap-1
				rounded-full
				font-medium
				whitespace-nowrap
				${variantClasses}
				${sizeClasses}
				${className}
			`
				.replace(/\s+/g, " ")
				.trim()}>
			{icon && <span className="inline-flex items-center">{icon}</span>}
			{children}
		</span>
	)
}

export default Badge
