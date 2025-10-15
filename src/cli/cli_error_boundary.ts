/**
 * CLI Error Boundary - Graceful error handling and recovery
 *
 * Prevents CLI crashes by catching and handling errors gracefully
 * with automatic recovery and user-friendly error messages.
 *
 * Key features:
 * - Global error catching
 * - Graceful degradation
 * - Error recovery strategies
 * - User-friendly error display
 * - Automatic retry with backoff
 * - State restoration
 */

import { EventEmitter } from "node:events"
import { getLogger } from "./cli_logger"
import { formatMessageBox } from "./cli_message_formatter"
import { getOutputBuffer } from "./cli_output_buffer"
import { getTerminalState } from "./cli_terminal_state"

const logger = getLogger()

/**
 * Error severity levels
 */
type ErrorSeverity = "critical" | "error" | "warning" | "recoverable"

/**
 * Error context information
 */
interface ErrorContext {
	operation: string
	component: string
	timestamp: number
	severity: ErrorSeverity
	recoverable: boolean
	metadata?: Record<string, any>
}

/**
 * Error recovery strategy
 */
interface RecoveryStrategy {
	name: string
	attempt: () => Promise<boolean>
	maxAttempts: number
	backoffMs: number
}

/**
 * CLI Error Boundary
 *
 * Provides comprehensive error handling and recovery for the CLI,
 * preventing crashes and ensuring smooth user experience.
 */
export class CliErrorBoundary extends EventEmitter {
	private errorCount: number = 0
	private lastErrors: Array<{ error: Error; context: ErrorContext }> = []
	private readonly MAX_ERROR_HISTORY = 50
	private readonly CRITICAL_ERROR_THRESHOLD = 5
	private recoveryStrategies: Map<string, RecoveryStrategy> = new Map()
	private isRecovering: boolean = false

	constructor() {
		super()
		this.setupGlobalHandlers()
		this.setupDefaultRecoveryStrategies()
		logger.debug("CliErrorBoundary initialized")
	}

	/**
	 * Wrap a function with error handling
	 */
	wrap<T extends (...args: any[]) => any>(
		fn: T,
		context: Partial<ErrorContext> = {},
	): (...args: Parameters<T>) => ReturnType<T> | undefined {
		return (...args: Parameters<T>) => {
			try {
				const result = fn(...args)

				// Handle promises
				if (result && typeof result.then === "function") {
					return result.catch((error: Error) => {
						this.handleError(error, {
							operation: context.operation || fn.name || "unknown",
							component: context.component || "unknown",
							severity: context.severity || "error",
							recoverable: context.recoverable ?? true,
							timestamp: Date.now(),
							metadata: context.metadata,
						})
						return undefined
					})
				}

				return result
			} catch (error) {
				this.handleError(error as Error, {
					operation: context.operation || fn.name || "unknown",
					component: context.component || "unknown",
					severity: context.severity || "error",
					recoverable: context.recoverable ?? true,
					timestamp: Date.now(),
					metadata: context.metadata,
				})
				return undefined
			}
		}
	}

	/**
	 * Handle error with recovery
	 */
	async handleError(error: Error, context: ErrorContext): Promise<void> {
		this.errorCount++

		// Store error
		this.lastErrors.push({ error, context })
		if (this.lastErrors.length > this.MAX_ERROR_HISTORY) {
			this.lastErrors.shift()
		}

		logger.error(`Error in ${context.component}.${context.operation}:`, error)

		// Emit error event
		this.emit("error", { error, context })

		// Check if we're in a critical error state
		if (this.errorCount >= this.CRITICAL_ERROR_THRESHOLD) {
			await this.handleCriticalState()
			return
		}

		// Display error to user
		await this.displayError(error, context)

		// Attempt recovery if recoverable
		if (context.recoverable && !this.isRecovering) {
			await this.attemptRecovery(error, context)
		}
	}

