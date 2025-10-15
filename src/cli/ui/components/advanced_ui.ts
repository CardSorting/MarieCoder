/**
 * CLI Advanced UI Components
 *
 * Enhanced terminal UI components including:
 * - Notifications and alerts
 * - Tooltips and callouts
 * - Status dashboards
 * - Timeline visualizations
 * - Enhanced progress indicators
 * - Interactive menus
 *
 * @module cli_advanced_ui
 */

import {
	BoxChars,
	Colors256,
	EffectChars,
	gradient,
	leftPad,
	RoundedBoxChars,
	SemanticColors,
	stripAnsi,
	style,
	TerminalCapabilities,
	TerminalColors,
} from "../output/terminal_colors"

/**
 * Get responsive content width (shared utility)
 */
function getContentWidth(): number {
	const termWidth = TerminalCapabilities.getWidth()
	const minWidth = 60
	const maxWidth = 120
	const margin = 4
	return Math.min(maxWidth, Math.max(minWidth, termWidth - margin))
}

/**
 * Format a notification with enhanced styling
 */
export function formatNotification(
	title: string,
	message: string,
	options: {
		type?: "info" | "success" | "warning" | "error" | "tip"
		icon?: string
		dismissible?: boolean
		timestamp?: boolean
	} = {},
): string {
	const { type = "info", dismissible = false, timestamp = false } = options
	const lines: string[] = []
	const contentWidth = getContentWidth()

	// Determine styling based on type
	let borderColor = SemanticColors.info as string
	let bgColor = Colors256.bg(17) as string // Dark blue background
	let iconChar = "ℹ"

	switch (type) {
		case "success":
			borderColor = SemanticColors.complete as string
			bgColor = Colors256.bg(22) as string // Dark green background
			iconChar = "✓"
			break
		case "warning":
			borderColor = SemanticColors.warning as string
			bgColor = Colors256.bg(58) as string // Dark yellow background
			iconChar = "⚠"
			break
		case "error":
			borderColor = SemanticColors.error as string
			bgColor = Colors256.bg(52) as string // Dark red background
			iconChar = "✗"
			break
		case "tip":
			borderColor = Colors256.fg(Colors256.presets.violet) as string
			bgColor = Colors256.bg(53) as string // Dark purple background
			iconChar = "💡"
			break
		default:
			borderColor = SemanticColors.info as string
			bgColor = Colors256.bg(17) as string // Dark blue background
			iconChar = "ℹ"
			break
	}

	const icon = options.icon || iconChar
	const borderWidth = Math.min(contentWidth, 80) - 2

	// Top border with rounded corners
	lines.push("")
	lines.push(
		style(
			`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.topRight}`,
			borderColor,
		),
	)

	// Title bar with background color
	const titleText = `${icon}  ${title.toUpperCase()}`
	const dismissText = dismissible ? " [ESC to dismiss]" : ""
	const timeText = timestamp ? ` ${new Date().toLocaleTimeString()}` : ""
	const rightSide = `${dismissText}${timeText}`

	const titlePadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(titleText).length - rightSide.length - 2))

	lines.push(
		`${style(RoundedBoxChars.vertical, borderColor)}${bgColor} ${style(titleText, TerminalColors.bright)}${titlePadding}${style(rightSide, TerminalColors.dim)} ${TerminalColors.reset}${style(RoundedBoxChars.vertical, borderColor)}`,
	)

	// Separator
	lines.push(style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, borderColor))

	// Message content
	const messageLines = message.split("\n")
	for (const line of messageLines) {
		const wrappedLines = wordWrap(line, borderWidth - 4)
		for (const wrappedLine of wrappedLines) {
			const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(wrappedLine).length - 4))
			lines.push(
				`${style(RoundedBoxChars.vertical, borderColor)}  ${wrappedLine}${padding}  ${style(RoundedBoxChars.vertical, borderColor)}`,
			)
		}
	}

	// Bottom border
	lines.push(
		style(
			`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.bottomRight}`,
			borderColor,
		),
	)
	lines.push("")

	return lines.join("\n")
}

/**
 * Format a callout box (for highlighting important information)
 */
