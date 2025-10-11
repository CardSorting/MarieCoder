import React, { useEffect, useState } from "react"
import { generateGradientId, MARIE_BRAND_COLORS } from "@/components/icons/brand-colors"

interface MarieCoderLogoProps {
	className?: string
	size?: number
	/** Force a specific theme (useful for static renders) */
	theme?: "light" | "dark"
}

const MarieCoderLogo: React.FC<MarieCoderLogoProps> = ({ className = "", size = 24, theme }) => {
	const gradientId = generateGradientId("marie-gradient")
	const accentId = generateGradientId("marie-accent")

	// Detect theme from CSS variables if not explicitly provided
	const [isDark, setIsDark] = useState(true)

	useEffect(() => {
		if (theme) {
			setIsDark(theme === "dark")
			return
		}

		// Detect theme from VSCode CSS variables
		const detectTheme = () => {
			const bgColor = getComputedStyle(document.body).getPropertyValue("--vscode-editor-background").trim()
			// Check if background is dark by converting to RGB and checking luminance
			if (bgColor) {
				const rgb = bgColor.match(/\d+/g)
				if (rgb && rgb.length >= 3) {
					const luminance =
						(0.299 * Number.parseInt(rgb[0]) + 0.587 * Number.parseInt(rgb[1]) + 0.114 * Number.parseInt(rgb[2])) /
						255
					setIsDark(luminance < 0.5)
				}
			}
		}

		detectTheme()
		// Re-detect on theme changes
		const observer = new MutationObserver(detectTheme)
		observer.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] })

		return () => observer.disconnect()
	}, [theme])

	// Use brighter colors for dark theme, darker for light theme
	const purpleStart = isDark ? MARIE_BRAND_COLORS.purpleStart : "#5B21B6"
	const purpleEnd = isDark ? MARIE_BRAND_COLORS.purpleEnd : "#7C3AED"
	const textStart = isDark ? MARIE_BRAND_COLORS.whiteStart : "#FFFFFF"
	const textEnd = isDark ? MARIE_BRAND_COLORS.whiteEnd : "#E0E7FF"
	const accentColor = isDark ? MARIE_BRAND_COLORS.softPurple : "#F3E8FF"

	return (
		<svg
			className={className}
			fill="none"
			height={size}
			viewBox="0 0 128 128"
			width={size}
			xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
					<stop offset="0%" style={{ stopColor: purpleStart, stopOpacity: 1 }} />
					<stop offset="100%" style={{ stopColor: purpleEnd, stopOpacity: 1 }} />
				</linearGradient>
				<linearGradient id={accentId} x1="0%" x2="0%" y1="0%" y2="100%">
					<stop offset="0%" style={{ stopColor: textStart, stopOpacity: 1 }} />
					<stop offset="100%" style={{ stopColor: textEnd, stopOpacity: 1 }} />
				</linearGradient>
			</defs>

			{/* Rounded square background with purple gradient */}
			<rect fill={`url(#${gradientId})`} height="120" rx="24" width="120" x="4" y="4" />

			{/* Elegant "M" letter for Marie */}
			<text
				fill={`url(#${accentId})`}
				fontFamily="Arial, sans-serif"
				fontSize="76"
				fontWeight="bold"
				textAnchor="middle"
				x="64"
				y="94">
				M
			</text>

			{/* Subtle accent dot */}
			<circle cx="100" cy="28" fill={accentColor} opacity={isDark ? 0.8 : 0.9} r="8" />
		</svg>
	)
}

export default MarieCoderLogo
