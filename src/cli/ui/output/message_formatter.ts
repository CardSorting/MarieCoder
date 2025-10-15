/**
 * CLI Message Formatter - Enhanced terminal output with visual styling
 *
 * Inspired by webview-ui ThinkingBlock component improvements:
 * - Responsive width based on terminal size
 * - Visual hierarchy with colors and borders
 * - Enhanced thinking block presentation
 * - Progressive disclosure patterns
 * - Better task state visualization
 * - Improved typography and spacing
 */

import {
	BoxChars,
	centerText,
	SemanticColors,
	stripAnsi,
	style,
	TerminalCapabilities,
	TerminalColors,
	truncate,
} from "./terminal_colors"

/**
 * Get responsive content width based on terminal size
 * Leaves margin on both sides for better readability
 */
function getContentWidth(): number {
	const termWidth = TerminalCapabilities.getWidth()
	const minWidth = 60
	const maxWidth = 120
	const margin = 4

	// Use 90% of terminal width, with margins
	const calculatedWidth = Math.min(maxWidth, Math.max(minWidth, termWidth - margin))
	return calculatedWidth
}

/**
 * Format a thinking block with enhanced visual styling
 * Now responsive to terminal width with improved visual hierarchy
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

	const contentWidth = getContentWidth()
	const borderWidth = contentWidth - 2

	// Top border with enhanced visual hierarchy
	const statusBadge = partial ? " STREAMING " : " THINKING "
	const badgeColor = partial ? TerminalColors.bgBrightYellow : TerminalColors.bgMagenta
	const badge = style(statusBadge, badgeColor, TerminalColors.black, TerminalColors.bright)

	lines.push("") // Breathing room
	lines.push(
		style(
			`${BoxChars.doubleTopLeft}${BoxChars.doubleHorizontal.repeat(borderWidth)}${BoxChars.doubleTopRight}`,
			SemanticColors.thinking,
		),
	)

	// Header with icon and label - centered for emphasis
	const icon = "💭"
	const label = partial ? "AI Processing" : "AI Thought Process"
	const headerContent = `${icon}  ${label}`
	const centeredHeader = centerText(
		style(headerContent, TerminalColors.bright, SemanticColors.thinking),
		borderWidth - badge.length - 4,
	)

	lines.push(
		`${style(BoxChars.doubleVertical, SemanticColors.thinking)} ${centeredHeader} ${badge} ${style(BoxChars.doubleVertical, SemanticColors.thinking)}`,
	)

	// Separator with subtle style
	lines.push(
		style(
			`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`,
			SemanticColors.thinking,
		),
	)

	if (expanded) {
		// Content with word wrap and improved spacing
		const contentLines = wordWrap(text, borderWidth - 2)
		for (const line of contentLines) {
			const padding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(line).length))
			lines.push(
				`${style(BoxChars.vertical, SemanticColors.thinking)} ${style(line, TerminalColors.dim)}${padding} ${style(BoxChars.vertical, SemanticColors.thinking)}`,
			)
		}

		// Add spacing before footer
		if (contentLines.length > 0) {
			const emptyLine = " ".repeat(borderWidth - 2)
			lines.push(
				`${style(BoxChars.vertical, SemanticColors.thinking)} ${emptyLine} ${style(BoxChars.vertical, SemanticColors.thinking)}`,
			)
		}

		// Copy hint at bottom (only when complete)
		if (showCopyHint && !partial) {
			lines.push(
				style(
					`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`,
					SemanticColors.thinking,
				),
			)
			const hint = "💡 Tip: Select and copy text as needed"
			const hintStyled = style(hint, TerminalColors.dim)
			const hintPadding = " ".repeat(Math.max(0, borderWidth - 2 - hint.length))
			lines.push(
				`${style(BoxChars.vertical, SemanticColors.thinking)} ${hintStyled}${hintPadding} ${style(BoxChars.vertical, SemanticColors.thinking)}`,
			)
		}
	} else {
		// Collapsed preview with clear indication
		const previewWidth = borderWidth - 4
		const preview = truncate(text, previewWidth, "end")
		const padding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(preview).length))
		lines.push(
			`${style(BoxChars.vertical, SemanticColors.thinking)} ${style(preview, TerminalColors.dim)}${padding} ${style(BoxChars.vertical, SemanticColors.thinking)}`,
		)

		// Expand hint with metadata
		const wordCount = text.split(/\s+/).length
		const expandHint = `[Collapsed - ${text.length} chars, ~${wordCount} words]`
		const expandPadding = " ".repeat(Math.max(0, borderWidth - 2 - expandHint.length))
		lines.push(
			`${style(BoxChars.vertical, SemanticColors.thinking)} ${style(expandHint, SemanticColors.metadata)}${expandPadding} ${style(BoxChars.vertical, SemanticColors.thinking)}`,
		)
	}

	// Bottom border
	lines.push(
		style(
			`${BoxChars.doubleBottomLeft}${BoxChars.doubleHorizontal.repeat(borderWidth)}${BoxChars.doubleBottomRight}`,
			SemanticColors.thinking,
		),
	)
	lines.push("") // Breathing room

	return lines.join("\n")
}

/**
 * Format a task progress indicator with improved visual design
 */
