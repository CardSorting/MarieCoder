/**
 * CLI Output Buffer - Intelligent output management for fluid CLI experience
 *
 * Prevents rapid scrolling, controls output rate, and provides smooth
 * rendering with batching, throttling, and priority queuing.
 *
 * Key features:
 * - Output queueing with priority levels
 * - Rate limiting to prevent terminal flooding
 * - Batching for efficient rendering
 * - Smooth scrolling with controlled pace
 * - Buffer overflow protection
 * - Error boundary with graceful recovery
 */

import { EventEmitter } from "node:events"
import { getLogger } from "../../infrastructure/logger"

const logger = getLogger()

/**
 * Output message with metadata
 */
interface OutputMessage {
	id: string
	content: string
	priority: "critical" | "high" | "normal" | "low"
	timestamp: number
	type: "stdout" | "stderr"
	source?: string
}

/**
 * Output buffer configuration
 */
interface BufferConfig {
	/** Maximum messages in queue before dropping low priority */
	maxQueueSize?: number
	/** Minimum time between renders (ms) */
	minRenderInterval?: number
	/** Maximum messages to render per batch */
	batchSize?: number
	/** Enable smooth scrolling control */
	smoothScrolling?: boolean
	/** Lines per scroll step */
	scrollStep?: number
	/** Delay between scroll steps (ms) */
	scrollDelay?: number
	/** Enable rate limiting */
	rateLimiting?: boolean
	/** Max outputs per second */
	maxOutputsPerSecond?: number
}

/**
 * Output statistics for monitoring
 */
interface OutputStats {
	totalMessages: number
	droppedMessages: number
	batchesRendered: number
	averageBatchSize: number
	currentQueueSize: number
	lastRenderTime: number
}

/**
 * CLI Output Buffer Manager
 *
 * Manages all terminal output with intelligent queuing, batching,
 * and rate limiting to prevent rapid scrolling and ensure smooth UX.
 */
export class CliOutputBuffer extends EventEmitter {
	private config: Required<BufferConfig>
	private queue: OutputMessage[] = []
	private renderTimer: NodeJS.Timeout | null = null
	private lastRenderTime: number = 0
	private messageCounter: number = 0
	private stats: OutputStats = {
		totalMessages: 0,
		droppedMessages: 0,
		batchesRendered: 0,
		averageBatchSize: 0,
		currentQueueSize: 0,
		lastRenderTime: 0,
	}
	private isRendering: boolean = false
	private rateLimitTokens: number = 0
	private rateLimitLastRefill: number = Date.now()
	private errorCount: number = 0
	private readonly MAX_ERRORS = 10

	constructor(config: BufferConfig = {}) {
		super()
		this.config = {
			maxQueueSize: config.maxQueueSize ?? 500,
			minRenderInterval: config.minRenderInterval ?? 50, // 20 FPS max
			batchSize: config.batchSize ?? 10,
			smoothScrolling: config.smoothScrolling ?? true,
			scrollStep: config.scrollStep ?? 5,
			scrollDelay: config.scrollDelay ?? 16, // ~60 FPS
			rateLimiting: config.rateLimiting ?? true,
			maxOutputsPerSecond: config.maxOutputsPerSecond ?? 30,
		}

		// Initialize rate limit tokens
		this.rateLimitTokens = this.config.maxOutputsPerSecond

		// Start render loop
		this.startRenderLoop()

		// Refill rate limit tokens periodically
		if (this.config.rateLimiting) {
			setInterval(() => {
				this.refillRateLimitTokens()
			}, 1000)
		}

		logger.debug("CliOutputBuffer initialized", this.config)
	}

	/**
	 * Write output to buffer (primary API)
	 */
	write(
		content: string,
		options: {
			priority?: "critical" | "high" | "normal" | "low"
			type?: "stdout" | "stderr"
			source?: string
		} = {},
	): void {
		try {
			const { priority = "normal", type = "stdout", source } = options

			// Skip empty content
			if (!content || content.trim().length === 0) {
				return
			}

			// Create message
			const message: OutputMessage = {
				id: `msg-${this.messageCounter++}`,
				content,
				priority,
				timestamp: Date.now(),
				type,
				source,
			}

			// Check queue size
			if (this.queue.length >= this.config.maxQueueSize) {
				// Drop low priority messages when queue is full
				if (priority === "low") {
					this.stats.droppedMessages++
					logger.warn(`Dropped low priority message (queue full: ${this.queue.length})`)
					this.emit("message-dropped", message)
					return
				}

				// Remove lowest priority message to make room
				const lowestPriorityIndex = this.findLowestPriorityIndex()
				if (lowestPriorityIndex >= 0) {
					const dropped = this.queue.splice(lowestPriorityIndex, 1)[0]
					this.stats.droppedMessages++
					logger.warn(`Dropped message to make room: ${dropped.id}`)
					this.emit("message-dropped", dropped)
				}
			}

			// Add to queue
			this.queue.push(message)
			this.stats.totalMessages++
			this.stats.currentQueueSize = this.queue.length

			// Trigger immediate render for critical messages
			if (priority === "critical" && !this.isRendering) {
				this.renderNow()
			}

			this.emit("message-queued", message)
		} catch (error) {
			this.handleError("write", error)
		}
	}

