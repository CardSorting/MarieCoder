/**
 * Enhanced Feedback System
 *
 * Provides real-time feedback and status indicators for CLI:
 * - Live activity monitors
 * - Pulsing alerts
 * - Status indicators
 * - Real-time metrics displays
 * - Live logs with filtering
 * - Connection status
 * - Resource monitors
 *
 * @module cli_enhanced_feedback
 */

import {
	BoxChars,
	Colors256,
	EffectChars,
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
 * Live activity monitor
 */
export class LiveActivityMonitor {
	private activities: Map<
		string,
		{
			label: string
			status: "active" | "idle" | "success" | "error"
			startTime: number
			details?: string
		}
	> = new Map()
	private frame = 0

	/**
	 * Add or update activity
	 */
	updateActivity(id: string, label: string, status: "active" | "idle" | "success" | "error", details?: string): void {
		const existing = this.activities.get(id)
		this.activities.set(id, {
			label,
			status,
			startTime: existing?.startTime || Date.now(),
			details,
		})
	}

	/**
	 * Remove activity
	 */
	removeActivity(id: string): void {
		this.activities.delete(id)
	}

	/**
	 * Clear all activities
	 */
	clear(): void {
		this.activities.clear()
	}

	/**
	 * Render activity monitor
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()
		const borderWidth = Math.min(contentWidth - 2, 80)

		// Update animation frame
		this.frame++

		// Header
		lines.push("")
		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.topRight}`,
				SemanticColors.info,
			),
		)

		const header = `⚡ Live Activity Monitor (${this.activities.size} active)`
		const headerPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(header).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${style(header, TerminalColors.bright)}${headerPadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
		)

		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`,
				SemanticColors.info,
			),
		)

		// Activities
		if (this.activities.size === 0) {
			const noActivity = style("No active tasks", TerminalColors.dim)
			const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(noActivity).length - 2))
			lines.push(
				`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${noActivity}${padding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
			)
		} else {
			for (const [_id, activity] of this.activities) {
				let icon: string
				let iconColor: string

				switch (activity.status) {
					case "active":
						// Animated spinner
						const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
						icon = spinnerFrames[this.frame % spinnerFrames.length]
						iconColor = SemanticColors.progress as string
						break
					case "idle":
						icon = "○"
						iconColor = TerminalColors.dim as string
						break
					case "success":
						icon = "✓"
						iconColor = SemanticColors.complete as string
						break
					case "error":
						icon = "✗"
						iconColor = SemanticColors.error as string
						break
				}

				// Calculate duration
				const duration = Date.now() - activity.startTime
				const seconds = Math.floor(duration / 1000)
				const durationText = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`

				const line = `${style(icon, iconColor)} ${style(activity.label, TerminalColors.bright)} ${style(`(${durationText})`, TerminalColors.dim)}`
				const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(line).length - 2))

				lines.push(
					`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${line}${padding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
				)

				// Details if present
				if (activity.details) {
					const details = `    ${style(activity.details, TerminalColors.dim)}`
					const detailsPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(details).length - 2))
					lines.push(
						`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${details}${detailsPadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
					)
				}
			}
		}

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.bottomRight}`,
				SemanticColors.info,
			),
		)
		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Pulsing alert
 */
export class PulsingAlert {
	private intensity = 0
	private direction = 1

	constructor(
		private message: string,
		private type: "info" | "warning" | "error" | "success" = "info",
	) {}

	/**
	 * Update animation
	 */
	private updateAnimation(): void {
		this.intensity += this.direction * 0.15
		if (this.intensity >= 1) {
			this.intensity = 1
			this.direction = -1
		} else if (this.intensity <= 0) {
			this.intensity = 0
			this.direction = 1
		}
	}

	/**
	 * Render pulsing alert
	 */
	render(): string {
		this.updateAnimation()

		let icon: string
		let color: number

		switch (this.type) {
			case "info":
				icon = "ℹ"
				color = Colors256.presets.skyBlue
				break
			case "warning":
				icon = "⚠"
				color = Colors256.presets.amber
				break
			case "error":
				icon = "✗"
				color = Colors256.presets.crimson
				break
			case "success":
				icon = "✓"
				color = Colors256.presets.limeGreen
				break
		}

		// Apply intensity to color (brightness)
		const bright = this.intensity > 0.5 ? TerminalColors.bright : ""
		const iconStyled = `${bright}${Colors256.fg(color)}${icon}${TerminalColors.reset}`

		return `${iconStyled} ${this.message}`
	}
}

/**
 * Real-time status indicator
 */
export class StatusIndicator {
	private lastUpdate = Date.now()
	private blinkState = false
	private blinkInterval = 500 // ms

	constructor(
		private label: string,
		private status: "online" | "offline" | "connecting" | "error",
	) {}

	/**
	 * Update status
	 */
	setStatus(status: "online" | "offline" | "connecting" | "error"): void {
		this.status = status
		this.lastUpdate = Date.now()
	}

	/**
	 * Update blink state
	 */
	private updateBlink(): void {
		const now = Date.now()
		if (now - this.lastUpdate >= this.blinkInterval) {
			this.blinkState = !this.blinkState
			this.lastUpdate = now
		}
	}

	/**
	 * Render status indicator
	 */
	render(): string {
		this.updateBlink()

		let icon: string
		let color: string
		let statusText: string

		switch (this.status) {
			case "online":
				icon = "●"
				color = SemanticColors.complete
				statusText = "Online"
				break
			case "offline":
				icon = "●"
				color = TerminalColors.dim
				statusText = "Offline"
				break
			case "connecting":
				// Blinking effect
				icon = this.blinkState ? "◉" : "○"
				color = SemanticColors.progress
				statusText = "Connecting..."
				break
			case "error":
				icon = "●"
				color = SemanticColors.error
				statusText = "Error"
				break
		}

		return `${style(icon, color)} ${style(this.label, TerminalColors.bright)}: ${style(statusText, color)}`
	}
}

/**
 * Real-time metrics display
 */
export class MetricsDisplay {
	private metrics: Map<string, { value: number; unit: string; trend?: "up" | "down" | "stable" }> = new Map()

	/**
	 * Update metric
	 */
	updateMetric(key: string, value: number, unit: string = "", trend?: "up" | "down" | "stable"): void {
		this.metrics.set(key, { value, unit, trend })
	}

	/**
	 * Remove metric
	 */
	removeMetric(key: string): void {
		this.metrics.delete(key)
	}

	/**
	 * Render metrics display
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()
		const borderWidth = Math.min(contentWidth - 2, 60)

		lines.push("")
		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.topRight}`,
				SemanticColors.info,
			),
		)

		const header = "📊 Real-time Metrics"
		const headerPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(header).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${style(header, TerminalColors.bright)}${headerPadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
		)

		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`,
				SemanticColors.info,
			),
		)

		if (this.metrics.size === 0) {
			const noMetrics = style("No metrics available", TerminalColors.dim)
			const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(noMetrics).length - 2))
			lines.push(
				`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${noMetrics}${padding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
			)
		} else {
			for (const [key, metric] of this.metrics) {
				let trendIcon = ""
				let trendColor: string = TerminalColors.reset

				if (metric.trend) {
					switch (metric.trend) {
						case "up":
							trendIcon = " ↑"
							trendColor = SemanticColors.complete
							break
						case "down":
							trendIcon = " ↓"
							trendColor = SemanticColors.error
							break
						case "stable":
							trendIcon = " →"
							trendColor = TerminalColors.dim
							break
					}
				}

				const valueText = `${metric.value}${metric.unit}`
				const line = `${style(key, TerminalColors.bright)}: ${style(valueText, SemanticColors.highlight)}${style(trendIcon, trendColor)}`
				const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(line).length - 2))

				lines.push(
					`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${line}${padding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
				)
			}
		}

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.bottomRight}`,
				SemanticColors.info,
			),
		)
		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Live log viewer with filtering
 */
export class LiveLogViewer {
	private logs: Array<{
		timestamp: Date
		level: "info" | "warn" | "error" | "debug"
		message: string
	}> = []
	private maxLogs = 50
	private filterLevel?: "info" | "warn" | "error" | "debug"

	/**
	 * Add log entry
	 */
	addLog(level: "info" | "warn" | "error" | "debug", message: string): void {
		this.logs.push({
			timestamp: new Date(),
			level,
			message,
		})

		// Keep only recent logs
		if (this.logs.length > this.maxLogs) {
			this.logs.shift()
		}
	}

	/**
	 * Set filter level
	 */
	setFilter(level?: "info" | "warn" | "error" | "debug"): void {
		this.filterLevel = level
	}

	/**
	 * Clear logs
	 */
	clear(): void {
		this.logs = []
	}

	/**
	 * Render log viewer
	 */
	render(maxDisplay: number = 10): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()
		const borderWidth = contentWidth - 2

		lines.push("")
		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.topRight}`,
				SemanticColors.info,
			),
		)

		const header = this.filterLevel ? `📋 Live Logs (${this.filterLevel.toUpperCase()} only)` : "📋 Live Logs (All)"
		const headerPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(header).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${style(header, TerminalColors.bright)}${headerPadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
		)

		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`,
				SemanticColors.info,
			),
		)

		// Filter logs
		const filteredLogs = this.filterLevel ? this.logs.filter((log) => log.level === this.filterLevel) : this.logs

		// Get recent logs
		const recentLogs = filteredLogs.slice(-maxDisplay)

		if (recentLogs.length === 0) {
			const noLogs = style("No logs available", TerminalColors.dim)
			const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(noLogs).length - 2))
			lines.push(
				`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${noLogs}${padding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
			)
		} else {
			for (const log of recentLogs) {
				let icon: string
				let color: string

				switch (log.level) {
					case "info":
						icon = "ℹ"
						color = SemanticColors.info
						break
					case "warn":
						icon = "⚠"
						color = SemanticColors.warning
						break
					case "error":
						icon = "✗"
						color = SemanticColors.error
						break
					case "debug":
						icon = "●"
						color = TerminalColors.dim
						break
				}

				const timestamp = log.timestamp.toLocaleTimeString()
				const line = `${style(timestamp, TerminalColors.dim)} ${style(icon, color)} ${log.message}`
				const truncated = line.substring(0, borderWidth - 4)
				const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(truncated).length - 4))

				lines.push(
					`${style(RoundedBoxChars.vertical, SemanticColors.info)}  ${truncated}${padding}  ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
				)
			}
		}

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.bottomRight}`,
				SemanticColors.info,
			),
		)
		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Resource monitor (CPU, Memory, etc.)
 */
export class ResourceMonitor {
	constructor(
		private resources: Map<
			string,
			{
				current: number
				max: number
				unit: string
			}
		> = new Map(),
	) {}

	/**
	 * Update resource
	 */
	updateResource(name: string, current: number, max: number, unit: string = "%"): void {
		this.resources.set(name, { current, max, unit })
	}

	/**
	 * Render resource monitor
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()
		const borderWidth = Math.min(contentWidth - 2, 60)

		lines.push("")
		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.topRight}`,
				SemanticColors.info,
			),
		)

		const header = "💻 Resource Monitor"
		const headerPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(header).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${style(header, TerminalColors.bright)}${headerPadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
		)

		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`,
				SemanticColors.info,
			),
		)

		for (const [name, resource] of this.resources) {
			const percentage = (resource.current / resource.max) * 100
			const barWidth = 20
			const filled = Math.round((percentage / 100) * barWidth)

			// Color based on usage
			let color: number
			if (percentage >= 90) {
				color = Colors256.presets.crimson
			} else if (percentage >= 75) {
				color = Colors256.presets.orange
			} else if (percentage >= 50) {
				color = Colors256.presets.amber
			} else {
				color = Colors256.presets.limeGreen
			}

			const bar =
				Colors256.fg(color) +
				EffectChars.progressFull.repeat(filled) +
				TerminalColors.reset +
				style(EffectChars.progressEmpty.repeat(barWidth - filled), TerminalColors.dim)

			const valueText = `${resource.current.toFixed(1)}/${resource.max}${resource.unit}`
			const line = `${style(name.padEnd(12, " "), TerminalColors.bright)} [${bar}] ${style(valueText, TerminalColors.dim)}`
			const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(line).length - 2))

			lines.push(
				`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${line}${padding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
			)
		}

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.bottomRight}`,
				SemanticColors.info,
			),
		)
		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Connection status panel
 */
export class ConnectionStatus {
	private connections: Map<
		string,
		{
			status: "connected" | "disconnected" | "connecting" | "error"
			latency?: number
			lastUpdate: Date
		}
	> = new Map()

	/**
	 * Update connection
	 */
	updateConnection(name: string, status: "connected" | "disconnected" | "connecting" | "error", latency?: number): void {
		this.connections.set(name, {
			status,
			latency,
			lastUpdate: new Date(),
		})
	}

	/**
	 * Remove connection
	 */
	removeConnection(name: string): void {
		this.connections.delete(name)
	}

	/**
	 * Render connection status
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()
		const borderWidth = Math.min(contentWidth - 2, 60)

		lines.push("")
		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.topRight}`,
				SemanticColors.info,
			),
		)

		const header = "🌐 Connection Status"
		const headerPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(header).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${style(header, TerminalColors.bright)}${headerPadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
		)

		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`,
				SemanticColors.info,
			),
		)

		if (this.connections.size === 0) {
			const noConnections = style("No connections", TerminalColors.dim)
			const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(noConnections).length - 2))
			lines.push(
				`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${noConnections}${padding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
			)
		} else {
			for (const [name, conn] of this.connections) {
				let icon: string
				let color: string
				let statusText: string

				switch (conn.status) {
					case "connected":
						icon = "●"
						color = SemanticColors.complete
						statusText = "Connected"
						break
					case "disconnected":
						icon = "●"
						color = TerminalColors.dim
						statusText = "Disconnected"
						break
					case "connecting":
						icon = "◐"
						color = SemanticColors.progress
						statusText = "Connecting..."
						break
					case "error":
						icon = "●"
						color = SemanticColors.error
						statusText = "Error"
						break
				}

				const latencyText = conn.latency ? ` (${conn.latency}ms)` : ""
				const line = `${style(icon, color)} ${style(name.padEnd(20, " "), TerminalColors.bright)} ${style(statusText, color)}${style(latencyText, TerminalColors.dim)}`
				const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(line).length - 2))

				lines.push(
					`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${line}${padding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
				)
			}
		}

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.bottomRight}`,
				SemanticColors.info,
			),
		)
		lines.push("")

		return lines.join("\n")
	}
}
