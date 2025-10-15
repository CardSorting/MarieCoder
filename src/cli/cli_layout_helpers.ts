/**
 * CLI Layout Helpers - Advanced layout and formatting utilities
 *
 * Provides higher-level composition utilities for creating complex
 * terminal UI layouts with proper spacing, alignment, and visual hierarchy.
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
} from "./cli_terminal_colors"

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
 * Create a two-column layout
 */
export function formatTwoColumns(
	leftContent: string,
	rightContent: string,
	options: {
		leftWidth?: number
		gap?: number
		leftAlign?: "left" | "right"
		rightAlign?: "left" | "right"
	} = {},
): string {
	const contentWidth = getContentWidth()
	const gap = options.gap ?? 4
	const leftWidth = options.leftWidth ?? Math.floor(contentWidth * 0.4)
	const rightWidth = contentWidth - leftWidth - gap

	const leftLines = leftContent.split("\n")
	const rightLines = rightContent.split("\n")
	const maxLines = Math.max(leftLines.length, rightLines.length)

	const lines: string[] = []

	for (let i = 0; i < maxLines; i++) {
		const left = leftLines[i] || ""
		const right = rightLines[i] || ""

		const leftTruncated = truncate(left, leftWidth, "end")
		const rightTruncated = truncate(right, rightWidth, "end")

		const leftPadded =
			options.leftAlign === "right"
				? " ".repeat(Math.max(0, leftWidth - stripAnsi(leftTruncated).length)) + leftTruncated
				: leftTruncated + " ".repeat(Math.max(0, leftWidth - stripAnsi(leftTruncated).length))

		const rightPadded =
			options.rightAlign === "right"
				? " ".repeat(Math.max(0, rightWidth - stripAnsi(rightTruncated).length)) + rightTruncated
				: rightTruncated

		lines.push(`${leftPadded}${" ".repeat(gap)}${rightPadded}`)
	}

	return lines.join("\n")
}

/**
 * Create a grid layout
 */
export function formatGrid(
	items: string[],
	options: {
		columns?: number
		gap?: number
		equalWidth?: boolean
	} = {},
): string {
	const contentWidth = getContentWidth()
	const gap = options.gap ?? 2
	const columns = options.columns ?? 3

	if (columns < 1) {
		throw new Error("Columns must be at least 1")
	}

	const columnWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns)
	const lines: string[] = []

	for (let i = 0; i < items.length; i += columns) {
		const rowItems = items.slice(i, i + columns)
		const cells = rowItems.map((item) => {
			const truncated = truncate(item, columnWidth, "end")
			const padding = " ".repeat(Math.max(0, columnWidth - stripAnsi(truncated).length))
			return truncated + padding
		})

		lines.push(cells.join(" ".repeat(gap)))
	}

	return lines.join("\n")
}

/**
 * Create a panel with border and title
 */
export function formatPanel(
	title: string,
	content: string,
	options: {
		color?: string
		icon?: string
		padding?: number
		footer?: string
	} = {},
): string {
	const { color = SemanticColors.info, icon, padding = 1, footer } = options
	const lines: string[] = []

	const contentWidth = getContentWidth()
	const borderWidth = contentWidth - 2
	const innerWidth = borderWidth - 2 * padding

	// Top border
	lines.push("")
	lines.push(style(`${BoxChars.topLeft}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.topRight}`, color))

	// Title
	const titleText = icon ? `${icon}  ${title}` : title
	const titleStyled = style(titleText, TerminalColors.bright)
	const titlePadding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(titleText).length))
	lines.push(`${style(BoxChars.vertical, color)} ${titleStyled}${titlePadding} ${style(BoxChars.vertical, color)}`)

	// Separator
	lines.push(style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, color))

	// Content with padding
	const contentLines = content.split("\n")
	const paddingStr = " ".repeat(padding)

	for (const line of contentLines) {
		const wrappedLines = wordWrap(line, innerWidth)
		for (const wrappedLine of wrappedLines) {
			const linePadding = " ".repeat(Math.max(0, innerWidth - stripAnsi(wrappedLine).length))
			lines.push(
				`${style(BoxChars.vertical, color)}${paddingStr}${wrappedLine}${linePadding}${paddingStr}${style(BoxChars.vertical, color)}`,
			)
		}
	}

	// Footer if provided
	if (footer) {
		lines.push(style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, color))
		const footerStyled = style(footer, TerminalColors.dim)
		const footerPadding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(footer).length))
		lines.push(`${style(BoxChars.vertical, color)} ${footerStyled}${footerPadding} ${style(BoxChars.vertical, color)}`)
	}

	// Bottom border
	lines.push(style(`${BoxChars.bottomLeft}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.bottomRight}`, color))
	lines.push("")

	return lines.join("\n")
}

/**
 * Create a tree structure view
 */
