/**
 * MarieCoder Brand Colors
 *
 * These colors define the visual identity of MarieCoder.
 * Use these constants for consistent branding across the application.
 */

export const MARIE_BRAND_COLORS = {
	// Primary purple gradient
	purpleStart: "#6B46C1",
	purpleEnd: "#9333EA",

	// Accent white gradient
	whiteStart: "#FFFFFF",
	whiteEnd: "#E0E7FF",

	// Soft purple for accents
	softPurple: "#F3E8FF",

	// CSS gradient strings for easy use
	gradients: {
		purple: "linear-gradient(135deg, #6B46C1 0%, #9333EA 100%)",
		white: "linear-gradient(180deg, #FFFFFF 0%, #E0E7FF 100%)",
	},
} as const

/**
 * Generate unique gradient IDs for SVG gradients
 * This prevents conflicts when multiple instances are rendered
 */
export const generateGradientId = (name: string) => {
	return `${name}-${Math.random().toString(36).substr(2, 9)}`
}
