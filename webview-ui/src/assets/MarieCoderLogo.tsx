import React from "react"
import { generateGradientId, MARIE_BRAND_COLORS } from "@/components/icons/brand-colors"

interface MarieCoderLogoProps {
	className?: string
	size?: number
}

const MarieCoderLogo: React.FC<MarieCoderLogoProps> = ({ className = "", size = 24 }) => {
	const gradientId = generateGradientId("marie-gradient")
	const accentId = generateGradientId("marie-accent")

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
					<stop offset="0%" style={{ stopColor: MARIE_BRAND_COLORS.purpleStart, stopOpacity: 1 }} />
					<stop offset="100%" style={{ stopColor: MARIE_BRAND_COLORS.purpleEnd, stopOpacity: 1 }} />
				</linearGradient>
				<linearGradient id={accentId} x1="0%" x2="0%" y1="0%" y2="100%">
					<stop offset="0%" style={{ stopColor: MARIE_BRAND_COLORS.whiteStart, stopOpacity: 1 }} />
					<stop offset="100%" style={{ stopColor: MARIE_BRAND_COLORS.whiteEnd, stopOpacity: 1 }} />
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
			<circle cx="100" cy="28" fill={MARIE_BRAND_COLORS.softPurple} opacity="0.8" r="8" />
		</svg>
	)
}

export default MarieCoderLogo
