/**
 * Structured logging system for CLI
 *
 * @module cli_logger
 * @description Provides leveled logging with optional timestamps and color output.
 * Supports DEBUG, INFO, WARN, ERROR, and SILENT log levels.
 *
 * @example
 * ```typescript
 * import { getLogger, LogLevel } from '../infrastructure/logger'
 *
 * const logger = getLogger({ level: LogLevel.DEBUG })
 *
 * logger.debug('Detailed debug information')
 * logger.info('General information')
 * logger.warn('Warning message')
 * logger.error('Error occurred', error)
 * logger.success('Operation completed!')
 * ```
 */

import { output } from "../ui/output/output"
export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	SILENT = 4,
}

export interface LoggerOptions {
	level: LogLevel
	timestamp?: boolean
	colorize?: boolean
}

/**
 * CLI Logger with structured logging and levels
 *
 * Provides formatted console output with configurable log levels,
 * optional timestamps, and ANSI color support.
 *
 * @example
 * ```typescript
 * // Create logger with custom options
 * const logger = new CliLogger({
 *   level: LogLevel.DEBUG,
 *   timestamp: true,
 *   colorize: true
 * })
 *
 * // Use different log levels
 * logger.debug('Debug info')
 * logger.info('Information')
 * logger.warn('Warning!')
 * logger.error('Error!', errorObject)
 *
 * // Create child logger with prefix
 * const childLogger = logger.child('Module')
 * childLogger.info('Message') // Output: [Module] Message
 * ```
 */
export class CliLogger {
	private level: LogLevel
	private timestamp: boolean
	private colorize: boolean
	private static instance: CliLogger | null = null

	constructor(options: Partial<LoggerOptions> = {}) {
		this.level = options.level ?? LogLevel.INFO
		this.timestamp = options.timestamp ?? false
		this.colorize = options.colorize ?? true
	}

	/**
	 * Get or create singleton logger instance
	 */
	static getInstance(options?: Partial<LoggerOptions>): CliLogger {
		if (!CliLogger.instance) {
			CliLogger.instance = new CliLogger(options)
		} else if (options) {
			// Update existing instance with new options
			CliLogger.instance.setLevel(options.level ?? CliLogger.instance.level)
			if (options.timestamp !== undefined) {
				CliLogger.instance.timestamp = options.timestamp
			}
			if (options.colorize !== undefined) {
				CliLogger.instance.colorize = options.colorize
			}
		}
		return CliLogger.instance
	}

	/**
	 * Set log level
	 */
	setLevel(level: LogLevel): void {
		this.level = level
	}

	/**
	 * Get current log level
	 */
	getLevel(): LogLevel {
		return this.level
	}

	/**
	 * Format log message with timestamp and level
	 */
	private formatMessage(level: string, message: string, color?: string): string {
		const parts: string[] = []

		if (this.timestamp) {
			const now = new Date().toISOString()
			parts.push(`[${now}]`)
		}

		parts.push(`[${level}]`)
		parts.push(message)

		const formattedMessage = parts.join(" ")

		if (this.colorize && color) {
			return this.colorize ? this.applyColor(formattedMessage, color) : formattedMessage
		}

		return formattedMessage
	}

	/**
	 * Apply ANSI color codes
	 */
	private applyColor(text: string, color: string): string {
		const colors: Record<string, string> = {
			reset: "\x1b[0m",
			bright: "\x1b[1m",
			dim: "\x1b[2m",
			red: "\x1b[31m",
			green: "\x1b[32m",
			yellow: "\x1b[33m",
			blue: "\x1b[34m",
			magenta: "\x1b[35m",
			cyan: "\x1b[36m",
			white: "\x1b[37m",
			gray: "\x1b[90m",
		}

		return `${colors[color] || ""}${text}${colors.reset}`
	}

	/**
	 * Debug level logging (most verbose)
	 */
	debug(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.DEBUG) {
			const formatted = this.formatMessage("DEBUG", message, "gray")
			output.log(formatted, ...args)
		}
	}

	/**
	 * Info level logging (general information)
	 */
	info(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.INFO) {
			const formatted = this.formatMessage("INFO", message, "blue")
			output.log(formatted, ...args)
		}
	}

	/**
	 * Warning level logging
	 */
	warn(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.WARN) {
			const formatted = this.formatMessage("WARN", message, "yellow")
			output.warn(formatted, ...args)
		}
	}

	/**
	 * Error level logging
	 */
	error(message: string, error?: unknown, ...args: unknown[]): void {
		if (this.level <= LogLevel.ERROR) {
			const formatted = this.formatMessage("ERROR", message, "red")
			console.error(formatted, ...args)

			if (error) {
				if (error instanceof Error) {
					console.error(this.applyColor(`  ${error.message}`, "red"))
					if (this.level === LogLevel.DEBUG && error.stack) {
						console.error(this.applyColor(`  ${error.stack}`, "gray"))
					}
				} else {
					console.error(this.applyColor(`  ${String(error)}`, "red"))
				}
			}
		}
	}

	/**
	 * Success message (always shown unless SILENT)
	 */
	success(message: string, ...args: unknown[]): void {
		if (this.level < LogLevel.SILENT) {
			const formatted = this.formatMessage("SUCCESS", message, "green")
			output.log(formatted, ...args)
		}
	}

	/**
	 * Create a child logger with a prefix
	 */
	child(prefix: string): CliLogger {
		const childLogger = new CliLogger({
			level: this.level,
			timestamp: this.timestamp,
			colorize: this.colorize,
		})

		// Override formatting to include prefix
		const originalFormat = childLogger.formatMessage.bind(childLogger)
		childLogger.formatMessage = (level: string, message: string, color?: string) => {
			return originalFormat(level, `[${prefix}] ${message}`, color)
		}

		return childLogger
	}

	/**
	 * Group related log messages
	 */
	group(title: string): void {
		if (this.level < LogLevel.SILENT) {
			console.group(this.applyColor(title, "bright"))
		}
	}

	/**
	 * End log group
	 */
	groupEnd(): void {
		if (this.level < LogLevel.SILENT) {
			console.groupEnd()
		}
	}

	/**
	 * Log a separator line
	 */
	separator(char: string = "─", length: number = 80): void {
		if (this.level < LogLevel.SILENT) {
			output.log(this.applyColor(char.repeat(length), "dim"))
		}
	}

	/**
	 * Log table data
	 */
	table(data: unknown): void {
		if (this.level <= LogLevel.INFO) {
			console.table(data)
		}
	}
}

/**
 * Get the global logger instance
 */
export function getLogger(options?: Partial<LoggerOptions>): CliLogger {
	return CliLogger.getInstance(options)
}
