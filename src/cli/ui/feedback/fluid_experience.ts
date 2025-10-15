/**
 * CLI Fluid Experience - Complete integration for smooth CLI interactions
 *
 * Unified initialization and management of all fluid CLI systems:
 * - Output buffering with rate limiting
 * - Terminal state management
 * - Error boundaries with recovery
 * - Progressive rendering
 * - Console proxy for transparent buffering
 *
 * Usage:
 * ```typescript
 * import { initFluidCLI, getFluidCLI } from './ui/feedback/fluid_experience'
 *
 * // Initialize at app startup
 * await initFluidCLI({ enableBuffering: true })
 *
 * // Use normally - all console.log calls are automatically buffered
 * console.log("This output is smoothly rendered!")
 *
 * // Or use the API directly
 * const cli = getFluidCLI()
 * await cli.renderLarge(bigContent)
 * ```
 */

import { EventEmitter } from "node:events"
import {
	CliConsoleProxy,
	getConsoleProxy,
	installConsoleProxy,
	resetConsoleProxy,
	uninstallConsoleProxy,
} from "../../infrastructure/console_proxy"
import { CliErrorBoundary, getErrorBoundary, resetErrorBoundary } from "../../infrastructure/error_boundary"
import { getLogger } from "../../infrastructure/logger"
import { CliOutputBuffer, getOutputBuffer, resetOutputBuffer } from "../output/output_buffer"
import { CliTerminalState, getTerminalState, resetTerminalState } from "../output/terminal_state"
import { CliProgressiveRenderer, getProgressiveRenderer, resetProgressiveRenderer } from "./progressive_renderer"

const logger = getLogger()

/**
 * Fluid CLI configuration
 */
export interface FluidCLIConfig {
	/** Enable output buffering */
	enableBuffering?: boolean
	/** Install console proxy globally */
	installProxy?: boolean
	/** Buffer configuration */
	buffer?: {
		maxQueueSize?: number
		minRenderInterval?: number
		batchSize?: number
		smoothScrolling?: boolean
		rateLimiting?: boolean
		maxOutputsPerSecond?: number
	}
	/** Progressive renderer configuration */
	renderer?: {
		chunkSize?: number
		chunkDelay?: number
		enablePagination?: boolean
		adaptive?: boolean
	}
	/** Auto-cleanup on exit */
	autoCleanup?: boolean
}

/**
 * CLI system health status
 */
export interface HealthStatus {
	healthy: boolean
	buffer: {
		queueSize: number
		droppedMessages: number
		isHealthy: boolean
	}
	terminal: {
		supportsAnsi: boolean
		isInteractive: boolean
		isHealthy: boolean
	}
	errors: {
		totalErrors: number
		inCriticalState: boolean
		isHealthy: boolean
	}
	overall: {
		score: number // 0-100
		status: "excellent" | "good" | "degraded" | "critical"
	}
}

/**
 * CLI Fluid Experience Manager
 *
 * Orchestrates all fluid CLI systems to provide smooth,
 * crash-resistant terminal interactions.
 */
export class FluidCLIManager extends EventEmitter {
	private config: Required<FluidCLIConfig>
	private outputBuffer: CliOutputBuffer
	private terminalState: CliTerminalState
	private errorBoundary: CliErrorBoundary
	private progressiveRenderer: CliProgressiveRenderer
	private consoleProxy: CliConsoleProxy | null = null
	private initialized: boolean = false
	private healthCheckInterval: NodeJS.Timeout | null = null

	constructor(config: FluidCLIConfig = {}) {
		super()

		this.config = {
			enableBuffering: config.enableBuffering ?? true,
			installProxy: config.installProxy ?? true,
			buffer: config.buffer ?? {},
			renderer: config.renderer ?? {},
			autoCleanup: config.autoCleanup ?? true,
		}

		// Initialize core systems
		this.outputBuffer = getOutputBuffer(this.config.buffer)
		this.terminalState = getTerminalState()
		this.errorBoundary = getErrorBoundary()
		this.progressiveRenderer = getProgressiveRenderer(this.config.renderer)

		// Setup event forwarding
		this.setupEventForwarding()

		logger.info("FluidCLIManager created", this.config)
	}

