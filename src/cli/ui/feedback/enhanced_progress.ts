/**
 * Enhanced Progress Manager with Advanced Features
 *
 * Provides sophisticated progress visualization including:
 * - Multi-step progress tracking
 * - Animated spinners with custom frames
 * - ETA calculations
 * - Speed indicators
 * - Nested progress tracking
 * - Progress bars with gradients
 *
 * @module cli_enhanced_progress
 */

import { Colors256, EffectChars, SemanticColors, stripAnsi, style, TerminalColors } from "./ui/output/terminal_colors"

/**
 * Progress bar style options
 */
export type ProgressBarStyle = "standard" | "gradient" | "blocks" | "dots" | "minimal"

/**
 * Spinner animation frames
 */
export const SpinnerFrames = {
	dots: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
	line: ["-", "\\", "|", "/"],
	arrow: ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
	arc: ["◜", "◠", "◝", "◞", "◡", "◟"],
	box: ["▖", "▘", "▝", "▗"],
	bounce: ["⠁", "⠂", "⠄", "⠂"],
	earth: ["🌍", "🌎", "🌏"],
	moon: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
	clock: ["🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛"],
	growing: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▂"],
	pulse: ["●", "◉", "◎", "○", "◎", "◉"],
} as const

/**
 * Enhanced progress tracker
 */
export class EnhancedProgress {
	private startTime: number
	private lastUpdate: number = Date.now()
	private history: number[] = []
	private maxHistorySize = 10

	constructor(
		private current: number = 0,
		private total: number = 100,
		private label: string = "Progress",
	) {
		this.startTime = Date.now()
	}

	/**
	 * Update progress
	 */
	update(current: number): void {
		this.current = current
		this.lastUpdate = Date.now()
		this.history.push(current)
		if (this.history.length > this.maxHistorySize) {
			this.history.shift()
		}
	}

	/**
	 * Increment progress
	 */
	increment(amount: number = 1): void {
		this.update(this.current + amount)
	}

	/**
	 * Get current progress percentage
	 */
	getPercentage(): number {
		return Math.min(100, Math.max(0, Math.round((this.current / this.total) * 100)))
	}

	/**
	 * Get elapsed time in milliseconds
	 */
	getElapsed(): number {
		return Date.now() - this.startTime
	}

	/**
	 * Get ETA in milliseconds
	 */
	getEta(): number {
		if (this.current === 0) return 0

		const elapsed = this.getElapsed()
		const rate = this.current / elapsed
		const remaining = this.total - this.current

		return remaining / rate
	}

	/**
	 * Get current speed (items per second)
	 */
	getSpeed(): number {
		if (this.current === 0) return 0

		const elapsed = this.getElapsed() / 1000
		return this.current / elapsed
	}

	/**
	 * Get smoothed speed using history
	 */
	getSmoothedSpeed(): number {
		if (this.history.length < 2) return this.getSpeed()

		const recent = this.history.slice(-5)
		const timePeriod = (this.maxHistorySize * 100) / 1000 // Assume 100ms updates
		const delta = recent[recent.length - 1] - recent[0]

		return delta / timePeriod
	}

	/**
	 * Format ETA as human-readable string
	 */
	formatEta(): string {
		const eta = this.getEta()
		if (!Number.isFinite(eta) || eta <= 0) return ""

		const seconds = Math.round(eta / 1000)

		if (seconds < 1) return "< 1s"
		if (seconds < 60) return `${seconds}s`
		if (seconds < 3600) {
			const mins = Math.floor(seconds / 60)
			const secs = seconds % 60
			return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
		}

		const hours = Math.floor(seconds / 3600)
		const mins = Math.floor((seconds % 3600) / 60)
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
	}

	/**
	 * Format speed as human-readable string
	 */
	formatSpeed(): string {
		const speed = this.getSmoothedSpeed()
		if (!Number.isFinite(speed) || speed <= 0) return ""

		if (speed < 0.1) return `${speed.toFixed(3)}/s`
		if (speed < 1) return `${speed.toFixed(2)}/s`
		if (speed < 10) return `${speed.toFixed(1)}/s`
		return `${Math.round(speed)}/s`
	}