	/**
	 * Write line with automatic newline
	 */
	writeLine(content: string, options?: Parameters<typeof this.write>[1]): void {
		this.write(content + "\n", options)
	}

	/**
	 * Write error message
	 */
	writeError(content: string, options?: Omit<Parameters<typeof this.write>[1], "type">): void {
		this.write(content, { ...options, type: "stderr", priority: "high" })
	}

	/**
	 * Flush buffer immediately (bypass rate limiting)
	 */
	async flush(): Promise<void> {
		try {
			// Stop render loop temporarily
			if (this.renderTimer) {
				clearTimeout(this.renderTimer)
				this.renderTimer = null
			}

			// Render all pending messages
			await this.renderBatch(this.queue.length)

			// Restart render loop
			this.startRenderLoop()
		} catch (error) {
			this.handleError("flush", error)
		}
	}

	/**
	 * Clear buffer without rendering
	 */
	clear(): void {
		const droppedCount = this.queue.length
		this.queue = []
		this.stats.droppedMessages += droppedCount
		this.stats.currentQueueSize = 0
		logger.debug(`Buffer cleared, dropped ${droppedCount} messages`)
		this.emit("buffer-cleared", droppedCount)
	}

	/**
	 * Get current statistics
	 */
	getStats(): OutputStats {
		return { ...this.stats }
	}

	/**
	 * Check if rate limit allows output
	 */
	private canRender(): boolean {
		if (!this.config.rateLimiting) {
			return true
		}

		return this.rateLimitTokens > 0
	}

	/**
	 * Consume a rate limit token
	 */
	private consumeToken(): void {
		if (this.config.rateLimiting && this.rateLimitTokens > 0) {
			this.rateLimitTokens--
		}
	}

	/**
	 * Refill rate limit tokens
	 */
	private refillRateLimitTokens(): void {
		const now = Date.now()
		const elapsed = now - this.rateLimitLastRefill

		if (elapsed >= 1000) {
			this.rateLimitTokens = this.config.maxOutputsPerSecond
			this.rateLimitLastRefill = now
		}
	}

	/**
	 * Start the render loop
	 */
	private startRenderLoop(): void {
		if (this.renderTimer) {
			return
		}

		const loop = async () => {
			try {
				await this.renderNextBatch()
			} catch (error) {
				this.handleError("render-loop", error)
			}

			// Schedule next iteration
			this.renderTimer = setTimeout(loop, this.config.minRenderInterval)
		}

		this.renderTimer = setTimeout(loop, this.config.minRenderInterval)
	}

	/**
	 * Render next batch of messages
	 */
	private async renderNextBatch(): Promise<void> {
		// Skip if already rendering
		if (this.isRendering) {
			return
		}

		// Skip if queue is empty
		if (this.queue.length === 0) {
			return
		}

		// Check rate limit
		if (!this.canRender()) {
			return
		}

		// Check minimum render interval
		const now = Date.now()
		const timeSinceLastRender = now - this.lastRenderTime
		if (timeSinceLastRender < this.config.minRenderInterval) {
			return
		}

		this.isRendering = true

		try {
			// Sort queue by priority
			this.sortQueueByPriority()

			// Determine batch size
			const batchSize = Math.min(this.config.batchSize, this.queue.length)

			// Render batch
			await this.renderBatch(batchSize)

			this.lastRenderTime = Date.now()
			this.stats.lastRenderTime = this.lastRenderTime
		} finally {
			this.isRendering = false
		}
	}

	/**
	 * Render a batch of messages
	 */
	private async renderBatch(size: number): Promise<void> {
		if (size <= 0 || this.queue.length === 0) {
			return
		}

		// Extract batch
		const batch = this.queue.splice(0, size)
		this.stats.currentQueueSize = this.queue.length

		// Group by type
		const stdoutMessages = batch.filter((m) => m.type === "stdout")
		const stderrMessages = batch.filter((m) => m.type === "stderr")

		// Render with smooth scrolling if enabled
		if (this.config.smoothScrolling && batch.length > this.config.scrollStep) {
			await this.renderSmooth(stdoutMessages, stderrMessages)
		} else {
			await this.renderImmediate(stdoutMessages, stderrMessages)
		}

		// Update stats
		this.stats.batchesRendered++
		this.stats.averageBatchSize =
			(this.stats.averageBatchSize * (this.stats.batchesRendered - 1) + batch.length) / this.stats.batchesRendered

		// Consume rate limit token
		this.consumeToken()

		this.emit("batch-rendered", {
			size: batch.length,
			remaining: this.queue.length,
		})
	}

