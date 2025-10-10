/**
 * Lightweight floating element positioning utility
 * Replaces @floating-ui/react (1.5MB) with zero-dependency implementation
 *
 * Provides:
 * - Auto-positioning with collision detection
 * - Flip behavior when out of viewport
 * - Shift behavior to stay in bounds
 * - Offset control
 */

export type Placement =
	| "top"
	| "top-start"
	| "top-end"
	| "bottom"
	| "bottom-start"
	| "bottom-end"
	| "left"
	| "left-start"
	| "left-end"
	| "right"
	| "right-start"
	| "right-end"

export interface PositionOptions {
	/** Preferred placement */
	placement?: Placement
	/** Offset from reference element (main axis and cross axis) */
	offset?: { mainAxis?: number; crossAxis?: number } | number
	/** Enable flipping to opposite side if no space */
	flip?: boolean
	/** Enable shifting to stay within viewport */
	shift?: boolean
	/** Padding from viewport edges */
	padding?: number
}

export interface Position {
	x: number
	y: number
	placement: Placement
}

/**
 * Calculate the position of a floating element relative to a reference element
 * Handles viewport collision detection, flipping, and shifting
 */
export function calculatePosition(reference: HTMLElement, floating: HTMLElement, options: PositionOptions = {}): Position {
	const { placement = "bottom", offset = 0, flip = true, shift = true, padding = 8 } = options

	const offsetObj =
		typeof offset === "number"
			? { mainAxis: offset, crossAxis: 0 }
			: { mainAxis: offset.mainAxis ?? 0, crossAxis: offset.crossAxis ?? 0 }

	const refRect = reference.getBoundingClientRect()
	const floatRect = floating.getBoundingClientRect()
	const viewport = {
		width: window.innerWidth,
		height: window.innerHeight,
	}

	let finalPlacement = placement
	let x = 0
	let y = 0

	// Calculate base position based on placement
	const calculate = (place: Placement): { x: number; y: number } => {
		const [side, align] = place.split("-") as [string, string | undefined]

		let posX = 0
		let posY = 0

		// Calculate main axis position
		switch (side) {
			case "top":
				posX = refRect.left + refRect.width / 2 - floatRect.width / 2
				posY = refRect.top - floatRect.height - offsetObj.mainAxis
				break
			case "bottom":
				posX = refRect.left + refRect.width / 2 - floatRect.width / 2
				posY = refRect.bottom + offsetObj.mainAxis
				break
			case "left":
				posX = refRect.left - floatRect.width - offsetObj.mainAxis
				posY = refRect.top + refRect.height / 2 - floatRect.height / 2
				break
			case "right":
				posX = refRect.right + offsetObj.mainAxis
				posY = refRect.top + refRect.height / 2 - floatRect.height / 2
				break
		}

		// Apply alignment
		if (align === "start") {
			if (side === "top" || side === "bottom") {
				posX = refRect.left + offsetObj.crossAxis
			} else {
				posY = refRect.top + offsetObj.crossAxis
			}
		} else if (align === "end") {
			if (side === "top" || side === "bottom") {
				posX = refRect.right - floatRect.width - offsetObj.crossAxis
			} else {
				posY = refRect.bottom - floatRect.height - offsetObj.crossAxis
			}
		}

		return { x: posX, y: posY }
	}

	// Calculate initial position
	const pos = calculate(placement)
	x = pos.x
	y = pos.y

	// Flip if out of bounds
	if (flip) {
		const wouldOverflowTop = y < padding
		const wouldOverflowBottom = y + floatRect.height > viewport.height - padding
		const wouldOverflowLeft = x < padding
		const wouldOverflowRight = x + floatRect.width > viewport.width - padding

		const [side, align] = placement.split("-") as [string, string | undefined]
		let flipped = false

		if (side === "top" && wouldOverflowTop) {
			finalPlacement = align ? (`bottom-${align}` as Placement) : "bottom"
			flipped = true
		} else if (side === "bottom" && wouldOverflowBottom) {
			finalPlacement = align ? (`top-${align}` as Placement) : "top"
			flipped = true
		} else if (side === "left" && wouldOverflowLeft) {
			finalPlacement = align ? (`right-${align}` as Placement) : "right"
			flipped = true
		} else if (side === "right" && wouldOverflowRight) {
			finalPlacement = align ? (`left-${align}` as Placement) : "left"
			flipped = true
		}

		if (flipped) {
			const newPos = calculate(finalPlacement)
			x = newPos.x
			y = newPos.y
		}
	}

	// Shift to stay within viewport
	if (shift) {
		// Shift horizontally
		if (x < padding) {
			x = padding
		} else if (x + floatRect.width > viewport.width - padding) {
			x = viewport.width - floatRect.width - padding
		}

		// Shift vertically
		if (y < padding) {
			y = padding
		} else if (y + floatRect.height > viewport.height - padding) {
			y = viewport.height - floatRect.height - padding
		}
	}

	return { x, y, placement: finalPlacement }
}

/**
 * Apply calculated position to a floating element
 */
export function applyPosition(element: HTMLElement, position: Position): void {
	element.style.position = "fixed"
	element.style.left = `${position.x}px`
	element.style.top = `${position.y}px`
}

/**
 * React hook for managing floating element position
 * Simplified replacement for useFloating from @floating-ui/react
 */
export function useFloatingPosition(options: PositionOptions = {}) {
	return {
		calculate: (reference: HTMLElement, floating: HTMLElement) => {
			return calculatePosition(reference, floating, options)
		},
		apply: (element: HTMLElement, position: Position) => {
			applyPosition(element, position)
		},
	}
}
