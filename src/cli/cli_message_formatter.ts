/**
 * CLI Message Formatter - Enhanced terminal output with visual styling
 *
 * Inspired by webview-ui ThinkingBlock component improvements:
 * - Visual hierarchy with colors and borders
 * - Enhanced thinking block presentation
 * - Progressive disclosure patterns
 * - Better task state visualization
 */

/**
 * Terminal color codes (ANSI escape sequences)
 */
export const TerminalColors = {
	// Basic colors
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",

	// Foreground colors
	black: "\x1b[30m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	gray: "\x1b[90m",

	// Background colors
	bgBlack: "\x1b[40m",
	bgRed: "\x1b[41m",
	bgGreen: "\x1b[42m",
	bgYellow: "\x1b[43m",
	bgBlue: "\x1b[44m",
	bgMagenta: "\x1b[45m",
	bgCyan: "\x1b[46m",
	bgWhite: "\x1b[47m",
} as const

/**
 * Box drawing characters for terminal UI
 */
export const BoxChars = {
	// Single line
	topLeft: "┌",
	topRight: "┐",
	bottomLeft: "└",
	bottomRight: "┘",
	horizontal: "─",
	vertical: "│",
	verticalRight: "├",
	verticalLeft: "┤",
	horizontalDown: "┬",
	horizontalUp: "┴",
	cross: "┼",

	// Double line
	doubleTopLeft: "╔",
	doubleTopRight: "╗",
	doubleBottomLeft: "╚",
	doubleBottomRight: "╝",
	doubleHorizontal: "═",
	doubleVertical: "║",

	// Heavy line
	heavyHorizontal: "━",
	heavyVertical: "┃",

	// Misc
	bulletPoint: "•",
	rightArrow: "→",
	leftArrow: "←",
	upArrow: "↑",
	downArrow: "↓",
	checkMark: "✓",
	crossMark: "✗",
	spinner: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
} as const

/**
 * Format a thinking block with enhanced visual styling
 * Inspired by webview ThinkingBlock component
 */
export function formatThinkingBlock(
	text: string,
	options: {
		expanded?: boolean
		partial?: boolean
		showCopyHint?: boolean
	} = {},
): string {
	const { expanded = true, partial = false, showCopyHint = true } = options
	const lines: string[] = []

	// Top border with badge
	const statusBadge = partial ? " [STREAMING] " : " [AI THINKING] "
	const badge = `${TerminalColors.bgMagenta}${TerminalColors.white}${TerminalColors.bright}${statusBadge}${TerminalColors.reset}`

	lines.push("")
	lines.push(
		`${TerminalColors.magenta}${BoxChars.doubleTopLeft}${BoxChars.doubleHorizontal.repeat(78)}${BoxChars.doubleTopRight}${TerminalColors.reset}`,
	)

	// Header with icon and label
	const icon = "💡"
	const label = `${TerminalColors.bright}${TerminalColors.magenta}THINKING PROCESS${TerminalColors.reset}`
	const headerPadding = " ".repeat(Math.max(0, 72 - label.length - 2))
	lines.push(
		`${TerminalColors.magenta}${BoxChars.doubleVertical}${TerminalColors.reset} ${icon} ${label}${headerPadding}${badge}`,
	)

	// Separator
	lines.push(
		`${TerminalColors.magenta}${BoxChars.verticalRight}${BoxChars.horizontal.repeat(78)}${BoxChars.verticalLeft}${TerminalColors.reset}`,
	)

	if (expanded) {
		// Content with word wrap
		const contentLines = wordWrap(text, 76)
		for (const line of contentLines) {
			const padding = " ".repeat(Math.max(0, 76 - line.length))
			lines.push(
				`${TerminalColors.magenta}${BoxChars.vertical}${TerminalColors.reset} ${TerminalColors.dim}${line}${padding}${TerminalColors.reset} ${TerminalColors.magenta}${BoxChars.vertical}${TerminalColors.reset}`,
			)
		}

		// Copy hint at bottom
		if (showCopyHint && !partial) {
			lines.push(
				`${TerminalColors.magenta}${BoxChars.verticalRight}${BoxChars.horizontal.repeat(78)}${BoxChars.verticalLeft}${TerminalColors.reset}`,
			)
			const hint = `${TerminalColors.dim}💡 Tip: Content is copy-friendly - select and copy as needed${TerminalColors.reset}`
			const hintPadding = " ".repeat(Math.max(0, 76 - stripAnsi(hint).length))
			lines.push(
				`${TerminalColors.magenta}${BoxChars.vertical}${TerminalColors.reset} ${hint}${hintPadding} ${TerminalColors.magenta}${BoxChars.vertical}${TerminalColors.reset}`,
			)
		}
	} else {
		// Collapsed preview
		const preview = text.slice(0, 70) + (text.length > 70 ? "..." : "")
		const padding = " ".repeat(Math.max(0, 76 - preview.length))
		lines.push(
			`${TerminalColors.magenta}${BoxChars.vertical}${TerminalColors.reset} ${TerminalColors.dim}${preview}${padding}${TerminalColors.reset} ${TerminalColors.magenta}${BoxChars.vertical}${TerminalColors.reset}`,
		)

		// Expand hint
		const expandHint = `${TerminalColors.dim}[Collapsed - ${text.length} chars total]${TerminalColors.reset}`
		const expandPadding = " ".repeat(Math.max(0, 76 - stripAnsi(expandHint).length))
		lines.push(
			`${TerminalColors.magenta}${BoxChars.vertical}${TerminalColors.reset} ${expandHint}${expandPadding} ${TerminalColors.magenta}${BoxChars.vertical}${TerminalColors.reset}`,
		)
	}

	// Bottom border
	lines.push(
		`${TerminalColors.magenta}${BoxChars.doubleBottomLeft}${BoxChars.doubleHorizontal.repeat(78)}${BoxChars.doubleBottomRight}${TerminalColors.reset}`,
	)
	lines.push("")

	return lines.join("\n")
}

/**
 * Format a task progress indicator
 */
export function formatTaskProgress(current: number, total: number, label: string = "Progress"): string {
	const percentage = Math.round((current / total) * 100)
	const barWidth = 40
	const filledWidth = Math.round((current / total) * barWidth)
	const emptyWidth = barWidth - filledWidth

	const filled = BoxChars.heavyHorizontal.repeat(filledWidth)
	const empty = BoxChars.horizontal.repeat(emptyWidth)

	const bar = `${TerminalColors.green}${filled}${TerminalColors.reset}${TerminalColors.dim}${empty}${TerminalColors.reset}`
	const stats = `${TerminalColors.bright}${current}/${total}${TerminalColors.reset} ${TerminalColors.dim}(${percentage}%)${TerminalColors.reset}`

	return `\n${label}: [${bar}] ${stats}\n`
}

/**
 * Format a message box with colored border
 */
export function formatMessageBox(
	title: string,
	content: string,
	options: {
		color?: string
		icon?: string
		type?: "info" | "success" | "warning" | "error"
	} = {},
): string {
	const { icon, type = "info" } = options

	// Determine color based on type
	let color: string = options.color || TerminalColors.cyan
	let defaultIcon = "ℹ️"

	switch (type) {
		case "success":
			color = TerminalColors.green
			defaultIcon = "✅"
			break
		case "warning":
			color = TerminalColors.yellow
			defaultIcon = "⚠️"
			break
		case "error":
			color = TerminalColors.red
			defaultIcon = "❌"
			break
	}

	const actualIcon = icon || defaultIcon
	const lines: string[] = []

	lines.push("")
	lines.push(`${color}${BoxChars.topLeft}${BoxChars.horizontal.repeat(78)}${BoxChars.topRight}${TerminalColors.reset}`)

	// Title
	const titleText = `${actualIcon} ${title}`
	const titlePadding = " ".repeat(Math.max(0, 76 - titleText.length))
	lines.push(
		`${color}${BoxChars.vertical}${TerminalColors.reset} ${TerminalColors.bright}${titleText}${titlePadding}${TerminalColors.reset} ${color}${BoxChars.vertical}${TerminalColors.reset}`,
	)

	if (content) {
		lines.push(
			`${color}${BoxChars.verticalRight}${BoxChars.horizontal.repeat(78)}${BoxChars.verticalLeft}${TerminalColors.reset}`,
		)

		// Content with word wrap
		const contentLines = wordWrap(content, 76)
		for (const line of contentLines) {
			const padding = " ".repeat(Math.max(0, 76 - line.length))
			lines.push(
				`${color}${BoxChars.vertical}${TerminalColors.reset} ${line}${padding} ${color}${BoxChars.vertical}${TerminalColors.reset}`,
			)
		}
	}

	lines.push(`${color}${BoxChars.bottomLeft}${BoxChars.horizontal.repeat(78)}${BoxChars.bottomRight}${TerminalColors.reset}`)
	lines.push("")

	return lines.join("\n")
}

/**
 * Format a focus chain display with better visual hierarchy
 */
export function formatFocusChain(chain: {
	title: string
	steps: Array<{
		description: string
		status: "pending" | "in_progress" | "completed" | "skipped" | "failed"
		result?: string
		duration?: number
	}>
	currentStepIndex: number
}): string {
	const lines: string[] = []

	// Header
	lines.push("")
	lines.push(
		`${TerminalColors.cyan}${BoxChars.doubleTopLeft}${BoxChars.doubleHorizontal.repeat(78)}${BoxChars.doubleTopRight}${TerminalColors.reset}`,
	)
	const titleText = `📋 FOCUS CHAIN: ${chain.title}`
	const titlePadding = " ".repeat(Math.max(0, 76 - titleText.length))
	lines.push(
		`${TerminalColors.cyan}${BoxChars.doubleVertical}${TerminalColors.reset} ${TerminalColors.bright}${titleText}${titlePadding}${TerminalColors.reset} ${TerminalColors.cyan}${BoxChars.doubleVertical}${TerminalColors.reset}`,
	)
	lines.push(
		`${TerminalColors.cyan}${BoxChars.verticalRight}${BoxChars.horizontal.repeat(78)}${BoxChars.verticalLeft}${TerminalColors.reset}`,
	)

	// Steps
	for (let i = 0; i < chain.steps.length; i++) {
		const step = chain.steps[i]
		const isCurrent = i === chain.currentStepIndex

		let icon = "⬜"
		let statusColor: string = TerminalColors.gray
		let statusText = "PENDING"

		switch (step.status) {
			case "completed":
				icon = "✅"
				statusColor = TerminalColors.green
				statusText = "DONE"
				break
			case "in_progress":
				icon = "🔄"
				statusColor = TerminalColors.yellow
				statusText = "IN PROGRESS"
				break
			case "skipped":
				icon = "⏭️"
				statusColor = TerminalColors.dim
				statusText = "SKIPPED"
				break
			case "failed":
				icon = "❌"
				statusColor = TerminalColors.red
				statusText = "FAILED"
				break
		}

		const currentMarker = isCurrent ? ` ${TerminalColors.bright}${TerminalColors.yellow}◄${TerminalColors.reset}` : ""
		const stepNum = `Step ${i + 1}`
		const stepText = `${icon} ${TerminalColors.bright}${stepNum}:${TerminalColors.reset} ${step.description} ${statusColor}[${statusText}]${TerminalColors.reset}${currentMarker}`
		const padding = " ".repeat(Math.max(0, 76 - stripAnsi(stepText).length))

		lines.push(
			`${TerminalColors.cyan}${BoxChars.vertical}${TerminalColors.reset} ${stepText}${padding} ${TerminalColors.cyan}${BoxChars.vertical}${TerminalColors.reset}`,
		)

		// Result
		if (step.result && (step.status === "completed" || step.status === "skipped" || step.status === "failed")) {
			const resultText = `  ${BoxChars.verticalRight}${BoxChars.horizontal} ${TerminalColors.dim}${step.result}${TerminalColors.reset}`
			const resultPadding = " ".repeat(Math.max(0, 76 - stripAnsi(resultText).length))
			lines.push(
				`${TerminalColors.cyan}${BoxChars.vertical}${TerminalColors.reset} ${resultText}${resultPadding} ${TerminalColors.cyan}${BoxChars.vertical}${TerminalColors.reset}`,
			)
		}

		// Duration
		if (step.duration !== undefined) {
			const durationText = `  ${BoxChars.verticalRight}${BoxChars.horizontal} ${TerminalColors.dim}Duration: ${step.duration}s${TerminalColors.reset}`
			const durationPadding = " ".repeat(Math.max(0, 76 - stripAnsi(durationText).length))
			lines.push(
				`${TerminalColors.cyan}${BoxChars.vertical}${TerminalColors.reset} ${durationText}${durationPadding} ${TerminalColors.cyan}${BoxChars.vertical}${TerminalColors.reset}`,
			)
		}
	}

	// Progress summary
	lines.push(
		`${TerminalColors.cyan}${BoxChars.verticalRight}${BoxChars.horizontal.repeat(78)}${BoxChars.verticalLeft}${TerminalColors.reset}`,
	)
	const completedCount = chain.steps.filter((s) => s.status === "completed").length
	const progress = Math.round((completedCount / chain.steps.length) * 100)
	const progressText = `Progress: ${TerminalColors.bright}${completedCount}/${chain.steps.length}${TerminalColors.reset} steps ${TerminalColors.dim}(${progress}%)${TerminalColors.reset}`
	const progressPadding = " ".repeat(Math.max(0, 76 - stripAnsi(progressText).length))
	lines.push(
		`${TerminalColors.cyan}${BoxChars.doubleVertical}${TerminalColors.reset} ${progressText}${progressPadding} ${TerminalColors.cyan}${BoxChars.doubleVertical}${TerminalColors.reset}`,
	)

	// Footer
	lines.push(
		`${TerminalColors.cyan}${BoxChars.doubleBottomLeft}${BoxChars.doubleHorizontal.repeat(78)}${BoxChars.doubleBottomRight}${TerminalColors.reset}`,
	)
	lines.push("")

	return lines.join("\n")
}

/**
 * Format streaming text indicator
 */
export function formatStreamingIndicator(text: string = "Streaming"): string {
	const spinner = BoxChars.spinner[Date.now() % BoxChars.spinner.length]
	return `${TerminalColors.cyan}${spinner}${TerminalColors.reset} ${TerminalColors.dim}${text}...${TerminalColors.reset}`
}

/**
 * Wrap text to specified width
 */
function wordWrap(text: string, width: number): string[] {
	const lines: string[] = []
	const paragraphs = text.split("\n")

	for (const paragraph of paragraphs) {
		if (paragraph.length <= width) {
			lines.push(paragraph)
			continue
		}

		const words = paragraph.split(" ")
		let currentLine = ""

		for (const word of words) {
			if ((currentLine + " " + word).trim().length <= width) {
				currentLine = (currentLine + " " + word).trim()
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
	}

	return lines
}

/**
 * Strip ANSI color codes from string for length calculation
 */
function stripAnsi(str: string): string {
	// eslint-disable-next-line no-control-regex
	return str.replace(/\x1b\[[0-9;]*m/g, "")
}

/**
 * Create a horizontal separator line
 */
export function formatSeparator(char: string = BoxChars.horizontal, color: string = TerminalColors.gray): string {
	return `${color}${char.repeat(80)}${TerminalColors.reset}`
}

/**
 * Format command execution display
 */
export function formatCommandExecution(command: string, status: "pending" | "running" | "success" | "error" = "pending"): string {
	let icon = "⚡"
	let color: string = TerminalColors.cyan
	let statusText = "EXECUTING"

	switch (status) {
		case "running":
			icon = "🔄"
			color = TerminalColors.yellow
			statusText = "RUNNING"
			break
		case "success":
			icon = "✅"
			color = TerminalColors.green
			statusText = "COMPLETED"
			break
		case "error":
			icon = "❌"
			color = TerminalColors.red
			statusText = "FAILED"
			break
	}

	const lines: string[] = []
	lines.push("")
	lines.push(`${color}${BoxChars.topLeft}${BoxChars.horizontal.repeat(78)}${BoxChars.topRight}${TerminalColors.reset}`)

	const title = `${icon} COMMAND ${statusText}`
	const titlePadding = " ".repeat(Math.max(0, 76 - title.length))
	lines.push(
		`${color}${BoxChars.vertical}${TerminalColors.reset} ${TerminalColors.bright}${title}${titlePadding}${TerminalColors.reset} ${color}${BoxChars.vertical}${TerminalColors.reset}`,
	)

	lines.push(
		`${color}${BoxChars.verticalRight}${BoxChars.horizontal.repeat(78)}${BoxChars.verticalLeft}${TerminalColors.reset}`,
	)

	const cmdLines = wordWrap(command, 76)
	for (const line of cmdLines) {
		const padding = " ".repeat(Math.max(0, 76 - line.length))
		lines.push(
			`${color}${BoxChars.vertical}${TerminalColors.reset} ${TerminalColors.cyan}${line}${padding}${TerminalColors.reset} ${color}${BoxChars.vertical}${TerminalColors.reset}`,
		)
	}

	lines.push(`${color}${BoxChars.bottomLeft}${BoxChars.horizontal.repeat(78)}${BoxChars.bottomRight}${TerminalColors.reset}`)
	lines.push("")

	return lines.join("\n")
}
