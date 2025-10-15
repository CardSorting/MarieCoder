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
import type { TerminalManager } from "@/integrations/terminal/TerminalManager"
import { CliConfigManager } from "./config/config_manager"
import { CliContext } from "./core/context"
import { getCancellationManager } from "./infrastructure/cancellation"
import { getApiConnectionPoolManager } from "./infrastructure/connection_pool"
import { getLogger, LogLevel } from "./infrastructure/logger"
import { getDeduplicationManager } from "./infrastructure/request_deduplicator"
import { getProgressManager } from "./monitoring/progress_manager"
import { CliDiffViewProvider } from "./providers/diff_provider"
import { CliHostBridgeClient } from "./providers/host_bridge"
import { CliWebviewProvider } from "./providers/webview_provider"
import { CliTaskMonitor } from "./tasks/task_monitor"
import { CliTerminalManager } from "./terminal/terminal_manager"
import { LiveActivityMonitor, MetricsDisplay } from "./ui/feedback/enhanced_feedback"
import { SplashScreen, SuccessAnimation, TutorialOverlay } from "./ui/feedback/immersive_experience"
import { output } from "./ui/output/output"

const logger = getLogger()
const progressManager = getProgressManager()
const cancellationManager = getCancellationManager()
const apiConnectionPoolManager = getApiConnectionPoolManager()
const _deduplicationManager = getDeduplicationManager()

interface CliOptions {
	workspace: string
	model?: string
	apiKey?: string
	provider?: string
	maxTokens?: number
	temperature?: number
	autoApprove?: boolean
	verbose?: boolean
	terminalOutputLineLimit?: number
	shellIntegrationTimeout?: number
	terminalReuseEnabled?: boolean
	logLevel?: LogLevel
	maxConcurrentRequests?: number
	requestsPerMinute?: number
}

class MarieCli {
	private context!: CliContext
	private webviewProvider!: CliWebviewProvider
	private rl!: readline.Interface
	private taskMonitor!: CliTaskMonitor
	private mcpManager!: import("./providers/mcp_manager").CliMcpManager
	private taskHistoryManager!: import("./tasks/task_history_manager").CliTaskHistoryManager
	private slashCommandsHandler!: import("./commands/slash_commands").CliSlashCommandsHandler
	private mentionsParser!: import("./commands/mentions_parser").CliMentionsParser
	private commandHistory: string[] = []
	private readonly MAX_HISTORY = 100
	private hasSeenInteractiveTutorial = false

