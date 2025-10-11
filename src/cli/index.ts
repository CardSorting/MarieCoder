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
import { CliConfigManager } from "./cli_config_manager"
import { CliContext } from "./cli_context"
import { CliDiffViewProvider } from "./cli_diff_provider"
import { CliHostBridgeClient } from "./cli_host_bridge"
import { CliSetupWizard } from "./cli_setup_wizard"
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
		console.log("\n⚡ Initializing MarieCoder CLI...")
		console.log("─".repeat(80))

		// Show workspace information
		console.log(`📁 Workspace: ${this.options.workspace}`)

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
		console.log("─".repeat(80) + "\n")
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
				console.log(`📝 Loaded ${ruleCount} local rule file${ruleCount !== 1 ? "s" : ""} from .clinerules/`)
			}

			if (globalRules && this.options.verbose) {
				const globalRuleCount = Object.keys(allToggles.globalClineRules).length
				console.log(`📝 Loaded ${globalRuleCount} global rule file${globalRuleCount !== 1 ? "s" : ""}`)
			}

			if (!localRules && !globalRules) {
				console.log("💡 Tip: Create .clinerules/ to add project coding standards")
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
			console.error("\n❌ API key not configured!")
			console.log("\n" + "─".repeat(80))
			console.log("To configure your API key, you have several options:")
			console.log("\n1. Run the setup wizard (recommended for first-time users):")
			console.log("   mariecoder --setup")
			console.log("\n2. Provide via command line:")
			console.log('   mariecoder --api-key YOUR_KEY "Your task"')
			console.log("\n3. Set environment variable:")
			console.log("   export ANTHROPIC_API_KEY=your-key")
			console.log('   mariecoder "Your task"')
			console.log("\n4. Edit configuration file:")
			console.log("   ~/.mariecoder/cli/secrets.json")
			console.log("\nExample:")
			console.log('   mariecoder --api-key sk-ant-... "Create a React component"')
			console.log("─".repeat(80) + "\n")
			return false
		}

		console.log(`✓ Provider: ${provider}`)
		if (this.options.model) {
			console.log(`✓ Model: ${this.options.model}`)
		}

		return true
	}

	/**
	 * Interactive mode - keep asking for prompts
	 */
	async interactiveMode(): Promise<void> {
		console.log("\n" + "═".repeat(80))
		console.log("🎯 Interactive Mode")
		console.log("═".repeat(80))
		console.log("\nEnter your coding tasks and I'll help you accomplish them.")
		console.log("Commands:")
		console.log("  • Type your task and press Enter to start")
		console.log("  • Type 'exit' or 'quit' to end the session")
		console.log("  • Type 'config' to show current configuration")
		console.log("  • Type 'help' for more options")
		console.log("─".repeat(80))

		const prompt = async (): Promise<void> => {
			this.rl.question("\n💬 You: ", async (input) => {
				const trimmed = input.trim()

				if (!trimmed) {
					await prompt()
					return
				}

				const command = trimmed.toLowerCase()

				if (command === "exit" || command === "quit") {
					console.log("\n👋 Thanks for using MarieCoder CLI!")
					this.cleanup()
					process.exit(0)
				} else if (command === "config") {
					const { CliConfigManager: ConfigManager } = await import("./cli_config_manager")
					const configManager = new ConfigManager()
					configManager.displayConfig()
					await prompt()
					return
				} else if (command === "help") {
					this.showInteractiveModeHelp()
					await prompt()
					return
				} else if (command === "clear") {
					console.clear()
					console.log("🎯 Interactive Mode - Ready for your next task")
					await prompt()
					return
				} else {
					await this.executeTask(trimmed)
				}

				// Continue interactive mode
				await prompt()
			})
		}

		await prompt()
	}

	/**
	 * Show help for interactive mode
	 */
	private showInteractiveModeHelp(): void {
		console.log("\n" + "─".repeat(80))
		console.log("📚 Interactive Mode Help")
		console.log("─".repeat(80))
		console.log("\nAvailable Commands:")
		console.log("  • exit, quit   - Exit interactive mode")
		console.log("  • config       - Show current configuration")
		console.log("  • help         - Show this help message")
		console.log("  • clear        - Clear the screen")
		console.log("\nTips:")
		console.log("  • Be specific with your tasks for best results")
		console.log("  • You can iterate on previous tasks by providing feedback")
		console.log("  • Use Ctrl+C to interrupt a running task")
		console.log("─".repeat(80))
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
function parseArgs(args: string[]): {
	options: CliOptions
	prompt?: string
	runSetup?: boolean
	showConfig?: boolean
	resetConfig?: boolean
} {
	const options: CliOptions = {
		workspace: process.cwd(),
		verbose: false,
		autoApprove: false,
	}

	let prompt: string | undefined
	let runSetup = false
	let showConfig = false
	let resetConfig = false
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
		} else if (arg === "--setup") {
			runSetup = true
		} else if (arg === "--config") {
			showConfig = true
		} else if (arg === "--reset-config") {
			resetConfig = true
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
		} else {
			console.warn(`⚠️  Unknown option: ${arg}`)
		}

		i++
	}

	// Load configuration from file if no API key provided
	if (!options.apiKey && !runSetup && !resetConfig) {
		try {
			const configManager = new CliConfigManager()
			if (configManager.hasConfiguration()) {
				const config = configManager.loadConfig()
				options.apiKey = options.apiKey || config.apiKey
				options.provider = options.provider || config.apiProvider
				options.model = options.model || config.apiModelId
				options.temperature = options.temperature ?? config.temperature
				options.maxTokens = options.maxTokens ?? config.maxTokens
			}
		} catch {
			// Ignore config loading errors during argument parsing
		}
	}

	// Check environment variables for API key (lowest priority)
	if (!options.apiKey) {
		options.apiKey =
			process.env.ANTHROPIC_API_KEY ||
			process.env.OPENAI_API_KEY ||
			process.env.OPENROUTER_API_KEY ||
			process.env.MARIE_API_KEY
	}

	return { options, prompt, runSetup, showConfig, resetConfig }
}

