/**
 * CLI Terminal State Manager - Safe terminal operations with state tracking
 *
 * Prevents crashes and corruption by tracking terminal state and
 * validating operations before execution.
 *
 * Key features:
 * - Terminal capability detection
 * - State validation before operations
 * - Safe cursor positioning
 * - Screen clearing with recovery
 * - Alternate screen buffer support
 * - Signal handling for graceful cleanup
 */

import { EventEmitter } from "node:events"
import { getLogger } from "./infrastructure/logger"
import { TerminalCapabilities } from "./ui/output/terminal_colors"

const logger = getLogger()

/**
 * Terminal state
 */
interface TerminalState {
	supportsAnsi: boolean
	supportsUnicode: boolean
	isInteractive: boolean
	width: number
	height: number
	cursorVisible: boolean
	alternateScreenActive: boolean
	rawModeActive: boolean
}

/**
 * Cursor position
 */
interface CursorPosition {
	row: number
	column: number
}

/**
 * Terminal operation result
 */
interface OperationResult<T = void> {
	success: boolean
	value?: T
	error?: Error
}

/**
 * CLI Terminal State Manager
 *
 * Manages terminal state and provides safe operations to prevent
 * crashes from invalid terminal operations.
 */
export class CliTerminalState extends EventEmitter {
	private state: TerminalState
	private savedCursorPosition: CursorPosition | null = null
	private cleanupHandlers: Array<() => void> = []
	private isShuttingDown: boolean = false

	constructor() {
		super()

		// Initialize state
		this.state = {
			supportsAnsi: TerminalCapabilities.supportsColors(),
			supportsUnicode: TerminalCapabilities.supportsUnicode(),
			isInteractive: TerminalCapabilities.isInteractive(),
			width: TerminalCapabilities.getWidth(),
			height: process.stdout.rows || 24,
			cursorVisible: true,
			alternateScreenActive: false,
			rawModeActive: false,
		}

		// Setup signal handlers for graceful cleanup
		this.setupSignalHandlers()

		// Setup resize handler
		process.stdout.on("resize", () => {
			this.handleResize()
		})

		logger.debug("CliTerminalState initialized", this.state)
	}

	/**
	 * Get current terminal state
	 */
	getState(): Readonly<TerminalState> {
		return { ...this.state }
	}

	/**
	 * Check if terminal supports ANSI codes
	 */
	supportsAnsi(): boolean {
		return this.state.supportsAnsi
	}

	/**
	 * Check if terminal is interactive
	 */
	isInteractive(): boolean {
		return this.state.isInteractive
	}

	/**
	 * Get terminal dimensions
	 */
	getDimensions(): { width: number; height: number } {
		return {
			width: this.state.width,
			height: this.state.height,
		}
	}

	/**
	 * Hide cursor (safe operation)
	 */
	hideCursor(): OperationResult {
		try {
			if (!this.state.supportsAnsi || !this.state.isInteractive) {
				return { success: false, error: new Error("Terminal does not support cursor control") }
			}

			if (!this.state.cursorVisible) {
				return { success: true } // Already hidden
			}

			process.stdout.write("\x1b[?25l")
			this.state.cursorVisible = false
			this.emit("cursor-hidden")
			return { success: true }
		} catch (error) {
			return this.handleOperationError("hideCursor", error)
		}
	}

	/**
	 * Show cursor (safe operation)
	 */
	showCursor(): OperationResult {
		try {
			if (!this.state.supportsAnsi || !this.state.isInteractive) {
				return { success: false, error: new Error("Terminal does not support cursor control") }
			}

			if (this.state.cursorVisible) {
				return { success: true } // Already visible
			}

			process.stdout.write("\x1b[?25h")
			this.state.cursorVisible = true
			this.emit("cursor-shown")
			return { success: true }
		} catch (error) {
			return this.handleOperationError("showCursor", error)
		}
	}

	/**
	 * Save cursor position
	 */
	saveCursor(): OperationResult {
		try {
			if (!this.state.supportsAnsi) {
				return { success: false, error: new Error("Terminal does not support cursor saving") }
			}

			process.stdout.write("\x1b[s")
			// We don't track exact position as it's managed by terminal
			this.savedCursorPosition = { row: 0, column: 0 }
			this.emit("cursor-saved")
			return { success: true }
		} catch (error) {
			return this.handleOperationError("saveCursor", error)
		}
	}

