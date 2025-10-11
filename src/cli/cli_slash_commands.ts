/**
 * CLI Slash Commands Handler
 * Handles slash commands for quick operations in interactive mode
 */

import type { Task } from "@/core/task"
import type { CliWebviewProvider } from "./cli_webview_provider"

export interface SlashCommand {
	name: string
	description: string
	usage: string
	aliases?: string[]
	handler: (args: string[], context: SlashCommandContext) => Promise<void>
}

export interface SlashCommandContext {
	task?: Task
	webviewProvider: CliWebviewProvider
	verbose?: boolean
	focusChainManager?: any
}

export class CliSlashCommandsHandler {
	private commands: Map<string, SlashCommand> = new Map()

	constructor() {
		this.registerDefaultCommands()
	}

	/**
	 * Register default slash commands
	 */
	private registerDefaultCommands(): void {
		// Search command
		this.register({
			name: "search",
			description: "Search the codebase for a pattern",
			usage: "/search <query>",
			aliases: ["find", "grep"],
			handler: async (args, _context) => {
				if (args.length === 0) {
					console.log("❌ Usage: /search <query>")
					return
				}

				const query = args.join(" ")
				console.log(`\n🔍 Searching for: "${query}"`)
				console.log("─".repeat(80))
				console.log("💡 This would execute a codebase search.")
				console.log("   Results would be displayed here with file paths and line numbers.")
				console.log("─".repeat(80) + "\n")
			},
		})

		// Replace command
		this.register({
			name: "replace",
			description: "Perform bulk find-and-replace operations",
			usage: "/replace <pattern> <replacement>",
			aliases: ["sub"],
			handler: async (args, _context) => {
				if (args.length < 2) {
					console.log("❌ Usage: /replace <pattern> <replacement>")
					return
				}

				const pattern = args[0]
				const replacement = args.slice(1).join(" ")
				console.log(`\n🔄 Replace: "${pattern}" → "${replacement}"`)
				console.log("─".repeat(80))
				console.log("💡 This would perform a bulk find-and-replace.")
				console.log("   Affected files and preview would be shown here.")
				console.log("─".repeat(80) + "\n")
			},
		})

		// Analyze command
		this.register({
			name: "analyze",
			description: "Analyze a specific file or directory",
			usage: "/analyze <path>",
			aliases: ["check", "inspect"],
			handler: async (args, _context) => {
				if (args.length === 0) {
					console.log("❌ Usage: /analyze <path>")
					return
				}

				const filePath = args.join(" ")
				console.log(`\n📊 Analyzing: ${filePath}`)
				console.log("─".repeat(80))
				console.log("💡 This would perform static analysis on the file.")
				console.log("   Code metrics, issues, and suggestions would be displayed.")
				console.log("─".repeat(80) + "\n")
			},
		})

		// MCP command
		this.register({
			name: "mcp",
			description: "Interact with MCP servers",
			usage: "/mcp [server|tools|status]",
			handler: async (args, _context) => {
				const subcommand = args[0] || "status"

				switch (subcommand) {
					case "status": {
						console.log("\n🔌 MCP Server Status")
						console.log("─".repeat(80))
						console.log("💡 MCP server status would be displayed here.")
						console.log("─".repeat(80) + "\n")
						break
					}
					case "tools": {
						console.log("\n🔧 Available MCP Tools")
						console.log("─".repeat(80))
						console.log("💡 List of available MCP tools would be shown here.")
						console.log("─".repeat(80) + "\n")
						break
					}
					case "servers":
					case "list": {
						console.log("\n📋 MCP Servers")
						console.log("─".repeat(80))
						console.log("💡 List of configured MCP servers would be shown here.")
						console.log("─".repeat(80) + "\n")
						break
					}
					default: {
						console.log("❌ Unknown MCP subcommand:", subcommand)
						console.log("   Usage: /mcp [status|tools|servers]")
					}
				}
			},
		})

		// Checkpoint command
		this.register({
			name: "checkpoint",
			description: "Manage Git-based checkpoints (automatic on first API request)",
			usage: "/checkpoint [status|create|changes]",
			aliases: ["cp"],
			handler: async (args, context) => {
				const subcommand = args[0] || "status"

				// Import checkpoint integration
				const { CliCheckpointIntegration } = await import("./cli_checkpoint_integration")
				const checkpointIntegration = new CliCheckpointIntegration(context.verbose)

				const controller = context.webviewProvider.controller
				const task = controller.task

				try {
					switch (subcommand) {
						case "status":
						case "info": {
							console.log(checkpointIntegration.formatCheckpointInfo(task))
							break
						}
						case "create":
						case "save": {
							if (!task) {
								console.log("\n❌ No active task. Start a task first.\n")
								break
							}

							console.log("\n💾 Creating checkpoint...")
							console.log("─".repeat(80))

							const commitHash = await checkpointIntegration.createCheckpoint(task)

							if (commitHash) {
								console.log("✅ Checkpoint created successfully!")
								console.log(`   Git commit: ${commitHash.substring(0, 8)}...`)
								console.log("   Saved to shadow Git repository")
							} else {
								console.log("⚠️  Checkpoint created but no commit hash returned.")
							}
							console.log("─".repeat(80) + "\n")
							break
						}
						case "changes":
						case "check": {
							if (!task) {
								console.log("\n❌ No active task.\n")
								break
							}

							console.log("\n🔍 Checking for changes since last completion...")
							console.log("─".repeat(80))

							const hasChanges = await checkpointIntegration.hasNewChangesSinceCompletion(task)

							if (hasChanges) {
								console.log("📝 Yes, there are new changes since last task completion.")
							} else {
								console.log("✓ No new changes since last task completion.")
							}
							console.log("─".repeat(80) + "\n")
							break
						}
						case "restore": {
							console.log("\n💡 Checkpoint restoration is available through the extension UI.")
							console.log("   This allows you to visually review changes before restoring.")
							console.log("   Use the 'View Changes' button in the chat to access this feature.\n")
							break
						}
						case "diff": {
							console.log("\n💡 Checkpoint diffs are available through the extension UI.")
							console.log("   This provides a visual comparison of file changes.")
							console.log("   Use the 'View Changes' button in the chat to see diffs.\n")
							break
						}
						default: {
							console.log("❌ Unknown checkpoint subcommand:", subcommand)
							console.log("   Usage: /checkpoint [status|create|changes]")
							console.log("\n   status  - Show checkpoint system status")
							console.log("   create  - Create a checkpoint manually")
							console.log("   changes - Check for new changes since last completion\n")
						}
					}
				} catch (error) {
					console.log("❌ Error executing checkpoint command:", error)
					if (error instanceof Error && error.message.includes("not available")) {
						console.log("\n💡 Tip: Enable checkpoints in settings:")
						console.log('   "enableCheckpointsSetting": true\n')
					}
				}
			},
		})

		// Undo command
		this.register({
			name: "undo",
			description: "Undo all changes and restore to last checkpoint",
			usage: "/undo [task|workspace|all]",
			aliases: ["revert"],
			handler: async (args, context) => {
				const restoreScope = args[0] || "all"

				// Import checkpoint integration
				const { CliCheckpointIntegration } = await import("./cli_checkpoint_integration")
				const checkpointIntegration = new CliCheckpointIntegration(context.verbose)

				const controller = context.webviewProvider.controller
				const task = controller.task

				if (!task) {
					console.log("\n❌ No active task. Start a task first.\n")
					return
				}

				try {
					// Determine restore type
					let restoreType: "task" | "workspace" | "taskAndWorkspace"
					switch (restoreScope.toLowerCase()) {
						case "task":
						case "messages":
							restoreType = "task"
							break
						case "workspace":
						case "files":
							restoreType = "workspace"
							break
						case "all":
						case "both":
						default:
							restoreType = "taskAndWorkspace"
							break
					}

					// Get last checkpoint info
					const lastCheckpointTs = checkpointIntegration.getLastCheckpointTimestamp(task)
					if (!lastCheckpointTs) {
						console.log("\n❌ No checkpoint found to restore from.")
						console.log("   Checkpoints are created automatically on the first API request.")
						console.log("   Make sure you have executed at least one task.\n")
						return
					}

					console.log("\n⏮️  Undoing changes...")
					console.log("─".repeat(80))
					console.log(`Restoring to checkpoint: ${new Date(lastCheckpointTs).toLocaleString()}`)
					console.log(`Restore type: ${restoreType}`)
					console.log("─".repeat(80))

					// Perform the undo
					await checkpointIntegration.undoToLastCheckpoint(task, restoreType)

					console.log("\n✅ Successfully restored to last checkpoint!")

					switch (restoreType) {
						case "task":
							console.log("   ✓ Task messages restored")
							console.log("   ✓ Conversation history rolled back")
							break
						case "workspace":
							console.log("   ✓ Workspace files restored")
							console.log("   ✓ File changes reverted")
							break
						case "taskAndWorkspace":
							console.log("   ✓ Task messages restored")
							console.log("   ✓ Workspace files restored")
							console.log("   ✓ All changes reverted")
							break
					}

					console.log("\n💡 Tip: You can now continue the task from this point.\n")
				} catch (error) {
					console.log("❌ Error during undo:", error)
					if (error instanceof Error) {
						if (error.message.includes("not available")) {
							console.log("\n💡 Tip: Enable checkpoints in settings:")
							console.log('   "enableCheckpointsSetting": true\n')
						} else if (error.message.includes("No checkpoint found")) {
							console.log("\n💡 Tip: Checkpoints are created automatically after the first API request.")
							console.log("   Start a task to create your first checkpoint.\n")
						}
					}
				}
			},
		})

		// History command
		this.register({
			name: "history",
			description: "View task history",
			usage: "/history [list|export]",
			aliases: ["h"],
			handler: async (args, _context) => {
				const subcommand = args[0] || "list"

				switch (subcommand) {
					case "list": {
						console.log("\n📜 Task History")
						console.log("─".repeat(80))
						console.log("💡 Recent tasks would be listed here.")
						console.log("─".repeat(80) + "\n")
						break
					}
					case "export": {
						const taskId = args[1]
						console.log(`\n📤 Exporting task: ${taskId || "latest"}`)
						console.log("─".repeat(80))
						console.log("💡 Task would be exported as markdown.")
						console.log("─".repeat(80) + "\n")
						break
					}
					default: {
						console.log("❌ Unknown history subcommand:", subcommand)
						console.log("   Usage: /history [list|export]")
					}
				}
			},
		})

		// Focus chain command
		this.register({
			name: "focus",
			description: "Manage focus chains for structured multi-step tasks",
			usage: "/focus [create|show|next|skip|clear]",
			aliases: ["fc", "steps"],
			handler: async (args, context) => {
				const subcommand = args[0] || "show"

				// Import focus chain manager
				const { CliFocusChainManager } = await import("./cli_focus_chain_manager")
				// We'll store focus chain manager in context for persistence
				if (!context.focusChainManager) {
					context.focusChainManager = new CliFocusChainManager(context.verbose)
				}
				const focusChainManager = context.focusChainManager

				try {
					switch (subcommand) {
						case "create": {
							console.log("\n📋 Creating Focus Chain...")
							console.log("─".repeat(80))
							console.log("Enter steps (one per line, empty line to finish):")

							// This is a placeholder - in interactive mode, we'd need proper input handling
							console.log("💡 Focus chain creation from CLI coming soon.")
							console.log("   For now, focus chains are created automatically by the AI.")
							console.log("─".repeat(80) + "\n")
							break
						}
						case "show":
						case "status": {
							const display = focusChainManager.displayFocusChain()
							console.log(display)
							break
						}
						case "next": {
							const moved = focusChainManager.nextStep()
							if (moved) {
								console.log("\n✅ Moved to next step!")
								console.log(focusChainManager.getCurrentStepSummary() + "\n")
							} else {
								console.log("\n❌ No next step available or no active focus chain.\n")
							}
							break
						}
						case "skip": {
							const skipped = focusChainManager.skipCurrentStep()
							if (skipped) {
								console.log("\n⏭️  Skipped current step!")
								console.log(focusChainManager.getCurrentStepSummary() + "\n")
							} else {
								console.log("\n❌ Cannot skip or no active focus chain.\n")
							}
							break
						}
						case "clear": {
							focusChainManager.clearFocusChain()
							console.log("\n✅ Focus chain cleared.\n")
							break
						}
						default: {
							console.log("❌ Unknown focus command:", subcommand)
							console.log("   Usage: /focus [create|show|next|skip|clear]")
						}
					}
				} catch (error) {
					console.log("❌ Error executing focus command:", error)
				}
			},
		})

		// Workflow command
		this.register({
			name: "workflow",
			description: "Manage and execute pre-defined task workflows",
			usage: "/workflow [list|show|run|create|delete|templates]",
			aliases: ["wf"],
			handler: async (args, context) => {
				const subcommand = args[0] || "list"

				// Import workflow manager
				const { CliWorkflowManager } = await import("./cli_workflow_manager")
				const workflowManager = new CliWorkflowManager(process.cwd(), context.verbose)

				try {
					switch (subcommand) {
						case "list": {
							console.log("\n📋 Available Workflows")
							console.log("─".repeat(80))

							const workflows = await workflowManager.listWorkflows()
							console.log(workflowManager.formatWorkflowList(workflows, false))
							console.log("─".repeat(80) + "\n")
							break
						}
						case "show": {
							const workflowName = args[1]
							if (!workflowName) {
								console.log("❌ Please specify a workflow name.")
								console.log("   Usage: /workflow show <workflow-name>\n")
								break
							}

							console.log("\n📋 Workflow Details")
							console.log("─".repeat(80))

							const workflow = await workflowManager.getWorkflow(workflowName)
							if (!workflow) {
								console.log(`❌ Workflow "${workflowName}" not found.`)
							} else {
								console.log(workflowManager.formatWorkflow(workflow, true))
							}
							console.log("─".repeat(80) + "\n")
							break
						}
						case "run":
						case "execute": {
							const workflowName = args[1]
							if (!workflowName) {
								console.log("❌ Please specify a workflow name.")
								console.log("   Usage: /workflow run <workflow-name>\n")
								break
							}

							console.log("💡 Workflow execution from slash command coming soon.")
							console.log("   For now, use: mariecoder --workflow <workflow-name>\n")
							break
						}
						case "delete":
						case "remove": {
							const workflowName = args[1]
							if (!workflowName) {
								console.log("❌ Please specify a workflow name.")
								console.log("   Usage: /workflow delete <workflow-name>\n")
								break
							}

							const success = await workflowManager.deleteWorkflow(workflowName)
							if (success) {
								console.log(`✅ Workflow "${workflowName}" deleted successfully.\n`)
							} else {
								console.log(`❌ Failed to delete workflow "${workflowName}" or workflow not found.\n`)
							}
							break
						}
						case "templates":
						case "init": {
							console.log("\n📋 Creating Template Workflows...")
							console.log("─".repeat(80))

							await workflowManager.createTemplates()
							console.log("✅ Template workflows created!")
							console.log("   • new-feature: Standard feature implementation workflow")
							console.log("   • bug-fix: Standard bug fixing workflow")
							console.log("   • refactor: Standard refactoring workflow")
							console.log("─".repeat(80) + "\n")
							break
						}
						default: {
							console.log("❌ Unknown workflow subcommand:", subcommand)
							console.log("   Usage: /workflow [list|show|run|create|delete|templates]")
						}
					}
				} catch (error) {
					console.log("❌ Error executing workflow command:", error)
				}
			},
		})

		// Help command
		this.register({
			name: "help",
			description: "Show available slash commands",
			usage: "/help [command]",
			aliases: ["?"],
			handler: async (args, _context) => {
				if (args.length > 0) {
					const commandName = args[0]
					const command = this.commands.get(commandName)

					if (command) {
						console.log(`\n📚 Help: /${command.name}`)
						console.log("─".repeat(80))
						console.log(`Description: ${command.description}`)
						console.log(`Usage: ${command.usage}`)
						if (command.aliases && command.aliases.length > 0) {
							console.log(`Aliases: ${command.aliases.map((a) => `/${a}`).join(", ")}`)
						}
						console.log("─".repeat(80) + "\n")
					} else {
						console.log(`❌ Unknown command: /${commandName}`)
						console.log("   Type /help to see all available commands.")
					}
				} else {
					this.showHelp()
				}
			},
		})
	}

