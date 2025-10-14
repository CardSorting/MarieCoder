/**
 * Progress bar manager for CLI operations
 * Provides visual feedback for long-running tasks
 */

import { getLogger } from "./cli_logger"

const _logger = getLogger()

export interface ProgressBarOptions {
	total: number
	label?: string
	format?: string
	barWidth?: number
	showPercentage?: boolean
	showEta?: boolean
}

/**
 * Simple progress bar implementation without external dependencies
 */
export class ProgressBar {
	private current: number = 0
	private total: number
	private label: string
	private barWidth: number
	private showPercentage: boolean
	private showEta: boolean
	private startTime: number
	private lastRenderTime: number = 0
	private throttleMs: number = 100

	constructor(options: ProgressBarOptions) {
		this.total = options.total
		this.label = options.label || "Progress"
		this.barWidth = options.barWidth || 40
		this.showPercentage = options.showPercentage ?? true
		this.showEta = options.showEta ?? true
		this.startTime = Date.now()
	}

	/**
	 * Update progress
	 */
	update(current?: number, label?: string): void {
		if (current !== undefined) {
			this.current = Math.min(current, this.total)
		}
		if (label) {
			this.label = label
		}

		// Throttle rendering to avoid performance issues
		const now = Date.now()
		if (now - this.lastRenderTime < this.throttleMs && this.current < this.total) {
			return
		}
		this.lastRenderTime = now

		this.render()
	}

	/**
	 * Increment progress by 1
	 */
	increment(amount: number = 1, label?: string): void {
		this.update(this.current + amount, label)
	}

	/**
	 * Render the progress bar
	 */
	private render(): void {
		const percentage = this.total > 0 ? Math.floor((this.current / this.total) * 100) : 0
		const filled = Math.floor((this.current / this.total) * this.barWidth)
		const empty = this.barWidth - filled

		const bar = "█".repeat(filled) + "░".repeat(empty)

		const parts: string[] = []
		parts.push(`\r${this.label}:`)
		parts.push(`[${bar}]`)

		if (this.showPercentage) {
			parts.push(`${percentage}%`)
		}

		parts.push(`(${this.current}/${this.total})`)

		if (this.showEta && this.current > 0 && this.current < this.total) {
			const elapsed = Date.now() - this.startTime
			const rate = this.current / elapsed
			const remaining = (this.total - this.current) / rate
			const eta = this.formatTime(remaining)
			parts.push(`ETA: ${eta}`)
		}

		process.stdout.write(parts.join(" "))

		if (this.current >= this.total) {
			process.stdout.write("\n")
		}
	}

	/**
	 * Format time in milliseconds to human-readable string
	 */
	private formatTime(ms: number): string {
		const seconds = Math.floor(ms / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`
		}
		if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`
		}
		return `${seconds}s`
	}

	/**
	 * Complete the progress bar
	 */
	complete(label?: string): void {
		this.update(this.total, label)
	}

	/**
	 * Stop and clear the progress bar
	 */
	stop(): void {
		process.stdout.write("\n")
	}
}

/**
 * Progress manager for managing multiple progress bars
 */
export class ProgressManager {
	private bars: Map<string, ProgressBar> = new Map()
	private enabled: boolean = true

	/**
	 * Create or update a progress bar
	 */
	create(id: string, options: ProgressBarOptions): ProgressBar {
		if (!this.enabled) {
			// Return a no-op progress bar if disabled
			return this.createNoOpBar()
		}

		const bar = new ProgressBar(options)
		this.bars.set(id, bar)
		return bar
	}

	/**
	 * Get an existing progress bar
	 */
	get(id: string): ProgressBar | undefined {
		return this.bars.get(id)
	}

	/**
	 * Remove a progress bar
	 */
	remove(id: string): void {
		const bar = this.bars.get(id)
		if (bar) {
			bar.stop()
			this.bars.delete(id)
		}
	}

	/**
	 * Clear all progress bars
	 */
	clear(): void {
		for (const bar of this.bars.values()) {
			bar.stop()
		}
		this.bars.clear()
	}

	/**
	 * Enable or disable progress bars
	 */
	setEnabled(enabled: boolean): void {
		this.enabled = enabled
		if (!enabled) {
			this.clear()
		}
	}

	/**
	 * Create a no-op progress bar (for when disabled)
	 */
	private createNoOpBar(): ProgressBar {
		return {
			update: () => {},
			increment: () => {},
			complete: () => {},
			stop: () => {},
		} as any
	}

	/**
	 * Create a spinner for indeterminate operations
	 */
	createSpinner(label: string): Spinner {
		if (!this.enabled) {
			return this.createNoOpSpinner()
		}
		return new Spinner(label)
	}

	/**
	 * Create a no-op spinner
	 */
	private createNoOpSpinner(): Spinner {
		return {
			start: () => {},
			update: () => {},
			succeed: () => {},
			fail: () => {},
			warn: () => {},
			info: () => {},
			stop: () => {},
		} as any
	}
}

/**
 * Spinner for indeterminate progress
 */
export class Spinner {
	private frames: string[] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
	private currentFrame: number = 0
	private label: string
	private interval: NodeJS.Timeout | null = null

	constructor(label: string) {
		this.label = label
	}

	/**
	 * Start the spinner
	 */
	start(): void {
		this.interval = setInterval(() => {
			const frame = this.frames[this.currentFrame]
			process.stdout.write(`\r${frame} ${this.label}`)
			this.currentFrame = (this.currentFrame + 1) % this.frames.length
		}, 80)
	}

	/**
	 * Update the spinner label
	 */
	update(label: string): void {
		this.label = label
	}

	/**
	 * Stop with success
	 */
	succeed(message?: string): void {
		this.stop()
		console.log(`✓ ${message || this.label}`)
	}

	/**
	 * Stop with failure
	 */
	fail(message?: string): void {
		this.stop()
		console.log(`✗ ${message || this.label}`)
	}

	/**
	 * Stop with warning
	 */
	warn(message?: string): void {
		this.stop()
		console.log(`⚠ ${message || this.label}`)
	}

	/**
	 * Stop with info
	 */
	info(message?: string): void {
		this.stop()
		console.log(`ℹ ${message || this.label}`)
	}

	/**
	 * Stop the spinner
	 */
	stop(): void {
		if (this.interval) {
			clearInterval(this.interval)
			this.interval = null
			process.stdout.write("\r\x1b[K") // Clear line
		}
	}
}

/**
 * Get the global progress manager instance
 */
let progressManagerInstance: ProgressManager | null = null

export function getProgressManager(): ProgressManager {
	if (!progressManagerInstance) {
		progressManagerInstance = new ProgressManager()
	}
	return progressManagerInstance
}