export function formatTaskProgress(current: number, total: number, label: string = "Progress"): string {
	const percentage = Math.round((current / total) * 100)
	const contentWidth = getContentWidth()
	const statsText = `${current}/${total} (${percentage}%)`
	const barWidth = Math.max(20, contentWidth - label.length - statsText.length - 6)

	const filledWidth = Math.round((current / total) * barWidth)
	const emptyWidth = barWidth - filledWidth

	// Use different colors based on progress
	let barColor: string = SemanticColors.progress
	if (percentage === 100) {
		barColor = SemanticColors.complete
	} else if (percentage < 25) {
		barColor = SemanticColors.pending
	}

	const filled = BoxChars.heavyHorizontal.repeat(filledWidth)
	const empty = BoxChars.horizontal.repeat(emptyWidth)

	const bar = `${barColor}${filled}${TerminalColors.reset}${style(empty, TerminalColors.dim)}`
	const stats = `${style(statsText, TerminalColors.bright)}`

	return `\n${style(label, TerminalColors.bright)}: [${bar}] ${stats}\n`
}

/**
 * Format a message box with colored border and improved hierarchy
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

	// Determine color and icon based on type with improved semantic colors
	let color: string = options.color || SemanticColors.info
	let defaultIcon = "ℹ️"

	switch (type) {
		case "success":
			color = SemanticColors.success
			defaultIcon = "✅"
			break
		case "warning":
			color = SemanticColors.warning
			defaultIcon = "⚠️"
			break
		case "error":
			color = SemanticColors.error
			defaultIcon = "❌"
			break
	}

	const actualIcon = icon || defaultIcon
	const lines: string[] = []

	const contentWidth = getContentWidth()
	const borderWidth = contentWidth - 2

	lines.push("") // Breathing room
	lines.push(style(`${BoxChars.topLeft}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.topRight}`, color))

	// Title with improved typography
	const titleText = `${actualIcon}  ${title}`
	const titlePadding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(titleText).length))
	lines.push(
		`${style(BoxChars.vertical, color)} ${style(titleText, TerminalColors.bright)}${titlePadding} ${style(BoxChars.vertical, color)}`,
	)

	if (content) {
		lines.push(style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, color))

		// Content with word wrap and improved readability
		const contentLines = wordWrap(content, borderWidth - 2)
		for (const line of contentLines) {
			const padding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(line).length))
			lines.push(`${style(BoxChars.vertical, color)} ${line}${padding} ${style(BoxChars.vertical, color)}`)
		}
	}

	lines.push(style(`${BoxChars.bottomLeft}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.bottomRight}`, color))
	lines.push("") // Breathing room

	return lines.join("\n")
}

/**
 * Format a focus chain display with improved visual hierarchy and responsive design
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

	const contentWidth = getContentWidth()
	const borderWidth = contentWidth - 2

	// Header with enhanced styling
	lines.push("") // Breathing room
	lines.push(
		style(
			`${BoxChars.doubleTopLeft}${BoxChars.doubleHorizontal.repeat(borderWidth)}${BoxChars.doubleTopRight}`,
			SemanticColors.info,
		),
	)
	const titleText = `📋  ${chain.title.toUpperCase()}`
	const titlePadding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(titleText).length))
	lines.push(
		`${style(BoxChars.doubleVertical, SemanticColors.info)} ${style(titleText, TerminalColors.bright, SemanticColors.header)}${titlePadding} ${style(BoxChars.doubleVertical, SemanticColors.info)}`,
	)
	lines.push(
		style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, SemanticColors.info),
	)

	// Steps with improved visual indicators
	for (let i = 0; i < chain.steps.length; i++) {
		const step = chain.steps[i]
		const isCurrent = i === chain.currentStepIndex

		let icon = "○"
		let statusColor: string = SemanticColors.pending
		let statusText = "PENDING"

		switch (step.status) {
			case "completed":
				icon = "●"
				statusColor = SemanticColors.complete
				statusText = "DONE"
				break
			case "in_progress":
				icon = "◐"
				statusColor = SemanticColors.progress
				statusText = "IN PROGRESS"
				break
			case "skipped":
				icon = "⊝"
				statusColor = SemanticColors.metadata
				statusText = "SKIPPED"
				break
			case "failed":
				icon = "✗"
				statusColor = SemanticColors.error
				statusText = "FAILED"
				break
		}

		const currentMarker = isCurrent ? ` ${style("◀", TerminalColors.bright, SemanticColors.highlight)}` : ""
		const stepNum = `Step ${i + 1}`
		const stepText = `${icon} ${style(stepNum, TerminalColors.bright)}: ${step.description} ${style(`[${statusText}]`, statusColor)}${currentMarker}`
		const padding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(stepText).length))

		lines.push(
			`${style(BoxChars.vertical, SemanticColors.info)} ${stepText}${padding} ${style(BoxChars.vertical, SemanticColors.info)}`,
		)

		// Result with indentation for hierarchy
		if (step.result && (step.status === "completed" || step.status === "skipped" || step.status === "failed")) {
			const resultText = `   ${BoxChars.rightArrow} ${step.result}`
			const resultStyled = style(resultText, TerminalColors.dim)
			const resultPadding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(resultText).length))
			lines.push(
				`${style(BoxChars.vertical, SemanticColors.info)} ${resultStyled}${resultPadding} ${style(BoxChars.vertical, SemanticColors.info)}`,
			)
		}

		// Duration with subtle styling
		if (step.duration !== undefined) {
			const durationText = `   ⏱  ${step.duration.toFixed(2)}s`
			const durationStyled = style(durationText, SemanticColors.metadata)
			const durationPadding = " ".repeat(Math.max(0, borderWidth - 2 - durationText.length))
			lines.push(
				`${style(BoxChars.vertical, SemanticColors.info)} ${durationStyled}${durationPadding} ${style(BoxChars.vertical, SemanticColors.info)}`,
			)
		}
	}

	// Progress summary with visual bar
	lines.push(
		style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, SemanticColors.info),
	)
	const completedCount = chain.steps.filter((s) => s.status === "completed").length
	const progress = Math.round((completedCount / chain.steps.length) * 100)
	const progressText = `Progress: ${style(`${completedCount}/${chain.steps.length}`, TerminalColors.bright)} steps ${style(`(${progress}%)`, SemanticColors.metadata)}`
	const progressPadding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(progressText).length))
	lines.push(
		`${style(BoxChars.doubleVertical, SemanticColors.info)} ${progressText}${progressPadding} ${style(BoxChars.doubleVertical, SemanticColors.info)}`,
	)

	// Footer
	lines.push(
		style(
			`${BoxChars.doubleBottomLeft}${BoxChars.doubleHorizontal.repeat(borderWidth)}${BoxChars.doubleBottomRight}`,
			SemanticColors.info,
		),
	)
	lines.push("") // Breathing room

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
 * Properly handles ANSI escape codes by stripping them for length calculation
 */