	/**
	 * Initialize fluid CLI systems
	 */
	async init(): Promise<void> {
		if (this.initialized) {
			logger.warn("FluidCLI already initialized")
			return
		}

		try {
			logger.info("Initializing FluidCLI systems...")

			// Install console proxy if enabled
			if (this.config.installProxy) {
				installConsoleProxy({
					enableBuffering: this.config.enableBuffering,
					defaultPriority: "normal",
				})
				this.consoleProxy = getConsoleProxy()
				logger.info("Console proxy installed")
			}

			// Setup auto-cleanup if enabled
			if (this.config.autoCleanup) {
				this.setupAutoCleanup()
			}

			// Start health monitoring
			this.startHealthMonitoring()

			this.initialized = true
			this.emit("initialized")

			logger.info("✓ FluidCLI initialized successfully")
		} catch (error) {
			logger.error("Failed to initialize FluidCLI:", error)
			throw error
		}
	}

	/**
	 * Check system health
	 */
	checkHealth(): HealthStatus {
		const bufferStats = this.outputBuffer.getStats()
		const terminalState = this.terminalState.getState()
		const errorStats = this.errorBoundary.getStats()

		// Assess buffer health
		const bufferHealthy = bufferStats.currentQueueSize < 100 && bufferStats.droppedMessages < bufferStats.totalMessages * 0.05

		// Assess terminal health
		const terminalHealthy = terminalState.isInteractive && terminalState.supportsAnsi

		// Assess error health
		const errorsHealthy = !errorStats.inCriticalState && errorStats.totalErrors < 10

		// Calculate overall health score
		let score = 100
		if (!bufferHealthy) {
			score -= 30
		}
		if (!terminalHealthy) {
			score -= 20
		}
		if (!errorsHealthy) {
			score -= 40
		}

		const status = score >= 90 ? "excellent" : score >= 70 ? "good" : score >= 40 ? "degraded" : "critical"

		const health: HealthStatus = {
			healthy: score >= 70,
			buffer: {
				queueSize: bufferStats.currentQueueSize,
				droppedMessages: bufferStats.droppedMessages,
				isHealthy: bufferHealthy,
			},
			terminal: {
				supportsAnsi: terminalState.supportsAnsi,
				isInteractive: terminalState.isInteractive,
				isHealthy: terminalHealthy,
			},
			errors: {
				totalErrors: errorStats.totalErrors,
				inCriticalState: errorStats.inCriticalState,
				isHealthy: errorsHealthy,
			},
			overall: {
				score,
				status,
			},
		}

		return health
	}

	/**
	 * Render large content progressively
	 */
	async renderLarge(content: string, title?: string, maxLines?: number): Promise<void> {
		await this.progressiveRenderer.render(content, {
			title,
			maxLines,
			showMore: true,
		})
	}

	/**
	 * Write output with priority
	 */
	write(content: string, priority?: "critical" | "high" | "normal" | "low"): void {
		this.outputBuffer.write(content, { priority, type: "stdout" })
	}

	/**
	 * Write error with priority
	 */
	writeError(content: string): void {
		this.outputBuffer.writeError(content)
	}

	/**
	 * Flush output buffer immediately
	 */
	async flush(): Promise<void> {
		await this.outputBuffer.flush()
	}

	/**
	 * Get buffer statistics
	 */
	getBufferStats() {
		return this.outputBuffer.getStats()
	}

	/**
	 * Get renderer statistics
	 */
	getRendererStats() {
		return this.progressiveRenderer.getStats()
	}

	/**
	 * Enable buffering
	 */
	enableBuffering(): void {
		if (this.consoleProxy) {
			this.consoleProxy.enableBuffering()
		}
		this.config.enableBuffering = true
		logger.info("Buffering enabled")
	}

	/**
	 * Disable buffering (direct output)
	 */
	disableBuffering(): void {
		if (this.consoleProxy) {
			this.consoleProxy.disableBuffering()
		}
		this.config.enableBuffering = false
		logger.info("Buffering disabled")
	}

