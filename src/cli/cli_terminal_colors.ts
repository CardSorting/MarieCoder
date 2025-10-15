/**
 * Terminal Colors - Centralized ANSI color codes
 *
 * Following MarieCoder standards: Single source of truth for all terminal colors
 * used throughout the CLI. Consolidates previous separate definitions.
 *
 * @module cli_terminal_colors
 * @description Provides ANSI escape codes for terminal colors, box-drawing characters,
 * and terminal capability detection utilities.
 *
 * @example
 * ```typescript
 * import { TerminalColors, SemanticColors, colorize } from './cli_terminal_colors'
 *
 * // Use colors directly
 * console.log(`${TerminalColors.green}Success!${TerminalColors.reset}`)
 *
 * // Use semantic colors
 * console.log(`${SemanticColors.error}Error occurred${TerminalColors.reset}`)
 *
 * // Use helper function
 * console.log(colorize('Warning', TerminalColors.yellow))
 * ```
 */

/**
 * ANSI escape sequences for terminal colors and formatting
 *
 * @example
 * ```typescript
 * import { TerminalColors } from "./cli_terminal_colors"
 *
 * console.log(`${TerminalColors.green}Success!${TerminalColors.reset}`)
 * console.log(`${TerminalColors.bright}${TerminalColors.cyan}Info${TerminalColors.reset}`)
 * ```
 */
export const TerminalColors = {
	// Basic formatting
	/** Reset all formatting */
	reset: "\x1b[0m",
	/** Bright/bold text */
	bright: "\x1b[1m",
	/** Dimmed text */
	dim: "\x1b[2m",

	// Foreground colors
	/** Black text */
	black: "\x1b[30m",
	/** Red text */
	red: "\x1b[31m",
	/** Green text */
	green: "\x1b[32m",
	/** Yellow text */
	yellow: "\x1b[33m",
	/** Blue text */
	blue: "\x1b[34m",
	/** Magenta text */
	magenta: "\x1b[35m",
	/** Cyan text */
	cyan: "\x1b[36m",
	/** White text */
	white: "\x1b[37m",
	/** Gray text */
	gray: "\x1b[90m",

	// Background colors
	/** Black background */
	bgBlack: "\x1b[40m",
	/** Red background */
	bgRed: "\x1b[41m",
	/** Green background */
	bgGreen: "\x1b[42m",
	/** Yellow background */
	bgYellow: "\x1b[43m",
	/** Blue background */
	bgBlue: "\x1b[44m",
	/** Magenta background */
	bgMagenta: "\x1b[45m",
	/** Cyan background */
	bgCyan: "\x1b[46m",
	/** White background */
	bgWhite: "\x1b[47m",
} as const

/**
 * Box drawing characters for terminal UI
 *
 * @example
 * ```typescript
 * import { BoxChars } from "./cli_terminal_colors"
 *
 * console.log(`${BoxChars.topLeft}${BoxChars.horizontal.repeat(10)}${BoxChars.topRight}`)
 * ```
 */
export const BoxChars = {
	// Single line box drawing
	/** Top-left corner ┌ */
	topLeft: "┌",
	/** Top-right corner ┐ */
	topRight: "┐",
	/** Bottom-left corner └ */
	bottomLeft: "└",
	/** Bottom-right corner ┘ */
	bottomRight: "┘",
	/** Horizontal line ─ */
	horizontal: "─",
	/** Vertical line │ */
	vertical: "│",
	/** Vertical line with right extension ├ */
	verticalRight: "├",
	/** Vertical line with left extension ┤ */
	verticalLeft: "┤",
	/** Horizontal line with down extension ┬ */
	horizontalDown: "┬",
	/** Horizontal line with up extension ┴ */
	horizontalUp: "┴",
	/** Cross intersection ┼ */
	cross: "┼",

	// Double line box drawing
	/** Double top-left corner ╔ */
	doubleTopLeft: "╔",
	/** Double top-right corner ╗ */
	doubleTopRight: "╗",
	/** Double bottom-left corner ╚ */
	doubleBottomLeft: "╚",
	/** Double bottom-right corner ╝ */
	doubleBottomRight: "╝",
	/** Double horizontal line ═ */
	doubleHorizontal: "═",
	/** Double vertical line ║ */
	doubleVertical: "║",

	// Heavy line box drawing
	/** Heavy horizontal line ━ */
	heavyHorizontal: "━",
	/** Heavy vertical line ┃ */
	heavyVertical: "┃",

	// Miscellaneous symbols
	/** Bullet point • */
	bulletPoint: "•",
	/** Right arrow → */
	rightArrow: "→",
	/** Left arrow ← */
	leftArrow: "←",
	/** Up arrow ↑ */
	upArrow: "↑",
	/** Down arrow ↓ */
	downArrow: "↓",
	/** Check mark ✓ */
	checkMark: "✓",
	/** Cross mark ✗ */
	crossMark: "✗",

	/** Spinner animation frames */
	spinner: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
} as const

/**
 * Semantic color helpers for common UI elements
 */
export const SemanticColors = {
	/** Color for success messages */
	success: TerminalColors.green,
	/** Color for error messages */
	error: TerminalColors.red,
	/** Color for warning messages */
	warning: TerminalColors.yellow,
	/** Color for info messages */
	info: TerminalColors.cyan,
	/** Color for debug messages */
	debug: TerminalColors.gray,
	/** Color for AI/assistant output */
	ai: TerminalColors.cyan,
	/** Color for user input prompts */
	prompt: TerminalColors.bright,
	/** Color for commands */
	command: TerminalColors.yellow,
	/** Color for file paths */
	path: TerminalColors.blue,
	/** Color for thinking/processing */
	thinking: TerminalColors.magenta,
} as const

/**
 * Terminal capability detection utilities
 */
export const TerminalCapabilities = {
	/**
	 * Check if terminal supports ANSI color codes
	 */
	supportsColors(): boolean {
		return process.stdout.isTTY === true && !process.env.NO_COLOR && process.env.TERM !== "dumb"
	},

	/**
	 * Check if terminal supports ANSI escape codes (alias for supportsColors)
	 */
	supportsAnsiCodes(): boolean {
		return this.supportsColors()
	},

	/**
	 * Check if terminal supports Unicode characters
	 */
	supportsUnicode(): boolean {
		const lang = process.env.LANG || ""
		return !lang.includes("ASCII")
	},

	/**
	 * Check if terminal is interactive (has TTY)
	 */
	isInteractive(): boolean {
		return process.stdout.isTTY === true
	},

	/**
	 * Get terminal width (columns)
	 */
	getWidth(): number {
		return process.stdout.columns || 80
	},

	/**
	 * Check if running in CI environment
	 */
	isCI(): boolean {
		return process.env.CI === "true" || !!process.env.CI
	},
} as const

/**
 * Helper function to strip ANSI color codes from string
 * Useful for calculating actual string length for alignment
 *
 * @param str - String with ANSI codes
 * @returns String without ANSI codes
 */
export function stripAnsi(str: string): string {
	// eslint-disable-next-line no-control-regex
	return str.replace(/\x1b\[[0-9;]*m/g, "")
}

/**
 * Helper function to apply color only if terminal supports it
 *
 * @param text - Text to colorize
 * @param color - ANSI color code
 * @returns Colored text if supported, plain text otherwise
 */
export function colorize(text: string, color: string): string {
	if (!TerminalCapabilities.supportsColors()) {
		return text
	}
	return `${color}${text}${TerminalColors.reset}`
}
