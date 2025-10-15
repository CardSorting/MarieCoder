/**
 * CLI Console Proxy - Safe console wrapper with buffering
 *
 * Wraps native console.log/error/warn to route through output buffer
 * for controlled, smooth rendering. Drop-in replacement for console.
 *
 * Key features:
 * - Transparent buffering of all console outputs
 * - Automatic priority assignment
 * - Format preservation
 * - Stack trace support
 * - Compatible with existing code
 */

import { type CliOutputBuffer, getOutputBuffer } from "../ui/output/output_buffer"
import { getLogger } from "./logger"

const logger = getLogger()

/**
 * Console proxy configuration
 */
interface ConsoleProxyConfig {
	/** Enable buffering (false = direct console) */
	enableBuffering?: boolean
	/** Default priority for log() calls */
	defaultPriority?: "critical" | "high" | "normal" | "low"
	/** Enable format interpolation */
	enableFormatting?: boolean
	/** Source identifier for tracking */
	source?: string
}

/**
 * CLI Console Proxy
 *
 * Wraps console methods to route through output buffer while
 * maintaining compatibility with standard console API.
 */
export class CliConsoleProxy {
	private config: Required<ConsoleProxyConfig>
	private buffer: CliOutputBuffer
	private originalConsole: {
		log: typeof console.log
		error: typeof console.error
		warn: typeof console.warn
		info: typeof console.info
		debug: typeof console.debug
	}

	constructor(config: ConsoleProxyConfig = {}) {
		this.config = {
			enableBuffering: config.enableBuffering ?? true,
			defaultPriority: config.defaultPriority ?? "normal",
			enableFormatting: config.enableFormatting ?? true,
			source: config.source ?? "console",
		}

		this.buffer = getOutputBuffer()

		// Save original console methods
		this.originalConsole = {
			log: console.log.bind(console),
			error: console.error.bind(console),
			warn: console.warn.bind(console),
			info: console.info.bind(console),
			debug: console.debug.bind(console),
		}

		logger.debug("CliConsoleProxy initialized", this.config)
	}

	/**
	 * Proxied console.log
	 */
	log(...args: any[]): void {
		const formatted = this.formatArgs(args)

		if (this.config.enableBuffering) {
			this.buffer.write(formatted + "\n", {
				priority: this.config.defaultPriority,
				type: "stdout",
				source: this.config.source,
			})
		} else {
			this.originalConsole.log(...args)
		}
	}

	/**
	 * Proxied console.error
	 */
	error(...args: any[]): void {
		const formatted = this.formatArgs(args)

		if (this.config.enableBuffering) {
			this.buffer.write(formatted + "\n", {
				priority: "high",
				type: "stderr",
				source: this.config.source,
			})
		} else {
			this.originalConsole.error(...args)
		}
	}

	/**
	 * Proxied console.warn
	 */
	warn(...args: any[]): void {
		const formatted = this.formatArgs(args)

		if (this.config.enableBuffering) {
			this.buffer.write(formatted + "\n", {
				priority: "normal",
				type: "stderr",
				source: this.config.source,
			})
		} else {
			this.originalConsole.warn(...args)
		}
	}

	/**
	 * Proxied console.info
	 */
	info(...args: any[]): void {
		const formatted = this.formatArgs(args)

		if (this.config.enableBuffering) {
			this.buffer.write(formatted + "\n", {
				priority: "normal",
				type: "stdout",
				source: this.config.source,
			})
		} else {
			this.originalConsole.info(...args)
		}
	}

	/**
	 * Proxied console.debug
	 */
	debug(...args: any[]): void {
		const formatted = this.formatArgs(args)

		if (this.config.enableBuffering) {
			this.buffer.write(formatted + "\n", {
				priority: "low",
				type: "stdout",
				source: this.config.source,
			})
		} else {
			this.originalConsole.debug(...args)
		}
	}

	/**
	 * Direct write without newline
	 */
	write(text: string, priority?: "critical" | "high" | "normal" | "low"): void {
		if (this.config.enableBuffering) {
			this.buffer.write(text, {
				priority: priority ?? this.config.defaultPriority,
				type: "stdout",
				source: this.config.source,
			})
		} else {
			process.stdout.write(text)
		}
	}

