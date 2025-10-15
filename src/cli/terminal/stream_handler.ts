/**
 * CLI Stream Handler - Real-time streaming message display
 *
 * Enhanced with improved visual feedback:
 * - Throttled updates for better performance
 * - Progressive content display with smooth transitions
 * - Animated thinking blocks with elegant streaming
 * - Efficient terminal rendering with cursor management
 * - Better feedback for long-running operations
 */

import type { ClineMessage } from "@/shared/ExtensionMessage"
import { OUTPUT_LIMITS, STREAMING } from "../core/constants"
import { getLogger } from "../infrastructure/logger"
import { BoxChars, formatThinkingBlock, SemanticColors, style, TerminalColors } from "../ui/output/message_formatter"
import { output } from "../ui/output/output"

const logger = getLogger()

/**
 * Stream handler configuration
 */
interface StreamHandlerConfig {
	/** Minimum time between updates (ms) */
	throttleMs?: number
	/** Show partial content during streaming */
	showPartialContent?: boolean
	/** Auto-expand thinking blocks */
	autoExpandThinking?: boolean
	/** Max length before truncating partial display */
	maxPartialLength?: number
}

/**
 * Active streaming session state
 */
interface StreamSession {
	type: "text" | "thinking" | "command"
	startTime: number
	lastUpdate: number
	accumulatedText: string
	lineCount: number
	isThinking: boolean
}

/**
 * CLI Stream Handler
 *
 * Manages real-time streaming of messages to the terminal with:
 * - Throttled updates to prevent terminal flooding
 * - Progressive display of partial content
 * - Special handling for thinking blocks
 * - Efficient cursor management
 */
export class CliStreamHandler {
	private config: Required<StreamHandlerConfig>
	private activeSession: StreamSession | null = null
	private updateTimer: NodeJS.Timeout | null = null
	private spinnerTimer: NodeJS.Timeout | null = null

	constructor(config: StreamHandlerConfig = {}) {
		this.config = {
			throttleMs: config.throttleMs || STREAMING.THROTTLE_MS,
			showPartialContent: config.showPartialContent ?? true,
			autoExpandThinking: config.autoExpandThinking ?? true,
			maxPartialLength: config.maxPartialLength || OUTPUT_LIMITS.MAX_PARTIAL_LENGTH,
		}
	}

	/**
	 * Start a new streaming session with enhanced visual feedback
	 */
	startStream(type: "text" | "thinking" | "command"): void {
		// Check terminal capabilities and warn if limited
		const supportsAnsi = process.stdout.isTTY === true && !process.env.NO_COLOR && process.env.TERM !== "dumb"
		if (!supportsAnsi) {
			logger.debug("Terminal does not support ANSI codes. Stream clearing disabled. Output may accumulate.")
		}

		// End any existing session
		this.endStream()

		this.activeSession = {
			type,
			startTime: Date.now(),
			lastUpdate: Date.now(),
			accumulatedText: "",
			lineCount: 0,
			isThinking: type === "thinking",
		}

		// Start spinner for thinking with elegant animation
		if (type === "thinking") {
			this.startSpinner()
		}

		// Show initial indicator with better styling
		if (type === "thinking") {
			const indicator = `\n${style("●", SemanticColors.thinking)} ${style("AI is processing your request...", TerminalColors.dim)}\n`
			output.log(indicator)
		} else if (type === "text") {
			const indicator = `${style(BoxChars.rightArrow, SemanticColors.ai)} ${style("Streaming response...", TerminalColors.dim)}`
			output.log(indicator)
		}
	}