	/**
	 * Register a new slash command
	 */
	register(command: SlashCommand): void {
		this.commands.set(command.name, command)

		// Register aliases
		if (command.aliases) {
			for (const alias of command.aliases) {
				this.commands.set(alias, command)
			}
		}
	}

	/**
	 * Parse and execute a slash command
	 */
	async execute(input: string, context: SlashCommandContext): Promise<boolean> {
		const trimmed = input.trim()

		// Check if input starts with /
		if (!trimmed.startsWith("/")) {
			return false
		}

		// Parse command and arguments
		const parts = trimmed.substring(1).split(/\s+/)
		const commandName = parts[0].toLowerCase()
		const args = parts.slice(1)

		// Find and execute command
		const command = this.commands.get(commandName)
		if (command) {
			try {
				await command.handler(args, context)
				return true
			} catch (error) {
				console.error(`\n❌ Error executing /${commandName}:`, error)
				return true // Still consumed the input
			}
		}

		// Unknown command
		console.log(`\n❌ Unknown command: /${commandName}`)
		console.log("   Type /help to see available commands.\n")
		return true
	}

	/**
	 * Check if input is a slash command
	 */
	isSlashCommand(input: string): boolean {
		return input.trim().startsWith("/")
	}

	/**
	 * Get all registered commands
	 */
	getCommands(): SlashCommand[] {
		const uniqueCommands = new Set<SlashCommand>()
		for (const command of this.commands.values()) {
			uniqueCommands.add(command)
		}
		return Array.from(uniqueCommands)
	}

	/**
	 * Show help for all commands
	 */
	private showHelp(): void {
		console.log("\n📚 Available Slash Commands")
		console.log("═".repeat(80))

		const commands = this.getCommands()
		for (const command of commands) {
			console.log(`\n/${command.name.padEnd(15)} ${command.description}`)
			console.log(`${"".padEnd(17)}${command.usage}`)

			if (command.aliases && command.aliases.length > 0) {
				console.log(`${"".padEnd(17)}Aliases: ${command.aliases.map((a) => `/${a}`).join(", ")}`)
			}
		}

		console.log("\n" + "═".repeat(80))
		console.log("💡 Tip: Use /help <command> for detailed help on a specific command.")
		console.log("═".repeat(80) + "\n")
	}

	/**
	 * Get command suggestions for autocomplete
	 */
	getSuggestions(partial: string): string[] {
		if (!partial.startsWith("/")) {
			return []
		}

		const prefix = partial.substring(1).toLowerCase()
		const suggestions: string[] = []

		for (const [name, command] of this.commands.entries()) {
			if (name.startsWith(prefix)) {
				suggestions.push(`/${command.name}`)
			}
		}

		return Array.from(new Set(suggestions)) // Remove duplicates
	}
}
