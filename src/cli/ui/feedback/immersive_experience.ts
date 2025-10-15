/**
 * Immersive Experience Components
 *
 * Provides engaging experience features for CLI:
 * - Welcome/splash screens
 * - Tutorial overlays
 * - Contextual hints and tips
 * - Achievement celebrations
 * - Milestone markers
 * - Success animations
 * - Guided tours
 *
 * @module cli_immersive_experience
 */

import {
	BoxChars,
	Colors256,
	centerText,
	EffectChars,
	gradient,
	RoundedBoxChars,
	SemanticColors,
	stripAnsi,
	style,
	TerminalColors,
} from "../output/terminal_colors"

/**
 * Get responsive content width
 */
function getContentWidth(): number {
	const termWidth = process.stdout.columns || 80
	const minWidth = 60
	const maxWidth = 120
	const margin = 4
	return Math.min(maxWidth, Math.max(minWidth, termWidth - margin))
}

/**
 * Splash screen with animated entrance and ASCII art
 */
export class SplashScreen {
	private animationFrame = 0
	private readonly marieCoderAsciiArt = [
		"███╗   ███╗ █████╗ ██████╗ ██╗███████╗ ██████╗ ██████╗ ██████╗ ███████╗██████╗ ",
		"████╗ ████║██╔══██╗██╔══██╗██║██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗",
		"██╔████╔██║███████║██████╔╝██║█████╗  ██║     ██║   ██║██║  ██║█████╗  ██████╔╝",
		"██║╚██╔╝██║██╔══██║██╔══██╗██║██╔══╝  ██║     ██║   ██║██║  ██║██╔══╝  ██╔══██╗",
		"██║ ╚═╝ ██║██║  ██║██║  ██║██║███████╗╚██████╗╚██████╔╝██████╔╝███████╗██║  ██║",
		"╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝",
	]

	constructor(
		_appName: string,
		private version: string,
		private tagline?: string,
		private asciiArt?: string[],
	) {
		// appName parameter kept for backward compatibility but not used since we have ASCII art
		void _appName
	}

	/**
	 * Generate animated gradient colors
	 */
	private getAnimatedGradient(text: string): string {
		// Create smooth color cycling
		const time = this.animationFrame
		const colorPhase = time % 360

		// Define color stops for the gradient
		const colors = [
			Colors256.presets.skyBlue, // 0°
			Colors256.presets.violet, // 60°
			Colors256.presets.magenta, // 120°
			Colors256.presets.pink, // 180°
			Colors256.presets.coral, // 240°
			Colors256.presets.gold, // 300°
			Colors256.presets.skyBlue, // 360° (loop back)
		]

		// Apply gradient to text
		const result: string[] = []
		const cleanText = stripAnsi(text)

		for (let i = 0; i < cleanText.length; i++) {
			// Create rainbow effect across the text
			const charPhase = (i * 10 + colorPhase) % colors.length
			const colorIndex = Math.floor(charPhase)
			const color = colors[colorIndex % colors.length]
			result.push(Colors256.fg(color) + cleanText[i])
		}

		return result.join("") + TerminalColors.reset
	}

	/**
	 * Render splash screen with animated gradient
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()

		lines.push("")
		lines.push("")

		// Use MarieCoder ASCII art or provided art
		const artToUse = this.asciiArt || this.marieCoderAsciiArt

		// Render ASCII art with animated gradient
		for (const line of artToUse) {
			const gradientLine = this.getAnimatedGradient(line)
			const centered = centerText(gradientLine, contentWidth)
			lines.push(centered)
		}

		lines.push("")

		// Version with subtle animation
		const versionText = `v${this.version}`
		const versionGradient = gradient(versionText, Colors256.presets.silver, Colors256.presets.lightGray)
		lines.push(centerText(style(versionGradient, TerminalColors.bright), contentWidth))

		// Tagline with animation
		if (this.tagline) {
			lines.push("")
			const taglineGradient = gradient(this.tagline, Colors256.presets.teal, Colors256.presets.skyBlue)
			lines.push(centerText(style(taglineGradient, TerminalColors.dim), contentWidth))
		}

		// Animated decorative border with sparkles
		lines.push("")
		const borderWidth = Math.min(60, contentWidth)
		const sparkles = ["·", "∗", "✦", "✧", "⋆", "∘"]
		let border = ""
		for (let i = 0; i < borderWidth; i++) {
			const sparkleIndex = (i + this.animationFrame) % sparkles.length
			const colorPhase = (i * 5 + this.animationFrame * 2) % 360
			const colorIndex = Math.floor(colorPhase / 60) % 6
			const colors = [
				Colors256.presets.gold,
				Colors256.presets.amber,
				Colors256.presets.orange,
				Colors256.presets.coral,
				Colors256.presets.rose,
				Colors256.presets.pink,
			]
			border += Colors256.fg(colors[colorIndex]) + sparkles[sparkleIndex]
		}
		border += TerminalColors.reset
		lines.push(centerText(border, contentWidth))

		lines.push("")
		lines.push("")

		// Increment animation frame for next render
		this.animationFrame++

		return lines.join("\n")
	}

	/**
	 * Render with loading animation
	 */
	renderWithLoading(loadingMessage: string = "Initializing..."): string {
		const splash = this.render()
		const contentWidth = getContentWidth()

		// Animated loading text
		const dots = ".".repeat(this.animationFrame % 4)
		const loadingText = `${loadingMessage}${dots}`
		const loadingGradient = gradient(loadingText, Colors256.presets.skyBlue, Colors256.presets.violet)

		return splash + "\n" + centerText(loadingGradient, contentWidth) + "\n"
	}

