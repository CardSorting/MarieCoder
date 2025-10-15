/**
 * Advanced Animation System
 *
 * Provides sophisticated animation capabilities including:
 * - Typewriter effects
 * - Wave animations
 * - Particle effects
 * - Smooth transitions
 * - Loading sequences
 * - Visual effects
 *
 * @module cli_animations
 */

import { Colors256, EffectChars, SemanticColors, stripAnsi, style, TerminalColors } from "../output/terminal_colors"

/**
 * Typewriter effect - renders text character by character
 */
export class TypewriterEffect {
	private currentIndex = 0
	private intervalId: NodeJS.Timeout | null = null

	constructor(
		private text: string,
		private delayMs: number = 50,
	) {}

	/**
	 * Start the typewriter effect
	 */
	start(callback: (text: string) => void, onComplete?: () => void): void {
		this.stop()
		this.currentIndex = 0

		this.intervalId = setInterval(() => {
			if (this.currentIndex <= this.text.length) {
				const partial = this.text.substring(0, this.currentIndex)
				callback(partial + style("▋", TerminalColors.dim))
				this.currentIndex++
			} else {
				this.stop()
				callback(this.text)
				if (onComplete) onComplete()
			}
		}, this.delayMs)
	}

	/**
	 * Stop the typewriter effect
	 */
	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}
	}

	/**
	 * Render current state (without animation)
	 */
	renderInstant(): string {
		return this.text.substring(0, this.currentIndex)
	}
}

/**
 * Wave animation for text
 */
export class WaveAnimation {
	private frame = 0
	private readonly waveChars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"]

	constructor(private length: number = 20) {}

	/**
	 * Get next frame
	 */
	nextFrame(): string {
		const wave: string[] = []
		for (let i = 0; i < this.length; i++) {
			const offset = (this.frame + i) % (this.waveChars.length * 2)
			const index = offset < this.waveChars.length ? offset : this.waveChars.length * 2 - offset - 1

			const char = this.waveChars[Math.floor(index)]
			const colorIndex = Math.floor((i / this.length) * 6) + 1
			wave.push(Colors256.fg(26 + colorIndex) + char)
		}
		this.frame++
		return wave.join("") + TerminalColors.reset
	}

	/**
	 * Render with label
	 */
	render(label: string = "Loading"): string {
		return `${style(label, TerminalColors.bright)} ${this.nextFrame()}`
	}
}

/**
 * Particle effect animation
 */
export class ParticleEffect {
	private particles: Array<{
		x: number
		y: number
		vx: number
		vy: number
		char: string
		color: number
		life: number
	}> = []
	private frame = 0

	constructor(
		private width: number = 40,
		private height: number = 5,
		private particleCount: number = 20,
	) {
		this.initParticles()
	}

	/**
	 * Initialize particles
	 */
	private initParticles(): void {
		const chars = ["·", "•", "●", "○", "◦", "∘", "*", "✦", "✧", "⋆"]
		for (let i = 0; i < this.particleCount; i++) {
			this.particles.push({
				x: Math.random() * this.width,
				y: Math.random() * this.height,
				vx: (Math.random() - 0.5) * 2,
				vy: (Math.random() - 0.5) * 2,
				char: chars[Math.floor(Math.random() * chars.length)],
				color: Math.floor(Math.random() * 216) + 16,
				life: Math.random(),
			})
		}
	}

	/**
	 * Update particle positions
	 */
	private updateParticles(): void {
		for (const particle of this.particles) {
			particle.x += particle.vx
			particle.y += particle.vy

			// Bounce off edges
			if (particle.x < 0 || particle.x >= this.width) {
				particle.vx *= -1
				particle.x = Math.max(0, Math.min(this.width - 1, particle.x))
			}
			if (particle.y < 0 || particle.y >= this.height) {
				particle.vy *= -1
				particle.y = Math.max(0, Math.min(this.height - 1, particle.y))
			}

			// Update life
			particle.life = (particle.life + 0.02) % 1
		}
	}

	/**
	 * Render next frame
	 */
	nextFrame(): string {
		this.updateParticles()
		this.frame++

		// Create grid
		const grid: string[][] = Array(this.height)
			.fill(null)
			.map(() => Array(this.width).fill(" "))

		// Place particles
		for (const particle of this.particles) {
			const x = Math.floor(particle.x)
			const y = Math.floor(particle.y)
			if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
				const alpha = particle.life
				const color = alpha > 0.5 ? particle.color : Colors256.presets.darkGray
				grid[y][x] = Colors256.fg(color) + particle.char + TerminalColors.reset
			}
		}