	/**
	 * Render progress bar
	 */
	render(
		options: {
			width?: number
			style?: ProgressBarStyle
			showPercentage?: boolean
			showCount?: boolean
			showEta?: boolean
			showSpeed?: boolean
		} = {},
	): string {
		const {
			width = 40,
			style: barStyle = "gradient",
			showPercentage = true,
			showCount = true,
			showEta = true,
			showSpeed = false,
		} = options

		const percentage = this.getPercentage()
		const filledWidth = Math.round((percentage / 100) * width)
		const emptyWidth = width - filledWidth

		// Build progress bar based on style
		let bar: string
		switch (barStyle) {
			case "gradient":
				bar = this.renderGradientBar(filledWidth, emptyWidth)
				break
			case "blocks":
				bar = this.renderBlockBar(filledWidth, emptyWidth)
				break
			case "dots":
				bar = this.renderDotBar(filledWidth, emptyWidth)
				break
			case "minimal":
				bar = this.renderMinimalBar(filledWidth, emptyWidth)
				break
			default:
				bar = this.renderStandardBar(filledWidth, emptyWidth)
				break
		}

		// Build info section
		const parts: string[] = []
		if (showCount) parts.push(`${this.current}/${this.total}`)
		if (showPercentage) parts.push(`${percentage}%`)
		if (showEta && percentage < 100) {
			const eta = this.formatEta()
			if (eta) parts.push(`ETA: ${eta}`)
		}
		if (showSpeed) {
			const speed = this.formatSpeed()
			if (speed) parts.push(speed)
		}

		const info = parts.join(" | ")
		const labelStyled = style(this.label, TerminalColors.bright)

		return `${labelStyled} [${bar}] ${style(info, TerminalColors.dim)}`
	}

	/**
	 * Render gradient progress bar
	 */
	private renderGradientBar(filled: number, empty: number): string {
		const filledChar = EffectChars.progressFull
		let color: number

		const percentage = this.getPercentage()
		if (percentage === 100) {
			color = Colors256.presets.limeGreen
		} else if (percentage >= 75) {
			color = Colors256.presets.skyBlue
		} else if (percentage >= 50) {
			color = Colors256.presets.teal
		} else if (percentage >= 25) {
			color = Colors256.presets.amber
		} else {
			color = Colors256.presets.orange
		}

		const filledPart = Colors256.fg(color) + filledChar.repeat(filled) + TerminalColors.reset
		const emptyPart = style(EffectChars.progressEmpty.repeat(empty), TerminalColors.dim)

		return filledPart + emptyPart
	}

	/**
	 * Render block-style progress bar
	 */
	private renderBlockBar(filled: number, empty: number): string {
		const blocks = [
			EffectChars.progressFull,
			EffectChars.progressSeven,
			EffectChars.progressFive,
			EffectChars.progressThree,
			EffectChars.progressOne,
		]

		const filledPart = style(EffectChars.fullBlock.repeat(filled), SemanticColors.complete)
		const emptyPart = style(EffectChars.lightShade.repeat(empty), TerminalColors.dim)

		return filledPart + emptyPart
	}

	/**
	 * Render dot-style progress bar
	 */
	private renderDotBar(filled: number, empty: number): string {
		const filledPart = style(EffectChars.circleFilled.repeat(filled), SemanticColors.complete)
		const emptyPart = style(EffectChars.circleEmpty.repeat(empty), TerminalColors.dim)

		return filledPart + emptyPart
	}

	/**
	 * Render minimal progress bar
	 */
	private renderMinimalBar(filled: number, empty: number): string {
		const filledPart = style("━".repeat(filled), SemanticColors.complete)
		const emptyPart = style("─".repeat(empty), TerminalColors.dim)

		return filledPart + emptyPart
	}

	/**
	 * Render standard progress bar
	 */
	private renderStandardBar(filled: number, empty: number): string {
		const filledPart = style("█".repeat(filled), SemanticColors.progress)
		const emptyPart = style("░".repeat(empty), TerminalColors.dim)

		return filledPart + emptyPart
	}

	/**
	 * Check if completed
	 */
	isComplete(): boolean {
		return this.current >= this.total
	}

	/**
	 * Reset progress
	 */
	reset(): void {
		this.current = 0
		this.startTime = Date.now()
		this.lastUpdate = Date.now()
		this.history = []
	}
}

/**
 * Animated spinner
 */
export class AnimatedSpinner {
	private frameIndex = 0
	private intervalId: NodeJS.Timeout | null = null
	private lastRender: string = ""

	constructor(
		private message: string,
		private frames: readonly string[] = SpinnerFrames.dots,
		private color: string = SemanticColors.progress,
	) {}

	/**
	 * Get current frame
	 */
	getCurrentFrame(): string {
		return this.frames[this.frameIndex % this.frames.length]
	}

	/**
	 * Advance to next frame
	 */
	nextFrame(): void {
		this.frameIndex++
	}

	/**
	 * Render current state
	 */
	render(): string {
		const frame = this.getCurrentFrame()
		const frameStyled = style(frame, this.color)
		this.lastRender = `${frameStyled} ${style(this.message, TerminalColors.dim)}`
		return this.lastRender
	}

	/**
	 * Update message
	 */
	setMessage(message: string): void {
		this.message = message
	}

	/**
	 * Start auto-animation (for terminal updates)
	 */
	startAnimation(callback: (text: string) => void, intervalMs: number = 80): void {
		this.stopAnimation()
		this.intervalId = setInterval(() => {
			this.nextFrame()
			callback(this.render())
		}, intervalMs)
	}

