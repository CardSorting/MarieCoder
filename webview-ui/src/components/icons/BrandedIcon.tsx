import React from "react"
import { generateGradientId, MARIE_BRAND_COLORS } from "./brand-colors"
import { type IconProps } from "./index"

interface BrandedIconProps extends IconProps {
	/** Apply Marie brand purple gradient to the icon */
	branded?: boolean
	children: React.ReactNode
}

/**
 * Wrapper component for icons that can optionally apply Marie brand styling
 *
 * @example
 * // Regular icon with theme colors
 * <BrandedIcon size={24}><Star /></BrandedIcon>
 *
 * // Icon with Marie brand purple gradient
 * <BrandedIcon size={24} branded><Star /></BrandedIcon>
 */
export const BrandedIcon: React.FC<BrandedIconProps> = ({ branded = false, children, size = 24, className = "", ...props }) => {
	const gradientId = generateGradientId("branded-icon")

	if (!branded) {
		return <>{children}</>
	}

	return (
		<svg
			className={className}
			fill="none"
			height={size}
			viewBox="0 0 24 24"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}>
			<defs>
				<linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
					<stop offset="0%" style={{ stopColor: MARIE_BRAND_COLORS.purpleStart, stopOpacity: 1 }} />
					<stop offset="100%" style={{ stopColor: MARIE_BRAND_COLORS.purpleEnd, stopOpacity: 1 }} />
				</linearGradient>
			</defs>
			<g stroke={`url(#${gradientId})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
				{children}
			</g>
		</svg>
	)
}
