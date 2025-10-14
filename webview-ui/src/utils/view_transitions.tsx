/**
 * View Transitions API utility for smooth, native page transitions
 * Provides declarative, performant transitions between UI states
 */

import { useCallback, useRef } from "react"

/**
 * Check if View Transitions API is supported
 */
export function supportsViewTransitions(): boolean {
	return typeof document !== "undefined" && "startViewTransition" in document
}

/**
 * Transition configuration
 */
export interface TransitionConfig {
	/**
	 * Transition name for CSS targeting
	 */
	name?: string
	/**
	 * Duration in milliseconds
	 * @default 300
	 */
	duration?: number
	/**
	 * Easing function
	 * @default 'ease'
	 */
	easing?: string
	/**
	 * Callback when transition starts
	 */
	onStart?: () => void
	/**
	 * Callback when transition completes
	 */
	onComplete?: () => void
	/**
	 * Fallback for unsupported browsers
	 */
	fallback?: () => void
}

/**
 * Execute a view transition
 * Uses native View Transitions API when available, falls back gracefully
 *
 * @example
 * ```tsx
 * await viewTransition(() => {
 *   setContent(newContent)
 * }, { duration: 400, name: 'fade' })
 * ```
 */
export async function viewTransition(updateCallback: () => void | Promise<void>, config: TransitionConfig = {}): Promise<void> {
	const { duration: _duration = 300, easing: _easing = "ease", onStart, onComplete, fallback } = config

	// Check browser support
	if (!supportsViewTransitions()) {
		// Fallback: use CSS animations
		if (fallback) {
			fallback()
		} else {
			await updateCallback()
		}
		onComplete?.()
		return
	}

	onStart?.()

	try {
		// Start view transition
		const transition = (document as any).startViewTransition(async () => {
			await updateCallback()
		})

		// Wait for transition to complete
		await transition.finished

		onComplete?.()
	} catch (error) {
		console.error("View transition failed:", error)
		// Fallback on error
		await updateCallback()
		onComplete?.()
	}
}

/**
 * React hook for view transitions
 *
 * @example
 * ```tsx
 * const transition = useViewTransition()
 *
 * const handleUpdate = () => {
 *   transition(() => {
 *     setData(newData)
 *   }, { name: 'slide', duration: 400 })
 * }
 * ```
 */
export function useViewTransition() {
	const activeTransitionRef = useRef<boolean>(false)

	const transition = useCallback(async (updateCallback: () => void | Promise<void>, config: TransitionConfig = {}) => {
		// Prevent overlapping transitions
		if (activeTransitionRef.current) {
			await updateCallback()
			return
		}

		activeTransitionRef.current = true

		try {
			await viewTransition(updateCallback, config)
		} finally {
			activeTransitionRef.current = false
		}
	}, [])

	return transition
}

/**
 * Predefined transition types
 */
export const TransitionPresets = {
	/**
	 * Fade in/out transition
	 */
	fade: (duration = 300): TransitionConfig => ({
		name: "fade",
		duration,
		easing: "ease-in-out",
	}),

	/**
	 * Slide left transition
	 */
	slideLeft: (duration = 400): TransitionConfig => ({
		name: "slide-left",
		duration,
		easing: "cubic-bezier(0.16, 1, 0.3, 1)",
	}),

	/**
	 * Slide right transition
	 */
	slideRight: (duration = 400): TransitionConfig => ({
		name: "slide-right",
		duration,
		easing: "cubic-bezier(0.16, 1, 0.3, 1)",
	}),

	/**
	 * Scale up transition
	 */
	scaleUp: (duration = 300): TransitionConfig => ({
		name: "scale-up",
		duration,
		easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
	}),

	/**
	 * Zoom transition
	 */
	zoom: (duration = 350): TransitionConfig => ({
		name: "zoom",
		duration,
		easing: "ease-out",
	}),

	/**
	 * Morph transition (cross-fade with scale)
	 */
	morph: (duration = 400): TransitionConfig => ({
		name: "morph",
		duration,
		easing: "cubic-bezier(0.16, 1, 0.3, 1)",
	}),
}

/**
 * Apply view transition name to element
 * Used for targeting specific elements in transitions
 *
 * @example
 * ```tsx
 * <div style={getTransitionName('header')}>
 *   Header content
 * </div>
 * ```
 */
export function getTransitionName(name: string): React.CSSProperties {
	return {
		viewTransitionName: name as any,
	}
}

/**
 * Create CSS for view transitions
 * Inject this into your global styles
 */