export function formatCallout(
	content: string,
	options: {
		title?: string
		variant?: "note" | "important" | "tip" | "warning" | "caution"
		icon?: string
	} = {},
): string {
	const { variant = "note" } = options
	const lines: string[] = []
	const contentWidth = getContentWidth()
	const borderWidth = Math.min(contentWidth, 80) - 2

	// Determine styling based on variant
	let color = Colors256.fg(Colors256.presets.skyBlue) as string
	let iconChar = "📝"
	let titleText = "NOTE"

	switch (variant) {
		case "important":
			color = Colors256.fg(Colors256.presets.crimson) as string
			iconChar = "❗"
			titleText = "IMPORTANT"
			break
		case "tip":
			color = Colors256.fg(Colors256.presets.violet) as string
			iconChar = "💡"
			titleText = "TIP"
			break
		case "warning":
			color = SemanticColors.warning as string
			iconChar = "⚠"
			titleText = "WARNING"
			break
		case "caution":
			color = SemanticColors.error as string
			iconChar = "⚠"
			titleText = "CAUTION"
			break
		default:
			color = Colors256.fg(Colors256.presets.skyBlue) as string
			iconChar = "📝"
			titleText = "NOTE"
			break
	}

	const icon = options.icon || iconChar
	const title = options.title || titleText

	// Vertical bar on the left
	const barChar = RoundedBoxChars.heavyVertical
	lines.push("")

	// Title
	const titleLine = `${barChar} ${icon}  ${style(title, TerminalColors.bright, color)}`
	lines.push(style(titleLine, color))

	// Content with left bar
	const contentLines = content.split("\n")
	for (const line of contentLines) {
		const wrappedLines = wordWrap(line, borderWidth - 6)
		for (const wrappedLine of wrappedLines) {
			lines.push(style(`${barChar} `, color) + `  ${wrappedLine}`)
		}
	}

	lines.push(style(barChar, color))
	lines.push("")

	return lines.join("\n")
}

/**
 * Format a tooltip (small contextual help)
 */
export function formatTooltip(text: string, anchor: string): string {
	const tooltipContent = `💬 ${text}`
	const borderWidth = Math.min(getContentWidth(), Math.max(40, stripAnsi(tooltipContent).length + 4))

	const lines: string[] = []
	lines.push(
		style(
			`  ${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(borderWidth - 2)}${RoundedBoxChars.topRight}`,
			TerminalColors.dim,
		),
	)

	const wrappedLines = wordWrap(tooltipContent, borderWidth - 4)
	for (const line of wrappedLines) {
		const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(line).length - 4))
		lines.push(style(`  ${RoundedBoxChars.vertical} ${line}${padding} ${RoundedBoxChars.vertical}`, TerminalColors.dim))
	}

	lines.push(
		style(
			`  ${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(borderWidth - 2)}${RoundedBoxChars.bottomRight}`,
			TerminalColors.dim,
		),
	)
	lines.push(`  ${style("↑", TerminalColors.dim)}`)
	lines.push(anchor)

	return lines.join("\n")
}

/**
 * Format an enhanced progress bar with percentage, ETA, and animation
 */
export function formatEnhancedProgress(
	current: number,
	total: number,
	options: {
		label?: string
		showPercentage?: boolean
		showEta?: boolean
		showSpeed?: boolean
		startTime?: number
		width?: number
	} = {},
): string {
	const { label = "Progress", showPercentage = true, showEta = true, width } = options

	const contentWidth = getContentWidth()
	const percentage = Math.min(100, Math.max(0, Math.round((current / total) * 100)))

	// Calculate bar width
	const statsText = showPercentage ? ` ${percentage}%` : ""
	const countText = ` ${current}/${total}`
	const etaText = showEta && options.startTime ? calculateEta(current, total, options.startTime) : ""
	const speedText = options.showSpeed && options.startTime ? calculateSpeed(current, options.startTime) : ""

	const rightSide = `${countText}${statsText}${etaText}${speedText}`
	const barWidth = width || Math.max(20, contentWidth - label.length - rightSide.length - 6)

	// Calculate filled portion
	const filledWidth = Math.round((current / total) * barWidth)
	const emptyWidth = barWidth - filledWidth

	// Determine color based on progress
	let barColor: number
	if (percentage === 100) {
		barColor = Colors256.presets.limeGreen
	} else if (percentage >= 75) {
		barColor = Colors256.presets.skyBlue
	} else if (percentage >= 50) {
		barColor = Colors256.presets.teal
	} else if (percentage >= 25) {
		barColor = Colors256.presets.amber
	} else {
		barColor = Colors256.presets.darkGray
	}

	// Create gradient bar
	const filled = Colors256.fg(barColor) + EffectChars.progressFull.repeat(filledWidth)
	const empty = TerminalColors.dim + EffectChars.progressEmpty.repeat(emptyWidth)

	const bar = `${filled}${empty}${TerminalColors.reset}`
	const labelStyled = style(label, TerminalColors.bright)

	return `${labelStyled} [${bar}]${rightSide}`
}

/**
 * Calculate ETA string
 */
function calculateEta(current: number, total: number, startTime: number): string {
	if (current === 0) {
		return ""
	}

	const elapsed = Date.now() - startTime
	const rate = current / elapsed
	const remaining = total - current
	const eta = remaining / rate

	if (!Number.isFinite(eta)) {
		return ""
	}

	const seconds = Math.round(eta / 1000)
	if (seconds < 60) {
		return ` ETA: ${seconds}s`
	}
	if (seconds < 3600) {
		return ` ETA: ${Math.round(seconds / 60)}m`
	}
	return ` ETA: ${Math.round(seconds / 3600)}h`
}