	/**
	 * Reset animation frame
	 */
	resetAnimation(): void {
		this.animationFrame = 0
	}

	/**
	 * Render animated splash (call repeatedly for animation effect)
	 */
	async renderAnimated(durationMs: number = 2000, frameDelayMs: number = 80): Promise<void> {
		const frames = Math.floor(durationMs / frameDelayMs)

		for (let i = 0; i < frames; i++) {
			console.clear()
			console.log(this.render())
			await new Promise((resolve) => setTimeout(resolve, frameDelayMs))
		}
	}
}

/**
 * Tutorial overlay/tooltip
 */
export class TutorialOverlay {
	private currentStep = 0

	constructor(
		private steps: Array<{
			title: string
			content: string
			hint?: string
			action?: string
		}>,
	) {}

	/**
	 * Move to next step
	 */
	nextStep(): boolean {
		if (this.currentStep < this.steps.length - 1) {
			this.currentStep++
			return true
		}
		return false
	}

	/**
	 * Move to previous step
	 */
	previousStep(): boolean {
		if (this.currentStep > 0) {
			this.currentStep--
			return true
		}
		return false
	}

	/**
	 * Get current step number
	 */
	getCurrentStepNumber(): number {
		return this.currentStep + 1
	}

	/**
	 * Get total steps
	 */
	getTotalSteps(): number {
		return this.steps.length
	}

	/**
	 * Check if last step
	 */
	isLastStep(): boolean {
		return this.currentStep === this.steps.length - 1
	}

	/**
	 * Render current tutorial step
	 */
	render(): string {
		const step = this.steps[this.currentStep]
		const lines: string[] = []
		const width = 60

		lines.push("")

		// Header with step counter
		const header = `Tutorial (${this.currentStep + 1}/${this.steps.length})`
		const headerGradient = gradient(header, Colors256.presets.violet, Colors256.presets.skyBlue)

		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(width)}${RoundedBoxChars.topRight}`,
				Colors256.fg(Colors256.presets.violet),
			),
		)

		const headerPadding = " ".repeat(Math.max(0, width - stripAnsi(header).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, Colors256.fg(Colors256.presets.violet))} ${headerGradient}${headerPadding} ${style(RoundedBoxChars.vertical, Colors256.fg(Colors256.presets.violet))}`,
		)

		// Title
		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`,
				Colors256.fg(Colors256.presets.violet),
			),
		)

		const titleText = `💡 ${step.title}`
		const titlePadding = " ".repeat(Math.max(0, width - stripAnsi(titleText).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, Colors256.fg(Colors256.presets.violet))} ${style(titleText, TerminalColors.bright)}${titlePadding} ${style(RoundedBoxChars.vertical, Colors256.fg(Colors256.presets.violet))}`,
		)

		// Content
		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`,
				Colors256.fg(Colors256.presets.violet),
			),
		)

		const contentLines = wordWrap(step.content, width - 4)
		for (const line of contentLines) {
			const padding = " ".repeat(Math.max(0, width - stripAnsi(line).length - 4))
			lines.push(
				`${style(RoundedBoxChars.vertical, Colors256.fg(Colors256.presets.violet))}  ${line}${padding}  ${style(RoundedBoxChars.vertical, Colors256.fg(Colors256.presets.violet))}`,
			)
		}

		// Hint if provided
		if (step.hint) {
			lines.push(
				style(
					`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`,
					Colors256.fg(Colors256.presets.violet),
				),
			)

			const hintText = `💬 ${step.hint}`
			const hintLines = wordWrap(hintText, width - 4)
			for (const line of hintLines) {
				const padding = " ".repeat(Math.max(0, width - stripAnsi(line).length - 4))
				lines.push(
					`${style(RoundedBoxChars.vertical, Colors256.fg(Colors256.presets.violet))}  ${style(line, TerminalColors.dim)}${padding}  ${style(RoundedBoxChars.vertical, Colors256.fg(Colors256.presets.violet))}`,
				)
			}
		}

		// Navigation
		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`,
				Colors256.fg(Colors256.presets.violet),
			),
		)

		const navText = this.isLastStep()
			? "← Previous | Enter to finish"
			: this.currentStep === 0
				? "Enter to continue →"
				: "← Previous | Next →"

		const navPadding = " ".repeat(Math.max(0, width - stripAnsi(navText).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, Colors256.fg(Colors256.presets.violet))} ${style(navText, TerminalColors.dim)}${navPadding} ${style(RoundedBoxChars.vertical, Colors256.fg(Colors256.presets.violet))}`,
		)

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(width)}${RoundedBoxChars.bottomRight}`,
				Colors256.fg(Colors256.presets.violet),
			),
		)

		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Contextual hint/tip
 */