	/**
	 * Flush buffer immediately
	 */
	async flush(): Promise<void> {
		if (this.config.enableBuffering) {
			await this.buffer.flush()
		}
	}

	/**
	 * Enable buffering
	 */
	enableBuffering(): void {
		this.config.enableBuffering = true
	}

	/**
	 * Disable buffering (direct console output)
	 */
	disableBuffering(): void {
		this.config.enableBuffering = false
	}

	/**
	 * Get buffering status
	 */
	isBufferingEnabled(): boolean {
		return this.config.enableBuffering
	}

	/**
	 * Format arguments like console does
	 */
	private formatArgs(args: any[]): string {
		if (args.length === 0) {
			return ""
		}

		if (!this.config.enableFormatting) {
			return args.map((arg) => String(arg)).join(" ")
		}

		// Handle format strings (basic implementation)
		const first = args[0]
		if (typeof first === "string" && first.includes("%")) {
			return this.formatString(first, args.slice(1))
		}

		// Convert all args to strings
		return args
			.map((arg) => {
				if (typeof arg === "string") {
					return arg
				}
				if (arg === null) {
					return "null"
				}
				if (arg === undefined) {
					return "undefined"
				}
				if (typeof arg === "object") {
					try {
						return JSON.stringify(arg, null, 2)
					} catch {
						return String(arg)
					}
				}
				return String(arg)
			})
			.join(" ")
	}

	/**
	 * Basic format string implementation (subset of console formatting)
	 */
	private formatString(format: string, args: any[]): string {
		let result = format
		let argIndex = 0

		// Replace format specifiers
		result = result.replace(/%[sdifjoO]/g, (match) => {
			if (argIndex >= args.length) {
				return match
			}

			const arg = args[argIndex++]

			switch (match) {
				case "%s": // String
					return String(arg)
				case "%d": // Integer
				case "%i": // Integer
					return String(Number.parseInt(String(arg), 10))
				case "%f": // Float
					return String(Number.parseFloat(String(arg)))
				case "%j": // JSON
					try {
						return JSON.stringify(arg)
					} catch {
						return String(arg)
					}
				case "%o": // Object
				case "%O": // Object
					try {
						return JSON.stringify(arg, null, 2)
					} catch {
						return String(arg)
					}
				default:
					return match
			}
		})

		// Append remaining args
		if (argIndex < args.length) {
			result +=
				" " +
				args
					.slice(argIndex)
					.map((arg) => String(arg))
					.join(" ")
		}

		return result
	}

	/**
	 * Get original console methods
	 */
	getOriginal(): typeof console {
		return this.originalConsole as any
	}
}

/**
 * Global console proxy instance
 */
let globalConsoleProxy: CliConsoleProxy | null = null

/**
 * Get or create global console proxy
 */
export function getConsoleProxy(config?: ConsoleProxyConfig): CliConsoleProxy {
	if (!globalConsoleProxy) {
		globalConsoleProxy = new CliConsoleProxy(config)
	}
	return globalConsoleProxy
}

/**
 * Install console proxy (replaces global console methods)
 */
export function installConsoleProxy(config?: ConsoleProxyConfig): void {
	const proxy = getConsoleProxy(config)

	// Replace global console methods
	console.log = proxy.log.bind(proxy)
	console.error = proxy.error.bind(proxy)
	console.warn = proxy.warn.bind(proxy)
	console.info = proxy.info.bind(proxy)
	console.debug = proxy.debug.bind(proxy)

	logger.debug("Console proxy installed globally")
}

/**
 * Uninstall console proxy (restore original console)
 */
export function uninstallConsoleProxy(): void {
	const proxy = getConsoleProxy()
	const original = proxy.getOriginal()

	// Restore original console methods
	console.log = original.log
	console.error = original.error
	console.warn = original.warn
	console.info = original.info
	console.debug = original.debug

	logger.debug("Console proxy uninstalled")
}

/**
 * Reset global console proxy (useful for testing)
 */
export function resetConsoleProxy(): void {
	if (globalConsoleProxy) {
		uninstallConsoleProxy()
		globalConsoleProxy = null
	}
}
