/**
 * useKeyboardShortcut - Enhanced keyboard shortcut hook
 *
 * Provides advanced keyboard shortcut functionality with:
 * - Cross-platform support (Cmd/Ctrl)
 * - Conditional enabling
 * - Priority levels
 * - Description for help documentation
 *
 * @example
 * ```typescript
 * useKeyboardShortcut('cmd+k', openCommandPalette, {
 *   description: 'Open command palette',
 *   enabled: !isModalOpen,
 *   preventDefault: true
 * })
 * ```
 */

import { useCallback, useEffect, useRef } from "react"

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcutOptions {
	/** Description for help documentation */
	description?: string
	/** Whether the shortcut is enabled */
	enabled?: boolean
	/** Prevent default browser behavior */
	preventDefault?: boolean
	/** Stop event propagation */
	stopPropagation?: boolean
	/** Disable in text inputs */
	disableInInputs?: boolean
	/** Priority level (higher = processed first) */
	priority?: number
	/** When condition - function that returns boolean */
	when?: () => boolean
}

export interface ParsedShortcut {
	ctrl: boolean
	alt: boolean
	shift: boolean
	meta: boolean
	key: string
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse shortcut string into modifier keys and key
 * Supports: cmd+k, ctrl+shift+p, meta+alt+n, etc.
 */
function parseShortcut(shortcut: string): ParsedShortcut {
	const parts = shortcut.toLowerCase().split("+")
	const key = parts.pop() || ""

	const parsed: ParsedShortcut = {
		ctrl: false,
		alt: false,
		shift: false,
		meta: false,
		key,
	}

	for (const part of parts) {
		switch (part) {
			case "ctrl":
			case "control":
				parsed.ctrl = true
				break
			case "alt":
			case "option":
				parsed.alt = true
				break
			case "shift":
				parsed.shift = true
				break
			case "meta":
			case "cmd":
			case "command":
			case "mod": // mod = Cmd on Mac, Ctrl on Windows/Linux
				// For cross-platform, use metaKey on Mac, ctrlKey on others
				if (navigator.platform.toLowerCase().includes("mac")) {
					parsed.meta = true
				} else {
					parsed.ctrl = true
				}
				break
		}
	}

	return parsed
}

/**
 * Check if event matches parsed shortcut
 */
function matchesShortcut(event: KeyboardEvent, parsed: ParsedShortcut): boolean {
	const keyMatch = event.key.toLowerCase() === parsed.key.toLowerCase()
	const ctrlMatch = event.ctrlKey === parsed.ctrl
	const altMatch = event.altKey === parsed.alt
	const shiftMatch = event.shiftKey === parsed.shift
	const metaMatch = event.metaKey === parsed.meta

	return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch
}

/**
 * Check if target is a text input
 */
function isTextInput(target: EventTarget | null): boolean {
	if (!target || !(target instanceof HTMLElement)) {
		return false
	}

	return (
		target instanceof HTMLTextAreaElement ||
		(target instanceof HTMLInputElement &&
			(!target.type || target.type === "text" || target.type === "search" || target.type === "email")) ||
		target.isContentEditable
	)
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for registering keyboard shortcuts
 *
 * @param shortcut - Shortcut string (e.g., "cmd+k", "ctrl+shift+p")
 * @param callback - Function to call when shortcut is pressed
 * @param options - Configuration options
 */
export function useKeyboardShortcut(
	shortcut: string | string[],
	callback: (event: KeyboardEvent) => void,
	options: KeyboardShortcutOptions = {},
): void {
	const { enabled = true, preventDefault = true, stopPropagation = false, disableInInputs = true, when } = options

	const callbackRef = useRef(callback)
	const optionsRef = useRef(options)

	// Update refs when callback or options change
	useEffect(() => {
		callbackRef.current = callback
		optionsRef.current = options
	}, [callback, options])

	// Parse shortcuts
	const parsedShortcuts = useRef<ParsedShortcut[]>([])
	useEffect(() => {
		const shortcuts = Array.isArray(shortcut) ? shortcut : [shortcut]
		parsedShortcuts.current = shortcuts.map(parseShortcut)
	}, [shortcut])

	// Handler
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			// Check if enabled
			if (!enabled) {
				return
			}

			// Check when condition
			if (when && !when()) {
				return
			}

			// Check if in text input
			if (disableInInputs && isTextInput(event.target)) {
				return
			}

			// Check if any shortcut matches
			const matches = parsedShortcuts.current.some((parsed) => matchesShortcut(event, parsed))

			if (matches) {
				if (preventDefault) {
					event.preventDefault()
				}
				if (stopPropagation) {
					event.stopPropagation()
				}
				callbackRef.current(event)
			}
		},
		[enabled, preventDefault, stopPropagation, disableInInputs, when],
	)

	// Register listener
	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [handleKeyDown])
}

/**
 * Hook for registering multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(
	shortcuts: Array<{
		shortcut: string | string[]
		callback: (event: KeyboardEvent) => void
		options?: KeyboardShortcutOptions
	}>,
): void {
	shortcuts.forEach(({ shortcut, callback, options }) => {
		useKeyboardShortcut(shortcut, callback, options)
	})
}

export default useKeyboardShortcut
