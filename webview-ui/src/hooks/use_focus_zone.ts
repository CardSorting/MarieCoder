/**
 * useFocusZone - Focus management for keyboard navigation
 *
 * Creates a focus zone where arrow keys navigate between focusable elements.
 * Perfect for toolbars, menus, and custom widgets.
 *
 * Features:
 * - Arrow key navigation
 * - Home/End support
 * - Wrap around option
 * - Orientation (horizontal/vertical)
 *
 * @example
 * ```typescript
 * const { containerProps, getItemProps } = useFocusZone({
 *   orientation: 'horizontal',
 *   wrap: true
 * })
 *
 * <div {...containerProps}>
 *   <button {...getItemProps(0)}>Item 1</button>
 *   <button {...getItemProps(1)}>Item 2</button>
 * </div>
 * ```
 */

import { useCallback, useRef, useState } from "react"

// ============================================================================
// Types
// ============================================================================

export interface UseFocusZoneOptions {
	/** Orientation of the focus zone */
	orientation?: "horizontal" | "vertical" | "both"
	/** Whether to wrap around at edges */
	wrap?: boolean
	/** Initial focused index */
	defaultFocusedIndex?: number
	/** Callback when focus changes */
	onFocusChange?: (index: number) => void
	/** Whether the zone is enabled */
	enabled?: boolean
}

export interface UseFocusZoneReturn {
	/** Props for the container element */
	containerProps: {
		role: string
		onKeyDown: (e: React.KeyboardEvent) => void
	}
	/** Get props for a focusable item */
	getItemProps: (index: number) => {
		tabIndex: number
		onFocus: () => void
		"data-focus-index": number
	}
	/** Current focused index */
	focusedIndex: number
	/** Set focused index programmatically */
	setFocusedIndex: (index: number) => void
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for creating a focus zone with arrow key navigation
 */
export function useFocusZone(options: UseFocusZoneOptions = {}): UseFocusZoneReturn {
	const { orientation = "horizontal", wrap = true, defaultFocusedIndex = 0, onFocusChange, enabled = true } = options

	const [focusedIndex, setFocusedIndex] = useState(defaultFocusedIndex)
	const itemsRef = useRef<Map<number, HTMLElement>>(new Map())

	// Set focus to specific index
	const focusItem = useCallback(
		(index: number) => {
			const item = itemsRef.current.get(index)
			if (item) {
				item.focus()
				setFocusedIndex(index)
				onFocusChange?.(index)
			}
		},
		[onFocusChange],
	)

	// Handle keyboard navigation
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!enabled) {
				return
			}

			const items = Array.from(itemsRef.current.keys()).sort((a, b) => a - b)
			const currentItemIndex = items.indexOf(focusedIndex)
			const itemCount = items.length

			if (itemCount === 0) {
				return
			}

			let newIndex = focusedIndex

			// Horizontal navigation
			if (orientation === "horizontal" || orientation === "both") {
				if (e.key === "ArrowLeft") {
					e.preventDefault()
					if (currentItemIndex > 0) {
						newIndex = items[currentItemIndex - 1]
					} else if (wrap) {
						newIndex = items[itemCount - 1]
					}
				} else if (e.key === "ArrowRight") {
					e.preventDefault()
					if (currentItemIndex < itemCount - 1) {
						newIndex = items[currentItemIndex + 1]
					} else if (wrap) {
						newIndex = items[0]
					}
				}
			}

			// Vertical navigation
			if (orientation === "vertical" || orientation === "both") {
				if (e.key === "ArrowUp") {
					e.preventDefault()
					if (currentItemIndex > 0) {
						newIndex = items[currentItemIndex - 1]
					} else if (wrap) {
						newIndex = items[itemCount - 1]
					}
				} else if (e.key === "ArrowDown") {
					e.preventDefault()
					if (currentItemIndex < itemCount - 1) {
						newIndex = items[currentItemIndex + 1]
					} else if (wrap) {
						newIndex = items[0]
					}
				}
			}

			// Home/End navigation
			if (e.key === "Home") {
				e.preventDefault()
				newIndex = items[0]
			} else if (e.key === "End") {
				e.preventDefault()
				newIndex = items[itemCount - 1]
			}

			if (newIndex !== focusedIndex) {
				focusItem(newIndex)
			}
		},
		[enabled, focusedIndex, focusItem, orientation, wrap],
	)

	// Get props for container
	const containerProps = {
		role: "toolbar",
		onKeyDown: handleKeyDown,
	}

	// Get props for focusable items
	const getItemProps = useCallback(
		(index: number) => ({
			tabIndex: index === focusedIndex ? 0 : -1,
			onFocus: () => {
				setFocusedIndex(index)
				onFocusChange?.(index)
			},
			"data-focus-index": index,
			ref: (el: HTMLElement | null) => {
				if (el) {
					itemsRef.current.set(index, el)
				} else {
					itemsRef.current.delete(index)
				}
			},
		}),
		[focusedIndex, onFocusChange],
	)

	return {
		containerProps,
		getItemProps,
		focusedIndex,
		setFocusedIndex: focusItem,
	}
}

export default useFocusZone
