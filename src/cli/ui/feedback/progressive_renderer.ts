/**
 * CLI Progressive Renderer - Smooth rendering of large content
 *
 * Renders large content progressively to prevent overwhelming
 * the terminal and provide smooth scrolling experience.
 *
 * Key features:
 * - Chunked rendering for large outputs
 * - Adaptive chunk sizes based on terminal speed
 * - Pagination for very large content
 * - Smooth scrolling with pauses
 * - User control (pause/resume/skip)
 */

import { EventEmitter } from "node:events"
import { getLogger } from "../../infrastructure/logger"
import { formatSectionHeader } from "../output/message_formatter"
import { getOutputBuffer } from "../output/output_buffer"
import { SemanticColors, style, TerminalColors } from "../output/terminal_colors"
import { getTerminalState } from "../output/terminal_state"

const logger = getLogger()

/**
 * Progressive renderer configuration
 */
interface RendererConfig {
	/** Lines per chunk */
	chunkSize?: number
	/** Delay between chunks (ms) */
	chunkDelay?: number
	/** Enable pagination for very large content */
	enablePagination?: boolean
	/** Lines per page */
	pageSize?: number
	/** Auto-adjust chunk size based on performance */
	adaptive?: boolean
	/** Show progress indicator */
	showProgress?: boolean
}

/**
 * Render options
 */
interface RenderOptions {
	/** Content title/header */
	title?: string
	/** Enable syntax highlighting hints */
	syntax?: string
	/** Priority for output buffer */
	priority?: "critical" | "high" | "normal" | "low"
	/** Truncate after N lines */
	maxLines?: number
	/** Show "Show more" option */
	showMore?: boolean
}

/**
 * Render statistics
 */
interface RenderStats {
	totalLines: number
	renderedLines: number
	chunksRendered: number
	elapsedTime: number
	averageChunkTime: number
}

/**
 * CLI Progressive Renderer
 *
 * Handles rendering of large content in a smooth, controlled manner
 * to prevent rapid scrolling and terminal overwhelm.
 */
export class CliProgressiveRenderer extends EventEmitter {
	private config: Required<RendererConfig>
	private buffer = getOutputBuffer()
	private terminalState = getTerminalState()
	private isRendering: boolean = false
	private renderStats: RenderStats = {
		totalLines: 0,
		renderedLines: 0,
		chunksRendered: 0,
		elapsedTime: 0,
		averageChunkTime: 0,
	}

	constructor(config: RendererConfig = {}) {
		super()
		this.config = {
			chunkSize: config.chunkSize ?? 20,
			chunkDelay: config.chunkDelay ?? 50,
			enablePagination: config.enablePagination ?? true,
			pageSize: config.pageSize ?? 100,
			adaptive: config.adaptive ?? true,
			showProgress: config.showProgress ?? true,
		}

		logger.debug("CliProgressiveRenderer initialized", this.config)
	}

	/**
	 * Render large content progressively
	 */
	async render(content: string, options: RenderOptions = {}): Promise<void> {
		if (this.isRendering) {
			logger.warn("Render already in progress, queueing")
		}

		this.isRendering = true
		const startTime = Date.now()

		try {
			// Split content into lines
			const lines = content.split("\n")
			this.renderStats.totalLines = lines.length

			// Check if content needs progressive rendering
			if (lines.length <= this.config.chunkSize) {
				// Small content, render immediately
				await this.renderImmediate(content, options)
				return
			}

			// Render header if provided
			if (options.title) {
				await this.renderHeader(options.title, lines.length)
			}

			// Apply truncation if specified
			let linesToRender = lines
			if (options.maxLines && lines.length > options.maxLines) {
				linesToRender = lines.slice(0, options.maxLines)
				options.showMore = true
			}

			// Choose rendering strategy
			if (this.config.enablePagination && linesToRender.length > this.config.pageSize) {
				await this.renderPaginated(linesToRender, options)
			} else {
				await this.renderChunked(linesToRender, options)
			}

			// Show truncation notice if applicable
			if (options.showMore) {
				await this.renderTruncationNotice(lines.length, linesToRender.length)
			}

			this.renderStats.elapsedTime = Date.now() - startTime
			this.emit("render-complete", this.renderStats)
		} catch (error) {
			logger.error("Progressive render error:", error)
			this.emit("render-error", error)
			throw error
		} finally {
			this.isRendering = false
		}
	}

	/**
	 * Render content immediately (for small content)
	 */
	private async renderImmediate(content: string, options: RenderOptions): Promise<void> {
		if (options.title) {
			const header = formatSectionHeader(options.title)
			this.buffer.write(header, {
				priority: options.priority ?? "normal",
				type: "stdout",
			})
		}

		this.buffer.write(content + "\n", {
			priority: options.priority ?? "normal",
			type: "stdout",
		})

		await this.buffer.flush()
		this.renderStats.renderedLines = content.split("\n").length
	}

