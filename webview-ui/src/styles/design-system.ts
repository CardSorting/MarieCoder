/**
 * MarieCoder Design System
 *
 * Central design tokens for the MarieCoder extension.
 * Provides consistent spacing, colors, typography, and component styles.
 */

import { MARIE_BRAND_COLORS } from "@/components/icons/brand-colors"

/**
 * Brand Colors
 * Purple gradient theme that represents MarieCoder's identity
 */
export const colors = {
	brand: MARIE_BRAND_COLORS,

	// VSCode theme colors (dynamic based on user theme)
	vscode: {
		background: "var(--vscode-editor-background)",
		foreground: "var(--vscode-foreground)",
		border: "var(--vscode-focusBorder)",
		borderPanel: "var(--vscode-panel-border)",

		// Interactive elements
		hover: "var(--vscode-list-hoverBackground)",
		active: "var(--vscode-list-activeSelectionBackground)",
		focus: "var(--vscode-focusBorder)",

		// Semantic colors
		error: "var(--vscode-errorForeground)",
		warning: "var(--vscode-charts-yellow)",
		success: "var(--vscode-charts-green)",
		info: "var(--vscode-charts-blue)",

		// Text colors
		description: "var(--vscode-descriptionForeground)",
		disabled: "var(--vscode-disabledForeground)",
		link: "var(--vscode-textLink-foreground)",
		linkHover: "var(--vscode-textLink-activeForeground)",

		// Button colors
		buttonBackground: "var(--vscode-button-background)",
		buttonForeground: "var(--vscode-button-foreground)",
		buttonHover: "var(--vscode-button-hoverBackground)",
		buttonSecondaryBackground: "var(--vscode-button-secondaryBackground)",
		buttonSecondaryForeground: "var(--vscode-button-secondaryForeground)",
		buttonSecondaryHover: "var(--vscode-button-secondaryHoverBackground)",

		// Input colors
		inputBackground: "var(--vscode-input-background)",
		inputBorder: "var(--vscode-input-border)",
		inputForeground: "var(--vscode-input-foreground)",
		inputPlaceholder: "var(--vscode-input-placeholderForeground)",

		// Badge colors
		badgeBackground: "var(--vscode-badge-background)",
		badgeForeground: "var(--vscode-badge-foreground)",
	},
} as const

/**
 * Spacing Scale
 * Based on 4px grid system for consistent spacing
 */
export const spacing = {
	xs: "4px",
	sm: "8px",
	md: "12px",
	lg: "16px",
	xl: "20px",
	"2xl": "24px",
	"3xl": "32px",
	"4xl": "40px",
	"5xl": "48px",
} as const

/**
 * Border Radius
 * Consistent corner rounding across components
 */
export const radius = {
	none: "0",
	sm: "3px",
	md: "4px",
	lg: "6px",
	xl: "8px",
	"2xl": "12px",
	"3xl": "16px",
	full: "9999px",
} as const

/**
 * Typography Scale
 * Based on VSCode font sizes
 */
export const typography = {
	fontSize: {
		xs: "calc(0.75 * var(--vscode-font-size))",
		sm: "calc(0.85 * var(--vscode-font-size))",
		base: "var(--vscode-font-size)",
		md: "calc(1.25 * var(--vscode-font-size))",
		lg: "calc(1.5 * var(--vscode-font-size))",
		xl: "calc(2 * var(--vscode-font-size))",
	},
	fontWeight: {
		normal: 400,
		medium: 500,
		semibold: 600,
		bold: 700,
	},
	lineHeight: {
		tight: 1.25,
		normal: 1.5,
		relaxed: 1.75,
	},
} as const

/**
 * Shadows
 * Subtle depth indicators
 */
export const shadows = {
	sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
	md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
	lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
	xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
} as const

/**
 * Transitions
 * Smooth animations for interactions
 */
export const transitions = {
	fast: "150ms ease-in-out",
	base: "200ms ease-in-out",
	slow: "300ms ease-in-out",

	props: {
		default: "all",
		colors: "background-color, border-color, color, fill, stroke",
		opacity: "opacity",
		shadow: "box-shadow",
		transform: "transform",
	},
} as const

/**
 * Z-Index Scale
 * Layering order for stacked elements
 */
export const zIndex = {
	base: 0,
	dropdown: 1000,
	sticky: 1020,
	fixed: 1030,
	modalBackdrop: 1040,
	modal: 1050,
	popover: 1060,
	tooltip: 1070,
} as const

/**
 * Component-specific Design Tokens
 */
export const components = {
	button: {
		height: {
			sm: "24px",
			md: "28px",
			lg: "32px",
		},
		padding: {
			sm: "4px 12px",
			md: "6px 16px",
			lg: "8px 20px",
		},
		borderRadius: radius.md,
		fontSize: {
			sm: typography.fontSize.xs,
			md: typography.fontSize.sm,
			lg: typography.fontSize.base,
		},
	},
	card: {
		padding: spacing.md,
		borderRadius: radius.md,
		border: `1px solid ${colors.vscode.borderPanel}`,
		background: "color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 65%, transparent)",
		backgroundHover: "color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 100%, transparent)",
	},
	input: {
		height: "28px",
		padding: "4px 8px",
		borderRadius: radius.sm,
		fontSize: typography.fontSize.sm,
		border: `1px solid ${colors.vscode.inputBorder}`,
	},
	badge: {
		padding: "2px 8px",
		borderRadius: radius.full,
		fontSize: typography.fontSize.xs,
	},
} as const

/**
 * Animation Utilities
 */
export const animations = {
	fadeIn: {
		from: { opacity: 0 },
		to: { opacity: 1 },
	},
	slideInUp: {
		from: { transform: "translateY(10px)", opacity: 0 },
		to: { transform: "translateY(0)", opacity: 1 },
	},
	slideInDown: {
		from: { transform: "translateY(-10px)", opacity: 0 },
		to: { transform: "translateY(0)", opacity: 1 },
	},
	scaleIn: {
		from: { transform: "scale(0.95)", opacity: 0 },
		to: { transform: "scale(1)", opacity: 1 },
	},
} as const

/**
 * Helper Functions
 */

/**
 * Create a color-mix CSS value for transparency effects
 */
export const colorMix = (color: string, percentage: number, transparent = true) => {
	return `color-mix(in srgb, ${color} ${percentage}%, ${transparent ? "transparent" : "var(--vscode-editor-background)"})`
}

/**
 * Create a branded gradient background
 */
export const brandGradient = (direction: "to-r" | "to-br" | "to-b" = "to-br") => {
	const dirMap = {
		"to-r": "90deg",
		"to-br": "135deg",
		"to-b": "180deg",
	}
	return `linear-gradient(${dirMap[direction]}, ${colors.brand.purpleStart} 0%, ${colors.brand.purpleEnd} 100%)`
}

/**
 * Create a focus ring style
 */
export const focusRing = (color = colors.vscode.focus) => ({
	outline: `2px solid ${color}`,
	outlineOffset: "2px",
})

export default {
	colors,
	spacing,
	radius,
	typography,
	shadows,
	transitions,
	zIndex,
	components,
	animations,
	// Helper functions
	colorMix,
	brandGradient,
	focusRing,
}