export class ContextualHint {
	constructor(
		private message: string,
		private type: "tip" | "hint" | "info" | "warning" = "hint",
	) {}

	/**
	 * Render hint
	 */
	render(): string {
		const lines: string[] = []
		const width = 50

		let icon: string
		let color: number
		let title: string

		switch (this.type) {
			case "tip":
				icon = "💡"
				color = Colors256.presets.gold
				title = "TIP"
				break
			case "hint":
				icon = "💬"
				color = Colors256.presets.skyBlue
				title = "HINT"
				break
			case "info":
				icon = "ℹ"
				color = Colors256.presets.teal
				title = "INFO"
				break
			case "warning":
				icon = "⚠"
				color = Colors256.presets.amber
				title = "NOTE"
				break
		}

		lines.push("")
		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(width)}${RoundedBoxChars.topRight}`,
				Colors256.fg(color),
			),
		)

		const header = `${icon} ${title}`
		const headerPadding = " ".repeat(Math.max(0, width - stripAnsi(header).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, Colors256.fg(color))} ${style(header, TerminalColors.bright)}${headerPadding} ${style(RoundedBoxChars.vertical, Colors256.fg(color))}`,
		)

		lines.push(
			style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`, Colors256.fg(color)),
		)

		const messageLines = wordWrap(this.message, width - 4)
		for (const line of messageLines) {
			const padding = " ".repeat(Math.max(0, width - stripAnsi(line).length - 4))
			lines.push(
				`${style(RoundedBoxChars.vertical, Colors256.fg(color))}  ${line}${padding}  ${style(RoundedBoxChars.vertical, Colors256.fg(color))}`,
			)
		}

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(width)}${RoundedBoxChars.bottomRight}`,
				Colors256.fg(color),
			),
		)
		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Achievement/success celebration
 */
export class Achievement {
	constructor(
		private title: string,
		private description: string,
		private icon: string = "🏆",
	) {}

	/**
	 * Render achievement
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()
		const width = Math.min(60, contentWidth - 4)

		lines.push("")
		lines.push("")

		// Decorative top
		const stars = EffectChars.starFilled.repeat(Math.floor(width / 2))
		lines.push(centerText(style(stars, Colors256.fg(Colors256.presets.gold)), contentWidth))

		lines.push("")

		// Achievement banner
		const banner = gradient("🎉 ACHIEVEMENT UNLOCKED! 🎉", Colors256.presets.gold, Colors256.presets.amber)
		lines.push(centerText(banner, contentWidth))

		lines.push("")

		// Icon
		lines.push(centerText(this.icon, contentWidth))

		lines.push("")

		// Title
		const titleGradient = gradient(this.title, Colors256.presets.gold, Colors256.presets.amber)
		lines.push(centerText(style(titleGradient, TerminalColors.bright), contentWidth))

		lines.push("")

		// Description
		const descLines = wordWrap(this.description, width)
		for (const line of descLines) {
			lines.push(centerText(style(line, TerminalColors.dim), contentWidth))
		}

		lines.push("")

		// Decorative bottom
		lines.push(centerText(style(stars, Colors256.fg(Colors256.presets.gold)), contentWidth))

		lines.push("")
		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Milestone marker
 */
export class Milestone {
	constructor(
		private title: string,
		private progress: number,
		private total: number,
		private rewards?: string[],
	) {}