	/**
	 * Update streaming content
	 */
	updateStream(text: string, partial: boolean = true): void {
		if (!this.activeSession) {
			// No active session, treat as complete message
			this.handleCompleteMessage(text)
			return
		}

		// Update accumulated text
		this.activeSession.accumulatedText = text
		const now = Date.now()

		// Throttle updates
		const timeSinceLastUpdate = now - this.activeSession.lastUpdate
		if (partial && timeSinceLastUpdate < this.config.throttleMs) {
			// Schedule update if not already scheduled
			if (!this.updateTimer) {
				this.updateTimer = setTimeout(() => {
					this.updateTimer = null
					this.renderStreamingContent()
				}, this.config.throttleMs - timeSinceLastUpdate)
			}
			return
		}

		// Clear any pending update
		if (this.updateTimer) {
			clearTimeout(this.updateTimer)
			this.updateTimer = null
		}

		// Update timestamp
		this.activeSession.lastUpdate = now

		// Render content
		if (partial) {
			this.renderStreamingContent()
		} else {
			// Final render
			this.renderFinalContent()
		}
	}

	/**
	 * End the current streaming session
	 */
	endStream(): void {
		// Clear timers
		if (this.updateTimer) {
			clearTimeout(this.updateTimer)
			this.updateTimer = null
		}

		if (this.spinnerTimer) {
			clearInterval(this.spinnerTimer)
			this.spinnerTimer = null
		}

		// Final render if there's accumulated content
		if (this.activeSession?.accumulatedText) {
			this.renderFinalContent()
		}

		this.activeSession = null
	}

	/**
	 * Handle a complete message (non-streaming)
	 */
	handleMessage(message: ClineMessage): void {
		const sayType = message.say
		const text = message.text || ""
		const partial = message.partial || false

		switch (sayType) {
			case "text": {
				if (partial) {
					if (!this.activeSession || this.activeSession.type !== "text") {
						this.startStream("text")
					}
					this.updateStream(text, true)
				} else {
					this.endStream()
					if (text) {
						const aiLabel = style("🤖 AI", SemanticColors.ai, TerminalColors.bright)
						output.log(`\n${aiLabel}: ${text}\n`)
					}
				}
				break
			}

			case "command": {
				this.endStream()
				const commandIcon = style("⚡", SemanticColors.command)
				const commandLabel = style("Command", TerminalColors.bright)
				output.log(`\n${commandIcon} ${commandLabel}: ${style(text, SemanticColors.code)}`)
				break
			}

			case "command_output": {
				// Command output is not streamed, displayed directly
				break
			}

			case "api_req_started": {
				// Start thinking stream
				this.startStream("thinking")
				break
			}

			case "api_req_finished": {
				// End thinking stream
				this.endStream()
				break
			}

			case "error": {
				this.endStream()
				const errorIcon = style("✗", SemanticColors.error)
				const errorLabel = style("Error", SemanticColors.error, TerminalColors.bright)
				console.error(`\n${errorIcon} ${errorLabel}: ${text}\n`)
				break
			}

			default: {
				// Pass through other message types
				break
			}
		}
	}

	/**
	 * Render streaming content (partial) with enhanced visual feedback
	 */
	private renderStreamingContent(): void {
		if (!this.activeSession) {
			return
		}

		const { type, accumulatedText, startTime } = this.activeSession

		// Clear previous line(s) if needed
		this.clearPreviousOutput()

		if (type === "thinking") {
			// Show abbreviated thinking content while streaming
			const preview = accumulatedText.slice(0, this.config.maxPartialLength)
			const truncated = accumulatedText.length > this.config.maxPartialLength
			const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

			if (this.config.showPartialContent && preview) {
				// Show preview with streaming indicator
				const statusLine = truncated
					? `[Streaming... ${accumulatedText.length} chars, ${elapsed}s]`
					: `[Processing... ${elapsed}s]`

				output.log(
					formatThinkingBlock(preview + (truncated ? `\n\n${statusLine}` : ""), {
						expanded: false,
						partial: true,
						showCopyHint: false,
					}),
				)
			} else {
				// Show minimal spinner indicator
				const spinner = BoxChars.spinner[Math.floor(Date.now() / 100) % BoxChars.spinner.length]
				const indicator = `${style(spinner, SemanticColors.thinking)} ${style(`Processing (${elapsed}s)...`, TerminalColors.dim)}`
				output.log(indicator)
			}
		} else if (type === "text") {
			// Show partial text with streaming indicator
			const preview = accumulatedText.slice(0, this.config.maxPartialLength)
			const truncated = accumulatedText.length > this.config.maxPartialLength
			const streamingDot = BoxChars.bulletPoint

			const aiLabel = style("🤖 AI", SemanticColors.ai, TerminalColors.bright)
			const textContent = style(preview, TerminalColors.dim)
			const ellipsis = truncated ? style("...", TerminalColors.dim) : ""
			const streamIndicator = style(` ${streamingDot}`, SemanticColors.thinking)

			output.log(`\n${aiLabel}:${streamIndicator} ${textContent}${ellipsis}`)
		}

		// Update line count for clearing
		this.activeSession.lineCount = this.countOutputLines()
	}