	/**
	 * Restore cursor position
	 */
	restoreCursor(): OperationResult {
		try {
			if (!this.state.supportsAnsi) {
				return { success: false, error: new Error("Terminal does not support cursor restoration") }
			}

			if (!this.savedCursorPosition) {
				return { success: false, error: new Error("No saved cursor position") }
			}

			process.stdout.write("\x1b[u")
			this.emit("cursor-restored")
			return { success: true }
		} catch (error) {
			return this.handleOperationError("restoreCursor", error)
		}
	}

	/**
	 * Move cursor to position (safe operation)
	 */
	moveCursor(row: number, column: number): OperationResult {
		try {
			if (!this.state.supportsAnsi) {
				return { success: false, error: new Error("Terminal does not support cursor positioning") }
			}

			// Validate coordinates
			if (row < 0 || column < 0) {
				return { success: false, error: new Error("Invalid cursor position: negative coordinates") }
			}

			if (row > this.state.height || column > this.state.width) {
				logger.warn(
					`Cursor position (${row}, ${column}) exceeds terminal dimensions (${this.state.height}, ${this.state.width})`,
				)
			}

			// ANSI escape: ESC[{row};{column}H
			process.stdout.write(`\x1b[${row};${column}H`)
			this.emit("cursor-moved", { row, column })
			return { success: true }
		} catch (error) {
			return this.handleOperationError("moveCursor", error)
		}
	}

	/**
	 * Move cursor up by N lines
	 */
	moveCursorUp(lines: number): OperationResult {
		try {
			if (!this.state.supportsAnsi) {
				return { success: false }
			}

			if (lines <= 0) {
				return { success: true } // No-op
			}

			process.stdout.write(`\x1b[${lines}A`)
			return { success: true }
		} catch (error) {
			return this.handleOperationError("moveCursorUp", error)
		}
	}

	/**
	 * Clear screen (safe operation)
	 */
	clearScreen(): OperationResult {
		try {
			if (!this.state.supportsAnsi) {
				// Fallback: print newlines
				process.stdout.write("\n".repeat(this.state.height))
				return { success: true }
			}

			// ANSI escape: ESC[2J (clear entire screen) + ESC[H (move to home)
			process.stdout.write("\x1b[2J\x1b[H")
			this.emit("screen-cleared")
			return { success: true }
		} catch (error) {
			return this.handleOperationError("clearScreen", error)
		}
	}

	/**
	 * Clear from cursor to end of screen
	 */
	clearToEnd(): OperationResult {
		try {
			if (!this.state.supportsAnsi) {
				return { success: false }
			}

			process.stdout.write("\x1b[J")
			return { success: true }
		} catch (error) {
			return this.handleOperationError("clearToEnd", error)
		}
	}

	/**
	 * Clear current line
	 */
	clearLine(): OperationResult {
		try {
			if (!this.state.supportsAnsi) {
				return { success: false }
			}

			process.stdout.write("\x1b[2K")
			return { success: true }
		} catch (error) {
			return this.handleOperationError("clearLine", error)
		}
	}

	/**
	 * Clear N lines up from cursor
	 */
	clearLines(count: number): OperationResult {
		try {
			if (!this.state.supportsAnsi || count <= 0) {
				return { success: false }
			}

			for (let i = 0; i < count; i++) {
				process.stdout.write("\x1b[1A") // Move up
				process.stdout.write("\x1b[2K") // Clear line
			}

			return { success: true }
		} catch (error) {
			return this.handleOperationError("clearLines", error)
		}
	}

	/**
	 * Enter alternate screen buffer
	 */
	enterAlternateScreen(): OperationResult {
		try {
			if (!this.state.supportsAnsi) {
				return { success: false, error: new Error("Terminal does not support alternate screen") }
			}

			if (this.state.alternateScreenActive) {
				return { success: true } // Already in alternate screen
			}

			process.stdout.write("\x1b[?1049h")
			this.state.alternateScreenActive = true

			// Add cleanup handler
			this.addCleanupHandler(() => this.exitAlternateScreen())

			this.emit("alternate-screen-entered")
			return { success: true }
		} catch (error) {
			return this.handleOperationError("enterAlternateScreen", error)
		}
	}

	/**
	 * Exit alternate screen buffer
	 */
	exitAlternateScreen(): OperationResult {
		try {
			if (!this.state.supportsAnsi) {
				return { success: false }
			}

			if (!this.state.alternateScreenActive) {
				return { success: true } // Not in alternate screen
			}

			process.stdout.write("\x1b[?1049l")
			this.state.alternateScreenActive = false
			this.emit("alternate-screen-exited")
			return { success: true }
		} catch (error) {
			return this.handleOperationError("exitAlternateScreen", error)
		}
	}

