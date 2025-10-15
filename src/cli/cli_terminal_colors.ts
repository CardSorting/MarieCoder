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
 * output.log(`${TerminalColors.green}Success!${TerminalColors.reset}`)
 *
 * // Use semantic colors
 * output.log(`${SemanticColors.error}Error occurred${TerminalColors.reset}`)
 *
 * // Use helper function
 * output.log(colorize('Warning', TerminalColors.yellow))
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
	/** Italic text (not widely supported) */
	italic: "\x1b[3m",
	/** Underline text */
	underline: "\x1b[4m",
	/** Reverse colors (swap foreground/background) */
	reverse: "\x1b[7m",

	// Foreground colors - Standard
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

	// Foreground colors - Bright variants
	/** Bright red text */
	brightRed: "\x1b[91m",
	/** Bright green text */
	brightGreen: "\x1b[92m",
	/** Bright yellow text */
	brightYellow: "\x1b[93m",
	/** Bright blue text */
	brightBlue: "\x1b[94m",
	/** Bright magenta text */
	brightMagenta: "\x1b[95m",
	/** Bright cyan text */
	brightCyan: "\x1b[96m",
	/** Bright white text */
	brightWhite: "\x1b[97m",

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
	/** Gray background */
	bgGray: "\x1b[100m",

	// Background colors - Bright variants
	/** Bright red background */
	bgBrightRed: "\x1b[101m",
	/** Bright green background */
	bgBrightGreen: "\x1b[102m",
	/** Bright yellow background */
	bgBrightYellow: "\x1b[103m",
	/** Bright blue background */
	bgBrightBlue: "\x1b[104m",
	/** Bright magenta background */
	bgBrightMagenta: "\x1b[105m",
	/** Bright cyan background */
	bgBrightCyan: "\x1b[106m",
	/** Bright white background */
	bgBrightWhite: "\x1b[107m",
} as const

/**
 * Box drawing characters for terminal UI
 *
 * @example
 * ```typescript
 * import { BoxChars } from "./cli_terminal_colors"
 *
 * output.log(`${BoxChars.topLeft}${BoxChars.horizontal.repeat(10)}${BoxChars.topRight}`)
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
	/** Color for headers and titles */
	header: TerminalColors.brightCyan,
	/** Color for metadata and secondary info */
	metadata: TerminalColors.dim,
	/** Color for highlights and emphasis */
	highlight: TerminalColors.brightYellow,
	/** Color for code and technical content */
	code: TerminalColors.brightMagenta,
	/** Color for links and references */
	link: TerminalColors.brightBlue,
	/** Color for completion and done states */
	complete: TerminalColors.brightGreen,
	/** Color for in-progress indicators */
	progress: TerminalColors.brightYellow,
	/** Color for pending/queued items */
	pending: TerminalColors.gray,
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
	 * Provides safer fallback for terminal width detection
	 */
	getWidth(): number {
		// Try to get actual terminal width
		if (process.stdout.isTTY && process.stdout.columns) {
			// Ensure we have a reasonable width (not too small, not too large)
			const columns = process.stdout.columns
			return Math.max(40, Math.min(200, columns))
		}

		// Fallback to environment variable
		const envCols = process.env.COLUMNS
		if (envCols) {
			const parsed = Number.parseInt(envCols, 10)
			if (!Number.isNaN(parsed) && parsed > 0) {
				return Math.max(40, Math.min(200, parsed))
			}
		}

		// Safe default fallback
		return 80
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

/**
 * Helper function to apply multiple styles (color, bright, dim, etc.)
 *
 * @param text - Text to style
 * @param styles - Array of ANSI codes to apply
 * @returns Styled text if supported, plain text otherwise
 */
export function style(text: string, ...styles: string[]): string {
	if (!TerminalCapabilities.supportsColors()) {
		return text
	}
	return `${styles.join("")}${text}${TerminalColors.reset}`
}

/**
 * Pad text to center it within a given width
 *
 * @param text - Text to center
 * @param width - Total width to center within
 * @returns Centered text with padding
 */
export function centerText(text: string, width: number): string {
	const plainText = stripAnsi(text)
	const padding = Math.max(0, width - plainText.length)
	const leftPad = Math.floor(padding / 2)
	const rightPad = padding - leftPad
	return " ".repeat(leftPad) + text + " ".repeat(rightPad)
}

/**
 * Pad text to align it to the right within a given width
 *
 * @param text - Text to align
 * @param width - Total width to align within
 * @returns Right-aligned text with padding
 */
export function rightAlign(text: string, width: number): string {
	const plainText = stripAnsi(text)
	const padding = Math.max(0, width - plainText.length)
	return " ".repeat(padding) + text
}

/**
 * Truncate text to fit within a given width, adding ellipsis if needed
 *
 * @param text - Text to truncate
 * @param width - Maximum width
 * @param position - Where to place ellipsis ('end', 'middle', 'start')
 * @returns Truncated text
 */
export function truncate(text: string, width: number, position: "end" | "middle" | "start" = "end"): string {
	if (text.length <= width) {
		return text
	}

	const ellipsis = "..."
	if (position === "end") {
		return text.slice(0, width - ellipsis.length) + ellipsis
	}
	if (position === "start") {
		return ellipsis + text.slice(text.length - width + ellipsis.length)
	}
	// middle
	const halfWidth = Math.floor((width - ellipsis.length) / 2)
	return text.slice(0, halfWidth) + ellipsis + text.slice(text.length - halfWidth)
}
