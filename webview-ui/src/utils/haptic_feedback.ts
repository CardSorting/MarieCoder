/**
 * Haptic-style visual feedback utility
 * Provides instant tactile-like feedback through animations and visual cues
 */

import { useCallback, useRef } from "react"

/**
 * Feedback intensity levels
 */
export type FeedbackIntensity = "light" | "medium" | "heavy"

/**
 * Feedback types
 */
export type FeedbackType = "success" | "error" | "warning" | "info" | "selection"

/**
 * Visual haptic feedback manager
 */
export class HapticFeedbackManager {
	private static instance: HapticFeedbackManager

	private constructor() {}

	static getInstance(): HapticFeedbackManager {
		if (!HapticFeedbackManager.instance) {
			HapticFeedbackManager.instance = new HapticFeedbackManager()
		}
		return HapticFeedbackManager.instance
	}

	/**
	 * Trigger visual haptic feedback on an element
	 */
	trigger(element: HTMLElement | null, type: FeedbackType = "selection", intensity: FeedbackIntensity = "medium"): void {
		if (!element) {
			return
		}

		// Add haptic class for animation
		element.classList.add("haptic-feedback")

		// Apply intensity-specific effects
		const scale = this.getScaleForIntensity(intensity)
		const originalTransform = element.style.transform

		// Instant feedback with requestAnimationFrame for smooth 60fps animation
		requestAnimationFrame(() => {
			element.style.transform = `scale(${scale})`

			requestAnimationFrame(() => {
				element.style.transform = originalTransform || "scale(1)"
			})
		})

		// Remove class after animation completes
		setTimeout(() => {
			element.classList.remove("haptic-feedback")
		}, 300)

		// Optional: Add visual indicator based on type
		this.addTypeIndicator(element, type)
	}

	/**
	 * Get scale transformation based on intensity
	 */
	private getScaleForIntensity(intensity: FeedbackIntensity): number {
		switch (intensity) {
			case "light":
				return 1.01
			case "medium":
				return 1.02
			case "heavy":
				return 1.05
			default:
				return 1.02
		}
	}

	/**
	 * Add visual type indicator (color flash, etc.)
	 */
	private addTypeIndicator(element: HTMLElement, type: FeedbackType): void {
		const indicator = document.createElement("div")
		indicator.className = `haptic-indicator haptic-${type}`
		indicator.style.cssText = `
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 100%;
			height: 100%;
			border-radius: inherit;
			pointer-events: none;
			z-index: 9999;
			opacity: 0.3;
			animation: hapticFlash 0.3s ease-out;
		`

		// Set color based on type
		const colors = {
			success: "var(--vscode-testing-iconPassed, #4caf50)",
			error: "var(--vscode-testing-iconFailed, #f44336)",
			warning: "var(--vscode-testing-iconQueued, #ff9800)",
			info: "var(--vscode-charts-blue, #2196f3)",
			selection: "var(--vscode-focusBorder, #007fd4)",
		}
		indicator.style.backgroundColor = colors[type]

		// Ensure element has position context
		const originalPosition = element.style.position
		if (!originalPosition || originalPosition === "static") {
			element.style.position = "relative"
		}

		element.appendChild(indicator)

		// Remove indicator after animation
		setTimeout(() => {
			indicator.remove()
			if (!originalPosition || originalPosition === "static") {
				element.style.position = originalPosition
			}
		}, 300)
	}

	/**
	 * Trigger ripple effect (Material Design-style)
	 */
	ripple(element: HTMLElement | null, event?: MouseEvent): void {
		if (!element) {
			return
		}

		const rect = element.getBoundingClientRect()
		const x = event ? event.clientX - rect.left : rect.width / 2
		const y = event ? event.clientY - rect.top : rect.height / 2
		const size = Math.max(rect.width, rect.height) * 2

		const ripple = document.createElement("div")
		ripple.style.cssText = `
			position: absolute;
			left: ${x}px;
			top: ${y}px;
			width: ${size}px;
			height: ${size}px;
			border-radius: 50%;
			background: var(--vscode-focusBorder, #007fd4);
			opacity: 0.3;
			transform: translate(-50%, -50%) scale(0);
			animation: rippleEffect 0.6s ease-out;
			pointer-events: none;
		`

		// Ensure element has position context
		const originalPosition = element.style.position
		if (!originalPosition || originalPosition === "static") {
			element.style.position = "relative"
		}
		const originalOverflow = element.style.overflow
		element.style.overflow = "hidden"

		element.appendChild(ripple)

		// Remove ripple after animation
		setTimeout(() => {
			ripple.remove()
			if (!originalPosition || originalPosition === "static") {
				element.style.position = originalPosition
			}
			element.style.overflow = originalOverflow
		}, 600)
	}
}

/**
 * React hook for haptic feedback
 *
 * @example
 * ```tsx
 * const { triggerFeedback, triggerRipple } = useHapticFeedback()
 *
 * <button
 *   ref={buttonRef}
 *   onClick={(e) => {
 *     triggerRipple(buttonRef.current, e)
 *     handleClick()
 *   }}
 * >
 *   Click me
 * </button>
 * ```
 */
export function useHapticFeedback() {
	const manager = HapticFeedbackManager.getInstance()

	const triggerFeedback = useCallback(
		(element: HTMLElement | null, type: FeedbackType = "selection", intensity: FeedbackIntensity = "medium") => {
			manager.trigger(element, type, intensity)
		},
		[manager],
	)

	const triggerRipple = useCallback(
		(element: HTMLElement | null, event?: MouseEvent) => {
			manager.ripple(element, event)
		},
		[manager],
	)

	return {
		triggerFeedback,
		triggerRipple,
	}
}

/**
 * Hook for button feedback
 * Automatically adds haptic feedback to button clicks
 */
export function useButtonFeedback(type: FeedbackType = "selection") {
	const { triggerFeedback, triggerRipple } = useHapticFeedback()
	const elementRef = useRef<HTMLElement>(null)

	const onClick = useCallback(
		(event: React.MouseEvent<HTMLElement>) => {
			const element = elementRef.current || (event.currentTarget as HTMLElement)

			// Trigger both feedback types for rich interaction
			triggerFeedback(element, type, "light")
			triggerRipple(element, event.nativeEvent)
		},
		[triggerFeedback, triggerRipple, type],
	)

	return {
		ref: elementRef,
		onClick,
	}
}

// Add CSS for haptic animations to the document
if (typeof document !== "undefined") {
	const style = document.createElement("style")
	style.textContent = `
		@keyframes hapticFlash {
			0% {
				opacity: 0.3;
				transform: translate(-50%, -50%) scale(0.9);
			}
			50% {
				opacity: 0.5;
			}
			100% {
				opacity: 0;
				transform: translate(-50%, -50%) scale(1.1);
			}
		}

		@keyframes rippleEffect {
			0% {
				transform: translate(-50%, -50%) scale(0);
				opacity: 0.3;
			}
			100% {
				transform: translate(-50%, -50%) scale(1);
				opacity: 0;
			}
		}
	`

	// Only add if not already present
	if (!document.getElementById("haptic-feedback-styles")) {
		style.id = "haptic-feedback-styles"
		document.head.appendChild(style)
	}
}