	/**
	 * Stop auto-animation
	 */
	stopAnimation(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}
	}

	/**
	 * Get last rendered text
	 */
	getLastRender(): string {
		return this.lastRender
	}
}

/**
 * Multi-step progress tracker
 */
export class MultiStepProgress {
	private steps: Map<
		string,
		{
			label: string
			status: "pending" | "in_progress" | "completed" | "failed"
			progress?: EnhancedProgress
			startTime?: number
			endTime?: number
		}
	> = new Map()
	private stepOrder: string[] = []
	private currentStepId: string | null = null

	/**
	 * Add a step
	 */
	addStep(id: string, label: string, total: number = 100): void {
		this.steps.set(id, {
			label,
			status: "pending",
			progress: new EnhancedProgress(0, total, label),
		})
		this.stepOrder.push(id)
	}

	/**
	 * Start a step
	 */
	startStep(id: string): void {
		const step = this.steps.get(id)
		if (!step) return

		step.status = "in_progress"
		step.startTime = Date.now()
		this.currentStepId = id
	}

	/**
	 * Update step progress
	 */
	updateStep(id: string, current: number): void {
		const step = this.steps.get(id)
		if (!step || !step.progress) return

		step.progress.update(current)
	}

	/**
	 * Complete a step
	 */
	completeStep(id: string, success: boolean = true): void {
		const step = this.steps.get(id)
		if (!step) return

		step.status = success ? "completed" : "failed"
		step.endTime = Date.now()

		// Auto-start next step if exists
		const currentIndex = this.stepOrder.indexOf(id)
		if (currentIndex >= 0 && currentIndex < this.stepOrder.length - 1) {
			const nextId = this.stepOrder[currentIndex + 1]
			this.startStep(nextId)
		}
	}

	/**
	 * Render all steps
	 */
	render(): string {
		const lines: string[] = []

		for (const id of this.stepOrder) {
			const step = this.steps.get(id)
			if (!step) continue

			let icon: string
			let iconColor: string

			switch (step.status) {
				case "completed":
					icon = "✓"
					iconColor = SemanticColors.complete
					break
				case "in_progress":
					icon = "●"
					iconColor = SemanticColors.progress
					break
				case "failed":
					icon = "✗"
					iconColor = SemanticColors.error
					break
				default:
					icon = "○"
					iconColor = TerminalColors.dim
					break
			}

			const iconStyled = style(icon, iconColor)
			const labelStyled =
				step.status === "in_progress" ? style(step.label, TerminalColors.bright) : style(step.label, TerminalColors.dim)

			let line = `${iconStyled} ${labelStyled}`

			// Add progress bar for in-progress steps
			if (step.status === "in_progress" && step.progress) {
				const progressBar = step.progress.render({ width: 30, style: "gradient", showPercentage: true, showEta: true })
				line = `${line}\n  ${progressBar}`
			}

			// Add duration for completed steps
			if ((step.status === "completed" || step.status === "failed") && step.startTime && step.endTime) {
				const duration = step.endTime - step.startTime
				const durationText = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`
				line = `${line} ${style(`(${durationText})`, SemanticColors.metadata)}`
			}

			lines.push(line)
		}

		return lines.join("\n")
	}

	/**
	 * Get overall completion percentage
	 */
	getOverallPercentage(): number {
		if (this.steps.size === 0) return 0

		let totalPercentage = 0
		for (const step of this.steps.values()) {
			if (step.status === "completed") {
				totalPercentage += 100
			} else if (step.status === "in_progress" && step.progress) {
				totalPercentage += step.progress.getPercentage()
			}
		}

		return Math.round(totalPercentage / this.steps.size)
	}

	/**
	 * Check if all steps completed
	 */
	isComplete(): boolean {
		for (const step of this.steps.values()) {
			if (step.status !== "completed") return false
		}
		return true
	}

	/**
	 * Check if any step failed
	 */
	hasFailed(): boolean {
		for (const step of this.steps.values()) {
			if (step.status === "failed") return true
		}
		return false
	}
}

/**
 * Simple progress indicator that writes to stdout
 */
export class LiveProgress {
	private lastLineLength = 0

	/**
	 * Update progress on same line
	 */
	update(text: string): void {
		// Clear previous line
		if (this.lastLineLength > 0) {
			process.stdout.write("\r" + " ".repeat(this.lastLineLength) + "\r")
		}

		// Write new progress
		process.stdout.write(text)
		this.lastLineLength = stripAnsi(text).length
	}

	/**
	 * Clear progress line
	 */
	clear(): void {
		if (this.lastLineLength > 0) {
			process.stdout.write("\r" + " ".repeat(this.lastLineLength) + "\r")
			this.lastLineLength = 0
		}
	}

	/**
	 * Finish progress and move to new line
	 */
	finish(finalText?: string): void {
		if (finalText) {
			this.update(finalText)
		}
		process.stdout.write("\n")
		this.lastLineLength = 0
	}
}