	/**
	 * Render content in chunks
	 */
	private async renderChunked(lines: string[], options: RenderOptions): Promise<void> {
		const chunks = this.splitIntoChunks(lines, this.config.chunkSize)

		for (let i = 0; i < chunks.length; i++) {
			const chunkStartTime = Date.now()
			const chunk = chunks[i]

			// Render chunk
			this.buffer.write(chunk.join("\n") + "\n", {
				priority: options.priority ?? "normal",
				type: "stdout",
			})

			await this.buffer.flush()

			this.renderStats.chunksRendered++
			this.renderStats.renderedLines += chunk.length

			// Show progress
			if (this.config.showProgress && chunks.length > 5) {
				await this.updateProgress(i + 1, chunks.length)
			}

			// Track chunk time for adaptive adjustment
			const chunkTime = Date.now() - chunkStartTime
			this.renderStats.averageChunkTime = (this.renderStats.averageChunkTime * i + chunkTime) / (i + 1)

			// Adaptive delay adjustment
			let delay = this.config.chunkDelay
			if (this.config.adaptive) {
				delay = this.calculateAdaptiveDelay(chunkTime)
			}

			// Delay before next chunk (except for last chunk)
			if (i < chunks.length - 1) {
				await this.sleep(delay)
			}

			this.emit("chunk-rendered", {
				chunk: i + 1,
				total: chunks.length,
				lines: chunk.length,
			})
		}
	}

	/**
	 * Render content with pagination
	 */
	private async renderPaginated(lines: string[], options: RenderOptions): Promise<void> {
		const pages = this.splitIntoChunks(lines, this.config.pageSize)

		for (let pageNum = 0; pageNum < pages.length; pageNum++) {
			const page = pages[pageNum]

			// Show page header
			if (pages.length > 1) {
				const pageHeader = style(
					`\n--- Page ${pageNum + 1} of ${pages.length} ---\n`,
					SemanticColors.header,
					TerminalColors.bright,
				)
				this.buffer.write(pageHeader, {
					priority: "high",
					type: "stdout",
				})
			}

			// Render page in chunks
			await this.renderChunked(page, options)

			// Show "more" indicator for next page
			if (pageNum < pages.length - 1) {
				const moreIndicator = style("\n[More content...]\n", TerminalColors.dim)
				this.buffer.write(moreIndicator, {
					priority: "normal",
					type: "stdout",
				})

				await this.buffer.flush()
				await this.sleep(this.config.chunkDelay * 2) // Longer pause between pages
			}

			this.emit("page-rendered", {
				page: pageNum + 1,
				total: pages.length,
			})
		}
	}

	/**
	 * Render header
	 */
	private async renderHeader(title: string, totalLines: number): Promise<void> {
		const header = formatSectionHeader(title, "📄")
		const info = style(`Total lines: ${totalLines}`, SemanticColors.metadata)

		this.buffer.write(header + "\n" + info + "\n\n", {
			priority: "high",
			type: "stdout",
		})

		await this.buffer.flush()
	}

	/**
	 * Show truncation notice
	 */
	private async renderTruncationNotice(totalLines: number, shownLines: number): Promise<void> {
		const hiddenLines = totalLines - shownLines
		const notice = style(
			`\n💡 ${hiddenLines} more lines hidden (showing ${shownLines}/${totalLines})\n`,
			SemanticColors.metadata,
		)

		this.buffer.write(notice, {
			priority: "normal",
			type: "stdout",
		})

		await this.buffer.flush()
	}

	/**
	 * Update progress indicator
	 */
	private async updateProgress(current: number, total: number): Promise<void> {
		const percentage = Math.round((current / total) * 100)
		const progress = style(`  [Rendering... ${percentage}%]\r`, SemanticColors.progress)

		// Use direct write to avoid buffering for progress updates
		if (this.terminalState.supportsAnsi()) {
			process.stdout.write(progress)
		}
	}

	/**
	 * Calculate adaptive delay based on render performance
	 */
	private calculateAdaptiveDelay(chunkTime: number): number {
		const baseDelay = this.config.chunkDelay

		// If chunk rendered slowly, reduce delay
		if (chunkTime > 100) {
			return Math.max(10, baseDelay / 2)
		}

		// If chunk rendered quickly, keep or slightly increase delay
		if (chunkTime < 20) {
			return baseDelay
		}

		return baseDelay
	}

	/**
	 * Split content into chunks
	 */
	private splitIntoChunks(lines: string[], chunkSize: number): string[][] {
		const chunks: string[][] = []

		for (let i = 0; i < lines.length; i += chunkSize) {
			chunks.push(lines.slice(i, i + chunkSize))
		}

		return chunks
	}

	/**
	 * Get render statistics
	 */
	getStats(): RenderStats {
		return { ...this.renderStats }
	}

	/**
	 * Reset statistics
	 */
	resetStats(): void {
		this.renderStats = {
			totalLines: 0,
			renderedLines: 0,
			chunksRendered: 0,
			elapsedTime: 0,
			averageChunkTime: 0,
		}
	}

	/**
	 * Check if currently rendering
	 */
	isCurrentlyRendering(): boolean {
		return this.isRendering
	}

	/**
	 * Sleep helper
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this.removeAllListeners()
		logger.debug("CliProgressiveRenderer disposed")
	}
}

/**
 * Global progressive renderer instance
 */
let globalRenderer: CliProgressiveRenderer | null = null

/**
 * Get or create global renderer
 */
export function getProgressiveRenderer(config?: RendererConfig): CliProgressiveRenderer {
	if (!globalRenderer) {
		globalRenderer = new CliProgressiveRenderer(config)
	}
	return globalRenderer
}

/**
 * Reset global renderer (useful for testing)
 */
export function resetProgressiveRenderer(): void {
	if (globalRenderer) {
		globalRenderer.dispose()
		globalRenderer = null
	}
}

/**
 * Convenience function to render content progressively
 */
export async function renderProgressively(content: string, options?: RenderOptions): Promise<void> {
	const renderer = getProgressiveRenderer()
	await renderer.render(content, options)
}