		// Convert to string
		return grid.map((row) => row.join("")).join("\n")
	}

	/**
	 * Render with border
	 */
	render(title?: string): string {
		const lines: string[] = []
		const borderChar = "─"

		if (title) {
			lines.push(style(` ${title} `, TerminalColors.bright, SemanticColors.highlight))
		}
		lines.push(style(borderChar.repeat(this.width), TerminalColors.dim))
		lines.push(this.nextFrame())
		lines.push(style(borderChar.repeat(this.width), TerminalColors.dim))

		return lines.join("\n")
	}
}

/**
 * Smooth loading sequence with multiple stages
 */
export class LoadingSequence {
	private currentStage = 0
	private stageStartTime = Date.now()
	private readonly spinnerFrames = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"]
	private spinnerIndex = 0

	constructor(
		private stages: Array<{
			label: string
			duration?: number
			icon?: string
		}>,
	) {}

	/**
	 * Update to next stage
	 */
	nextStage(): boolean {
		if (this.currentStage < this.stages.length - 1) {
			this.currentStage++
			this.stageStartTime = Date.now()
			return true
		}
		return false
	}

	/**
	 * Get elapsed time for current stage
	 */
	getStageElapsed(): number {
		return Date.now() - this.stageStartTime
	}

	/**
	 * Check if current stage is complete
	 */
	isStageComplete(): boolean {
		const stage = this.stages[this.currentStage]
		if (!stage.duration) return false
		return this.getStageElapsed() >= stage.duration
	}

	/**
	 * Render current state
	 */
	render(): string {
		const stage = this.stages[this.currentStage]
		const lines: string[] = []

		// Overall progress
		const progress = ((this.currentStage + 1) / this.stages.length) * 100
		const barWidth = 30
		const filled = Math.floor((progress / 100) * barWidth)
		const bar =
			Colors256.fg(Colors256.presets.skyBlue) +
			EffectChars.progressFull.repeat(filled) +
			TerminalColors.reset +
			style(EffectChars.progressEmpty.repeat(barWidth - filled), TerminalColors.dim)

		lines.push(`${style("Progress", TerminalColors.bright)}: [${bar}] ${Math.round(progress)}%`)
		lines.push("")

		// Current stage with spinner
		this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length
		const spinner = this.spinnerFrames[this.spinnerIndex]
		const icon = stage.icon || spinner

		lines.push(`${style(icon, SemanticColors.progress)} ${style(stage.label, TerminalColors.bright)}`)

		// Stage progress if duration specified
		if (stage.duration) {
			const stageProgress = Math.min(100, (this.getStageElapsed() / stage.duration) * 100)
			const stageFilled = Math.floor((stageProgress / 100) * 20)
			const stageBar =
				style(EffectChars.progressFull.repeat(stageFilled), SemanticColors.progress) +
				style(EffectChars.progressEmpty.repeat(20 - stageFilled), TerminalColors.dim)
			lines.push(`  [${stageBar}] ${Math.round(stageProgress)}%`)
		}

		// All stages list
		lines.push("")
		lines.push(style("Stages:", TerminalColors.dim))
		this.stages.forEach((s, i) => {
			let statusIcon: string
			let statusColor: string
			if (i < this.currentStage) {
				statusIcon = "✓"
				statusColor = SemanticColors.complete
			} else if (i === this.currentStage) {
				statusIcon = "●"
				statusColor = SemanticColors.progress
			} else {
				statusIcon = "○"
				statusColor = TerminalColors.dim
			}
			lines.push(
				`  ${style(statusIcon, statusColor)} ${style(s.label, i <= this.currentStage ? TerminalColors.reset : TerminalColors.dim)}`,
			)
		})

		return lines.join("\n")
	}

	/**
	 * Check if complete
	 */
	isComplete(): boolean {
		return this.currentStage === this.stages.length - 1 && this.isStageComplete()
	}
}

/**
 * Pulse effect for attention-grabbing elements
 */
export class PulseEffect {
	private intensity = 0
	private direction = 1
	private readonly step = 0.1

	/**
	 * Get next frame
	 */
	nextFrame(text: string, baseColor: string = TerminalColors.cyan): string {
		this.intensity += this.direction * this.step
		if (this.intensity >= 1) {
			this.intensity = 1
			this.direction = -1
		} else if (this.intensity <= 0) {
			this.intensity = 0
			this.direction = 1
		}

		const bright = this.intensity > 0.5 ? TerminalColors.bright : ""
		return `${bright}${baseColor}${text}${TerminalColors.reset}`
	}
}

/**
 * Rainbow effect for text
 */
export class RainbowEffect {
	private offset = 0
	private readonly colors = [
		Colors256.presets.crimson,
		Colors256.presets.orange,
		Colors256.presets.gold,
		Colors256.presets.limeGreen,
		Colors256.presets.skyBlue,
		Colors256.presets.violet,
	]

