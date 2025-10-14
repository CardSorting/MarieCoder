/**
 * Paint Holding utilities to prevent visual flashes during navigation and state changes
 * Ensures smooth visual continuity by holding the paint until content is ready
 */

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Paint holding configuration
 */
export interface PaintHoldingConfig {
	/**
	 * Maximum time to hold paint in milliseconds
	 * @default 100
	 */
	maxHoldTime?: number
	/**
	 * Minimum time to hold paint (prevents too-fast flashes)
	 * @default 16 (1 frame)
	 */
	minHoldTime?: number
	/**
	 * Show loading indicator after this time
	 * @default 50
	 */
	loadingThreshold?: number
	/**
	 * Callback when paint is held
	 */
	onHoldStart?: () => void
	/**
	 * Callback when paint is released
	 */
	onHoldEnd?: () => void
}

/**
 * Paint Holding Manager
 * Coordinates paint holds across the application
 */
class PaintHoldingManager {
	private static instance: PaintHoldingManager
	private activeHolds = new Set<string>()
	private holdTimers = new Map<string, NodeJS.Timeout>()
	private paintHeld = false

	private constructor() {}

	static getInstance(): PaintHoldingManager {
		if (!PaintHoldingManager.instance) {
			PaintHoldingManager.instance = new PaintHoldingManager()
		}
		return PaintHoldingManager.instance
	}

	/**
	 * Hold paint for a specific operation
	 */
	hold(id: string, config: PaintHoldingConfig = {}): () => void {
		const { maxHoldTime = 100, onHoldStart } = config

		// Add to active holds
		this.activeHolds.add(id)

		// Trigger hold start callback
		if (this.activeHolds.size === 1) {
			this.paintHeld = true
			onHoldStart?.()
			this.applyPaintHold()
		}

		// Set max hold timer
		const maxTimer = setTimeout(() => {
			this.release(id)
		}, maxHoldTime)

		this.holdTimers.set(id, maxTimer)

		// Return release function
		return () => this.release(id)
	}

	/**
	 * Release paint hold
	 */
	release(id: string, config: PaintHoldingConfig = {}): void {
		const { minHoldTime = 16, onHoldEnd } = config

		// Clear timer
		const timer = this.holdTimers.get(id)
		if (timer) {
			clearTimeout(timer)
			this.holdTimers.delete(id)
		}

		// Remove from active holds
		this.activeHolds.delete(id)

		// If no more active holds, release paint
		if (this.activeHolds.size === 0 && this.paintHeld) {
			// Ensure minimum hold time for smooth perception
			setTimeout(() => {
				this.paintHeld = false
				onHoldEnd?.()
				this.releasePaintHold()
			}, minHoldTime)
		}
	}

	/**
	 * Apply paint hold visually
	 */
	private applyPaintHold(): void {
		if (typeof document === "undefined") {
			return
		}

		// Add class to body for CSS targeting
		document.body.classList.add("paint-hold-active")

		// Use content-visibility to optimize (TypeScript doesn't recognize this yet)
		;(document.body.style as any).contentVisibility = "auto"
	}

	/**
	 * Release paint hold visually
	 */
	private releasePaintHold(): void {
		if (typeof document === "undefined") {
			return
		}

		// Remove class
		document.body.classList.remove("paint-hold-active")

		// Restore content-visibility
		;(document.body.style as any).contentVisibility = ""
	}

	/**
	 * Check if paint is currently held
	 */
	isPaintHeld(): boolean {
		return this.paintHeld
	}

	/**
	 * Get number of active holds
	 */
	getActiveHoldsCount(): number {
		return this.activeHolds.size
	}
}

/**
 * React hook for paint holding
 * Prevents visual flashes during async operations
 *
 * @example
 * ```tsx
 * const { holdPaint, isPaintHeld } = usePaintHolding()
 *
 * const loadData = async () => {
 *   const release = holdPaint('load-data')
 *   try {
 *     const data = await fetchData()
 *     setData(data)
 *   } finally {
 *     release()
 *   }
 * }
 * ```
 */
export function usePaintHolding(config: PaintHoldingConfig = {}) {
	const manager = PaintHoldingManager.getInstance()
	const [showLoading, setShowLoading] = useState(false)
	const loadingTimerRef = useRef<NodeJS.Timeout>()
	const holdIdRef = useRef(0)

	const holdPaint = useCallback(
		(id?: string): (() => void) => {
			const holdId = id || `hold-${++holdIdRef.current}`
			const { loadingThreshold = 50 } = config

			// Show loading indicator after threshold
			loadingTimerRef.current = setTimeout(() => {
				setShowLoading(true)
			}, loadingThreshold)

			const releaseHold = manager.hold(holdId, {
				...config,
				onHoldEnd: () => {
					if (loadingTimerRef.current) {
						clearTimeout(loadingTimerRef.current)
					}
					setShowLoading(false)
					config.onHoldEnd?.()
				},
			})

			return () => {
				if (loadingTimerRef.current) {
					clearTimeout(loadingTimerRef.current)
				}
				setShowLoading(false)
				releaseHold()
			}
		},
		[config],
	)

	const isPaintHeld = useCallback(() => {
		return manager.isPaintHeld()
	}, [])

	useEffect(() => {
		return () => {
			if (loadingTimerRef.current) {
				clearTimeout(loadingTimerRef.current)
			}
		}
	}, [])

	return {
		holdPaint,
		isPaintHeld,
		showLoading,
	}
}