	/**
	 * Display error to user with formatting
	 */
	private async displayError(error: Error, context: ErrorContext): Promise<void> {
		const buffer = getOutputBuffer()

		// Format error message
		let message = `Operation: ${context.operation}\n`
		message += `Component: ${context.component}\n`
		message += `Error: ${error.message}\n`

		// Add stack trace for non-recoverable errors
		if (!context.recoverable && error.stack) {
			message += `\nStack trace:\n${error.stack}`
		}

		// Add recovery info
		if (context.recoverable) {
			message += `\n\n💡 Attempting automatic recovery...`
		}

		// Format based on severity
		const formatted = formatMessageBox(
			`${this.getSeverityIcon(context.severity)} ${this.getSeverityLabel(context.severity)}`,
			message,
			{ type: context.severity === "critical" || context.severity === "error" ? "error" : "warning" },
		)

		buffer.write(formatted, {
			priority: context.severity === "critical" ? "critical" : "high",
			type: "stderr",
		})

		await buffer.flush()
	}

	/**
	 * Attempt error recovery
	 */
	private async attemptRecovery(error: Error, context: ErrorContext): Promise<void> {
		if (this.isRecovering) {
			return
		}

		this.isRecovering = true

		try {
			// Try component-specific recovery
			const strategy = this.recoveryStrategies.get(context.component)
			if (strategy) {
				await this.executeRecoveryStrategy(strategy)
			} else {
				// Try default recovery
				await this.defaultRecovery(context)
			}

			// Reset error count on successful recovery
			this.errorCount = Math.max(0, this.errorCount - 1)

			const buffer = getOutputBuffer()
			buffer.write("\n✓ Recovery successful\n\n", { priority: "high", type: "stdout" })
			await buffer.flush()

			this.emit("recovery-success", { error, context })
		} catch (recoveryError) {
			logger.error("Recovery failed:", recoveryError)
			this.emit("recovery-failed", { error, context, recoveryError })
		} finally {
			this.isRecovering = false
		}
	}

	/**
	 * Execute recovery strategy with retry
	 */
	private async executeRecoveryStrategy(strategy: RecoveryStrategy): Promise<void> {
		for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
			try {
				const success = await strategy.attempt()
				if (success) {
					logger.info(`Recovery strategy '${strategy.name}' succeeded on attempt ${attempt}`)
					return
				}
			} catch (error) {
				logger.warn(`Recovery attempt ${attempt} failed:`, error)
			}

			// Wait before retry (exponential backoff)
			if (attempt < strategy.maxAttempts) {
				const delay = strategy.backoffMs * 2 ** (attempt - 1)
				await this.sleep(delay)
			}
		}