	/**
	 * Render messages immediately
	 */
	private async renderImmediate(stdoutMessages: OutputMessage[], stderrMessages: OutputMessage[]): Promise<void> {
		// Render stdout
		if (stdoutMessages.length > 0) {
			const content = stdoutMessages.map((m) => m.content).join("")
			process.stdout.write(content)
		}

		// Render stderr
		if (stderrMessages.length > 0) {
			const content = stderrMessages.map((m) => m.content).join("")
			process.stderr.write(content)
		}
	}

	/**
	 * Render messages with smooth scrolling
	 */
	private async renderSmooth(stdoutMessages: OutputMessage[], stderrMessages: OutputMessage[]): Promise<void> {
		const allMessages = [...stdoutMessages, ...stderrMessages].sort((a, b) => a.timestamp - b.timestamp)

		// Render in chunks
		for (let i = 0; i < allMessages.length; i += this.config.scrollStep) {
			const chunk = allMessages.slice(i, i + this.config.scrollStep)

			for (const message of chunk) {
				const stream = message.type === "stdout" ? process.stdout : process.stderr
				stream.write(message.content)
			}

			// Small delay for smooth scrolling effect
			if (i + this.config.scrollStep < allMessages.length) {
				await this.sleep(this.config.scrollDelay)
			}
		}
	}

	/**
	 * Render immediately without queue (for critical messages)
	 */
	private renderNow(): void {
		if (this.queue.length === 0) {
			return
		}

		// Get all critical messages
		const criticalMessages = this.queue.filter((m) => m.priority === "critical")
		if (criticalMessages.length === 0) {
			return
		}

		// Remove from queue
		this.queue = this.queue.filter((m) => m.priority !== "critical")
		this.stats.currentQueueSize = this.queue.length

		// Render immediately
		for (const message of criticalMessages) {
			const stream = message.type === "stdout" ? process.stdout : process.stderr
			stream.write(message.content)
		}

		this.emit("critical-rendered", criticalMessages.length)
	}

	/**
	 * Sort queue by priority
	 */
	private sortQueueByPriority(): void {
		const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
		this.queue.sort((a, b) => {
			const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
			if (priorityDiff !== 0) {
				return priorityDiff
			}
			return a.timestamp - b.timestamp
		})
	}

	/**
	 * Find lowest priority message index
	 */
	private findLowestPriorityIndex(): number {
		let lowestIndex = -1
		let lowestPriority = -1
		const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }

		for (let i = 0; i < this.queue.length; i++) {
			const priority = priorityOrder[this.queue[i].priority]
			if (priority > lowestPriority) {
				lowestPriority = priority
				lowestIndex = i
			}
		}

		return lowestIndex
	}

	/**
	 * Sleep for specified milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	/**
	 * Handle errors with recovery
	 */
	private handleError(context: string, error: unknown): void {
		this.errorCount++

		logger.error(`CliOutputBuffer error in ${context}:`, error)

		// Emit error event
		this.emit("error", { context, error })

		// If too many errors, clear buffer and reset
		if (this.errorCount >= this.MAX_ERRORS) {
			logger.error(`Too many errors (${this.errorCount}), resetting buffer`)
			this.clear()
			this.errorCount = 0
		}
	}

	/**
	 * Cleanup resources
	 */
	dispose(): void {
		if (this.renderTimer) {
			clearTimeout(this.renderTimer)
			this.renderTimer = null
		}

		// Flush remaining messages
		this.flush().catch((error) => {
			logger.error("Error flushing buffer on dispose:", error)
		})

		this.removeAllListeners()

		logger.debug("CliOutputBuffer disposed")
	}
}

/**
 * Global output buffer instance
 */
let globalOutputBuffer: CliOutputBuffer | null = null

/**
 * Get or create global output buffer
 */
export function getOutputBuffer(config?: BufferConfig): CliOutputBuffer {
	if (!globalOutputBuffer) {
		globalOutputBuffer = new CliOutputBuffer(config)
	}
	return globalOutputBuffer
}

/**
 * Reset global output buffer (useful for testing)
 */
export function resetOutputBuffer(): void {
	if (globalOutputBuffer) {
		globalOutputBuffer.dispose()
		globalOutputBuffer = null
	}
}

/**
 * Convenience function to write to global buffer
 */
export function bufferWrite(content: string, options?: Parameters<CliOutputBuffer["write"]>[1]): void {
	const buffer = getOutputBuffer()
	buffer.write(content, options)
}

/**
 * Convenience function to write line to global buffer
 */
export function bufferWriteLine(content: string, options?: Parameters<CliOutputBuffer["write"]>[1]): void {
	const buffer = getOutputBuffer()
	buffer.writeLine(content, options)
}

/**
 * Convenience function to write error to global buffer
 */
export function bufferWriteError(content: string, options?: Parameters<CliOutputBuffer["writeError"]>[1]): void {
	const buffer = getOutputBuffer()
	buffer.writeError(content, options)
}

/**
 * Convenience function to flush global buffer
 */
export async function bufferFlush(): Promise<void> {
	const buffer = getOutputBuffer()
	await buffer.flush()
}