/**
 * Helper to create loading overlay element
 * Use this in your component when showLoading is true
 */
export function createLoadingOverlay(): HTMLDivElement {
	const overlay = document.createElement("div")
	overlay.className = "paint-hold-loading"
	overlay.style.cssText = `
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--vscode-editor-background);
		opacity: 0.5;
		pointer-events: none;
		z-index: 9999;
	`
	return overlay
}

/**
 * Wrap navigation with paint holding
 * Prevents flash of old content
 *
 * @example
 * ```tsx
 * const navigate = usePaintHoldingNavigation()
 *
 * await navigate(async () => {
 *   router.push('/new-route')
 *   await loadRouteData()
 * })
 * ```
 */
export function usePaintHoldingNavigation(config: PaintHoldingConfig = {}) {
	const { holdPaint } = usePaintHolding(config)

	return useCallback(
		async (navigationFn: () => Promise<void>): Promise<void> => {
			const release = holdPaint("navigation")

			try {
				await navigationFn()
			} finally {
				// Small delay to ensure new content is painted
				await new Promise((resolve) => setTimeout(resolve, 16))
				release()
			}
		},
		[holdPaint],
	)
}

/**
 * Component transition with paint holding
 * Prevents flicker when swapping components
 *
 * @example
 * ```tsx
 * const transition = useComponentTransition()
 *
 * const switchComponent = () => {
 *   transition(() => {
 *     setCurrentComponent(NewComponent)
 *   })
 * }
 * ```
 */
export function useComponentTransition(config: PaintHoldingConfig = {}) {
	const { holdPaint } = usePaintHolding(config)

	return useCallback(
		(transitionFn: () => void): void => {
			const release = holdPaint("component-transition")

			// Schedule transition for next frame
			requestAnimationFrame(() => {
				transitionFn()

				// Release after paint
				requestAnimationFrame(() => {
					release()
				})
			})
		},
		[holdPaint],
	)
}

/**
 * CSS for paint holding
 * Inject this into your global styles
 */
export function generatePaintHoldingCSS(): string {
	return `
/* Paint Holding Styles */
.paint-hold-active {
	/* Prevent flash of unstyled content */
	visibility: visible;
}

/* Loading overlay during paint hold */
.paint-hold-loading {
	animation: paint-hold-fade-in 0.15s ease-out;
}

@keyframes paint-hold-fade-in {
	from {
		opacity: 0;
	}
	to {
		opacity: 0.5;
	}
}

/* Optimize rendering during paint hold */
.paint-hold-optimized {
	content-visibility: auto;
	contain: layout style paint;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
	.paint-hold-loading {
		animation: none;
		opacity: 0.5;
	}
}
`
}

/**
 * Initialize paint holding
 * Call this once in your app initialization
 */
export function initializePaintHolding(): void {
	if (typeof document === "undefined") {
		return
	}

	// Check if styles already injected
	if (document.getElementById("paint-holding-styles")) {
		return
	}

	// Inject CSS
	const style = document.createElement("style")
	style.id = "paint-holding-styles"
	style.textContent = generatePaintHoldingCSS()
	document.head.appendChild(style)
}

/**
 * Utility functions for common paint holding scenarios
 */
export const PaintHoldingUtils = {
	/**
	 * Hold paint during data loading
	 */
	async withDataLoading<T>(loadFn: () => Promise<T>, config?: PaintHoldingConfig): Promise<T> {
		const manager = PaintHoldingManager.getInstance()
		const release = manager.hold("data-loading", config)

		try {
			const result = await loadFn()
			// Ensure content is ready before releasing
			await new Promise((resolve) => requestAnimationFrame(resolve))
			return result
		} finally {
			release()
		}
	},

	/**
	 * Hold paint during route change
	 */
	async withRouteChange(routeChangeFn: () => Promise<void>, config?: PaintHoldingConfig): Promise<void> {
		const manager = PaintHoldingManager.getInstance()
		const release = manager.hold("route-change", {
			maxHoldTime: 150,
			...config,
		})

		try {
			await routeChangeFn()
			// Wait for next frame to ensure new route is painted
			await new Promise((resolve) => requestAnimationFrame(resolve))
		} finally {
			release()
		}
	},

	/**
	 * Hold paint during modal open/close
	 */
	withModal(modalFn: () => void, config?: PaintHoldingConfig): void {
		const manager = PaintHoldingManager.getInstance()
		const release = manager.hold("modal", {
			maxHoldTime: 50,
			...config,
		})

		requestAnimationFrame(() => {
			modalFn()
			requestAnimationFrame(() => {
				release()
			})
		})
	},
}
