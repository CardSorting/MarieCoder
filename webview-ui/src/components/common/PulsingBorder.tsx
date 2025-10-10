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

import { memo } from "react"
import styled, { keyframes } from "styled-components"

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

// Create gradient animation with color cycling
const createGradientAnimation = (colors: string[]) => keyframes`
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
`

const PulsingBorderContainer = styled.div<{
	$colors: string[]
	$roundness: number
	$intensity: number
	$bloom: number
	$smoke: number
}>`
	position: relative;
	width: 100%;
	height: 100%;
	border-radius: ${(props) => props.$roundness * 8}px;
	overflow: hidden;

	&::before {
		content: "";
		position: absolute;
		inset: 0;
		padding: 2px; /* Border width */
		background: linear-gradient(90deg, ${(props) => props.$colors.join(", ")});
		-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		animation: ${(props) => createGradientAnimation(props.$colors)} 4s ease-in-out infinite;
		opacity: ${(props) => 0.4 + props.$smoke * 0.3};
		filter: blur(${(props) => props.$intensity * 2}px);
	}

	&::after {
		content: "";
		position: absolute;
		inset: -10px;
		background: linear-gradient(90deg, ${(props) => props.$colors.join(", ")});
		animation: ${(props) => createGradientAnimation(props.$colors)} 4s ease-in-out infinite;
		opacity: ${(props) => props.$bloom * 0.3};
		filter: blur(${(props) => (props.$bloom + props.$intensity) * 8}px);
		z-index: -1;
	}
`

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
		return (
			<PulsingBorderContainer
				$bloom={bloom}
				$colors={colors}
				$intensity={intensity}
				$roundness={roundness}
				$smoke={smoke}
				className={className}
			/>
		)
	},
)

PulsingBorder.displayName = "PulsingBorder"