	/**
	 * Apply rainbow effect to text
	 */
	apply(text: string): string {
		const result: string[] = []
		const cleanText = stripAnsi(text)

		for (let i = 0; i < cleanText.length; i++) {
			const colorIndex = (i + this.offset) % this.colors.length
			const color = this.colors[colorIndex]
			result.push(Colors256.fg(color) + cleanText[i])
		}

		this.offset = (this.offset + 1) % this.colors.length
		return result.join("") + TerminalColors.reset
	}
}

/**
 * Matrix-style falling text effect
 */
export class MatrixEffect {
	private columns: Array<{
		chars: string[]
		speed: number
		offset: number
	}> = []
	private readonly width: number
	private readonly height: number

	constructor(width: number = 60, height: number = 10) {
		this.width = width
		this.height = height
		this.initColumns()
	}

	/**
	 * Initialize columns
	 */
	private initColumns(): void {
		const chars = "01アイウエオカキクケコサシスセソタチツテト".split("")
		for (let i = 0; i < this.width; i++) {
			this.columns.push({
				chars: Array(this.height)
					.fill(null)
					.map(() => chars[Math.floor(Math.random() * chars.length)]),
				speed: Math.random() * 2 + 1,
				offset: Math.random() * this.height,
			})
		}
	}

	/**
	 * Update animation
	 */
	private update(): void {
		for (const column of this.columns) {
			column.offset += column.speed * 0.1
			if (column.offset >= this.height) {
				column.offset = 0
			}
		}
	}

	/**
	 * Render next frame
	 */
	nextFrame(): string {
		this.update()
		const grid: string[][] = Array(this.height)
			.fill(null)
			.map(() => Array(this.width).fill(" "))

		for (let x = 0; x < this.width; x++) {
			const column = this.columns[x]
			for (let y = 0; y < this.height; y++) {
				const charIndex = (y + Math.floor(column.offset)) % column.chars.length
				const char = column.chars[charIndex]
				const distance = Math.abs(y - column.offset)
				const brightness = Math.max(0, 1 - distance / 5)

				let color: number
				if (brightness > 0.8) {
					color = Colors256.presets.limeGreen
				} else if (brightness > 0.5) {
					color = Colors256.presets.forestGreen
				} else if (brightness > 0.2) {
					color = Colors256.presets.darkGray
				} else {
					continue
				}

				grid[y][x] = Colors256.fg(color) + char + TerminalColors.reset
			}
		}

		return grid.map((row) => row.join("")).join("\n")
	}
}

/**
 * Progress circle spinner
 */
export class ProgressCircle {
	private angle = 0
	private readonly segments = 8

	/**
	 * Render circular progress
	 */
	render(progress: number, _size: number = 3): string {
		const percentage = Math.min(100, Math.max(0, progress))

		const chars = ["○", "◔", "◑", "◕", "●"]

		// Simple representation
		const charIndex = Math.floor((percentage / 100) * (chars.length - 1))
		const char = chars[charIndex]

		const coloredChar =
			percentage >= 75
				? style(char, SemanticColors.complete)
				: percentage >= 50
					? style(char, SemanticColors.progress)
					: percentage >= 25
						? style(char, SemanticColors.warning)
						: style(char, TerminalColors.dim)

		return `${coloredChar} ${percentage}%`
	}

	/**
	 * Render as animated spinner
	 */
	renderSpinner(): string {
		const frames = ["◜", "◠", "◝", "◞", "◡", "◟"]
		const frame = frames[Math.floor(this.angle) % frames.length]
		this.angle += 0.5
		return style(frame, SemanticColors.progress)
	}
}

/**
 * Glitch effect for emphasis
 */
export class GlitchEffect {
	private glitchChars = "!<>-_\\/[]{}—=+*^?#________"

	/**
	 * Apply glitch effect to text
	 */
	apply(text: string, intensity: number = 0.3): string {
		const result: string[] = []
		const cleanText = stripAnsi(text)

		for (let i = 0; i < cleanText.length; i++) {
			if (Math.random() < intensity) {
				const glitchChar = this.glitchChars[Math.floor(Math.random() * this.glitchChars.length)]
				const color = Math.random() > 0.5 ? TerminalColors.red : TerminalColors.cyan
				result.push(style(glitchChar, color))
			} else {
				result.push(cleanText[i])
			}
		}

		return result.join("")
	}
}

/**
 * Smooth fade-in effect
 */
export class FadeInEffect {
	private opacity = 0
	private readonly fadeSpeed = 0.05

	/**
	 * Get next frame
	 */
	nextFrame(text: string): string {
		if (this.opacity < 1) {
			this.opacity += this.fadeSpeed
		}

		if (this.opacity < 0.3) {
			return ""
		} else if (this.opacity < 0.7) {
			return style(text, TerminalColors.dim)
		} else {
			return text
		}
	}

	/**
	 * Reset effect
	 */
	reset(): void {
		this.opacity = 0
	}

	/**
	 * Check if complete
	 */
	isComplete(): boolean {
		return this.opacity >= 1
	}
}