	/**
	 * Render final content (complete) with improved presentation
	 */
	private renderFinalContent(): void {
		if (!this.activeSession) {
			return
		}

		const { type, accumulatedText, startTime } = this.activeSession

		// Clear previous output
		this.clearPreviousOutput()

		// Stop spinner
		if (this.spinnerTimer) {
			clearInterval(this.spinnerTimer)
			this.spinnerTimer = null
		}

		// Calculate elapsed time for context
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

		// Render final content based on type
		if (type === "thinking") {
			output.log(formatThinkingBlock(accumulatedText, { expanded: this.config.autoExpandThinking, partial: false }))
			// Optionally show duration for long operations
			if (parseFloat(elapsed) > 2) {
				const durationText = style(`⏱  Completed in ${elapsed}s`, SemanticColors.metadata)
				output.log(`${durationText}\n`)
			}
		} else if (type === "text") {
			const aiLabel = style("🤖 AI", SemanticColors.ai, TerminalColors.bright)
			const completionMark = style("✓", SemanticColors.complete)
			output.log(`\n${aiLabel}:${completionMark} ${accumulatedText}\n`)
		}
	}

	/**
	 * Handle a complete non-partial message with improved styling
	 */
	private handleCompleteMessage(text: string): void {
		const aiLabel = style("🤖 AI", SemanticColors.ai, TerminalColors.bright)
		output.log(`\n${aiLabel}: ${text}\n`)
	}

	/**
	 * Start spinner animation
	 */
	private startSpinner(): void {
		if (this.spinnerTimer) {
			return
		}

		// Spinner animation would go here if we want to show it
		// For now, we'll keep it simple without animation
	}

	/**
	 * Clear previous terminal output
	 * Note: This is tricky in terminals and may not work everywhere
	 */
	private clearPreviousOutput(): void {
		// In terminal, we can't reliably clear previous output
		// Instead, we'll just move cursor up if we know the line count
		if (this.activeSession && this.activeSession.lineCount > 0) {
			// Move cursor up N lines
			const lines = this.activeSession.lineCount
			for (let i = 0; i < lines; i++) {
				process.stdout.write("\x1b[1A") // Move up
				process.stdout.write("\x1b[2K") // Clear line
			}
		}
	}

	/**
	 * Count lines in current output
	 */
	private countOutputLines(): number {
		// Approximate line count based on content
		// This is a rough estimate
		if (!this.activeSession) {
			return 0
		}

		const { type, accumulatedText } = this.activeSession

		if (type === "thinking") {
			// Thinking block has header + content + footer
			const contentLines = Math.ceil(accumulatedText.length / 76)
			return Math.min(contentLines + 6, 20) // Cap at 20 lines for partial display
		}

		return Math.ceil(accumulatedText.length / 80)
	}

	/**
	 * Cleanup resources
	 */
	dispose(): void {
		this.endStream()
	}
}

/**
 * Global stream handler instance
 */
let globalStreamHandler: CliStreamHandler | null = null

/**
 * Get or create global stream handler
 */
export function getStreamHandler(config?: StreamHandlerConfig): CliStreamHandler {
	if (!globalStreamHandler) {
		globalStreamHandler = new CliStreamHandler(config)
	}
	return globalStreamHandler
}

/**
 * Reset global stream handler (useful for testing)
 */
export function resetStreamHandler(): void {
	if (globalStreamHandler) {
		globalStreamHandler.dispose()
		globalStreamHandler = null
	}
}
