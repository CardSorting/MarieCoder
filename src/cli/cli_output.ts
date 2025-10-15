/**
 * CLI Output - Simple throttled console wrapper
 *
 * Lightweight replacement for console.log that prevents rapid scrolling
 * by throttling output rate and batching rapid calls.
 *
 * Usage:
 * ```typescript
 * import { output } from './cli_output'
 *
 * output.log("Message")      // Instead of console.log
 * output.error("Error!")     // Instead of console.error
 * output.warn("Warning")     // Instead of console.warn
 * ```
 */

/**
 * Output queue item
 */
interface QueueItem {
	fn: (...args: any[]) => void
	args: any[]
	timestamp: number
	priority: number
}

/**
 * Simple CLI Output Manager
 *
 * Throttles console output to prevent rapid scrolling while
 * maintaining natural feel. Drop-in replacement for console methods.
 */
class CliOutput {
	private queue: QueueItem[] = []
	private processing = false
	private lastOutput = 0
	private readonly MIN_INTERVAL = 20 // 20ms = 50 outputs/sec max
	private readonly BATCH_DELAY = 10 // Small delay for batching
	private batchTimer: NodeJS.Timeout | null = null
	private enabled = true

	/**
	 * Log output (normal priority)
	 */
	log(...args: any[]): void {
		if (!this.enabled) {
			console.log(...args)
			return
		}
		this.enqueue(console.log, args, 1)
	}

	/**
	 * Error output (high priority, immediate)
	 */
	error(...args: any[]): void {
		if (!this.enabled) {
			console.error(...args)
			return
		}
		// Errors bypass throttling for immediate feedback
		console.error(...args)
	}

	/**
	 * Warning output (normal priority)
	 */
	warn(...args: any[]): void {
		if (!this.enabled) {
			console.warn(...args)
			return
		}
		this.enqueue(console.warn, args, 1)
	}

	/**
	 * Info output (normal priority)
	 */
	info(...args: any[]): void {
		if (!this.enabled) {
			console.info(...args)
			return
		}
		this.enqueue(console.info, args, 1)
	}

	/**
	 * Debug output (low priority)
	 */
	debug(...args: any[]): void {
		if (!this.enabled) {
			console.debug(...args)
			return
		}
		this.enqueue(console.debug, args, 0)
	}

	/**
	 * Direct write without newline (advanced)
	 */
	write(text: string): void {
		if (!this.enabled) {
			process.stdout.write(text)
			return
		}
		this.enqueue(process.stdout.write.bind(process.stdout), [text], 1)
	}

	/**
	 * Enable throttling
	 */
	enable(): void {
		this.enabled = true
	}

	/**
	 * Disable throttling (direct console output)
	 */
	disable(): void {
		this.enabled = false
		this.flush() // Flush any pending before disabling
	}

	/**
	 * Check if throttling is enabled
	 */
	isEnabled(): boolean {
		return this.enabled
	}

	/**
	 * Flush all pending output immediately
	 */
	flush(): void {
		if (this.batchTimer) {
			clearTimeout(this.batchTimer)
			this.batchTimer = null
		}

		while (this.queue.length > 0) {
			const item = this.queue.shift()!
			item.fn(...item.args)
		}
	}

	/**
	 * Get queue size
	 */
	getQueueSize(): number {
		return this.queue.length
	}

	/**
	 * Clear queue without outputting
	 */
	clear(): void {
		this.queue = []
		if (this.batchTimer) {
			clearTimeout(this.batchTimer)
			this.batchTimer = null
		}
	}

	/**
	 * Enqueue output with batching
	 */
	private enqueue(fn: (...args: any[]) => void, args: any[], priority: number): void {
		this.queue.push({
			fn,
			args,
			timestamp: Date.now(),
			priority,
		})

		// Clear existing batch timer
		if (this.batchTimer) {
			clearTimeout(this.batchTimer)
		}

		// Set new batch timer
		this.batchTimer = setTimeout(() => {
			this.batchTimer = null
			this.processQueue()
		}, this.BATCH_DELAY)
	}

	/**
	 * Process the output queue with throttling
	 */
	private async processQueue(): Promise<void> {
		if (this.processing || this.queue.length === 0) {
			return
		}

		this.processing = true

		try {
			// Sort by priority (higher priority first)
			this.queue.sort((a, b) => b.priority - a.priority)

			while (this.queue.length > 0) {
				const now = Date.now()
				const timeSinceLastOutput = now - this.lastOutput

				// Throttle output
				if (timeSinceLastOutput < this.MIN_INTERVAL) {
					await this.sleep(this.MIN_INTERVAL - timeSinceLastOutput)
				}

				// Process next item
				const item = this.queue.shift()
				if (item) {
					item.fn(...item.args)
					this.lastOutput = Date.now()
				}
			}
		} finally {
			this.processing = false
		}
	}

	/**
	 * Sleep helper
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
}

/**
 * Global output instance
 */
export const output = new CliOutput()

/**
 * Setup exit handler to flush on exit
 */
process.on("exit", () => {
	output.flush()
})

// Also flush on common exit signals
process.on("SIGINT", () => {
	output.flush()
	process.exit(0)
})

process.on("SIGTERM", () => {
	output.flush()
	process.exit(0)
})
