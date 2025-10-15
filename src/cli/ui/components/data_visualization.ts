/**
 * Data Visualization Components
 *
 * Provides visualization tools for CLI:
 * - Bar charts (horizontal and vertical)
 * - Line charts with sparklines
 * - Pie charts
 * - Heat maps
 * - Histograms
 * - Gauges and meters
 * - Trend indicators
 *
 * @module cli_data_visualization
 */

import {
	BoxChars,
	Colors256,
	EffectChars,
	RoundedBoxChars,
	SemanticColors,
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
 * Horizontal bar chart
 */
export class BarChart {
	constructor(
		private title: string,
		private data: Array<{
			label: string
			value: number
			color?: number
		}>,
		private options: {
			maxBarWidth?: number
			showValues?: boolean
			showPercentages?: boolean
		} = {},
	) {}

	/**
	 * Render bar chart
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()
		const maxBarWidth = this.options.maxBarWidth || Math.min(40, contentWidth - 30)

		// Title
		lines.push("")
		lines.push(style(this.title, TerminalColors.bright, SemanticColors.header))
		lines.push(style(RoundedBoxChars.horizontal.repeat(Math.min(contentWidth, 60)), TerminalColors.dim))
		lines.push("")

		// Find max value for scaling
		const maxValue = Math.max(...this.data.map((d) => d.value))
		const total = this.data.reduce((sum, d) => sum + d.value, 0)

		// Find max label length
		const maxLabelLength = Math.max(...this.data.map((d) => d.label.length))

		// Render each bar
		for (const item of this.data) {
			const percentage = (item.value / total) * 100
			const barLength = Math.round((item.value / maxValue) * maxBarWidth)

			// Label
			const label = item.label.padEnd(maxLabelLength, " ")
			const labelStyled = style(label, TerminalColors.bright)

			// Bar
			const color = item.color || Colors256.presets.skyBlue
			const bar = Colors256.fg(color) + EffectChars.fullBlock.repeat(barLength) + TerminalColors.reset

			// Value and percentage
			const info: string[] = []
			if (this.options.showValues !== false) {
				info.push(item.value.toString())
			}
			if (this.options.showPercentages) {
				info.push(`${percentage.toFixed(1)}%`)
			}
			const infoText = info.length > 0 ? style(` ${info.join(" | ")}`, TerminalColors.dim) : ""

			lines.push(`${labelStyled} ${bar}${infoText}`)
		}

		lines.push("")
		return lines.join("\n")
	}
}

/**
 * Vertical bar chart
 */
export class VerticalBarChart {
	constructor(
		private title: string,
		private data: Array<{
			label: string
			value: number
			color?: number
		}>,
		private height: number = 10,
	) {}

	/**
	 * Render vertical bar chart
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()

		// Title
		lines.push("")
		lines.push(style(this.title, TerminalColors.bright, SemanticColors.header))
		lines.push("")

		// Find max value
		const maxValue = Math.max(...this.data.map((d) => d.value))

		// Create grid
		const grid: string[][] = Array(this.height)
			.fill(null)
			.map(() => [])

		// Calculate bar widths
		const barWidth = 3
		const gapWidth = 2
		const totalWidth = this.data.length * (barWidth + gapWidth)

		// Draw bars
		for (let i = 0; i < this.data.length; i++) {
			const item = this.data[i]
			const barHeight = Math.round((item.value / maxValue) * this.height)
			const color = item.color || Colors256.presets.skyBlue

			for (let y = 0; y < this.height; y++) {
				const level = this.height - y - 1
				if (level < barHeight) {
					grid[y][i] = Colors256.fg(color) + EffectChars.fullBlock.repeat(barWidth) + TerminalColors.reset
				} else {
					grid[y][i] = " ".repeat(barWidth)
				}
			}
		}

		// Render grid
		for (const row of grid) {
			lines.push("  " + row.join(" ".repeat(gapWidth)))
		}

		// Draw baseline
		lines.push("  " + style("─".repeat(totalWidth), TerminalColors.dim))

		// Draw labels
		const labelLine = this.data
			.map((item) => {
				const label = item.label.substring(0, barWidth)
				return label.padEnd(barWidth, " ")
			})
			.join(" ".repeat(gapWidth))
		lines.push("  " + style(labelLine, TerminalColors.dim))

		lines.push("")
		return lines.join("\n")
	}
}

/**
 * Sparkline - compact inline chart
 */
export class Sparkline {
	private readonly sparkChars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"]

	constructor(private data: number[]) {}

	/**
	 * Render sparkline
	 */
	render(options: { color?: string; showMinMax?: boolean } = {}): string {
		if (this.data.length === 0) return ""

		const min = Math.min(...this.data)
		const max = Math.max(...this.data)
		const range = max - min || 1

		const chars = this.data.map((value) => {
			const normalized = (value - min) / range
			const index = Math.min(this.sparkChars.length - 1, Math.floor(normalized * this.sparkChars.length))
			return this.sparkChars[index]
		})

		const color = options.color || SemanticColors.info
		const sparkline = style(chars.join(""), color)

		if (options.showMinMax) {
			const minText = style(`${min}`, TerminalColors.dim)
			const maxText = style(`${max}`, TerminalColors.dim)
			return `${minText} ${sparkline} ${maxText}`
		}

		return sparkline
	}

	/**
	 * Render with label
	 */
	renderWithLabel(label: string, options: { color?: string; showMinMax?: boolean } = {}): string {
		return `${style(label, TerminalColors.bright)}: ${this.render(options)}`
	}
}

/**
 * Line chart
 */
export class LineChart {
	constructor(
		private title: string,
		private data: number[],
		private labels?: string[],
	) {}

	/**
	 * Render line chart
	 */
	render(options: { height?: number; width?: number; color?: number } = {}): string {
		const height = options.height || 10
		const width = options.width || Math.min(60, getContentWidth() - 10)
		const color = options.color || Colors256.presets.skyBlue

		const lines: string[] = []

		// Title
		lines.push("")
		lines.push(style(this.title, TerminalColors.bright, SemanticColors.header))
		lines.push("")

		if (this.data.length === 0) {
			lines.push(style("No data", TerminalColors.dim))
			lines.push("")
			return lines.join("\n")
		}

		// Scale data to fit
		const min = Math.min(...this.data)
		const max = Math.max(...this.data)
		const range = max - min || 1

		// Resample data to fit width
		const sampledData: number[] = []
		for (let i = 0; i < width; i++) {
			const index = Math.floor((i / width) * this.data.length)
			sampledData.push(this.data[index])
		}

		// Create grid
		const grid: string[][] = Array(height)
			.fill(null)
			.map(() => Array(width).fill(" "))

		// Plot points
		for (let x = 0; x < sampledData.length; x++) {
			const value = sampledData[x]
			const normalized = (value - min) / range
			const y = Math.round((1 - normalized) * (height - 1))

			// Draw line to next point
			if (x < sampledData.length - 1) {
				const nextValue = sampledData[x + 1]
				const nextNormalized = (nextValue - min) / range
				const nextY = Math.round((1 - nextNormalized) * (height - 1))

				// Simple line drawing
				const startY = Math.min(y, nextY)
				const endY = Math.max(y, nextY)
				for (let py = startY; py <= endY; py++) {
					if (py >= 0 && py < height) {
						grid[py][x] = "●"
					}
				}
			} else {
				grid[y][x] = "●"
			}
		}

		// Render grid with y-axis
		for (let y = 0; y < height; y++) {
			const value = max - (y / (height - 1)) * range
			const yLabel = value.toFixed(1).padStart(6, " ")
			const row = grid[y].join("")
			lines.push(
				`${style(yLabel, TerminalColors.dim)} ${BoxChars.vertical} ${Colors256.fg(color)}${row}${TerminalColors.reset}`,
			)
		}

		// X-axis
		lines.push(`${"".padStart(6, " ")} ${BoxChars.bottomLeft}${style(BoxChars.horizontal.repeat(width), TerminalColors.dim)}`)

		// Labels if provided
		if (this.labels && this.labels.length > 0) {
			const labelSpacing = Math.floor(width / Math.min(this.labels.length, 5))
			let labelLine = "".padStart(8, " ")
			for (let i = 0; i < Math.min(this.labels.length, 5); i++) {
				const label = this.labels[Math.floor((i / 5) * this.labels.length)]
				labelLine += label.substring(0, labelSpacing).padEnd(labelSpacing, " ")
			}
			lines.push(style(labelLine, TerminalColors.dim))
		}

		lines.push("")
		return lines.join("\n")
	}
}

/**
 * Pie chart (ASCII representation)
 */
export class PieChart {
	constructor(
		private title: string,
		private data: Array<{
			label: string
			value: number
			color?: number
		}>,
	) {}

	/**
	 * Render pie chart
	 */
	render(): string {
		const lines: string[] = []

		// Title
		lines.push("")
		lines.push(style(this.title, TerminalColors.bright, SemanticColors.header))
		lines.push("")

		const total = this.data.reduce((sum, item) => sum + item.value, 0)

		// Calculate percentages
		const slices = this.data.map((item) => ({
			...item,
			percentage: (item.value / total) * 100,
		}))

		// Simple text representation
		for (const slice of slices) {
			const barLength = Math.round(slice.percentage / 2)
			const color = slice.color || Colors256.presets.skyBlue
			const bar = Colors256.fg(color) + EffectChars.fullBlock.repeat(barLength) + TerminalColors.reset

			const label = style(slice.label.padEnd(15, " "), TerminalColors.bright)
			const percent = style(`${slice.percentage.toFixed(1)}%`.padStart(6, " "), TerminalColors.dim)
			const value = style(`(${slice.value})`, TerminalColors.dim)

			lines.push(`${label} ${bar} ${percent} ${value}`)
		}

		lines.push("")
		return lines.join("\n")
	}
}

/**
 * Heat map
 */
export class HeatMap {
	constructor(
		private title: string,
		private data: number[][],
		private rowLabels?: string[],
		private colLabels?: string[],
	) {}

	/**
	 * Render heat map
	 */
	render(): string {
		const lines: string[] = []

		// Title
		lines.push("")
		lines.push(style(this.title, TerminalColors.bright, SemanticColors.header))
		lines.push("")

		// Find min/max for color scaling
		const allValues = this.data.flat()
		const min = Math.min(...allValues)
		const max = Math.max(...allValues)
		const range = max - min || 1

		// Color gradient from blue to red
		const getColor = (value: number): number => {
			const normalized = (value - min) / range
			if (normalized < 0.2) return 17 // Dark blue
			if (normalized < 0.4) return 27 // Blue
			if (normalized < 0.6) return 226 // Yellow
			if (normalized < 0.8) return 208 // Orange
			return 196 // Red
		}

		// Column headers
		if (this.colLabels) {
			const headerLine = "".padEnd(10, " ") + this.colLabels.map((label) => label.substring(0, 3).padEnd(4, " ")).join("")
			lines.push(style(headerLine, TerminalColors.dim))
		}

		// Render grid
		for (let row = 0; row < this.data.length; row++) {
			const rowData = this.data[row]
			if (rowData) {
				const rowLabel = this.rowLabels?.[row] || `Row ${row + 1}`
				let line = style(rowLabel.substring(0, 8).padEnd(10, " "), TerminalColors.dim)

				for (const value of rowData) {
					const color = getColor(value)
					line += Colors256.bg(color) + "    " + TerminalColors.reset
				}

				lines.push(line)
			}
		}

		// Legend
		lines.push("")
		const legendLine = `${style("Low", TerminalColors.dim)} ${Colors256.bg(17)}  ${TerminalColors.reset} ${Colors256.bg(27)}  ${TerminalColors.reset} ${Colors256.bg(226)}  ${TerminalColors.reset} ${Colors256.bg(208)}  ${TerminalColors.reset} ${Colors256.bg(196)}  ${TerminalColors.reset} ${style("High", TerminalColors.dim)}`
		lines.push(legendLine)

		lines.push("")
		return lines.join("\n")
	}
}

/**
 * Histogram
 */
export class Histogram {
	constructor(
		private title: string,
		private data: number[],
		private bins: number = 10,
	) {}

	/**
	 * Render histogram
	 */
	render(): string {
		const lines: string[] = []

		// Title
		lines.push("")
		lines.push(style(this.title, TerminalColors.bright, SemanticColors.header))
		lines.push("")

		if (this.data.length === 0) {
			lines.push(style("No data", TerminalColors.dim))
			lines.push("")
			return lines.join("\n")
		}

		// Calculate bins
		const min = Math.min(...this.data)
		const max = Math.max(...this.data)
		const range = max - min
		const binWidth = range / this.bins

		const binCounts = Array(this.bins).fill(0)
		for (const value of this.data) {
			const binIndex = Math.min(this.bins - 1, Math.floor((value - min) / binWidth))
			binCounts[binIndex]++
		}

		// Find max count for scaling
		const maxCount = Math.max(...binCounts)

		// Render bars
		const barMaxWidth = 40
		for (let i = 0; i < this.bins; i++) {
			const binStart = min + i * binWidth
			const binEnd = binStart + binWidth
			const count = binCounts[i]
			if (count !== undefined) {
				const barLength = Math.round((count / maxCount) * barMaxWidth)

				const rangeText = `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`.padEnd(15, " ")
				const bar =
					Colors256.fg(Colors256.presets.skyBlue) + EffectChars.fullBlock.repeat(barLength) + TerminalColors.reset
				const countText = style(` (${count})`, TerminalColors.dim)

				lines.push(`${style(rangeText, TerminalColors.bright)} ${bar}${countText}`)
			}
		}

		lines.push("")
		return lines.join("\n")
	}
}

/**
 * Gauge/Meter
 */
export class Gauge {
	constructor(
		private label: string,
		private value: number,
		private min: number = 0,
		private max: number = 100,
	) {}

	/**
	 * Render gauge
	 */
	render(options: { width?: number; showValue?: boolean } = {}): string {
		const width = options.width || 30
		const showValue = options.showValue !== false

		const percentage = ((this.value - this.min) / (this.max - this.min)) * 100
		const filled = Math.round((percentage / 100) * width)

		// Color based on percentage
		let color: number
		if (percentage >= 80) {
			color = Colors256.presets.limeGreen
		} else if (percentage >= 60) {
			color = Colors256.presets.skyBlue
		} else if (percentage >= 40) {
			color = Colors256.presets.amber
		} else if (percentage >= 20) {
			color = Colors256.presets.orange
		} else {
			color = Colors256.presets.crimson
		}

		const bar =
			Colors256.fg(color) +
			EffectChars.progressFull.repeat(filled) +
			TerminalColors.reset +
			style(EffectChars.progressEmpty.repeat(width - filled), TerminalColors.dim)

		const valueText = showValue ? ` ${this.value.toFixed(1)}/${this.max}` : ""
		const percentText = style(`${percentage.toFixed(0)}%`, TerminalColors.dim)

		return `${style(this.label, TerminalColors.bright)}: [${bar}] ${percentText}${valueText}`
	}
}

/**
 * Trend indicator
 */
export class TrendIndicator {
	constructor(
		private label: string,
		private current: number,
		private previous: number,
	) {}

	/**
	 * Render trend
	 */
	render(): string {
		const change = this.current - this.previous
		const percentChange = this.previous !== 0 ? (change / this.previous) * 100 : 0

		let arrow: string
		let color: string
		let prefix: string

		if (change > 0) {
			arrow = "↑"
			color = SemanticColors.complete
			prefix = "+"
		} else if (change < 0) {
			arrow = "↓"
			color = SemanticColors.error
			prefix = ""
		} else {
			arrow = "→"
			color = TerminalColors.dim
			prefix = ""
		}

		const changeText = `${prefix}${change.toFixed(1)} (${prefix}${percentChange.toFixed(1)}%)`
		const trendIcon = style(arrow, color)
		const trendText = style(changeText, color)

		return `${style(this.label, TerminalColors.bright)}: ${this.current.toFixed(1)} ${trendIcon} ${trendText}`
	}
}

/**
 * Table with data
 */
export class DataTable {
	constructor(
		private title: string,
		private headers: string[],
		private rows: string[][],
	) {}

	/**
	 * Render table
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()

		// Calculate column widths
		const colCount = this.headers.length
		const colWidth = Math.floor((contentWidth - 2 - (colCount - 1)) / colCount)

		// Title
		lines.push("")
		lines.push(style(this.title, TerminalColors.bright, SemanticColors.header))

		// Top border
		const borderTop =
			RoundedBoxChars.topLeft +
			this.headers.map(() => RoundedBoxChars.horizontal.repeat(colWidth)).join(BoxChars.horizontalDown) +
			RoundedBoxChars.topRight
		lines.push(style(borderTop, SemanticColors.info))

		// Headers
		const headerCells = this.headers.map((h) => {
			const truncated = h.substring(0, colWidth - 2)
			return ` ${truncated.padEnd(colWidth - 2, " ")} `
		})
		lines.push(
			style(RoundedBoxChars.vertical, SemanticColors.info) +
				style(headerCells.join(RoundedBoxChars.vertical), TerminalColors.bright) +
				style(RoundedBoxChars.vertical, SemanticColors.info),
		)

		// Separator
		const separator =
			BoxChars.verticalRight +
			this.headers.map(() => BoxChars.horizontal.repeat(colWidth)).join(BoxChars.cross) +
			BoxChars.verticalLeft
		lines.push(style(separator, SemanticColors.info))

		// Rows
		for (const row of this.rows) {
			const cells = row.map((cell, i) => {
				if (i >= this.headers.length) return ""
				const truncated = cell.substring(0, colWidth - 2)
				return ` ${truncated.padEnd(colWidth - 2, " ")} `
			})
			lines.push(
				style(RoundedBoxChars.vertical, SemanticColors.info) +
					cells.join(style(RoundedBoxChars.vertical, SemanticColors.info)) +
					style(RoundedBoxChars.vertical, SemanticColors.info),
			)
		}

		// Bottom border
		const borderBottom =
			RoundedBoxChars.bottomLeft +
			this.headers.map(() => RoundedBoxChars.horizontal.repeat(colWidth)).join(BoxChars.horizontalUp) +
			RoundedBoxChars.bottomRight
		lines.push(style(borderBottom, SemanticColors.info))

		lines.push("")
		return lines.join("\n")
	}
}