function wordWrap(text: string, width: number): string[] {
	const lines: string[] = []
	const paragraphs = text.split("\n")

	for (const paragraph of paragraphs) {
		// Check visual length (without ANSI codes) not actual string length
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
				// If a single word is too long, we still need to add it
				const wordVisualLength = stripAnsi(word).length
				if (wordVisualLength > width) {
					// Split long word
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

/**
 * Create a horizontal separator line with responsive width
 */
export function formatSeparator(char: string = BoxChars.horizontal, color: string = TerminalColors.gray): string {
	const contentWidth = getContentWidth()
	return `${color}${char.repeat(contentWidth)}${TerminalColors.reset}`
}

/**
 * Format command execution display with improved status visualization
 */
export function formatCommandExecution(command: string, status: "pending" | "running" | "success" | "error" = "pending"): string {
	let icon = "⚡"
	let color: string = SemanticColors.command
	let statusText = "READY"

	switch (status) {
		case "running":
			icon = "▶"
			color = SemanticColors.progress
			statusText = "RUNNING"
			break
		case "success":
			icon = "✓"
			color = SemanticColors.complete
			statusText = "COMPLETED"
			break
		case "error":
			icon = "✗"
			color = SemanticColors.error
			statusText = "FAILED"
			break
	}

	const lines: string[] = []
	const contentWidth = getContentWidth()
	const borderWidth = contentWidth - 2

	lines.push("") // Breathing room
	lines.push(style(`${BoxChars.topLeft}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.topRight}`, color))

	const title = `${icon}  COMMAND  ${statusText}`
	const titlePadding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(title).length))
	lines.push(
		`${style(BoxChars.vertical, color)} ${style(title, TerminalColors.bright)}${titlePadding} ${style(BoxChars.vertical, color)}`,
	)

	lines.push(style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, color))

	const cmdLines = wordWrap(command, borderWidth - 2)
	for (const line of cmdLines) {
		const padding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(line).length))
		lines.push(
			`${style(BoxChars.vertical, color)} ${style(line, SemanticColors.code)}${padding} ${style(BoxChars.vertical, color)}`,
		)
	}

	lines.push(style(`${BoxChars.bottomLeft}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.bottomRight}`, color))
	lines.push("") // Breathing room

	return lines.join("\n")
}