/**
 * Show help message
 */
function showHelp(): void {
	console.log(`
╔═══════════════════════════════════════════════════════════════╗
║               MarieCoder CLI - Quick Reference                ║
╚═══════════════════════════════════════════════════════════════╝

USAGE:
  mariecoder [options] <prompt>    # Execute a single task
  mariecoder [options]              # Interactive mode
  mariecoder --setup                # Run setup wizard

SETUP & CONFIGURATION:
  --setup                           Run interactive setup wizard (first-time users)
  --config                          Show current configuration
  --reset-config                    Reset all configuration

BASIC OPTIONS:
  -h, --help                        Show this help message
  -v, --version                     Show version information
  -w, --workspace <path>            Workspace directory (default: current directory)

AI PROVIDER OPTIONS:
  -p, --provider <provider>         AI provider (anthropic, openai, openrouter)
  -m, --model <model>               AI model to use
  -k, --api-key <key>               API key for the AI provider
  -t, --temperature <temp>          Temperature (0.0-1.0, default: 0.0)
  --max-tokens <number>             Maximum tokens for responses

EXECUTION OPTIONS:
  -y, --auto-approve                Auto-approve all actions (⚠️  use with caution!)
  --verbose                         Show detailed logging

EXAMPLES:

  First-time setup:
    $ mariecoder --setup

  Single task:
    $ mariecoder "Create a React component for a todo list"

  Interactive mode:
    $ mariecoder

  Specify workspace:
    $ mariecoder -w ./my-project "Add tests for the auth module"

  Use specific model:
    $ mariecoder -m claude-3-5-sonnet-20241022 "Refactor the API"

  Use OpenAI:
    $ mariecoder -p openai -m gpt-4 "Add error handling"

  Auto-approve mode:
    $ mariecoder -y "Run tests and fix failures"

ENVIRONMENT VARIABLES:
  ANTHROPIC_API_KEY                 Anthropic API key
  OPENAI_API_KEY                    OpenAI API key  
  OPENROUTER_API_KEY                OpenRouter API key
  MARIE_API_KEY                     Generic API key

CONFIGURATION:
  Configuration is stored in: ~/.mariecoder/cli/
  
  config.json                       Main configuration
  secrets.json                      API keys (secure, permissions: 0600)

CLINE RULES:
  The CLI automatically loads .clinerules from your workspace directory.
  These help MarieCoder follow your project's coding standards.
  
  To create rules: mkdir .clinerules && echo "# Standards" > .clinerules/rules.md

MORE INFORMATION:
  Documentation: https://github.com/CardSorting/MarieCoder
  Issues: https://github.com/CardSorting/MarieCoder/issues
  Discord: https://discord.gg/VPxMugw2g9

Made with ❤️  by the MarieCoder community
`)
}