	/**
	 * Setup event forwarding from subsystems
	 */
	private setupEventForwarding(): void {
		// Buffer events
		this.outputBuffer.on("message-dropped", (msg: unknown) => {
			logger.warn("Message dropped:", (msg as { id: string }).id)
			this.emit("message-dropped", msg)
		})

		this.outputBuffer.on("error", (err: Error) => {
			logger.error("Buffer error:", err)
			this.emit("buffer-error", err)
		})

		// Terminal events
		this.terminalState.on("resize", (dims: { width: number; height: number }) => {
			logger.debug("Terminal resized:", dims)
			this.emit("terminal-resize", dims)
		})

		// Error boundary events
		this.errorBoundary.on("error", ({ error, context }: { error: Error; context: string }) => {
			logger.error("Error caught by boundary:", error)
			this.emit("error-caught", { error, context })
		})

		this.errorBoundary.on("critical-state", () => {
			logger.error("Critical error state reached")
			this.emit("critical-state")
		})

		// Renderer events
		this.progressiveRenderer.on("render-complete", (stats: unknown) => {
			logger.debug("Render complete:", stats)
			this.emit("render-complete", stats)
		})
	}

	/**
	 * Setup auto-cleanup on exit
	 */
	private setupAutoCleanup(): void {
		const cleanup = () => {
			logger.info("Auto-cleanup triggered")
			this.cleanup()
		}

		process.on("exit", cleanup)
		process.on("SIGINT", () => {
			cleanup()
			process.exit(0)
		})
		process.on("SIGTERM", () => {
			cleanup()
			process.exit(0)
		})
	}

	/**
	 * Start health monitoring
	 */
	private startHealthMonitoring(): void {
		// Check health every 30 seconds
		this.healthCheckInterval = setInterval(() => {
			const health = this.checkHealth()

			if (health.overall.status === "degraded" || health.overall.status === "critical") {
				logger.warn("CLI health degraded:", health)
				this.emit("health-degraded", health)

				// Auto-recovery attempts
				if (!health.buffer.isHealthy) {
					logger.info("Attempting buffer recovery...")
					this.outputBuffer.clear()
				}
			}
		}, 30000)
	}

	/**
	 * Cleanup all systems
	 */
	cleanup(): void {
		logger.info("Cleaning up FluidCLI systems...")

		try {
			// Stop health monitoring
			if (this.healthCheckInterval) {
				clearInterval(this.healthCheckInterval)
				this.healthCheckInterval = null
			}

			// Flush pending output
			this.outputBuffer.flush().catch((err: Error) => {
				logger.error("Error flushing buffer during cleanup:", err)
			})

			// Restore terminal state
			this.terminalState.cleanup()

			// Uninstall console proxy
			if (this.consoleProxy) {
				uninstallConsoleProxy()
			}

			this.emit("cleanup-complete")
			logger.info("FluidCLI cleanup complete")
		} catch (error) {
			logger.error("Error during cleanup:", error)
		}
	}

	/**
	 * Dispose all resources
	 */
	dispose(): void {
		this.cleanup()
		this.outputBuffer.dispose()
		this.terminalState.dispose()
		this.errorBoundary.dispose()
		this.progressiveRenderer.dispose()
		this.removeAllListeners()
		this.initialized = false
		logger.info("FluidCLI disposed")
	}
}

/**
 * Global Fluid CLI instance
 */
let globalFluidCLI: FluidCLIManager | null = null

/**
 * Initialize Fluid CLI (call once at app startup)
 */
export async function initFluidCLI(config?: FluidCLIConfig): Promise<FluidCLIManager> {
	if (globalFluidCLI) {
		logger.warn("FluidCLI already initialized, returning existing instance")
		return globalFluidCLI
	}

	globalFluidCLI = new FluidCLIManager(config)
	await globalFluidCLI.init()

	return globalFluidCLI
}

/**
 * Get Fluid CLI instance
 */
export function getFluidCLI(): FluidCLIManager {
	if (!globalFluidCLI) {
		throw new Error("FluidCLI not initialized. Call initFluidCLI() first.")
	}
	return globalFluidCLI
}

/**
 * Reset Fluid CLI (useful for testing)
 */
export function resetFluidCLI(): void {
	if (globalFluidCLI) {
		globalFluidCLI.dispose()
		globalFluidCLI = null
	}

	// Reset all subsystems
	resetOutputBuffer()
	resetTerminalState()
	resetErrorBoundary()
	resetProgressiveRenderer()
	resetConsoleProxy()

	logger.info("FluidCLI reset complete")
}

/**
 * Check if Fluid CLI is initialized
 */
export function isFluidCLIInitialized(): boolean {
	return globalFluidCLI !== null
}