/**
 * Format a code block with syntax highlighting hints
 */
export function formatCodeBlock(code: string, language?: string): string {
	const lines: string[] = []
	const contentWidth = getContentWidth()
	const borderWidth = contentWidth - 2

	// Header with language badge
	const langBadge = language ? ` ${language.toUpperCase()} ` : " CODE "
	const badge = style(langBadge, TerminalColors.bgGray, TerminalColors.white, TerminalColors.bright)

	lines.push("") // Breathing room
	lines.push(style(`${BoxChars.topLeft}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.topRight}`, SemanticColors.code))

	const title = `${badge}`
	const titlePadding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(title).length))
	lines.push(
		`${style(BoxChars.vertical, SemanticColors.code)} ${title}${titlePadding} ${style(BoxChars.vertical, SemanticColors.code)}`,
	)

	lines.push(
		style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, SemanticColors.code),
	)

	// Code content with monospace appearance
	const codeLines = code.split("\n")
	for (const line of codeLines) {
		const displayLine = truncate(line, borderWidth - 4, "end")
		const padding = " ".repeat(Math.max(0, borderWidth - 4 - stripAnsi(displayLine).length))
		lines.push(
			`${style(BoxChars.vertical, SemanticColors.code)}  ${style(displayLine, TerminalColors.brightCyan)}${padding}  ${style(BoxChars.vertical, SemanticColors.code)}`,
		)
	}

	lines.push(
		style(`${BoxChars.bottomLeft}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.bottomRight}`, SemanticColors.code),
	)
	lines.push("") // Breathing room

	return lines.join("\n")
}

/**
 * Format a file path with visual distinction
 */
export function formatFilePath(path: string, status?: "created" | "modified" | "deleted" | "unchanged"): string {
	let icon = "📄"
	let color: string = SemanticColors.path

	if (status) {
		switch (status) {
			case "created":
				icon = "+"
				color = SemanticColors.complete
				break
			case "modified":
				icon = "~"
				color = SemanticColors.progress
				break
			case "deleted":
				icon = "-"
				color = SemanticColors.error
				break
			case "unchanged":
				icon = "="
				color = SemanticColors.metadata
				break
		}
	}

	return `${icon} ${style(path, color)}`
}

/**
 * Format a list of items with proper indentation
 */
export function formatList(
	items: string[],
	options: {
		ordered?: boolean
		bulletChar?: string
		indent?: number
	} = {},
): string {
	const { ordered = false, bulletChar = "•", indent = 2 } = options
	const lines: string[] = []

	items.forEach((item, index) => {
		const prefix = ordered ? `${index + 1}.` : bulletChar
		const indentation = " ".repeat(indent)
		lines.push(`${indentation}${style(prefix, SemanticColors.info)} ${item}`)
	})

	return lines.join("\n")
}

/**
 * Format a simple table with columns
 */
