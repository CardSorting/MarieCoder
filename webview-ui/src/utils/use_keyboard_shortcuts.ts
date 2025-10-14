/**
 * Keyboard shortcuts hook for power user efficiency
 * Implements VS Code-style keyboard navigation and actions
 */

import { useCallback, useEffect, useRef } from "react"

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
	key: string
	ctrl?: boolean
	meta?: boolean
	shift?: boolean
	alt?: boolean
	description?: string
	action: (event: KeyboardEvent) => void
	/**
	 * Prevent default browser behavior
	 * @default true
	 */
	preventDefault?: boolean
}

/**
 * Keyboard event matcher
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
	const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
	const ctrlMatches = shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl
	const metaMatches = shortcut.meta === undefined || event.metaKey === shortcut.meta
	const shiftMatches = shortcut.shift === undefined || event.shiftKey === shortcut.shift
	const altMatches = shortcut.alt === undefined || event.altKey === shortcut.alt

	return keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches
}

/**
 * Hook for managing keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 's',
 *     ctrl: true,
 *     description: 'Send message',
 *     action: () => handleSend(),
 *   },
 *   {
 *     key: 'Escape',
 *     description: 'Clear input',
 *     action: () => clearInput(),
 *   },
 * ])
 * ```
 */
export function useKeyboardShortcuts(
	shortcuts: KeyboardShortcut[],
	options: { enabled?: boolean; scope?: "global" | "local" } = {},
): void {
	const { enabled = true, scope = "global" } = options
	const shortcutsRef = useRef(shortcuts)

	// Update shortcuts ref when shortcuts change
	useEffect(() => {
		shortcutsRef.current = shortcuts
	}, [shortcuts])

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (!enabled) {
				return
			}

			// Don't interfere with input fields unless explicitly handled
			const target = event.target as HTMLElement
			const isInputField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

			for (const shortcut of shortcutsRef.current) {
				if (matchesShortcut(event, shortcut)) {
					// Skip if in input field and not a special key
					if (isInputField && !["Escape", "Enter"].includes(event.key)) {
						continue
					}

					if (shortcut.preventDefault !== false) {
						event.preventDefault()
					}

					shortcut.action(event)
					break
				}
			}
		},
		[enabled],
	)

	useEffect(() => {
		if (!enabled) {
			return
		}

		const target = scope === "global" ? window : document.body
		target.addEventListener("keydown", handleKeyDown as any)

		return () => {
			target.removeEventListener("keydown", handleKeyDown as any)
		}
	}, [handleKeyDown, enabled, scope])
}

/**
 * Common keyboard shortcuts for chat interface
 */
export function useChatKeyboardShortcuts(handlers: {
	onSendMessage?: () => void
	onClearInput?: () => void
	onFocusInput?: () => void
	onScrollToBottom?: () => void
	onScrollToTop?: () => void
	onCancelTask?: () => void
	onNewTask?: () => void
}) {
	const shortcuts: KeyboardShortcut[] = [
		// Send message (Ctrl/Cmd + Enter)
		...(handlers.onSendMessage
			? [
					{
						key: "Enter",
						ctrl: true,
						description: "Send message",
						action: handlers.onSendMessage,
					},
					{
						key: "Enter",
						meta: true,
						description: "Send message (Mac)",
						action: handlers.onSendMessage,
					},
				]
			: []),

		// Clear input (Escape)
		...(handlers.onClearInput
			? [
					{
						key: "Escape",
						description: "Clear input",
						action: handlers.onClearInput,
					},
				]
			: []),

		// Focus input (/)
		...(handlers.onFocusInput
			? [
					{
						key: "/",
						description: "Focus input",
						action: (e: KeyboardEvent) => {
							// Only if not already in an input
							const target = e.target as HTMLElement
							if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
								handlers.onFocusInput?.()
							}
						},
						preventDefault: false,
					},
				]
			: []),

		// Scroll to bottom (End)
		...(handlers.onScrollToBottom
			? [
					{
						key: "End",
						ctrl: true,
						description: "Scroll to bottom",
						action: handlers.onScrollToBottom,
					},
				]
			: []),

		// Scroll to top (Home)
		...(handlers.onScrollToTop
			? [
					{
						key: "Home",
						ctrl: true,
						description: "Scroll to top",
						action: handlers.onScrollToTop,
					},
				]
			: []),

		// Cancel task (Ctrl/Cmd + X)
		...(handlers.onCancelTask
			? [
					{
						key: "x",
						ctrl: true,
						description: "Cancel current task",
						action: handlers.onCancelTask,
					},
				]
			: []),

		// New task (Ctrl/Cmd + N)
		...(handlers.onNewTask
			? [
					{
						key: "n",
						ctrl: true,
						description: "Start new task",
						action: handlers.onNewTask,
					},
					{
						key: "n",
						meta: true,
						description: "Start new task (Mac)",
						action: handlers.onNewTask,
					},
				]
			: []),
	]

	useKeyboardShortcuts(shortcuts)
}

/**
 * Hook to show keyboard shortcuts help
 */
export function useKeyboardShortcutsHelp(shortcuts: KeyboardShortcut[]) {
	const getShortcutDisplay = useCallback((shortcut: KeyboardShortcut): string => {
		const parts: string[] = []

		if (shortcut.ctrl) {
			parts.push("Ctrl")
		}
		if (shortcut.meta) {
			parts.push("Cmd")
		}
		if (shortcut.shift) {
			parts.push("Shift")
		}
		if (shortcut.alt) {
			parts.push("Alt")
		}
		parts.push(shortcut.key)

		return parts.join("+")
	}, [])

	const helpText = shortcuts
		.filter((s) => s.description)
		.map((s) => `${getShortcutDisplay(s)}: ${s.description}`)
		.join("\n")

	return { helpText, getShortcutDisplay }
}

/**
 * Detect OS for platform-specific shortcuts
 */
export function isMac(): boolean {
	return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
}

/**
 * Get modifier key label based on OS
 */
export function getModifierKey(): "Ctrl" | "Cmd" {
	return isMac() ? "Cmd" : "Ctrl"
}
