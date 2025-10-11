#!/usr/bin/env node

/**
 * MarieCoder CLI - Standalone command-line interface
 *
 * Usage:
 *   mariecoder [options] <prompt>
 *   mariecoder --help
 *
 * Examples:
 *   mariecoder "Create a React component for a todo list"
 *   mariecoder --workspace ./my-project "Add tests for the auth module"
 *   mariecoder --model claude-3-5-sonnet "Refactor the API to use async/await"
 */

import * as path from "node:path"
import * as readline from "node:readline"
import { StateManager } from "@/core/storage/StateManager"
import { HostProvider } from "@/hosts/host-provider"
import { TerminalManager } from "@/integrations/terminal/TerminalManager"
import { CliContext } from "./cli_context"
import { CliDiffViewProvider } from "./cli_diff_provider"
import { CliHostBridgeClient } from "./cli_host_bridge"
import { CliTaskMonitor } from "./cli_task_monitor"
import { CliWebviewProvider } from "./cli_webview_provider"

interface CliOptions {
	workspace: string
	model?: string
	apiKey?: string
	provider?: string
	maxTokens?: number
	temperature?: number
	autoApprove?: boolean
	verbose?: boolean
}

class MarieCli {
	private context!: CliContext
	private webviewProvider!: CliWebviewProvider
	private rl!: readline.Interface
	private taskMonitor!: CliTaskMonitor

