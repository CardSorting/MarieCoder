/**
 * useRovingTabIndex - Roving tabindex for lists
 *
 * Implements the roving tabindex pattern for keyboard navigation in lists.
 * Only one item is tabbable at a time, arrow keys move focus.
 *
 * Perfect for:
 * - List views
 * - Menus
 * - Tree views
 * - Grid navigation
 *
 * @example
 * ```typescript
 * const { getItemProps } = useRovingTabIndex({
 *   itemCount: items.length,
 *   orientation: 'vertical'
 * })
 *
 * {items.map((item, i) => (
 *   <div {...getItemProps(i)} key={i}>
 *     {item.name}
 *   </div>
 * ))}
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react"

// ============================================================================
// Types
// ============================================================================

export interface UseRovingTabIndexOptions {
	/** Total number of items */
	itemCount: number
	/** Orientation of navigation */
	orientation?: "horizontal" | "vertical"
	/** Whether to wrap around at edges */
	wrap?: boolean
	/** Initial active index */
	defaultActiveIndex?: number
	/** Callback when active index changes */
	onActiveIndexChange?: (index: number) => void
	/** Whether the list is enabled */
	enabled?: boolean
}

export interface UseRovingTabIndexReturn {
	/** Get props for a list item */
	getItemProps: (index: number) => {
		tabIndex: number
		onKeyDown: (e: React.KeyboardEvent) => void
		onFocus: () => void
		role: string
	}
	/** Current active index */
	activeIndex: number
	/** Set active index programmatically */
	setActiveIndex: (index: number) => void
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for implementing roving tabindex pattern
 */
export function useRovingTabIndex(options: UseRovingTabIndexOptions): UseRovingTabIndexReturn {
	const {
		itemCount,
		orientation = "vertical",
		wrap = true,
		defaultActiveIndex = 0,
		onActiveIndexChange,
		enabled = true,
	} = options

	const [activeIndex, setActiveIndexState] = useState(defaultActiveIndex)
	const itemsRef = useRef<Map<number, HTMLElement>>(new Map())

	// Update active index
	const setActiveIndex = useCallback(
		(index: number) => {
			if (index >= 0 && index < itemCount) {
				setActiveIndexState(index)
				onActiveIndexChange?.(index)

				// Focus the element
				const element = itemsRef.current.get(index)
				if (element) {
					element.focus()
				}
			}
		},
		[itemCount, onActiveIndexChange],
	)

	// Navigate to next/previous item
	const navigate = useCallback(
		(direction: 1 | -1) => {
			if (!enabled || itemCount === 0) {
				return
			}

			let newIndex = activeIndex + direction

			// Handle wrap around
			if (wrap) {
				if (newIndex < 0) {
					newIndex = itemCount - 1
				} else if (newIndex >= itemCount) {
					newIndex = 0
				}
			} else {
				// Clamp to bounds
				newIndex = Math.max(0, Math.min(itemCount - 1, newIndex))
			}

			setActiveIndex(newIndex)
		},
		[enabled, itemCount, activeIndex, wrap, setActiveIndex],
	)

	// Handle keyboard navigation
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!enabled) {
				return
			}

			const isHorizontal = orientation === "horizontal"
			const forwardKey = isHorizontal ? "ArrowRight" : "ArrowDown"
			const backwardKey = isHorizontal ? "ArrowLeft" : "ArrowUp"

			if (e.key === forwardKey) {
				e.preventDefault()
				navigate(1)
			} else if (e.key === backwardKey) {
				e.preventDefault()
				navigate(-1)
			} else if (e.key === "Home") {
				e.preventDefault()
				setActiveIndex(0)
			} else if (e.key === "End") {
				e.preventDefault()
				setActiveIndex(itemCount - 1)
			}
		},
		[enabled, orientation, navigate, setActiveIndex, itemCount],
	)

	// Get props for an item
	const getItemProps = useCallback(
		(index: number) => ({
			tabIndex: index === activeIndex ? 0 : -1,
			onKeyDown: handleKeyDown,
			onFocus: () => setActiveIndexState(index),
			role: "option" as const,
			ref: (el: HTMLElement | null) => {
				if (el) {
					itemsRef.current.set(index, el)
				} else {
					itemsRef.current.delete(index)
				}
			},
		}),
		[activeIndex, handleKeyDown],
	)

	// Update active index when item count changes
	useEffect(() => {
		if (activeIndex >= itemCount && itemCount > 0) {
			setActiveIndex(itemCount - 1)
		}
	}, [itemCount, activeIndex, setActiveIndex])

	return {
		getItemProps,
		activeIndex,
		setActiveIndex,
	}
}

export default useRovingTabIndex
