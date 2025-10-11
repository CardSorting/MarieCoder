/**
 * Focus Management Utilities
 *
 * Provides hooks and utilities for managing focus in accessible ways,
 * including focus restoration when modals close and focus trapping within modals.
 *
 * @module accessibility/focus_management
 */

import { useCallback, useEffect, useRef } from "react"

/**
 * Hook to manage focus restoration when a modal or dialog closes.
 * Stores the previously focused element and provides a function to restore focus to it.
 *
 * @param isOpen - Whether the modal/dialog is currently open
 * @returns Object with restoreFocus function
 *
 * @example
 * const Modal = ({ isOpen, onClose }) => {
 *   const { restoreFocus } = useFocusManagement(isOpen)
 *
 *   const handleClose = () => {
 *     onClose()
 *     restoreFocus()
 *   }
 * }
 */
export function useFocusManagement(isOpen: boolean) {
	const previousFocusRef = useRef<HTMLElement | null>(null)

	useEffect(() => {
		if (isOpen) {
			// Store the currently focused element when modal opens
			previousFocusRef.current = document.activeElement as HTMLElement
		}
	}, [isOpen])

	const restoreFocus = useCallback(() => {
		// Restore focus to the previously focused element
		if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
			// Use setTimeout to ensure the element is visible and focusable
			setTimeout(() => {
				previousFocusRef.current?.focus()
			}, 0)
		}
	}, [])

	return { restoreFocus, previousFocusRef }
}

/**
 * Gets all focusable elements within a container
 *
 * @param container - The container element to search within
 * @returns Array of focusable HTML elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
	const focusableSelectors = [
		"button:not([disabled])",
		"[href]",
		"input:not([disabled])",
		"select:not([disabled])",
		"textarea:not([disabled])",
		'[tabindex]:not([tabindex="-1"])',
	].join(", ")

	return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
}

/**
 * Hook to trap focus within a container (typically a modal).
 * Prevents tab navigation from leaving the container and wraps around
 * when reaching the first or last focusable element.
 *
 * @param containerRef - Ref to the container element
 * @param isActive - Whether the focus trap should be active
 *
 * @example
 * const Modal = ({ isOpen }) => {
 *   const modalRef = useRef<HTMLDivElement>(null)
 *   useFocusTrap(modalRef, isOpen)
 *
 *   return <div ref={modalRef}>...</div>
 * }
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
	useEffect(() => {
		if (!isActive || !containerRef.current) {
			return
		}

		const container = containerRef.current
		const focusableElements = getFocusableElements(container)

		if (focusableElements.length === 0) {
			return
		}

		const firstElement = focusableElements[0]
		const _lastElement = focusableElements[focusableElements.length - 1]

		// Focus first element when trap activates
		setTimeout(() => {
			firstElement?.focus()
		}, 0)

		const handleKeyDown = (e: KeyboardEvent) => {
			// Only trap Tab key
			if (e.key !== "Tab") {
				return
			}

			// Get current focusable elements (they may have changed)
			const currentFocusableElements = getFocusableElements(container)
			if (currentFocusableElements.length === 0) {
				return
			}

			const currentFirst = currentFocusableElements[0]
			const currentLast = currentFocusableElements[currentFocusableElements.length - 1]

			// Shift + Tab on first element -> focus last
			if (e.shiftKey && document.activeElement === currentFirst) {
				e.preventDefault()
				currentLast.focus()
			}
			// Tab on last element -> focus first
			else if (!e.shiftKey && document.activeElement === currentLast) {
				e.preventDefault()
				currentFirst.focus()
			}
		}

		container.addEventListener("keydown", handleKeyDown)
		return () => container.removeEventListener("keydown", handleKeyDown)
	}, [isActive, containerRef])
}

/**
 * Hook to manage focus and focus trapping together.
 * Combines focus management with focus trapping for complete modal focus control.
 *
 * @param containerRef - Ref to the modal container
 * @param isOpen - Whether the modal is open
 * @param options - Configuration options
 * @returns Object with restoreFocus function
 *
 * @example
 * const Modal = ({ isOpen, onClose }) => {
 *   const modalRef = useRef<HTMLDivElement>(null)
 *   const { restoreFocus } = useModalFocus(modalRef, isOpen)
 *
 *   const handleClose = () => {
 *     onClose()
 *     restoreFocus()
 *   }
 * }
 */
export function useModalFocus(
	containerRef: React.RefObject<HTMLElement>,
	isOpen: boolean,
	options: {
		enableFocusTrap?: boolean
		focusFirstElement?: boolean
	} = {},
) {
	const { enableFocusTrap = true, focusFirstElement = true } = options

	// Use focus management for restoration
	const { restoreFocus, previousFocusRef } = useFocusManagement(isOpen)

	// Use focus trap if enabled
	if (enableFocusTrap) {
		useFocusTrap(containerRef, isOpen)
	}

	// Focus first element when modal opens (optional)
	useEffect(() => {
		if (isOpen && focusFirstElement && containerRef.current) {
			const focusableElements = getFocusableElements(containerRef.current)
			if (focusableElements.length > 0) {
				setTimeout(() => {
					focusableElements[0]?.focus()
				}, 0)
			}
		}
	}, [isOpen, focusFirstElement, containerRef])

	return { restoreFocus, previousFocusRef }
}