	constructor(private options: CliOptions) {
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})
		this.taskMonitor = new CliTaskMonitor(this.options.autoApprove || false)
	}

	/**
	 * Initialize the CLI environment
	 */
	async initialize(): Promise<void> {
		console.log("🚀 Initializing MarieCoder CLI...")

		// Create CLI context
		this.context = new CliContext(this.options.workspace)

		// Initialize host provider with CLI implementations
		const cliHostBridge = new CliHostBridgeClient(this.options.workspace)

		HostProvider.initialize(
			() => new CliWebviewProvider(this.context),
			() => new CliDiffViewProvider(),
			() => new TerminalManager(),
			cliHostBridge,
			(message: string) => {
				if (this.options.verbose) {
					console.log(`[LOG] ${message}`)
				}
			},
			async () => "cli://mariecoder",
			async (name: string) => {
				// Return ripgrep binary path
				throw new Error(`Binary '${name}' not available in CLI mode`)
			},
			this.context.extensionPath,
			this.context.globalStoragePath,
		)

		// Initialize state manager (CLI-specific initialization)
		try {
			await StateManager.initialize(this.context)
		} catch (error) {
			console.error("[CLI] Failed to initialize StateManager:", error)
			throw new Error("Failed to initialize MarieCoder's application state")
		}

		// Create webview provider
		this.webviewProvider = new CliWebviewProvider(this.context)

		// Ensure clinerules are loaded and enabled by default for CLI
		await this.ensureClineRulesEnabled()

		console.log("✅ MarieCoder CLI initialized")
	}

	/**
	 * Ensure clinerules are loaded and enabled by default
	 */
	private async ensureClineRulesEnabled(): Promise<void> {
		try {
			const controller = this.webviewProvider.controller
			const { refreshAllToggles, getLocalClineRules, getGlobalClineRules } = await import(
				"@/core/context/instructions/user-instructions/rule_loader"
			)

			// Refresh and sync all rule toggles - this automatically enables new rules
			const allToggles = await refreshAllToggles(controller, this.options.workspace)

			// Check if local rules exist and report to user
			const localRules = await getLocalClineRules(this.options.workspace, allToggles.localClineRules)
			const globalRules = await getGlobalClineRules(allToggles.globalClineRules)

			if (localRules) {
				const ruleCount = Object.keys(allToggles.localClineRules).length
				console.log(`✓ Loaded ${ruleCount} local rule file${ruleCount !== 1 ? "s" : ""} from .clinerules/`)
			}

			if (globalRules && this.options.verbose) {
				const globalRuleCount = Object.keys(allToggles.globalClineRules).length
				console.log(`✓ Loaded ${globalRuleCount} global rule file${globalRuleCount !== 1 ? "s" : ""}`)
			}

			if (!localRules && !globalRules && this.options.verbose) {
				console.log("ℹ No .clinerules found in workspace or global directory")
			}
		} catch (error) {
			if (this.options.verbose) {
				console.warn("⚠ Could not sync cline rules:", error)
			}
			// Non-fatal error - continue initialization
		}
	}

	/**
	 * Execute a task with the given prompt
	 */
	async executeTask(prompt: string): Promise<void> {
		console.log("\n" + "=".repeat(80))
		console.log("📝 Task:", prompt)
		console.log("=".repeat(80) + "\n")

		try {
			// Get the controller
			const controller = this.webviewProvider.controller

			// Check if API is configured
			const apiConfig = await this.checkApiConfiguration()
			if (!apiConfig) {
				return
			}

			// Start a new task
			await controller.clearTask()

			// Create task with the prompt
			console.log("🤖 Starting task execution...\n")

			// Initialize and execute the task
			const taskId = await controller.initTask(prompt)
			console.log(`✓ Task initialized with ID: ${taskId}\n`)

			// Start monitoring the task for approvals
			if (controller.task) {
				this.taskMonitor.startMonitoring(controller.task)
			}

			// Wait for task completion or user interruption
			await this.waitForTaskCompletion(controller)

			// Stop monitoring
			this.taskMonitor.stopMonitoring()
		} catch (error) {
			this.taskMonitor.stopMonitoring()
			console.error("\n❌ Error executing task:", error)
			if (this.options.verbose && error instanceof Error) {
				console.error("Stack trace:", error.stack)
			}
			throw error
		}
	}

	/**
	 * Wait for the current task to complete
	 */
	private async waitForTaskCompletion(controller: any): Promise<void> {
		return new Promise((resolve) => {
			// Poll for task completion
			const checkInterval = setInterval(async () => {
				try {
					const state = await controller.getStateToPostToWebview()

					// Check if task is complete
					if (!controller.task || !state.currentTaskItem) {
						clearInterval(checkInterval)
						console.log("\n✅ Task completed")
						resolve()
					}
				} catch (_error) {
					// Task might have been cleared
					clearInterval(checkInterval)
					resolve()
				}
			}, 500)

			// Also listen for interruption
			const interruptHandler = () => {
				clearInterval(checkInterval)
				controller.clearTask()
				resolve()
			}

			process.once("SIGINT", interruptHandler)
		})
	}

	/**
	 * Check and configure API settings
	 */
	private async checkApiConfiguration(): Promise<boolean> {
		// Check if API key is configured
		const stateManager = this.webviewProvider.controller.stateManager

		// Get current API configuration
		// @ts-expect-error - State manager API needs to be properly typed for CLI
		const _currentProvider = await stateManager.getState("apiProvider")
		// @ts-expect-error - State manager API needs to be properly typed for CLI
		const _currentApiKey = await stateManager.getState("apiKey")

		if (this.options.apiKey) {
			// @ts-expect-error - State manager API needs to be properly typed for CLI
			await stateManager.setState("apiKey", this.options.apiKey)
		}

		if (this.options.provider) {
			// @ts-expect-error - State manager API needs to be properly typed for CLI
			await stateManager.setState("apiProvider", this.options.provider)
		}

		if (this.options.model) {
			// @ts-expect-error - State manager API needs to be properly typed for CLI
			await stateManager.setState("apiModelId", this.options.model)
		}

		// Validate configuration
		// @ts-expect-error - State manager API needs to be properly typed for CLI
		const provider = (await stateManager.getState("apiProvider")) || "anthropic"
		// @ts-expect-error - State manager API needs to be properly typed for CLI
		const apiKey = await stateManager.getState("apiKey")

		if (!apiKey) {
			console.error("❌ API key not configured!")
			console.log("\nPlease provide an API key using one of these methods:")
			console.log("  1. Command line: --api-key YOUR_KEY")
			console.log("  2. Environment variable: ANTHROPIC_API_KEY or OPENAI_API_KEY")
			console.log("  3. Configuration file: ~/.mariecoder/cli/state.json")
			console.log("\nExample:")
			console.log('  mariecoder --api-key sk-ant-... "Create a component"')
			return false
		}

		console.log(`✓ Using provider: ${provider}`)
		if (this.options.model) {
			console.log(`✓ Using model: ${this.options.model}`)
		}

		return true
	}

	/**
	 * Interactive mode - keep asking for prompts
	 */
	async interactiveMode(): Promise<void> {
		console.log("\n🎯 Interactive Mode - Enter your prompts (type 'exit' to quit)")
		console.log("─".repeat(80))

		const prompt = async (): Promise<void> => {
			this.rl.question("\n💬 You: ", async (input) => {
				const trimmed = input.trim()

				if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
					console.log("\n👋 Goodbye!")
					this.cleanup()
					process.exit(0)
				}

				if (trimmed) {
					await this.executeTask(trimmed)
				}

				// Continue interactive mode
				await prompt()
			})
		}

		await prompt()
	}

	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		this.taskMonitor.stopMonitoring()
		this.rl.close()
		this.context.dispose()
	}
}

/**
 * Parse command-line arguments
 */
