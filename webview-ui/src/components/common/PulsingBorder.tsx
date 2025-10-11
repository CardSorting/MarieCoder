/**
 * Lightweight pulsing border animation component
 * Replaces @paper-design/shaders-react (1.2MB) with pure CSS animation
 *
 * Features:
 * - Gradient color cycling animation
 * - GPU-accelerated performance
 * - Zero runtime overhead
 * - Fully customizable
 */

import { memo, useMemo } from "react"

interface PulsingBorderProps {
	/** Array of colors to cycle through */
	colors?: string[]
	/** CSS className for positioning and sizing */
	className?: string
	/** Border roundness (0-1, where 0 is sharp, 1 is fully rounded) */
	roundness?: number
	/** Animation intensity (affects blur and glow) */
	intensity?: number
	/** Pulse scale effect (not implemented in CSS version) */
	pulse?: number
	/** Bloom effect (affects glow radius) */
	bloom?: number
	/** Background color */
	colorBack?: string
	/** Scale (not used in CSS version) */
	scale?: number
	/** Smoke effect (affects opacity variations) */
	smoke?: number
	/** Smoke size (not used in CSS version) */
	smokeSize?: number
	/** Additional props for API compatibility */
	softness?: number
	speed?: number
	spotSize?: number
	spots?: number
	thickness?: number
}

/**
 * PulsingBorder - Animated gradient border effect
 *
 * Drop-in replacement for @paper-design/shaders-react PulsingBorder
 * Uses pure CSS animations for better performance
 */
export const PulsingBorder = memo(
	({
		colors = ["#9d57fa", "#57c7fa", "#fa57a8", "#9d57fa"],
		className = "",
		roundness = 0,
		intensity = 0.4,
		bloom = 1,
		smoke = 0.25,
		// Unused parameters kept for API compatibility with original library
		pulse: _pulse = 0.3,
		colorBack: _colorBack = "rgba(0,0,0,0)",
		scale: _scale = 1.0,
		smokeSize: _smokeSize = 0.8,
		softness: _softness = 0.8,
		speed: _speed = 1.5,
		spotSize: _spotSize = 0.5,
		spots: _spots = 4,
		thickness: _thickness = 0.1,
	}: PulsingBorderProps) => {
		// Create unique animation name to avoid conflicts
		const animationId = useMemo(() => `gradient-anim-${Math.random().toString(36).substr(2, 9)}`, [])

		// Create CSS for keyframes
		const keyframesCSS = useMemo(
			() => `
			@keyframes ${animationId} {
				0% {
					background: linear-gradient(90deg, ${colors[0]}, ${colors[1]});
				}
				33% {
					background: linear-gradient(90deg, ${colors[1]}, ${colors[2]});
				}
				66% {
					background: linear-gradient(90deg, ${colors[2]}, ${colors[0]});
				}
				100% {
					background: linear-gradient(90deg, ${colors[0]}, ${colors[1]});
				}
			}
		`,
			[animationId, colors],
		)

		// Calculate values
		const borderRadius = roundness * 8
		const beforeOpacity = 0.4 + smoke * 0.3
		const beforeBlur = intensity * 2
		const afterOpacity = bloom * 0.3
		const afterBlur = (bloom + intensity) * 8
		const colorGradient = colors.join(", ")

		return (
			<>
				<style>{keyframesCSS}</style>
				<div
					className={`relative w-full h-full overflow-hidden ${className}`}
					style={{ borderRadius: `${borderRadius}px` }}>
					{/* Border gradient */}
					<div
						className="absolute inset-0"
						style={{
							padding: "2px",
							background: `linear-gradient(90deg, ${colorGradient})`,
							WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
							WebkitMaskComposite: "xor",
							maskComposite: "exclude",
							animation: `${animationId} 4s ease-in-out infinite`,
							opacity: beforeOpacity,
							filter: `blur(${beforeBlur}px)`,
						}}
					/>
					{/* Glow effect */}
					<div
						className="absolute -inset-[10px] -z-[1]"
						style={{
							background: `linear-gradient(90deg, ${colorGradient})`,
							animation: `${animationId} 4s ease-in-out infinite`,
							opacity: afterOpacity,
							filter: `blur(${afterBlur}px)`,
						}}
					/>
				</div>
			</>
		)
	},
)

PulsingBorder.displayName = "PulsingBorder"
