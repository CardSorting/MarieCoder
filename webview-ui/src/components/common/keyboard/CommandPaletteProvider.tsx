/**
 * CommandPaletteProvider - Command palette infrastructure
 *
 * Provides the foundation for a command palette (Cmd/Ctrl+K).
 * Components can register commands that appear in the palette.
 *
 * This is infrastructure - actual palette UI can be built on top.
 *
 * @example
 * ```typescript
 * <CommandPaletteProvider>
 *   <App />
 * </CommandPaletteProvider>
 *
 * // In a component:
 * const { registerCommand } = useCommandPalette()
 * registerCommand({
 *   id: 'open-settings',
 *   name: 'Open Settings',
 *   shortcut: 'cmd+,',
 *   action: () => navigate('/settings')
 * })
 * ```
 */

import type React from "react"
import { createContext, useCallback, useContext, useState } from "react"
import { useKeyboardShortcut } from "@/hooks/use_keyboard_shortcut"

// ============================================================================
// Types
// ============================================================================

export interface Command {
	/** Unique ID */
	id: string
	/** Display name */
	name: string
	/** Description (optional) */
	description?: string
	/** Category for grouping */
	category?: string
	/** Keyboard shortcut */
	shortcut?: string
	/** Icon (codicon name) */
	icon?: string
	/** Action to perform */
	action: () => void | Promise<void>
	/** Whether command is enabled */
	enabled?: boolean
	/** Search keywords */
	keywords?: string[]
}

export interface CommandPaletteContextValue {
	/** All registered commands */
	commands: Command[]
	/** Register a command */
	registerCommand: (command: Command) => () => void
	/** Unregister a command */
	unregisterCommand: (id: string) => void
	/** Execute a command by ID */
	executeCommand: (id: string) => void
	/** Whether palette is open */
	isOpen: boolean
	/** Open palette */
	open: () => void
	/** Close palette */
	close: () => void
	/** Toggle palette */
	toggle: () => void
}

// ============================================================================
// Context
// ============================================================================

const CommandPaletteContext = createContext<CommandPaletteContextValue | undefined>(undefined)

/**
 * Hook to access command palette
 */
export function useCommandPalette(): CommandPaletteContextValue {
	const context = useContext(CommandPaletteContext)
	if (!context) {
		throw new Error("useCommandPalette must be used within CommandPaletteProvider")
	}
	return context
}

// ============================================================================
// Provider
// ============================================================================

export function CommandPaletteProvider({ children }: { children: React.ReactNode }): React.ReactElement {
	const [commands, setCommands] = useState<Command[]>([])
	const [isOpen, setIsOpen] = useState(false)

	// Register command
	const registerCommand = useCallback((command: Command) => {
		setCommands((prev) => {
			// Remove existing command with same ID
			const filtered = prev.filter((c) => c.id !== command.id)
			return [...filtered, command]
		})

		// Return unregister function
		return () => {
			setCommands((prev) => prev.filter((c) => c.id !== command.id))
		}
	}, [])

	// Unregister command
	const unregisterCommand = useCallback((id: string) => {
		setCommands((prev) => prev.filter((c) => c.id !== id))
	}, [])

	// Execute command
	const executeCommand = useCallback(
		(id: string) => {
			const command = commands.find((c) => c.id === id)
			if (command && command.enabled !== false) {
				command.action()
				setIsOpen(false) // Close palette after executing command
			}
		},
		[commands],
	)

	// Palette controls
	const open = useCallback(() => setIsOpen(true), [])
	const close = useCallback(() => setIsOpen(false), [])
	const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

	// Register global shortcut to open palette (Cmd/Ctrl+K)
	useKeyboardShortcut("mod+k", toggle, {
		description: "Toggle command palette",
		preventDefault: true,
	})

	// Close on Escape
	useKeyboardShortcut("escape", close, {
		description: "Close command palette",
		enabled: isOpen,
		preventDefault: true,
	})

	const value: CommandPaletteContextValue = {
		commands,
		registerCommand,
		unregisterCommand,
		executeCommand,
		isOpen,
		open,
		close,
		toggle,
	}

	return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>
}

export default CommandPaletteProvider