function parseArgs(args: string[]): { options: CliOptions; prompt?: string } {
	const options: CliOptions = {
		workspace: process.cwd(),
		verbose: false,
		autoApprove: false,
	}

	let prompt: string | undefined
	let i = 0

	while (i < args.length) {
		const arg = args[i]

		if (arg === "--help" || arg === "-h") {
			showHelp()
			process.exit(0)
		} else if (arg === "--version" || arg === "-v") {
			const pkg = require("../../package.json")
			console.log(`MarieCoder CLI v${pkg.version}`)
			process.exit(0)
		} else if (arg === "--workspace" || arg === "-w") {
			options.workspace = path.resolve(args[++i])
		} else if (arg === "--model" || arg === "-m") {
			options.model = args[++i]
		} else if (arg === "--api-key" || arg === "-k") {
			options.apiKey = args[++i]
		} else if (arg === "--provider" || arg === "-p") {
			options.provider = args[++i]
		} else if (arg === "--max-tokens") {
			options.maxTokens = Number.parseInt(args[++i], 10)
		} else if (arg === "--temperature" || arg === "-t") {
			options.temperature = Number.parseFloat(args[++i])
		} else if (arg === "--auto-approve" || arg === "-y") {
			options.autoApprove = true
		} else if (arg === "--verbose") {
			options.verbose = true
		} else if (!arg.startsWith("-")) {
			// This is the prompt
			prompt = args.slice(i).join(" ")
			break
		}

		i++
	}

	// Check environment variables for API key
	if (!options.apiKey) {
		options.apiKey =
			process.env.ANTHROPIC_API_KEY ||
			process.env.OPENAI_API_KEY ||
			process.env.OPENROUTER_API_KEY ||
			process.env.MARIE_API_KEY
	}

	return { options, prompt }
}

/**
 * Show help message
 */
function showHelp(): void {
	console.log(`
MarieCoder CLI - AI coding assistant for your terminal

USAGE:
  mariecoder [options] <prompt>
  mariecoder [options]              # Interactive mode

OPTIONS:
  -h, --help                        Show this help message
  -v, --version                     Show version information
  -w, --workspace <path>            Workspace directory (default: current directory)
  -m, --model <model>               AI model to use (e.g., claude-3-5-sonnet-20241022)
  -k, --api-key <key>               API key for the AI provider
  -p, --provider <provider>         AI provider (anthropic, openai, openrouter)
  -t, --temperature <temp>          Temperature for AI responses (0.0 - 1.0)
  --max-tokens <number>             Maximum tokens for responses
  -y, --auto-approve                Auto-approve all actions (use with caution!)
  --verbose                         Show detailed logging

EXAMPLES:
  # Single task with prompt
  mariecoder "Create a React component for a todo list"

  # Interactive mode
  mariecoder

  # Specify workspace and model
  mariecoder -w ./my-project -m claude-3-5-sonnet-20241022 "Add tests"

  # Use OpenAI instead of Anthropic
  mariecoder -p openai -m gpt-4 "Refactor the authentication module"

ENVIRONMENT VARIABLES:
  ANTHROPIC_API_KEY                 Anthropic API key
  OPENAI_API_KEY                    OpenAI API key
  OPENROUTER_API_KEY                OpenRouter API key
  MARIE_API_KEY                     Generic API key

CONFIGURATION:
  Config is stored in: ~/.mariecoder/cli/
  
  Cline Rules: The CLI automatically loads and applies .clinerules from your
  workspace directory. Rules are enabled by default and help MarieCoder
  follow your project's coding standards and conventions.

MORE INFO:
  https://github.com/CardSorting/MarieCoder
`)
}

/**
 * Main entry point
 */
async function main() {
	try {
		const { options, prompt } = parseArgs(process.argv.slice(2))

		// Show banner
		console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███╗   ███╗ █████╗ ██████╗ ██╗███████╗ ██████╗██╗     ██╗  ║
║   ████╗ ████║██╔══██╗██╔══██╗██║██╔════╝██╔════╝██║     ██║  ║
║   ██╔████╔██║███████║██████╔╝██║█████╗  ██║     ██║     ██║  ║
║   ██║╚██╔╝██║██╔══██║██╔══██╗██║██╔══╝  ██║     ██║     ██║  ║
║   ██║ ╚═╝ ██║██║  ██║██║  ██║██║███████╗╚██████╗███████╗██║  ║
║   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝ ╚═════╝╚══════╝╚═╝  ║
║                                                               ║
║            AI Coding Assistant - Command Line Edition        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`)

		// Create CLI instance
		const cli = new MarieCli(options)

		// Setup cleanup on exit
		process.on("SIGINT", () => {
			console.log("\n\n👋 Interrupted by user")
			cli.cleanup()
			process.exit(0)
		})

		process.on("SIGTERM", () => {
			cli.cleanup()
			process.exit(0)
		})

		// Initialize
		await cli.initialize()

		// Execute task or enter interactive mode
		if (prompt) {
			await cli.executeTask(prompt)
			cli.cleanup()
		} else {
			await cli.interactiveMode()
		}
	} catch (error) {
		console.error("\n❌ Fatal error:", error)
		process.exit(1)
	}
}

// Run if called directly
if (require.main === module) {
	main().catch((error) => {
		console.error("Fatal error:", error)
		process.exit(1)
	})
}

export { MarieCli, parseArgs }