	/**
	 * Render milestone
	 */
	render(): string {
		const lines: string[] = []
		const width = 60

		const percentage = (this.progress / this.total) * 100
		const isComplete = this.progress >= this.total

		lines.push("")

		// Header
		const header = isComplete ? "🎯 MILESTONE COMPLETED!" : "🎯 Milestone Progress"
		const headerColor = isComplete ? Colors256.presets.limeGreen : Colors256.presets.skyBlue

		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(width)}${RoundedBoxChars.topRight}`,
				Colors256.fg(headerColor),
			),
		)

		const headerPadding = " ".repeat(Math.max(0, width - stripAnsi(header).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, Colors256.fg(headerColor))} ${style(header, TerminalColors.bright)}${headerPadding} ${style(RoundedBoxChars.vertical, Colors256.fg(headerColor))}`,
		)

		// Title
		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`,
				Colors256.fg(headerColor),
			),
		)

		const titlePadding = " ".repeat(Math.max(0, width - stripAnsi(this.title).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, Colors256.fg(headerColor))} ${style(this.title, TerminalColors.bright)}${titlePadding} ${style(RoundedBoxChars.vertical, Colors256.fg(headerColor))}`,
		)

		// Progress bar
		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`,
				Colors256.fg(headerColor),
			),
		)

		const barWidth = 40
		const filled = Math.round((percentage / 100) * barWidth)
		const bar =
			Colors256.fg(headerColor) +
			EffectChars.progressFull.repeat(filled) +
			TerminalColors.reset +
			style(EffectChars.progressEmpty.repeat(barWidth - filled), TerminalColors.dim)

		const progressText = `[${bar}] ${this.progress}/${this.total} (${Math.round(percentage)}%)`
		const progressPadding = " ".repeat(Math.max(0, width - stripAnsi(progressText).length - 4))
		lines.push(
			`${style(RoundedBoxChars.vertical, Colors256.fg(headerColor))}  ${progressText}${progressPadding}  ${style(RoundedBoxChars.vertical, Colors256.fg(headerColor))}`,
		)

		// Rewards if provided and complete
		if (isComplete && this.rewards && this.rewards.length > 0) {
			lines.push(
				style(
					`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`,
					Colors256.fg(headerColor),
				),
			)

			const rewardsTitle = style("Rewards:", TerminalColors.bright)
			const rewardsTitlePadding = " ".repeat(Math.max(0, width - stripAnsi(rewardsTitle).length - 4))
			lines.push(
				`${style(RoundedBoxChars.vertical, Colors256.fg(headerColor))}  ${rewardsTitle}${rewardsTitlePadding}  ${style(RoundedBoxChars.vertical, Colors256.fg(headerColor))}`,
			)

			for (const reward of this.rewards) {
				const rewardText = `  • ${reward}`
				const rewardPadding = " ".repeat(Math.max(0, width - stripAnsi(rewardText).length - 4))
				lines.push(
					`${style(RoundedBoxChars.vertical, Colors256.fg(headerColor))}  ${rewardText}${rewardPadding}  ${style(RoundedBoxChars.vertical, Colors256.fg(headerColor))}`,
				)
			}
		}

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(width)}${RoundedBoxChars.bottomRight}`,
				Colors256.fg(headerColor),
			),
		)

		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Success animation/celebration
 */
export class SuccessAnimation {
	private frame = 0
	private readonly frames = [
		"·  ·  ·  ·  ·",
		"·  •  ·  •  ·",
		"•  ●  •  ●  •",
		"●  ◉  ●  ◉  ●",
		"◉  ★  ◉  ★  ◉",
		"★  ✨  ★  ✨  ★",
		"✨  🌟  ✨  🌟  ✨",
	]

	/**
	 * Get next frame
	 */
	nextFrame(): string {
		const frame = this.frames[this.frame % this.frames.length]
		this.frame++
		return style(frame, Colors256.fg(Colors256.presets.gold))
	}

	/**
	 * Render with message
	 */
	render(message: string): string {
		const contentWidth = getContentWidth()
		const lines: string[] = []

		lines.push("")
		lines.push(centerText(this.nextFrame(), contentWidth))
		lines.push("")
		lines.push(centerText(style(message, TerminalColors.bright, SemanticColors.complete), contentWidth))
		lines.push("")
		lines.push(centerText(this.nextFrame(), contentWidth))
		lines.push("")

		return lines.join("\n")
	}

	/**
	 * Check if animation complete
	 */
	isComplete(): boolean {
		return this.frame >= this.frames.length * 2
	}
}

/**
 * Guided tour step
 */
export class GuidedTourStep {
	constructor(
		private stepNumber: number,
		private totalSteps: number,
		private title: string,
		private instructions: string[],
		private tip?: string,
	) {}