		throw new Error(`Recovery strategy '${strategy.name}' failed after ${strategy.maxAttempts} attempts`)
	}

	/**
	 * Default recovery procedure
	 */
	private async defaultRecovery(_context: ErrorContext): Promise<void> {
		// Clear terminal state
		const terminalState = getTerminalState()
		terminalState.showCursor()

		// Clear output buffer errors
		const buffer = getOutputBuffer()
		const stats = buffer.getStats()
		if (stats.currentQueueSize > 100) {
			buffer.clear()
		}

		await this.sleep(100)
	}

	/**
	 * Handle critical error state
	 */
	private async handleCriticalState(): Promise<void> {
		logger.error(`Critical error threshold reached (${this.errorCount} errors)`)

		const buffer = getOutputBuffer()

		const message = `The CLI has encountered multiple errors and may be unstable.
		
Recent errors:
${this.lastErrors
	.slice(-5)
	.map((e) => `  • ${e.context.operation}: ${e.error.message}`)
	.join("\n")}

Please try:
1. Restart the CLI
2. Check your configuration
3. Report this issue if it persists`

		const formatted = formatMessageBox("🚨 Critical Error State", message, { type: "error" })

		buffer.write(formatted, { priority: "critical", type: "stderr" })
		await buffer.flush()

		this.emit("critical-state")

		// Reset error count to allow continued operation
		this.errorCount = 0
	}

	/**
	 * Register recovery strategy for a component
	 */
	registerRecoveryStrategy(component: string, strategy: RecoveryStrategy): void {
		this.recoveryStrategies.set(component, strategy)
		logger.debug(`Registered recovery strategy for ${component}`)
	}

	/**
	 * Setup global error handlers
	 */
	private setupGlobalHandlers(): void {
		// Uncaught exceptions
		process.on("uncaughtException", (error: Error) => {
			this.handleError(error, {
				operation: "uncaughtException",
				component: "process",
				severity: "critical",
				recoverable: false,
				timestamp: Date.now(),
			})
		})

		// Unhandled promise rejections
		process.on("unhandledRejection", (reason: any) => {
			const error = reason instanceof Error ? reason : new Error(String(reason))
			this.handleError(error, {
				operation: "unhandledRejection",
				component: "promise",
				severity: "critical",
				recoverable: false,
				timestamp: Date.now(),
			})
		})

		// Warning handler
		process.on("warning", (warning: Error) => {
			logger.warn("Process warning:", warning)
		})
	}

	/**
	 * Setup default recovery strategies
	 */
	private setupDefaultRecoveryStrategies(): void {
		// Terminal recovery
		this.registerRecoveryStrategy("terminal", {
			name: "terminal-reset",
			maxAttempts: 3,
			backoffMs: 500,
			attempt: async () => {
				const terminalState = getTerminalState()
				terminalState.showCursor()
				terminalState.exitAlternateScreen()
				return true
			},
		})

		// Buffer recovery
		this.registerRecoveryStrategy("buffer", {
			name: "buffer-clear",
			maxAttempts: 2,
			backoffMs: 200,
			attempt: async () => {
				const buffer = getOutputBuffer()
				await buffer.flush()
				return true
			},
		})
	}

	/**
	 * Get severity icon
	 */
	private getSeverityIcon(severity: ErrorSeverity): string {
		switch (severity) {
			case "critical":
				return "🚨"
			case "error":
				return "❌"
			case "warning":
				return "⚠️"
			case "recoverable":
				return "🔄"
		}
	}

	/**
	 * Get severity label
	 */
	private getSeverityLabel(severity: ErrorSeverity): string {
		switch (severity) {
			case "critical":
				return "Critical Error"
			case "error":
				return "Error"
			case "warning":
				return "Warning"
			case "recoverable":
				return "Recoverable Error"
		}
	}

	/**
	 * Get error statistics
	 */
	getStats(): {
		totalErrors: number
		recentErrors: number
		inCriticalState: boolean
	} {
		return {
			totalErrors: this.errorCount,
			recentErrors: this.lastErrors.length,
			inCriticalState: this.errorCount >= this.CRITICAL_ERROR_THRESHOLD,
		}
	}

	/**
	 * Sleep helper
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	/**
	 * Clear error history
	 */
	clearHistory(): void {
		this.lastErrors = []
		this.errorCount = 0
		logger.debug("Error history cleared")
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this.removeAllListeners()
		this.recoveryStrategies.clear()
		logger.debug("CliErrorBoundary disposed")
	}
}

/**
 * Global error boundary instance
 */
let globalErrorBoundary: CliErrorBoundary | null = null

/**
 * Get or create global error boundary
 */
export function getErrorBoundary(): CliErrorBoundary {
	if (!globalErrorBoundary) {
		globalErrorBoundary = new CliErrorBoundary()
	}
	return globalErrorBoundary
}

/**
 * Reset global error boundary (useful for testing)
 */
export function resetErrorBoundary(): void {
	if (globalErrorBoundary) {
		globalErrorBoundary.dispose()
		globalErrorBoundary = null
	}
}

/**
 * Wrap function with global error boundary
 */
export function withErrorBoundary<T extends (...args: any[]) => any>(
	fn: T,
	context?: Partial<ErrorContext>,
): (...args: Parameters<T>) => ReturnType<T> | undefined {
	const boundary = getErrorBoundary()
	return boundary.wrap(fn, context)
}
