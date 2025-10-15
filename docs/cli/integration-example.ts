/**
 * CLI Integration Example - How to integrate Fluid CLI Experience
 *
 * This file demonstrates how to integrate the Fluid CLI system
 * into the existing MarieCoder CLI with minimal changes.
 */

import type { withErrorBoundary } from "./src/cli/cli_error_boundary"
import { getFluidCLI, initFluidCLI } from "./src/cli/cli_fluid_experience"
import { getLogger } from "./src/cli/cli_logger"

const logger = getLogger()

/**
 * Example 1: Basic Integration (Minimal Changes)
 *
 * Add to src/cli/index.ts at the start of main()
 */
async function example1_BasicIntegration() {
	// Initialize Fluid CLI at startup
	await initFluidCLI({
		enableBuffering: true, // Enable output buffering
		installProxy: true, // Replace console.log globally
		autoCleanup: true, // Auto-cleanup on exit
	})

	logger.info("✓ Fluid CLI initialized")

	// Now all existing console.log/error/warn calls are automatically buffered!
	// No other code changes needed!

	console.log("This is automatically buffered and rate-limited")
	console.error("Errors are handled gracefully")
	console.warn("Warnings too!")
}

/**
 * Example 2: Advanced Configuration
 *
 * Fine-tune for your specific needs
 */
async function example2_AdvancedConfiguration() {
	await initFluidCLI({
		enableBuffering: true,
		installProxy: true,
		autoCleanup: true,

		// Buffer configuration
		buffer: {
			maxQueueSize: 500, // Max messages in queue
			minRenderInterval: 50, // Min ms between renders (20 FPS)
			batchSize: 10, // Messages per batch
			smoothScrolling: true, // Smooth scrolling enabled
			scrollStep: 5, // Lines per scroll step
			scrollDelay: 16, // Delay between steps (~60 FPS)
			rateLimiting: true, // Enable rate limiting
			maxOutputsPerSecond: 30, // Max outputs per second
		},

		// Progressive renderer configuration
		renderer: {
			chunkSize: 20, // Lines per chunk
			chunkDelay: 50, // ms between chunks
			enablePagination: true, // Paginate large content
			pageSize: 100, // Lines per page
			adaptive: true, // Auto-adjust based on performance
		},
	})

	logger.info("✓ Fluid CLI initialized with custom config")
}

/**
 * Example 3: Using with Task Execution
 *
 * Integration with CliTaskMonitor
 */
async function example3_TaskExecution() {
	// Initialize at startup
	await initFluidCLI()

	// In CliTaskMonitor or similar classes
	class _EnhancedTaskMonitor {
		async displayTaskOutput(output: string) {
			const cli = getFluidCLI()

			// For large outputs, use progressive rendering
			if (output.length > 1000) {
				await cli.renderLarge(output, "Task Output", 500)
			} else {
				// Small outputs go through normal console (buffered)
				console.log(output)
			}
		}

		async handleError(error: Error) {
			// Errors are automatically handled by error boundary
			// But you can also access it directly
			console.error(`Task error: ${error.message}`)

			// Force flush critical errors
			await getFluidCLI().flush()
		}
	}
}

/**
 * Example 4: Health Monitoring
 *
 * Monitor CLI health during long-running operations
 */
async function example4_HealthMonitoring() {
	await initFluidCLI()

	const cli = getFluidCLI()

	// Listen for health issues
	cli.on("health-degraded", (health) => {
		logger.warn("CLI health degraded:", health)

		if (health.buffer.queueSize > 200) {
			logger.info("Flushing buffer due to high queue size")
			cli.flush()
		}
	})

	cli.on("critical-state", () => {
		logger.error("CLI in critical state - taking recovery action")
		// System automatically attempts recovery
	})

	// Periodic health checks
	setInterval(() => {
		const health = cli.checkHealth()

		if (health.overall.status !== "excellent") {
			logger.info(`CLI Health: ${health.overall.status} (${health.overall.score}/100)`)
		}
	}, 60000) // Every minute
}

/**
 * Example 5: Large Log File Display
 *
 * Display large log files without overwhelming terminal
 */
async function example5_LargeLogDisplay(logContent: string) {
	const cli = getFluidCLI()

	// Automatically handles chunking, pagination, and smooth scrolling
	await cli.renderLarge(logContent, "Application Logs", 1000)

	// Alternative: Use progressive renderer directly
	// import { renderProgressively } from './cli_progressive_renderer'
	// await renderProgressively(logContent, {
	//   title: "Logs",
	//   maxLines: 1000,
	//   showMore: true
	// })
}

/**
 * Example 6: Error-Resistant Operations
 *
 * Wrap operations that might fail
 */