/**
 * Calculate speed string
 */
function calculateSpeed(current: number, startTime: number): string {
	if (current === 0) {
		return ""
	}

	const elapsed = Date.now() - startTime
	const rate = current / (elapsed / 1000)

	if (!Number.isFinite(rate)) {
		return ""
	}

	if (rate < 1) {
		return ` ${rate.toFixed(2)}/s`
	}
	return ` ${Math.round(rate)}/s`
}

/**
 * Format a spinner with custom animation frames
 */
export function formatSpinner(message: string, frame: number = 0): string {
	const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
	const spinner = frames[frame % frames.length]
	const spinnerStyled = style(spinner, SemanticColors.progress)
	return `${spinnerStyled} ${style(message, TerminalColors.dim)}`
}

/**
 * Format a status dashboard with multiple metrics
 */
export function formatDashboard(
	title: string,
	sections: Array<{
		label: string
		value: string | number
		status?: "good" | "warning" | "error" | "neutral"
		icon?: string
	}>,
): string {
	const lines: string[] = []
	const contentWidth = getContentWidth()
	const borderWidth = contentWidth - 2

	// Header with gradient
	lines.push("")
	const headerText = `  ${title.toUpperCase()}  `
	const headerGradient = gradient(headerText, Colors256.presets.skyBlue, Colors256.presets.violet)
	lines.push(
		style(
			`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.topRight}`,
			SemanticColors.info,
		),
	)
	const headerPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(headerText).length - 2))
	lines.push(
		`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${headerGradient}${headerPadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
	)
	lines.push(
		style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, SemanticColors.info),
	)

	// Sections in grid layout
	const maxLabelWidth = Math.max(...sections.map((s) => s.label.length))

	for (const section of sections) {
		let statusIcon = ""
		let valueColor = TerminalColors.reset as string

		if (section.status) {
			switch (section.status) {
				case "good":
					statusIcon = style("●", SemanticColors.complete as string)
					valueColor = SemanticColors.complete as string
					break
				case "warning":
					statusIcon = style("●", SemanticColors.warning as string)
					valueColor = SemanticColors.warning as string
					break
				case "error":
					statusIcon = style("●", SemanticColors.error as string)
					valueColor = SemanticColors.error as string
					break
				default:
					statusIcon = style("○", TerminalColors.dim as string)
					valueColor = TerminalColors.dim as string
					break
			}
		}

		const icon = section.icon || statusIcon
		const label = leftPad(section.label, maxLabelWidth)
		const value = String(section.value)

		const line = `${icon} ${style(label, TerminalColors.bright)}: ${style(value, valueColor)}`
		const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(line).length - 4))

		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.info)}  ${line}${padding}  ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
		)
	}

	// Footer
	lines.push(
		style(
			`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.bottomRight}`,
			SemanticColors.info,
		),
	)
	lines.push("")

	return lines.join("\n")
}

/**
 * Format a timeline visualization
 */
export function formatTimeline(
	events: Array<{
		time: string
		title: string
		description?: string
		status?: "completed" | "in_progress" | "pending" | "failed"
	}>,
	options: {
		showConnectors?: boolean
	} = {},
): string {
	const { showConnectors = true } = options
	const lines: string[] = []
	const contentWidth = getContentWidth()

	lines.push("")
	lines.push(style("TIMELINE", TerminalColors.bright, SemanticColors.header))
	lines.push(style(RoundedBoxChars.horizontal.repeat(Math.min(contentWidth, 40)), TerminalColors.dim))
	lines.push("")

	events.forEach((event, index) => {
		const isLast = index === events.length - 1

		// Determine icon based on status
		let icon = "○"
		let iconColor = TerminalColors.dim as string

		switch (event.status) {
			case "completed":
				icon = "●"
				iconColor = SemanticColors.complete as string
				break
			case "in_progress":
				icon = "◐"
				iconColor = SemanticColors.progress as string
				break
			case "pending":
				icon = "○"
				iconColor = TerminalColors.dim as string
				break
			case "failed":
				icon = "✗"
				iconColor = SemanticColors.error as string
				break
		}

		// Time and title
		const timeStyled = style(event.time, SemanticColors.metadata)
		const titleStyled = style(event.title, TerminalColors.bright)
		lines.push(`${style(icon, iconColor)} ${timeStyled} ${BoxChars.rightArrow} ${titleStyled}`)

		// Description if present
		if (event.description) {
			const connector = showConnectors && !isLast ? RoundedBoxChars.vertical : " "
			const descLines = wordWrap(event.description, contentWidth - 6)
			for (const line of descLines) {
				lines.push(`${style(connector, TerminalColors.dim)}   ${style(line, TerminalColors.dim)}`)
			}
		}

		// Connector to next event
		if (showConnectors && !isLast) {
			lines.push(`${style(RoundedBoxChars.vertical, TerminalColors.dim)}`)
		}
	})

	lines.push("")

	return lines.join("\n")
}

/**
 * Format a badge (inline label)
 */
export function formatInlineBadge(
	text: string,
	variant: "primary" | "success" | "warning" | "error" | "info" | "neutral" = "neutral",
): string {
	let bgColor: string
	let fgColor: string

	switch (variant) {
		case "primary":
			bgColor = Colors256.bg(Colors256.presets.skyBlue)
			fgColor = TerminalColors.white
			break
		case "success":
			bgColor = Colors256.bg(Colors256.presets.forestGreen)
			fgColor = TerminalColors.white
			break
		case "warning":
			bgColor = Colors256.bg(Colors256.presets.amber)
			fgColor = TerminalColors.black
			break
		case "error":
			bgColor = Colors256.bg(Colors256.presets.crimson)
			fgColor = TerminalColors.white
			break
		case "info":
			bgColor = Colors256.bg(Colors256.presets.teal)
			fgColor = TerminalColors.white
			break
		default:
			bgColor = Colors256.bg(Colors256.presets.mediumGray)
			fgColor = TerminalColors.black
			break
	}

	return `${bgColor}${fgColor}${TerminalColors.bright} ${text} ${TerminalColors.reset}`
}

/**
 * Format a menu with selectable options
 */
export function formatMenu(
	title: string,
	options: Array<{
		label: string
		description?: string
		shortcut?: string
		disabled?: boolean
	}>,
	selectedIndex: number = 0,
): string {
	const lines: string[] = []
	const contentWidth = getContentWidth()
	const borderWidth = contentWidth - 2

	// Header
	lines.push("")
	lines.push(
		style(
			`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.topRight}`,
			SemanticColors.info,
		),
	)

	const titleStyled = style(title, TerminalColors.bright)
	const titlePadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(title).length - 2))
	lines.push(
		`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${titleStyled}${titlePadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
	)

	lines.push(
		style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, SemanticColors.info),
	)

	// Options
	options.forEach((option, index) => {
		const isSelected = index === selectedIndex
		const isDisabled = option.disabled

		let prefix = "  "
		let labelColor = TerminalColors.reset as string

		if (isSelected) {
			prefix = style("▶ ", SemanticColors.highlight as string)
			labelColor = TerminalColors.bright as string
		}

		if (isDisabled) {
			labelColor = TerminalColors.dim as string
		}

		const number = style(`${index + 1}.`, SemanticColors.info)
		const shortcut = option.shortcut ? style(` [${option.shortcut}]`, SemanticColors.metadata) : ""
		const label = `${number} ${style(option.label, labelColor)}${shortcut}`

		const line = `${prefix}${label}`
		const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(line).length - 2))

		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${line}${padding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
		)

		// Description if present
		if (option.description) {
			const desc = style(`   ${option.description}`, TerminalColors.dim)
			const descPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(desc).length - 2))
			lines.push(
				`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${desc}${descPadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
			)
		}
	})

	// Footer with hint
	lines.push(
		style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, SemanticColors.info),
	)
	const hint = style("Use arrow keys to navigate, Enter to select", TerminalColors.dim)
	const hintPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(hint).length - 2))
	lines.push(
		`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${hint}${hintPadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
	)

	lines.push(
		style(
			`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.bottomRight}`,
			SemanticColors.info,
		),
	)
	lines.push("")

	return lines.join("\n")
}

/**
 * Word wrap helper
 */
function wordWrap(text: string, width: number): string[] {
	const lines: string[] = []
	const paragraphs = text.split("\n")

	for (const paragraph of paragraphs) {
		const visualLength = stripAnsi(paragraph).length
		if (visualLength <= width) {
			lines.push(paragraph)
			continue
		}

		const words = paragraph.split(" ")
		let currentLine = ""

		for (const word of words) {
			const testLine = (currentLine + " " + word).trim()
			const testVisualLength = stripAnsi(testLine).length

			if (testVisualLength <= width) {
				currentLine = testLine
			} else {
				if (currentLine) {
					lines.push(currentLine)
				}
				const wordVisualLength = stripAnsi(word).length
				if (wordVisualLength > width) {
					lines.push(word.substring(0, width))
					currentLine = word.substring(width)
				} else {
					currentLine = word
				}
			}
		}

		if (currentLine) {
			lines.push(currentLine)
		}
	}

	return lines
}