	/**
	 * Enable raw mode (disable line buffering)
	 */
	enableRawMode(): OperationResult {
		try {
			if (!this.state.isInteractive) {
				return { success: false, error: new Error("Terminal is not interactive") }
			}

			if (this.state.rawModeActive) {
				return { success: true } // Already in raw mode
			}

			if (process.stdin.setRawMode) {
				process.stdin.setRawMode(true)
				this.state.rawModeActive = true

				// Add cleanup handler
				this.addCleanupHandler(() => this.disableRawMode())

				this.emit("raw-mode-enabled")
				return { success: true }
			}

			return { success: false, error: new Error("Raw mode not available") }
		} catch (error) {
			return this.handleOperationError("enableRawMode", error)
		}
	}

	/**
	 * Disable raw mode
	 */
	disableRawMode(): OperationResult {
		try {
			if (!this.state.rawModeActive) {
				return { success: true } // Not in raw mode
			}

			if (process.stdin.setRawMode) {
				process.stdin.setRawMode(false)
				this.state.rawModeActive = false
				this.emit("raw-mode-disabled")
				return { success: true }
			}

			return { success: false }
		} catch (error) {
			return this.handleOperationError("disableRawMode", error)
		}
	}

	/**
	 * Handle terminal resize
	 */
	private handleResize(): void {
		const oldWidth = this.state.width
		const oldHeight = this.state.height

		this.state.width = TerminalCapabilities.getWidth()
		this.state.height = process.stdout.rows || 24

		logger.debug(`Terminal resized: ${oldWidth}x${oldHeight} -> ${this.state.width}x${this.state.height}`)

		this.emit("resize", {
			oldWidth,
			oldHeight,
			newWidth: this.state.width,
			newHeight: this.state.height,
		})
	}

	/**
	 * Add cleanup handler
	 */
	private addCleanupHandler(handler: () => void): void {
		this.cleanupHandlers.push(handler)
	}

	/**
	 * Setup signal handlers for graceful cleanup
	 */
	private setupSignalHandlers(): void {
		const signals = ["SIGINT", "SIGTERM", "SIGQUIT"] as const

		for (const signal of signals) {
			process.on(signal, () => {
				if (!this.isShuttingDown) {
					this.isShuttingDown = true
					this.cleanup()
					process.exit(0)
				}
			})
		}

		// Handle uncaught errors
		process.on("uncaughtException", (error) => {
			logger.error("Uncaught exception:", error)
			if (!this.isShuttingDown) {
				this.isShuttingDown = true
				this.cleanup()
			}
		})

		process.on("unhandledRejection", (reason) => {
			logger.error("Unhandled rejection:", reason)
			if (!this.isShuttingDown) {
				this.isShuttingDown = true
				this.cleanup()
			}
		})
	}

	/**
	 * Handle operation error
	 */
	private handleOperationError(operation: string, error: unknown): OperationResult {
		const err = error instanceof Error ? error : new Error(String(error))
		logger.error(`Terminal operation failed: ${operation}`, err)
		this.emit("operation-error", { operation, error: err })
		return { success: false, error: err }
	}

	/**
	 * Cleanup terminal state
	 */
	cleanup(): void {
		logger.debug("Cleaning up terminal state")

		// Run all cleanup handlers
		for (const handler of this.cleanupHandlers) {
			try {
				handler()
			} catch (error) {
				logger.error("Error in cleanup handler:", error)
			}
		}

		// Restore terminal state
		this.showCursor()
		this.exitAlternateScreen()
		this.disableRawMode()

		this.emit("cleanup-complete")
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this.cleanup()
		this.removeAllListeners()
		logger.debug("CliTerminalState disposed")
	}
}

/**
 * Global terminal state instance
 */
let globalTerminalState: CliTerminalState | null = null

/**
 * Get or create global terminal state
 */
export function getTerminalState(): CliTerminalState {
	if (!globalTerminalState) {
		globalTerminalState = new CliTerminalState()
	}
	return globalTerminalState
}

/**
 * Reset global terminal state (useful for testing)
 */
export function resetTerminalState(): void {
	if (globalTerminalState) {
		globalTerminalState.dispose()
		globalTerminalState = null
	}
}