async function example6_ErrorResistance() {
	// Import the error boundary utility
	const errorBoundary = (await import("./src/cli/cli_error_boundary")) as { withErrorBoundary: typeof withErrorBoundary }

	// Wrap risky operation
	const safeOperation = errorBoundary.withErrorBoundary(
		async () => {
			// Code that might throw
			await processComplexData()
		},
		{
			component: "dataProcessor",
			operation: "processData",
			recoverable: true,
		},
	)

	// Automatically recovered on error
	await safeOperation()
}

/**
 * Example 7: Real Integration into src/cli/index.ts
 */
async function _example7_RealIntegration() {
	/**
	 * In src/cli/index.ts, modify the main() function:
	 *
	 * async function main() {
	 *   // Parse arguments
	 *   const args = process.argv.slice(2)
	 *   const options = parseCliArgs(args)
	 *
	 *   // Initialize Fluid CLI FIRST
	 *   await initFluidCLI({
	 *     enableBuffering: !options.noBuffer,  // Allow --no-buffer flag
	 *     installProxy: true,
	 *     autoCleanup: true
	 *   })
	 *
	 *   // Now continue with normal CLI initialization
	 *   const cli = new MarieCli(options)
	 *   await cli.init()
	 *
	 *   // Rest of code unchanged - all console.log automatically buffered
	 *   if (options.task) {
	 *     await cli.executeTask(options.task)
	 *   } else {
	 *     await cli.interactiveMode()
	 *   }
	 * }
	 */
}

/**
 * Example 8: Temporary Disable Buffering
 *
 * For debugging or specific operations
 */
async function _example8_TemporaryDisable() {
	const cli = getFluidCLI()

	// Disable buffering for immediate output
	cli.disableBuffering()

	console.log("This is output immediately")

	// Re-enable when done
	cli.enableBuffering()
}

/**
 * Example 9: Custom Priority Output
 *
 * Control output priority directly
 */
async function _example9_CustomPriority() {
	const cli = getFluidCLI()

	// Normal priority
	cli.write("Standard message\n", "normal")

	// High priority (rendered sooner)
	cli.write("Important message\n", "high")

	// Critical (rendered immediately, bypasses queue)
	cli.write("CRITICAL MESSAGE\n", "critical")

	// Low priority (can be dropped if queue full)
	cli.write("Debug info\n", "low")
}

/**
 * Example 10: Complete Integration Template
 */
async function completeIntegrationTemplate() {
	// ============================================
	// At the TOP of src/cli/index.ts
	// ============================================
	// import { initFluidCLI, getFluidCLI } from "./cli_fluid_experience"

	class _MarieCli {
		async init() {
			// Initialize Fluid CLI FIRST
			await initFluidCLI({
				enableBuffering: true,
				installProxy: true,
				autoCleanup: true,
				buffer: {
					maxOutputsPerSecond: 30, // Limit output rate
					smoothScrolling: true, // Smooth scrolling
				},
			})

			console.log("✓ Fluid CLI initialized")

			// Continue with rest of initialization
			// ... existing code ...
		}

		async executeTask(_prompt: string) {
			const cli = getFluidCLI()

			// Monitor health during task
			const health = cli.checkHealth()
			if (!health.healthy) {
				console.warn(`CLI health: ${health.overall.status}`)
			}

			// Execute task - all output automatically controlled
			// ... existing code ...

			// For large outputs (command output, logs, etc.)
			if (output.length > 1000) {
				await cli.renderLarge(output, "Task Output")
			} else {
				console.log(output)
			}
		}
	}

	// ============================================
	// That's it! Minimal changes, maximum benefit
	// ============================================
}

// Helper function (example)
async function processComplexData() {
	// Simulated complex operation
	await new Promise((resolve) => setTimeout(resolve, 100))
}

/**
 * Quick Migration Checklist:
 *
 * 1. ✅ Add import statement: import { initFluidCLI, getFluidCLI }
 * 2. ✅ Call initFluidCLI() at app startup (before any console.log)
 * 3. ✅ Replace large output displays with cli.renderLarge()
 * 4. ✅ (Optional) Add health monitoring for long-running processes
 * 5. ✅ (Optional) Use withErrorBoundary for risky operations
 * 6. ✅ Test with: npm run cli -- "test task"
 *
 * That's it! All existing console.log calls work automatically.
 */

export {
	example1_BasicIntegration,
	example2_AdvancedConfiguration,
	example3_TaskExecution,
	example4_HealthMonitoring,
	example5_LargeLogDisplay,
	example6_ErrorResistance,
	completeIntegrationTemplate,
}