export function formatTable(
	headers: string[],
	rows: string[][],
	_options: {
		align?: ("left" | "right" | "center")[]
	} = {},
): string {
	const lines: string[] = []
	const contentWidth = getContentWidth()

	// Calculate column widths
	const numCols = headers.length
	const colWidths: number[] = []

	for (let i = 0; i < numCols; i++) {
		let maxWidth = stripAnsi(headers[i]).length
		for (const row of rows) {
			if (row[i]) {
				maxWidth = Math.max(maxWidth, stripAnsi(row[i]).length)
			}
		}
		colWidths.push(maxWidth)
	}

	// Adjust column widths to fit terminal
	const totalWidth = colWidths.reduce((sum, w) => sum + w, 0) + (numCols - 1) * 3 + 4
	if (totalWidth > contentWidth) {
		const ratio = (contentWidth - (numCols - 1) * 3 - 4) / totalWidth
		colWidths.forEach((w, i) => {
			colWidths[i] = Math.max(8, Math.floor(w * ratio))
		})
	}

	const borderWidth = colWidths.reduce((sum, w) => sum + w, 0) + (numCols - 1) * 3 + 2

	// Top border
	lines.push("")
	lines.push(style(`${BoxChars.topLeft}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.topRight}`, SemanticColors.info))

	// Headers
	const headerCells: string[] = []
	headers.forEach((header, i) => {
		const truncated = truncate(header, colWidths[i], "end")
		const padded = truncated + " ".repeat(Math.max(0, colWidths[i] - stripAnsi(truncated).length))
		headerCells.push(style(padded, TerminalColors.bright))
	})
	lines.push(
		`${style(BoxChars.vertical, SemanticColors.info)} ${headerCells.join(" │ ")} ${style(BoxChars.vertical, SemanticColors.info)}`,
	)

	// Separator
	lines.push(
		style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, SemanticColors.info),
	)

	// Rows
	for (const row of rows) {
		const rowCells: string[] = []
		row.forEach((cell, i) => {
			const truncated = truncate(cell || "", colWidths[i], "end")
			const padded = truncated + " ".repeat(Math.max(0, colWidths[i] - stripAnsi(truncated).length))
			rowCells.push(padded)
		})
		lines.push(
			`${style(BoxChars.vertical, SemanticColors.info)} ${rowCells.join(" │ ")} ${style(BoxChars.vertical, SemanticColors.info)}`,
		)
	}

	// Bottom border
	lines.push(
		style(`${BoxChars.bottomLeft}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.bottomRight}`, SemanticColors.info),
	)
	lines.push("")

	return lines.join("\n")
}

/**
 * Format an inline badge/tag
 */
export function formatBadge(
	text: string,
	options: {
		color?: string
		background?: string
	} = {},
): string {
	const { color = TerminalColors.white, background = TerminalColors.bgBlue } = options
	return style(` ${text} `, background, color, TerminalColors.bright)
}

/**
 * Format a key-value pair
 */
export function formatKeyValue(key: string, value: string, options: { separator?: string } = {}): string {
	const { separator = ":" } = options
	return `${style(key, TerminalColors.bright)}${separator} ${value}`
}

/**
 * Format a status indicator
 */
export function formatStatus(status: "active" | "inactive" | "pending" | "success" | "error" | "warning"): string {
	let icon = "●"
	let color = SemanticColors.pending as string

	switch (status) {
		case "active":
			icon = "●"
			color = SemanticColors.complete as string
			break
		case "inactive":
			icon = "○"
			color = SemanticColors.metadata as string
			break
		case "pending":
			icon = "◐"
			color = SemanticColors.pending as string
			break
		case "success":
			icon = "✓"
			color = SemanticColors.complete as string
			break
		case "error":
			icon = "✗"
			color = SemanticColors.error as string
			break
		case "warning":
			icon = "⚠"
			color = SemanticColors.warning as string
			break
	}

	return `${style(icon, color)} ${style(status.toUpperCase(), color)}`
}

/**
 * Format a header/section title
 */
export function formatSectionHeader(title: string, icon?: string): string {
	const contentWidth = getContentWidth()
	const displayIcon = icon || "▸"
	const headerText = `${displayIcon}  ${title.toUpperCase()}`

	const lines: string[] = []
	lines.push("")
	lines.push(style(headerText, TerminalColors.bright, SemanticColors.header))
	lines.push(style(BoxChars.horizontal.repeat(contentWidth), SemanticColors.metadata))

	return lines.join("\n")
}

/**
 * Export re-used utilities
 */
export { TerminalColors, BoxChars, stripAnsi, SemanticColors, style }