/**
 * Main entry point
 */
async function main() {
	try {
		const { options, prompt, runSetup, showConfig, resetConfig } = parseArgs(process.argv.slice(2))

		const configManager = new CliConfigManager()

		// Handle --reset-config
		if (resetConfig) {
			console.log("\n⚠️  This will delete all MarieCoder CLI configuration.")
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			})

			await new Promise<void>((resolve) => {
				rl.question("Are you sure? [y/N]: ", (answer) => {
					rl.close()
					if (answer.trim().toLowerCase() === "y") {
						configManager.resetConfig()
					} else {
						console.log("Cancelled.")
					}
					resolve()
				})
			})
			return
		}

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

		// Handle --config (show configuration)
		if (showConfig) {
			configManager.displayConfig()
			return
		}

		// Handle --setup (run setup wizard)
		if (runSetup) {
			const wizard = new CliSetupWizard()
			const config = await wizard.runSetupWizard()
			wizard.close()

			if (!config) {
				console.log("\n❌ Setup cancelled or failed.")
				process.exit(1)
			}

			// Ask if they want to continue with a task
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			})

			await new Promise<void>((resolve) => {
				rl.question("\nWould you like to start an interactive session now? [Y/n]: ", (answer) => {
					rl.close()
					const wantsToContinue = !answer.trim() || answer.trim().toLowerCase() === "y"

					if (!wantsToContinue) {
						console.log("\n✅ Setup complete! Run 'mariecoder' to start coding.\n")
						process.exit(0)
					}

					resolve()
				})
			})

			// Update options with configured values
			options.apiKey = config.apiKey
			options.provider = config.apiProvider
			options.model = config.apiModelId
			options.temperature = config.temperature
			options.maxTokens = config.maxTokens
		}

		// Check if first run (and not --setup)
		if (!runSetup && !configManager.hasCompletedSetup()) {
			console.log("\n👋 Welcome to MarieCoder CLI!")
			console.log("\n" + "─".repeat(80))
			console.log("It looks like this is your first time running MarieCoder CLI.")
			console.log("Let's get you set up with a quick configuration wizard.")
			console.log("─".repeat(80) + "\n")

			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			})

			const shouldRunSetup = await new Promise<boolean>((resolve) => {
				rl.question("Would you like to run the setup wizard now? [Y/n]: ", (answer) => {
					rl.close()
					resolve(!answer.trim() || answer.trim().toLowerCase() === "y")
				})
			})

			if (shouldRunSetup) {
				const wizard = new CliSetupWizard()
				const config = await wizard.runSetupWizard()
				wizard.close()

				if (!config) {
					console.log("\n❌ Setup cancelled or failed.")
					console.log("You can run setup later with: mariecoder --setup\n")
					process.exit(1)
				}

				// Update options with configured values
				options.apiKey = config.apiKey
				options.provider = config.apiProvider
				options.model = config.apiModelId
				options.temperature = config.temperature
				options.maxTokens = config.maxTokens
			} else {
				console.log("\n💡 You can run setup later with: mariecoder --setup")
				console.log("For now, you'll need to provide configuration via command-line options.\n")

				// Check if we have minimum required config
				if (!options.apiKey) {
					configManager.getConfigurationHelp()
					process.exit(1)
				}
			}
		}

		// Validate configuration before proceeding
		const mergedConfig = configManager.mergeWithOptions(options)
		const validation = configManager.validateConfig(mergedConfig)

		if (!validation.valid) {
			console.error("\n❌ Configuration errors:")
			validation.errors.forEach((error: string) => console.error(`  • ${error}`))
			configManager.getConfigurationHelp()
			process.exit(1)
		}

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
		if (error instanceof Error && error.stack) {
			console.error("\nStack trace:", error.stack)
		}
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