export function generateTransitionCSS(): string {
	return `
/* View Transitions API - Base Styles */
::view-transition-old(root),
::view-transition-new(root) {
	animation-duration: 0.3s;
	animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

/* Fade Transition */
::view-transition-old(fade),
::view-transition-new(fade) {
	animation-duration: 0.3s;
}

::view-transition-old(fade) {
	animation-name: fade-out;
}

::view-transition-new(fade) {
	animation-name: fade-in;
}

@keyframes fade-out {
	to { opacity: 0; }
}

@keyframes fade-in {
	from { opacity: 0; }
}

/* Slide Left Transition */
::view-transition-old(slide-left) {
	animation: slide-out-left 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

::view-transition-new(slide-left) {
	animation: slide-in-left 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slide-out-left {
	to {
		transform: translateX(-100%);
		opacity: 0;
	}
}

@keyframes slide-in-left {
	from {
		transform: translateX(100%);
		opacity: 0;
	}
}

/* Slide Right Transition */
::view-transition-old(slide-right) {
	animation: slide-out-right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

::view-transition-new(slide-right) {
	animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slide-out-right {
	to {
		transform: translateX(100%);
		opacity: 0;
	}
}

@keyframes slide-in-right {
	from {
		transform: translateX(-100%);
		opacity: 0;
	}
}

/* Scale Up Transition */
::view-transition-old(scale-up) {
	animation: scale-down 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

::view-transition-new(scale-up) {
	animation: scale-up-anim 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scale-down {
	to {
		transform: scale(0.8);
		opacity: 0;
	}
}

@keyframes scale-up-anim {
	from {
		transform: scale(0.8);
		opacity: 0;
	}
}

/* Zoom Transition */
::view-transition-old(zoom) {
	animation: zoom-out 0.35s ease-out;
}

::view-transition-new(zoom) {
	animation: zoom-in 0.35s ease-out;
}

@keyframes zoom-out {
	to {
		transform: scale(1.2);
		opacity: 0;
	}
}

@keyframes zoom-in {
	from {
		transform: scale(0.8);
		opacity: 0;
	}
}

/* Morph Transition */
::view-transition-old(morph),
::view-transition-new(morph) {
	animation-duration: 0.4s;
	animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
	::view-transition-old(*),
	::view-transition-new(*) {
		animation-duration: 0.01ms !important;
	}
}
`
}

/**
 * Initialize view transitions
 * Call this once in your app initialization
 */
export function initializeViewTransitions(): void {
	if (typeof document === "undefined") {
		return
	}

	// Check if styles already injected
	if (document.getElementById("view-transitions-styles")) {
		return
	}

	// Inject CSS
	const style = document.createElement("style")
	style.id = "view-transitions-styles"
	style.textContent = generateTransitionCSS()
	document.head.appendChild(style)
}

/**
 * Higher-order component for view transitions
 *
 * @example
 * ```tsx
 * const TransitionedComponent = withViewTransition(MyComponent, {
 *   name: 'fade',
 *   duration: 400,
 * })
 * ```
 */
export function withViewTransition<P extends object>(_Component: React.ComponentType<P>, config: TransitionConfig = {}) {
	return (props: P) => {
		const transition = useViewTransition()

		// Wrap updates in transitions
		const handleUpdate = useCallback(
			(updateFn: () => void) => {
				transition(updateFn, config)
			},
			[transition],
		)

		return <_Component {...props} viewTransition={handleUpdate} />
	}
}

/**
 * Common transition utilities
 */
export const ViewTransitionUtils = {
	/**
	 * Transition to new content
	 */
	async transitionContent(
		oldElement: HTMLElement | null,
		newContent: string | HTMLElement,
		config?: TransitionConfig,
	): Promise<void> {
		if (!oldElement) {
			return
		}

		await viewTransition(() => {
			if (typeof newContent === "string") {
				oldElement.innerHTML = newContent
			} else {
				oldElement.replaceWith(newContent)
			}
		}, config)
	},

	/**
	 * Transition between routes/views
	 */
	async transitionRoute(onRouteChange: () => void | Promise<void>, direction: "forward" | "back" = "forward"): Promise<void> {
		const preset = direction === "forward" ? TransitionPresets.slideLeft() : TransitionPresets.slideRight()

		await viewTransition(onRouteChange, preset)
	},

	/**
	 * Transition modal open/close
	 */
	async transitionModal(isOpening: boolean, onTransition: () => void | Promise<void>): Promise<void> {
		const preset = isOpening ? TransitionPresets.scaleUp() : TransitionPresets.fade()

		await viewTransition(onTransition, preset)
	},
}