export function formatTree(
	nodes: Array<{
		label: string
		children?: Array<{ label: string }>
		expanded?: boolean
	}>,
	options: {
		showLines?: boolean
	} = {},
): string {
	const { showLines = true } = options
	const lines: string[] = []

	nodes.forEach((node, nodeIndex) => {
		const isLast = nodeIndex === nodes.length - 1
		const nodePrefix = showLines ? (isLast ? BoxChars.bottomLeft : BoxChars.verticalRight) : BoxChars.bulletPoint
		const nodeLine = `${nodePrefix}${BoxChars.horizontal} ${node.label}`
		lines.push(nodeLine)

		if (node.children && node.expanded !== false) {
			node.children.forEach((child, childIndex) => {
				const childIsLast = childIndex === node.children!.length - 1
				const childPrefix = showLines ? (isLast ? "  " : `${BoxChars.vertical} `) : "  "
				const childMarker = showLines
					? childIsLast
						? BoxChars.bottomLeft
						: BoxChars.verticalRight
					: BoxChars.bulletPoint
				const childLine = `${childPrefix}${childMarker}${BoxChars.horizontal} ${style(child.label, TerminalColors.dim)}`
				lines.push(childLine)
			})
		}
	})

	return lines.join("\n")
}

/**
 * Create a definition list
 */
export function formatDefinitionList(
	items: Array<{ term: string; definition: string }>,
	options: {
		termWidth?: number
		separator?: string
		termColor?: string
	} = {},
): string {
	const contentWidth = getContentWidth()
	const termWidth = options.termWidth ?? Math.min(30, Math.floor(contentWidth * 0.3))
	const defWidth = contentWidth - termWidth - 3
	const separator = options.separator ?? ":"
	const termColor = options.termColor ?? TerminalColors.bright

	const lines: string[] = []

	for (const item of items) {
		const term = truncate(item.term, termWidth, "end")
		const termStyled = style(term, termColor)
		const termPadding = " ".repeat(Math.max(0, termWidth - stripAnsi(term).length))

		const defLines = wordWrap(item.definition, defWidth)
		const firstDef = defLines[0] || ""

		lines.push(`${termStyled}${termPadding} ${separator} ${firstDef}`)

		// Indent continuation lines
		for (let i = 1; i < defLines.length; i++) {
			const indent = " ".repeat(termWidth + 3)
			lines.push(`${indent}${defLines[i]}`)
		}
	}

	return lines.join("\n")
}

/**
 * Create a card layout with header and sections
 */
export function formatCard(
	sections: Array<{
		title?: string
		content: string
		footer?: string
	}>,
	options: {
		color?: string
		spacing?: number
	} = {},
): string {
	const { color = SemanticColors.info, spacing = 1 } = options
	const lines: string[] = []

	const contentWidth = getContentWidth()
	const borderWidth = contentWidth - 2

	// Top border
	lines.push("")
	lines.push(style(`${BoxChars.topLeft}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.topRight}`, color))

	sections.forEach((section, index) => {
		// Add separator between sections
		if (index > 0) {
			lines.push(
				style(`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`, color),
			)
		}

		// Section title
		if (section.title) {
			const titleStyled = style(section.title, TerminalColors.bright)
			const titlePadding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(section.title).length))
			lines.push(`${style(BoxChars.vertical, color)} ${titleStyled}${titlePadding} ${style(BoxChars.vertical, color)}`)

			// Add spacing
			if (spacing > 0) {
				const emptyLine = " ".repeat(borderWidth - 2)
				lines.push(`${style(BoxChars.vertical, color)} ${emptyLine} ${style(BoxChars.vertical, color)}`)
			}
		}

		// Section content
		const contentLines = wordWrap(section.content, borderWidth - 4)
		for (const line of contentLines) {
			const linePadding = " ".repeat(Math.max(0, borderWidth - 4 - stripAnsi(line).length))
			lines.push(`${style(BoxChars.vertical, color)}  ${line}${linePadding}  ${style(BoxChars.vertical, color)}`)
		}

		// Section footer
		if (section.footer) {
			if (spacing > 0) {
				const emptyLine = " ".repeat(borderWidth - 2)
				lines.push(`${style(BoxChars.vertical, color)} ${emptyLine} ${style(BoxChars.vertical, color)}`)
			}

			const footerStyled = style(section.footer, TerminalColors.dim)
			const footerPadding = " ".repeat(Math.max(0, borderWidth - 2 - stripAnsi(section.footer).length))
			lines.push(`${style(BoxChars.vertical, color)} ${footerStyled}${footerPadding} ${style(BoxChars.vertical, color)}`)
		}
	})

	// Bottom border
	lines.push(style(`${BoxChars.bottomLeft}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.bottomRight}`, color))
	lines.push("")

	return lines.join("\n")
}

/**
 * Create a banner with centered text
 */
export function formatBanner(
	text: string,
	options: {
		color?: string
		char?: string
		padding?: number
	} = {},
): string {
	const { color = SemanticColors.header, char = BoxChars.heavyHorizontal, padding = 1 } = options
	const contentWidth = getContentWidth()

	const lines: string[] = []

	// Top border
	lines.push("")
	lines.push(style(char.repeat(contentWidth), color))

	// Add padding lines
	for (let i = 0; i < padding; i++) {
		lines.push("")
	}

	// Centered text
	const centeredText = centerText(style(text, TerminalColors.bright, color), contentWidth)
	lines.push(centeredText)

	// Add padding lines
	for (let i = 0; i < padding; i++) {
		lines.push("")
	}

	// Bottom border
	lines.push(style(char.repeat(contentWidth), color))
	lines.push("")

	return lines.join("\n")
}

/**
 * Word wrap helper (shared utility)
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