	/**
	 * Render tour step
	 */
	render(): string {
		const lines: string[] = []
		const width = 60

		lines.push("")

		// Header
		const header = `Guided Tour - Step ${this.stepNumber}/${this.totalSteps}`
		const color = Colors256.presets.skyBlue

		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(width)}${RoundedBoxChars.topRight}`,
				Colors256.fg(color),
			),
		)

		const headerPadding = " ".repeat(Math.max(0, width - stripAnsi(header).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, Colors256.fg(color))} ${style(header, TerminalColors.bright)}${headerPadding} ${style(RoundedBoxChars.vertical, Colors256.fg(color))}`,
		)

		// Title
		lines.push(
			style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`, Colors256.fg(color)),
		)

		const titleText = `📍 ${this.title}`
		const titlePadding = " ".repeat(Math.max(0, width - stripAnsi(titleText).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, Colors256.fg(color))} ${style(titleText, TerminalColors.bright)}${titlePadding} ${style(RoundedBoxChars.vertical, Colors256.fg(color))}`,
		)

		// Instructions
		lines.push(
			style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`, Colors256.fg(color)),
		)

		for (let i = 0; i < this.instructions.length; i++) {
			const instruction = `${i + 1}. ${this.instructions[i]}`
			const instLines = wordWrap(instruction, width - 4)
			for (const line of instLines) {
				const padding = " ".repeat(Math.max(0, width - stripAnsi(line).length - 4))
				lines.push(
					`${style(RoundedBoxChars.vertical, Colors256.fg(color))}  ${line}${padding}  ${style(RoundedBoxChars.vertical, Colors256.fg(color))}`,
				)
			}
		}

		// Tip
		if (this.tip) {
			lines.push(
				style(
					`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`,
					Colors256.fg(color),
				),
			)

			const tipText = `💡 ${this.tip}`
			const tipLines = wordWrap(tipText, width - 4)
			for (const line of tipLines) {
				const padding = " ".repeat(Math.max(0, width - stripAnsi(line).length - 4))
				lines.push(
					`${style(RoundedBoxChars.vertical, Colors256.fg(color))}  ${style(line, TerminalColors.dim)}${padding}  ${style(RoundedBoxChars.vertical, Colors256.fg(color))}`,
				)
			}
		}

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(width)}${RoundedBoxChars.bottomRight}`,
				Colors256.fg(color),
			),
		)

		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Welcome message with getting started guide
 */
export class WelcomeMessage {
	constructor(
		private appName: string,
		private version: string,
		private quickActions: Array<{
			command: string
			description: string
		}>,
	) {}

	/**
	 * Render welcome message
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()
		const width = Math.min(70, contentWidth - 4)

		lines.push("")
		lines.push("")

		// Welcome banner
		const welcome = `Welcome to ${this.appName}!`
		const welcomeGradient = gradient(welcome, Colors256.presets.skyBlue, Colors256.presets.violet)
		lines.push(centerText(welcomeGradient, contentWidth))

		lines.push("")

		const versionText = `Version ${this.version}`
		lines.push(centerText(style(versionText, TerminalColors.dim), contentWidth))

		lines.push("")
		lines.push(centerText(style(BoxChars.horizontal.repeat(40), TerminalColors.dim), contentWidth))
		lines.push("")

		// Quick start section
		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(width)}${RoundedBoxChars.topRight}`,
				SemanticColors.info,
			),
		)

		const header = "🚀 Quick Start"
		const headerPadding = " ".repeat(Math.max(0, width - stripAnsi(header).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${style(header, TerminalColors.bright)}${headerPadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
		)

		lines.push(
			style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`, SemanticColors.info),
		)

		// Quick actions
		for (const action of this.quickActions) {
			const commandText = style(action.command, SemanticColors.highlight)
			const descText = style(` - ${action.description}`, TerminalColors.dim)
			const line = `  ${commandText}${descText}`
			const padding = " ".repeat(Math.max(0, width - stripAnsi(line).length - 2))
			lines.push(
				`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${line}${padding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
			)
		}

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(width)}${RoundedBoxChars.bottomRight}`,
				SemanticColors.info,
			),
		)

		lines.push("")
		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Helper function to word wrap text
 */
function wordWrap(text: string, width: number): string[] {
	const lines: string[] = []
	const words = text.split(" ")
	let currentLine = ""

	for (const word of words) {
		const testLine = currentLine ? `${currentLine} ${word}` : word
		if (stripAnsi(testLine).length <= width) {
			currentLine = testLine
		} else {
			if (currentLine) {
				lines.push(currentLine)
			}
			currentLine = word
		}
	}

	if (currentLine) {
		lines.push(currentLine)
	}

	return lines
}