	constructor(private options: CliOptions) {
		// Configure logger
		const logLevel = this.options.verbose ? LogLevel.DEBUG : (this.options.logLevel ?? LogLevel.INFO)
		logger.setLevel(logLevel)

		// Configure connection pool
		if (this.options.maxConcurrentRequests || this.options.requestsPerMinute) {
			apiConnectionPoolManager.createPool("api", {
				maxConnections: this.options.maxConcurrentRequests || 10,
				requestsPerMinute: this.options.requestsPerMinute || 60,
				requestsPerSecond: 10,
			})
		}

		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})
		this.taskMonitor = new CliTaskMonitor(this.options.autoApprove || false, {
			lineLimit: this.options.terminalOutputLineLimit,
			shellIntegrationTimeout: this.options.shellIntegrationTimeout,
			terminalReuseEnabled: this.options.terminalReuseEnabled,
		})
	}

	/**
	 * Initialize the CLI environment
	 */
	async initialize(): Promise<void> {
		logger.info("Initializing MarieCoder CLI...")
		logger.separator()

		// Show workspace information
		logger.info(`Workspace: ${this.options.workspace}`)

		// Create CLI context
		this.context = new CliContext(this.options.workspace)

		// Initialize host provider with CLI implementations
		const cliHostBridge = new CliHostBridgeClient(this.options.workspace)

		HostProvider.initialize(
			() => new CliWebviewProvider(this.context),
			() => new CliDiffViewProvider(),
			() => new CliTerminalManager() as unknown as TerminalManager,
			cliHostBridge,
			(message: string) => {
				if (this.options.verbose) {
					output.log(`[LOG] ${message}`)
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
			const spinner = progressManager.createSpinner("Initializing state manager")
			spinner.start()
			await StateManager.initialize(this.context)
			spinner.succeed("State manager initialized")
		} catch (error) {
			logger.error("Failed to initialize StateManager", error)
			throw new Error("Failed to initialize MarieCoder's application state")
		}

		// Create webview provider
		this.webviewProvider = new CliWebviewProvider(this.context)

		// Ensure clinerules are loaded and enabled by default for CLI
		await this.ensureClineRulesEnabled()

		// Initialize MCP manager
		const { CliMcpManager: McpManager } = await import("./providers/mcp_manager")
		this.mcpManager = new McpManager(this.webviewProvider.controller, this.options.verbose || false)
		const mcpSpinner = progressManager.createSpinner("Initializing MCP manager")
		mcpSpinner.start()
		await this.mcpManager.initialize()
		mcpSpinner.succeed("MCP manager initialized")

		// Initialize task history manager
		const { CliTaskHistoryManager: HistoryManager } = await import("./tasks/task_history_manager")
		this.taskHistoryManager = new HistoryManager(this.webviewProvider.controller, this.options.verbose || false)

		// Initialize slash commands handler
		const { CliSlashCommandsHandler: SlashCommandsHandler } = await import("./commands/slash_commands")
		this.slashCommandsHandler = new SlashCommandsHandler()

		// Initialize mentions parser
		const { CliMentionsParser: MentionsParser } = await import("./commands/mentions_parser")
		this.mentionsParser = new MentionsParser(this.options.workspace)

		logger.success("MarieCoder CLI initialized")
		logger.separator()
		output.log()
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
				output.log(`📝 Loaded ${ruleCount} local rule file${ruleCount !== 1 ? "s" : ""} from .clinerules/`)
			}

			if (globalRules && this.options.verbose) {
				const globalRuleCount = Object.keys(allToggles.globalClineRules).length
				output.log(`📝 Loaded ${globalRuleCount} global rule file${globalRuleCount !== 1 ? "s" : ""}`)
			}

			if (!localRules && !globalRules) {
				output.log("💡 Tip: Create .clinerules/ to add project coding standards")
			}
		} catch (error) {
			if (this.options.verbose) {
				output.warn("⚠ Could not sync cline rules:", error)
			}
			// Non-fatal error - continue initialization
		}
	}

	/**
	 * Execute a task with the given prompt
	 */
	async executeTask(prompt: string): Promise<void> {
		// Create live monitoring components
		const activityMonitor = new LiveActivityMonitor()
		const metrics = new MetricsDisplay()
		let updateInterval: NodeJS.Timeout | null = null

		// Truncate long prompts for display
		const displayPrompt = prompt.length > 60 ? prompt.substring(0, 60) + "..." : prompt

		activityMonitor.updateActivity("main", "Initializing task...", "active", displayPrompt)

		try {
			// Get the controller
			const controller = this.webviewProvider.controller

			// Check if API is configured
			activityMonitor.updateActivity("main", "Checking configuration...", "active")
			const apiConfig = await this.checkApiConfiguration()
			if (!apiConfig) {
				activityMonitor.updateActivity("main", "Configuration missing", "error")
				output.log("\n" + activityMonitor.render())
				return
			}

			// Parse and resolve mentions
			activityMonitor.updateActivity("main", "Resolving mentions...", "active")
			const { text: processedPrompt, mentions } = await this.mentionsParser.resolveAllMentions(prompt)

			// Display resolved mentions if any
			if (mentions.length > 0) {
				const formatted = this.mentionsParser.formatResolvedMentions(mentions)
				output.log("\n" + formatted)
			}

			// Enhance prompt with mention content
			let enhancedPrompt = processedPrompt
			for (const mention of mentions) {
				if (mention.content && !mention.error) {
					enhancedPrompt += `\n\nReferenced ${mention.type} (${mention.path}):\n${mention.content}`
				}
			}

			// Start a new task
			activityMonitor.updateActivity("main", "Clearing previous task...", "active")
			await controller.clearTask()

			// Initialize and execute the task
			activityMonitor.updateActivity("main", "Starting AI analysis...", "active")
			await controller.initTask(enhancedPrompt)

			// Start monitoring the task for approvals
			if (controller.task) {
				this.taskMonitor.startMonitoring(controller.task)
			}

			// Start live update loop
			activityMonitor.updateActivity("main", "Processing your request...", "active")
			updateInterval = setInterval(() => {
				console.clear()
				output.log("\n" + "═".repeat(80))
				output.log(activityMonitor.render())
				output.log("═".repeat(80))
				output.flush()
			}, 100)

			// Wait for task completion or user interruption
			await this.waitForTaskCompletion(controller)

			// Stop monitoring
			this.taskMonitor.stopMonitoring()

			// Clear update interval
			if (updateInterval) {
				clearInterval(updateInterval)
				updateInterval = null
			}

			// Update to success state
			activityMonitor.updateActivity("main", "Task completed!", "success")

			// Clear screen and show success animation
			console.clear()
			const success = new SuccessAnimation()

			// Animate success message
			for (let i = 0; i < 6; i++) {
				console.clear()
				output.log(success.render("Task completed successfully! 🎉"))
				output.flush()
				await new Promise((resolve) => setTimeout(resolve, 150))
			}

			// Show final status
			console.clear()
			output.log("\n" + activityMonitor.render())

			// Populate and display metrics
			try {
				// Show basic completion metrics
				metrics.updateMetric("Status", 1, "✓")
				metrics.updateMetric("Completed", 1, "task")

				// Display metrics panel
				output.log("\n" + metrics.render())
			} catch {
				// Ignore errors in metrics collection
			}

			output.log("\n✅ Task completed\n")
		} catch (error) {
			this.taskMonitor.stopMonitoring()

			// Clear update interval
			if (updateInterval) {
				clearInterval(updateInterval)
				updateInterval = null
			}

			// Update to error state
			activityMonitor.updateActivity("main", "Task failed", "error", error instanceof Error ? error.message : String(error))

			// Show error state
			console.clear()
			output.log("\n" + activityMonitor.render())

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

					// Check if task is complete by checking:
					// 1. Task has been cleared (controller.task is null)
					// 2. Task has been aborted/completed (taskState.abort is true)
					// 3. Current task item is no longer in state
					if (!controller.task || !state.currentTaskItem || controller.task?.taskState?.abort) {
						clearInterval(checkInterval)
						output.log("\n✅ Task completed")
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
		const configManager = new CliConfigManager()
		const config = configManager.loadConfig()

		// Set up API configuration with plan/act mode support
		const mode = config.mode || "act"

		// Determine which provider/model to use based on current mode
		let provider = config.apiProvider
		let model = config.apiModelId

		// If separate models are configured, use mode-specific settings
		if (config.planActSeparateModelsSetting) {
			if (mode === "plan") {
				provider = config.planModeApiProvider || provider
				model = config.planModeApiModelId || model
			} else {
				provider = config.actModeApiProvider || provider
				model = config.actModeApiModelId || model
			}
		}

		// Set API configuration in state manager
		stateManager.setGlobalState("mode", mode)

		// Build API configuration with provider-specific API keys
		const apiConfiguration: any = {
			planModeApiProvider: (config.planModeApiProvider || provider) as any,
			planModeApiModelId: config.planModeApiModelId || model,
			actModeApiProvider: (config.actModeApiProvider || provider) as any,
			actModeApiModelId: config.actModeApiModelId || model,
			temperature: config.temperature,
			maxTokens: config.maxTokens,
		}

		// Map API key to provider-specific field
		if (config.apiKey) {
			if (provider === "openrouter") {
				apiConfiguration.openRouterApiKey = config.apiKey
			} else if (provider === "anthropic") {
				apiConfiguration.apiKey = config.apiKey
			} else if (provider === "openai") {
				apiConfiguration.openAiApiKey = config.apiKey
			} else {
				// Default to generic apiKey for other providers
				apiConfiguration.apiKey = config.apiKey
			}
		}

		stateManager.setApiConfiguration(apiConfiguration)
		stateManager.setGlobalState("planActSeparateModelsSetting", config.planActSeparateModelsSetting || false)

		// Validate API key exists
		if (!config.apiKey) {
			console.error("\n❌ API key not configured!")
			output.log("\n" + "─".repeat(80))
			output.log("To configure your API key, you have several options:")
			output.log("\n1. Run the setup wizard (recommended for first-time users):")
			output.log("   mariecoder --setup")
			output.log("\n2. Provide via command line:")
			output.log('   mariecoder --api-key YOUR_KEY "Your task"')
			output.log("\n3. Set environment variable:")
			output.log("   export ANTHROPIC_API_KEY=your-key")
			output.log('   mariecoder "Your task"')
			output.log("\n4. Edit configuration file:")
			output.log("   ~/.mariecoder/cli/secrets.json")
			output.log("\nExample:")
			output.log('   mariecoder --api-key sk-ant-... "Create a React component"')
			output.log("─".repeat(80) + "\n")
			return false
		}

		// Display configuration
		output.log(`✓ Provider: ${provider}`)
		output.log(`✓ Model: ${model}`)
		output.log(`✓ Mode: ${mode}`)

		if (config.planActSeparateModelsSetting) {
			output.log(`✓ Separate Plan/Act Models: Enabled`)
		}

		return true
	}

	/**
	 * Load tutorial state from disk
	 */
	private async loadTutorialState(): Promise<void> {
		try {
			const fs = await import("node:fs")
			const os = await import("node:os")
			const statePath = path.join(os.homedir(), ".mariecoder", "cli", "state.json")

			if (fs.existsSync(statePath)) {
				const data = JSON.parse(fs.readFileSync(statePath, "utf-8"))
				this.hasSeenInteractiveTutorial = data.hasSeenInteractiveTutorial || false
			}
		} catch {
			// Ignore errors - not critical
		}
	}

	/**
	 * Save tutorial state to disk
	 */
	private async saveTutorialState(): Promise<void> {
		try {
			const fs = await import("node:fs")
			const os = await import("node:os")
			const stateDir = path.join(os.homedir(), ".mariecoder", "cli")
			const statePath = path.join(stateDir, "state.json")

			let state: any = {}
			if (fs.existsSync(statePath)) {
				state = JSON.parse(fs.readFileSync(statePath, "utf-8"))
			}

			state.hasSeenInteractiveTutorial = true

			fs.mkdirSync(stateDir, { recursive: true })
			fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
		} catch {
			// Ignore errors - not critical
		}
	}

	/**
	 * Show interactive tutorial for first-time users
	 */
	private async showInteractiveTutorial(): Promise<void> {
		const tutorial = new TutorialOverlay([
			{
				title: "👋 Welcome to MarieCoder CLI Interactive Mode",
				content:
					"You can chat with MarieCoder by typing your coding tasks.\n\nI'll help you write code, fix bugs, refactor, and more!\n\nJust describe what you want in plain English.",
				hint: 'Example: "Create a React component for a user profile card"',
			},
			{
				title: "🎯 How It Works",
				content:
					"1. Type your request in natural language\n2. I'll analyze your codebase and context\n3. I'll make the changes or create new files\n4. You can continue the conversation and iterate",
			},
			{
				title: "⚡ Special Commands",
				content:
					"• help or commands - Show all available commands\n• history - View your past tasks\n• config - View or change settings\n• mode - Switch between plan/act modes\n• exit - Quit MarieCoder",
				hint: "Try typing: help",
			},
			{
				title: "💡 Pro Tips",
				content:
					"• Be specific in your requests for better results\n• Use @mentions to reference files or folders\n• Use Up/Down arrows to navigate command history\n• Press Ctrl+C anytime to cancel\n• I'll remember our conversation context",
			},
		])

		// Show each tutorial step with a delay
		console.clear()
		while (true) {
			output.log(tutorial.render())
			output.flush()

			if (tutorial.isLastStep()) {
				await new Promise((resolve) => setTimeout(resolve, 3000))
				break
			}

			await new Promise((resolve) => setTimeout(resolve, 2500))
			tutorial.nextStep()
			console.clear()
		}
		console.clear()
	}

	/**
	 * Interactive mode - keep asking for prompts
	 */
	async interactiveMode(): Promise<void> {
		// Load tutorial state
		await this.loadTutorialState()

		// Show tutorial for first-time users
		if (!this.hasSeenInteractiveTutorial) {
			await this.showInteractiveTutorial()
			this.hasSeenInteractiveTutorial = true
			await this.saveTutorialState()
		}

		output.log("\n" + "═".repeat(80))
		output.log("🎯 Interactive Mode")
		output.log("═".repeat(80))
		output.log("\nEnter your coding tasks and I'll help you accomplish them.")
		output.log("Commands:")
		output.log("  • Type your task and press Enter to start")
		output.log("  • Use @mentions to reference files (@file:path), URLs (@url:...), folders (@folder:path)")
		output.log("  • Type 'exit' or 'quit' to end the session")
		output.log("  • Type 'config' to show current configuration")
		output.log("  • Type 'mode' or 'toggle' to switch between plan/act modes")
		output.log("  • Type 'mcp' to show MCP server status")
		output.log("  • Type 'history' to view task history")
		output.log("  • Type '/help' to see slash commands (e.g., /search, /analyze)")
		output.log("  • Type 'help' or 'commands' for all options")
		output.log("  • Use Up/Down arrows to navigate command history")
		output.log("─".repeat(80))

		// Flush output before starting interactive loop
		output.flush()

		// Enable history support in readline
		// @ts-ignore - history is available but not in types
		if (this.rl.history && Array.isArray(this.rl.history)) {
			// @ts-ignore
			this.rl.history = this.commandHistory
		}

		const prompt = async (): Promise<void> => {
			// Ensure output is flushed before each prompt
			output.flush()

			this.rl.question("\n💬 You: ", async (input) => {
				const trimmed = input.trim()

				if (!trimmed) {
					await prompt()
					return
				}

				// Add to command history (avoid duplicates)
				if (trimmed !== this.commandHistory[this.commandHistory.length - 1]) {
					this.commandHistory.push(trimmed)
					if (this.commandHistory.length > this.MAX_HISTORY) {
						this.commandHistory.shift()
					}
					// Update readline history
					// @ts-ignore
					if (this.rl.history) {
						// @ts-ignore
						this.rl.history = this.commandHistory.slice().reverse()
					}
				}

				// Check for slash commands first
				if (this.slashCommandsHandler.isSlashCommand(trimmed)) {
					const handled = await this.slashCommandsHandler.execute(trimmed, {
						webviewProvider: this.webviewProvider,
						verbose: this.options.verbose,
					})
					if (handled) {
						await prompt()
						return
					}
				}

				const command = trimmed.toLowerCase()

				if (command === "exit" || command === "quit") {
					output.log("\n👋 Thanks for using MarieCoder CLI!")
					this.cleanup()
					process.exit(0)
				} else if (command === "config") {
					const { CliConfigManager: ConfigManager } = await import("./config/config_manager")
					const configManager = new ConfigManager()
					configManager.displayConfig()
					await prompt()
					return
				} else if (command === "mode" || command === "toggle") {
					await this.toggleMode()
					await prompt()
					return
				} else if (command === "mcp") {
					await this.mcpManager.displayStatus()
					await prompt()
					return
				} else if (command === "mcp tools") {
					await this.mcpManager.displayAvailableTools()
					await prompt()
					return
				} else if (command === "history" || command.startsWith("history ")) {
					await this.handleHistoryCommand(trimmed)
					await prompt()
					return
				} else if (command === "help" || command === "commands") {
					this.showInteractiveModeHelp()
					await prompt()
					return
				} else if (command === "clear") {
					console.clear()
					output.log("🎯 Interactive Mode - Ready for your next task")
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
	 * Handle history commands
	 */
	private async handleHistoryCommand(input: string): Promise<void> {
		const parts = input.split(" ")
		const subcommand = parts[1]
		const arg = parts[2]

		if (!subcommand) {
			// Show history
			await this.taskHistoryManager.displayHistory()
			return
		}

		switch (subcommand) {
			case "export":
				if (!arg) {
					output.log("\n❌ Task ID required")
					output.log("Usage: history export <task-id>\n")
					return
				}
				await this.taskHistoryManager.exportTask(arg)
				break

			case "resume":
				if (!arg) {
					output.log("\n❌ Task ID required")
					output.log("Usage: history resume <task-id>\n")
					return
				}
				await this.taskHistoryManager.resumeTask(arg)
				break

			case "delete":
				if (!arg) {
					output.log("\n❌ Task ID required")
					output.log("Usage: history delete <task-id>\n")
					return
				}
				await this.taskHistoryManager.deleteTask(arg)
				break

			case "search":
				if (!arg) {
					output.log("\n❌ Search query required")
					output.log("Usage: history search <query>\n")
					return
				}
				// Join remaining parts as query
				const query = parts.slice(2).join(" ")
				await this.taskHistoryManager.searchHistory(query)
				break

			case "details":
				if (!arg) {
					output.log("\n❌ Task ID required")
					output.log("Usage: history details <task-id>\n")
					return
				}
				await this.taskHistoryManager.displayTaskDetails(arg)
				break

			default:
				output.log(`\n❌ Unknown history command: ${subcommand}`)
				output.log("Available commands: export, resume, delete, search, details\n")
		}
	}

	/**
	 * Toggle between plan and act modes
	 */
	private async toggleMode(): Promise<void> {
		const stateManager = this.webviewProvider.controller.stateManager
		const currentMode = stateManager.getGlobalSettingsKey("mode")
		const newMode = currentMode === "plan" ? "act" : "plan"

		output.log("\n" + "─".repeat(80))
		output.log(`🔄 Mode Switch: ${currentMode} → ${newMode}`)
		output.log("─".repeat(80))

		// Update state manager
		await this.webviewProvider.controller.togglePlanActMode(newMode)

		// Update configuration file
		const configManager = new CliConfigManager()
		configManager.updateConfig({ mode: newMode })

		output.log(`✓ Now in ${newMode} mode`)

		if (newMode === "plan") {
			output.log("\n💡 Plan Mode: AI will propose changes for your review")
		} else {
			output.log("\n⚡ Act Mode: AI will execute approved changes directly")
		}

		output.log("─".repeat(80))
	}

	/**
	 * Show help for interactive mode
	 */
	private showInteractiveModeHelp(): void {
		import("./ui/output/terminal_colors").then(({ style, SemanticColors, TerminalColors }) => {
			output.log("\n" + style("═".repeat(80), SemanticColors.info))
			output.log(style("📚 Command Palette - MarieCoder CLI", TerminalColors.bright))
			output.log(style("═".repeat(80), SemanticColors.info))

			// Essentials
			output.log("\n" + style("🎯 Essential Commands", TerminalColors.bright))
			output.log("  " + style("exit, quit", SemanticColors.highlight) + "     Exit interactive mode")
			output.log("  " + style("help", SemanticColors.highlight) + "            Show this help message")
			output.log("  " + style("clear", SemanticColors.highlight) + "           Clear the screen")
			output.log("  " + style("commands", SemanticColors.highlight) + "        Show this command palette")

			// Configuration
			output.log("\n" + style("⚙️  Configuration & Settings", TerminalColors.bright))
			output.log("  " + style("config", SemanticColors.highlight) + "          Show current configuration")
			output.log("  " + style("mode, toggle", SemanticColors.highlight) + "    Switch between plan/act modes")

			// History
			output.log("\n" + style("📜 Task History", TerminalColors.bright))
			output.log("  " + style("history", SemanticColors.highlight) + "         Show task history")
			output.log("  " + style("history export <id>", SemanticColors.highlight) + "     Export task as markdown")
			output.log("  " + style("history resume <id>", SemanticColors.highlight) + "     Resume a previous task")
			output.log("  " + style("history delete <id>", SemanticColors.highlight) + "     Delete task from history")
			output.log("  " + style("history search <query>", SemanticColors.highlight) + "  Search task history")

			// MCP
			output.log("\n" + style("🔧 MCP (Model Context Protocol)", TerminalColors.bright))
			output.log("  " + style("mcp", SemanticColors.highlight) + "             Show MCP server status")
			output.log("  " + style("mcp tools", SemanticColors.highlight) + "        Show available MCP tools and resources")
			output.log("  " + style("💡 Tip:", TerminalColors.dim) + " MCP extends MarieCoder with custom tools")

			// Modes
			output.log("\n" + style("🔄 Operating Modes", TerminalColors.bright))
			output.log("  " + style("plan mode", SemanticColors.complete) + "      AI proposes changes for your review (safer)")
			output.log("  " + style("act mode", SemanticColors.progress) + "       AI executes changes directly (faster)")

			// Tips
			output.log("\n" + style("💡 Pro Tips", TerminalColors.bright))
			output.log("  • Be specific with your tasks for best results")
			output.log("  • You can iterate on previous tasks by providing feedback")
			output.log("  • Use " + style("Up/Down arrows", SemanticColors.highlight) + " to navigate command history")
			output.log("  • Use " + style("Ctrl+C", SemanticColors.warning) + " to interrupt a running task")
			output.log("  • Use plan mode for complex/risky changes")
			output.log("  • Use @mentions to reference files, folders, or URLs")

			output.log("\n" + style("─".repeat(80), TerminalColors.dim))
		})
	}

	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		try {
			logger.debug("Starting cleanup...")

			// Cancel all ongoing operations
			cancellationManager.cancelAll()

			// Stop monitoring first to prevent new operations
			this.taskMonitor.stopMonitoring()

			// Close task if active
			if (this.webviewProvider?.controller?.task) {
				try {
					this.webviewProvider.controller.clearTask().catch(() => {
						// Ignore errors during cleanup
					})
				} catch {
					// Ignore errors
				}
			}

			// Cleanup MCP manager
			if (this.mcpManager) {
				this.mcpManager.cleanup().catch((error: unknown) => {
					logger.warn("Error during MCP cleanup", error)
				})
			}

			// Shutdown connection pool
			apiConnectionPoolManager.shutdown().catch((error: unknown) => {
				logger.warn("Error shutting down connection pool", error)
			})

			// Clear progress bars
			progressManager.clear()

			// Close readline interface
			if (this.rl) {
				this.rl.close()
			}

			// Dispose context
			if (this.context) {
				this.context.dispose()
			}

			// Cleanup terminal manager
			try {
				const terminalManager = HostProvider.get().createTerminalManager()
				terminalManager.disposeAll()
			} catch {
				// Ignore if not initialized
			}

			logger.debug("Cleanup complete")
		} catch (error) {
			logger.error("Error during cleanup", error)
		}
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
			output.log(`MarieCoder CLI v${pkg.version}`)
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
		} else if (arg === "--log-level") {
			const level = args[++i].toUpperCase()
			options.logLevel = LogLevel[level as keyof typeof LogLevel] ?? LogLevel.INFO
		} else if (arg === "--max-concurrent-requests") {
			options.maxConcurrentRequests = Number.parseInt(args[++i], 10)
		} else if (arg === "--requests-per-minute") {
			options.requestsPerMinute = Number.parseInt(args[++i], 10)
		} else if (!arg.startsWith("-")) {
			// This is the prompt
			prompt = args.slice(i).join(" ")
			break
		} else {
			output.warn(`⚠️  Unknown option: ${arg}`)
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
				options.terminalOutputLineLimit = options.terminalOutputLineLimit ?? config.terminalOutputLineLimit
				options.shellIntegrationTimeout = options.shellIntegrationTimeout ?? config.shellIntegrationTimeout
				options.terminalReuseEnabled = options.terminalReuseEnabled ?? config.terminalReuseEnabled
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
	output.log(`
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
  --log-level <level>               Set log level (DEBUG, INFO, WARN, ERROR, SILENT)
  --max-concurrent-requests <n>     Maximum concurrent API requests (default: 10)
  --requests-per-minute <n>         Rate limit for API requests (default: 60)

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
			output.log("\n⚠️  This will delete all MarieCoder CLI configuration.")
			output.flush() // Ensure message is displayed before prompting

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
						output.log("Cancelled.")
					}
					resolve()
				})
			})
			return
		}

		// Show enhanced animated splash screen with ASCII art
		const splash = new SplashScreen("MarieCoder", "2.0.0", "AI Coding Assistant - Command Line Edition")

		// Render animated splash for visual impact
		await splash.renderAnimated(1500, 60)

		// Handle --config (show configuration)
		if (showConfig) {
			configManager.displayConfig()
			return
		}

		// Handle --setup (run setup wizard)
		if (runSetup) {
			const { CliSetupWizard } = await import("./config/setup_wizard")
			const wizard = new CliSetupWizard()
			const config = await wizard.runSetupWizard()
			wizard.close()

			if (!config) {
				output.log("\n❌ Setup cancelled or failed.")
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
						output.log("\n✅ Setup complete! Run 'mariecoder' to start coding.\n")
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
			output.log("\n👋 Welcome to MarieCoder CLI!")
			output.log("\n" + "─".repeat(80))
			output.log("It looks like this is your first time running MarieCoder CLI.")
			output.log("Let's get you set up with a quick configuration wizard.")
			output.log("─".repeat(80) + "\n")

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
				const { CliSetupWizard } = await import("./config/setup_wizard")
				const wizard = new CliSetupWizard()
				const config = await wizard.runSetupWizard()
				wizard.close()

				if (!config) {
					output.log("\n❌ Setup cancelled or failed.")
					output.log("You can run setup later with: mariecoder --setup\n")
					process.exit(1)
				}

				// Update options with configured values
				options.apiKey = config.apiKey
				options.provider = config.apiProvider
				options.model = config.apiModelId
				options.temperature = config.temperature
				options.maxTokens = config.maxTokens
			} else {
				output.log("\n💡 You can run setup later with: mariecoder --setup")
				output.log("For now, you'll need to provide configuration via command-line options.\n")

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

		// Track if cleanup has been called
		let cleanupCalled = false
		const doCleanup = (signal?: string) => {
			if (cleanupCalled) {
				return
			}
			cleanupCalled = true

			if (signal) {
				output.log(`\n\n👋 Received ${signal}, shutting down gracefully...`)
			}

			try {
				cli.cleanup()
			} catch (error) {
				if (options.verbose) {
					console.error("Error during cleanup:", error)
				}
			}
		}

		// Setup cleanup on exit
		process.on("SIGINT", () => {
			doCleanup("SIGINT")
			process.exit(130) // Standard exit code for SIGINT
		})

		process.on("SIGTERM", () => {
			doCleanup("SIGTERM")
			process.exit(143) // Standard exit code for SIGTERM
		})

		process.on("exit", () => {
			doCleanup()
		})

		// Handle uncaught errors
		process.on("uncaughtException", (error) => {
			console.error("\n❌ Uncaught exception:", error)
			doCleanup()
			process.exit(1)
		})

		process.on("unhandledRejection", (reason) => {
			console.error("\n❌ Unhandled rejection:", reason)
			doCleanup()
			process.exit(1)
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
