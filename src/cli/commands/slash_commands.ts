/**
 * CLI Slash Commands Handler
 * Handles slash commands for quick operations in interactive mode
 */

import type { Task } from "@/core/task"
import { output } from "../ui/output/output"
import type { CliWebviewProvider } from "./providers/webview_provider"

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
					output.log("❌ Usage: /search <query>")
					return
				}

				const query = args.join(" ")
				output.log(`\n🔍 Searching for: "${query}"`)
				output.log("─".repeat(80))
				output.log("💡 This would execute a codebase search.")
				output.log("   Results would be displayed here with file paths and line numbers.")
				output.log("─".repeat(80) + "\n")
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
					output.log("❌ Usage: /replace <pattern> <replacement>")
					return
				}

				const pattern = args[0]
				const replacement = args.slice(1).join(" ")
				output.log(`\n🔄 Replace: "${pattern}" → "${replacement}"`)
				output.log("─".repeat(80))
				output.log("💡 This would perform a bulk find-and-replace.")
				output.log("   Affected files and preview would be shown here.")
				output.log("─".repeat(80) + "\n")
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
					output.log("❌ Usage: /analyze <path>")
					return
				}

				const filePath = args.join(" ")
				output.log(`\n📊 Analyzing: ${filePath}`)
				output.log("─".repeat(80))
				output.log("💡 This would perform static analysis on the file.")
				output.log("   Code metrics, issues, and suggestions would be displayed.")
				output.log("─".repeat(80) + "\n")
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
						output.log("\n🔌 MCP Server Status")
						output.log("─".repeat(80))
						output.log("💡 MCP server status would be displayed here.")
						output.log("─".repeat(80) + "\n")
						break
					}
					case "tools": {
						output.log("\n🔧 Available MCP Tools")
						output.log("─".repeat(80))
						output.log("💡 List of available MCP tools would be shown here.")
						output.log("─".repeat(80) + "\n")
						break
					}
					case "servers":
					case "list": {
						output.log("\n📋 MCP Servers")
						output.log("─".repeat(80))
						output.log("💡 List of configured MCP servers would be shown here.")
						output.log("─".repeat(80) + "\n")
						break
					}
					default: {
						output.log("❌ Unknown MCP subcommand:", subcommand)
						output.log("   Usage: /mcp [status|tools|servers]")
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
				const { CliCheckpointIntegration } = await import("../tasks/checkpoint_integration")
				const checkpointIntegration = new CliCheckpointIntegration(context.verbose)

				const controller = context.webviewProvider.controller
				const task = controller.task

				try {
					switch (subcommand) {
						case "status":
						case "info": {
							output.log(checkpointIntegration.formatCheckpointInfo(task))
							break
						}
						case "create":
						case "save": {
							if (!task) {
								output.log("\n❌ No active task. Start a task first.\n")
								break
							}

							output.log("\n💾 Creating checkpoint...")
							output.log("─".repeat(80))

							const commitHash = await checkpointIntegration.createCheckpoint(task)

							if (commitHash) {
								output.log("✅ Checkpoint created successfully!")
								output.log(`   Git commit: ${commitHash.substring(0, 8)}...`)
								output.log("   Saved to shadow Git repository")
							} else {
								output.log("⚠️  Checkpoint created but no commit hash returned.")
							}
							output.log("─".repeat(80) + "\n")
							break
						}
						case "changes":
						case "check": {
							if (!task) {
								output.log("\n❌ No active task.\n")
								break
							}

							output.log("\n🔍 Checking for changes since last completion...")
							output.log("─".repeat(80))

							const hasChanges = await checkpointIntegration.hasNewChangesSinceCompletion(task)

							if (hasChanges) {
								output.log("📝 Yes, there are new changes since last task completion.")
							} else {
								output.log("✓ No new changes since last task completion.")
							}
							output.log("─".repeat(80) + "\n")
							break
						}
						case "restore": {
							output.log("\n💡 Checkpoint restoration is available through the extension UI.")
							output.log("   This allows you to visually review changes before restoring.")
							output.log("   Use the 'View Changes' button in the chat to access this feature.\n")
							break
						}
						case "diff": {
							output.log("\n💡 Checkpoint diffs are available through the extension UI.")
							output.log("   This provides a visual comparison of file changes.")
							output.log("   Use the 'View Changes' button in the chat to see diffs.\n")
							break
						}
						default: {
							output.log("❌ Unknown checkpoint subcommand:", subcommand)
							output.log("   Usage: /checkpoint [status|create|changes]")
							output.log("\n   status  - Show checkpoint system status")
							output.log("   create  - Create a checkpoint manually")
							output.log("   changes - Check for new changes since last completion\n")
						}
					}
				} catch (error) {
					output.log("❌ Error executing checkpoint command:", error)
					if (error instanceof Error && error.message.includes("not available")) {
						output.log("\n💡 Tip: Enable checkpoints in settings:")
						output.log('   "enableCheckpointsSetting": true\n')
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
				const { CliCheckpointIntegration } = await import("../tasks/checkpoint_integration")
				const checkpointIntegration = new CliCheckpointIntegration(context.verbose)

				const controller = context.webviewProvider.controller
				const task = controller.task

				if (!task) {
					output.log("\n❌ No active task. Start a task first.\n")
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
						output.log("\n❌ No checkpoint found to restore from.")
						output.log("   Checkpoints are created automatically on the first API request.")
						output.log("   Make sure you have executed at least one task.\n")
						return
					}

					output.log("\n⏮️  Undoing changes...")
					output.log("─".repeat(80))
					output.log(`Restoring to checkpoint: ${new Date(lastCheckpointTs).toLocaleString()}`)
					output.log(`Restore type: ${restoreType}`)
					output.log("─".repeat(80))

					// Perform the undo
					await checkpointIntegration.undoToLastCheckpoint(task, restoreType)

					output.log("\n✅ Successfully restored to last checkpoint!")

					switch (restoreType) {
						case "task":
							output.log("   ✓ Task messages restored")
							output.log("   ✓ Conversation history rolled back")
							break
						case "workspace":
							output.log("   ✓ Workspace files restored")
							output.log("   ✓ File changes reverted")
							break
						case "taskAndWorkspace":
							output.log("   ✓ Task messages restored")
							output.log("   ✓ Workspace files restored")
							output.log("   ✓ All changes reverted")
							break
					}

					output.log("\n💡 Tip: You can now continue the task from this point.\n")
				} catch (error) {
					output.log("❌ Error during undo:", error)
					if (error instanceof Error) {
						if (error.message.includes("not available")) {
							output.log("\n💡 Tip: Enable checkpoints in settings:")
							output.log('   "enableCheckpointsSetting": true\n')
						} else if (error.message.includes("No checkpoint found")) {
							output.log("\n💡 Tip: Checkpoints are created automatically after the first API request.")
							output.log("   Start a task to create your first checkpoint.\n")
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
						output.log("\n📜 Task History")
						output.log("─".repeat(80))
						output.log("💡 Recent tasks would be listed here.")
						output.log("─".repeat(80) + "\n")
						break
					}
					case "export": {
						const taskId = args[1]
						output.log(`\n📤 Exporting task: ${taskId || "latest"}`)
						output.log("─".repeat(80))
						output.log("💡 Task would be exported as markdown.")
						output.log("─".repeat(80) + "\n")
						break
					}
					default: {
						output.log("❌ Unknown history subcommand:", subcommand)
						output.log("   Usage: /history [list|export]")
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
				const { CliFocusChainManager } = await import("../tasks/focus_chain_manager")
				// We'll store focus chain manager in context for persistence
				if (!context.focusChainManager) {
					context.focusChainManager = new CliFocusChainManager(context.verbose)
				}
				const focusChainManager = context.focusChainManager

				try {
					switch (subcommand) {
						case "create": {
							output.log("\n📋 Creating Focus Chain...")
							output.log("─".repeat(80))
							output.log("Enter steps (one per line, empty line to finish):")

							// This is a placeholder - in interactive mode, we'd need proper input handling
							output.log("💡 Focus chain creation from CLI coming soon.")
							output.log("   For now, focus chains are created automatically by the AI.")
							output.log("─".repeat(80) + "\n")
							break
						}
						case "show":
						case "status": {
							const display = focusChainManager.displayFocusChain()
							output.log(display)
							break
						}
						case "next": {
							const moved = focusChainManager.nextStep()
							if (moved) {
								output.log("\n✅ Moved to next step!")
								output.log(focusChainManager.getCurrentStepSummary() + "\n")
							} else {
								output.log("\n❌ No next step available or no active focus chain.\n")
							}
							break
						}
						case "skip": {
							const skipped = focusChainManager.skipCurrentStep()
							if (skipped) {
								output.log("\n⏭️  Skipped current step!")
								output.log(focusChainManager.getCurrentStepSummary() + "\n")
							} else {
								output.log("\n❌ Cannot skip or no active focus chain.\n")
							}
							break
						}
						case "clear": {
							focusChainManager.clearFocusChain()
							output.log("\n✅ Focus chain cleared.\n")
							break
						}
						default: {
							output.log("❌ Unknown focus command:", subcommand)
							output.log("   Usage: /focus [create|show|next|skip|clear]")
						}
					}
				} catch (error) {
					output.log("❌ Error executing focus command:", error)
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
				const { CliWorkflowManager } = await import("../tasks/workflow_manager")
				const workflowManager = new CliWorkflowManager(process.cwd(), context.verbose)

				try {
					switch (subcommand) {
						case "list": {
							output.log("\n📋 Available Workflows")
							output.log("─".repeat(80))

							const workflows = await workflowManager.listWorkflows()
							output.log(workflowManager.formatWorkflowList(workflows, false))
							output.log("─".repeat(80) + "\n")
							break
						}
						case "show": {
							const workflowName = args[1]
							if (!workflowName) {
								output.log("❌ Please specify a workflow name.")
								output.log("   Usage: /workflow show <workflow-name>\n")
								break
							}

							output.log("\n📋 Workflow Details")
							output.log("─".repeat(80))

							const workflow = await workflowManager.getWorkflow(workflowName)
							if (!workflow) {
								output.log(`❌ Workflow "${workflowName}" not found.`)
							} else {
								output.log(workflowManager.formatWorkflow(workflow, true))
							}
							output.log("─".repeat(80) + "\n")
							break
						}
						case "run":
						case "execute": {
							const workflowName = args[1]
							if (!workflowName) {
								output.log("❌ Please specify a workflow name.")
								output.log("   Usage: /workflow run <workflow-name>\n")
								break
							}

							output.log("💡 Workflow execution from slash command coming soon.")
							output.log("   For now, use: mariecoder --workflow <workflow-name>\n")
							break
						}
						case "delete":
						case "remove": {
							const workflowName = args[1]
							if (!workflowName) {
								output.log("❌ Please specify a workflow name.")
								output.log("   Usage: /workflow delete <workflow-name>\n")
								break
							}

							const success = await workflowManager.deleteWorkflow(workflowName)
							if (success) {
								output.log(`✅ Workflow "${workflowName}" deleted successfully.\n`)
							} else {
								output.log(`❌ Failed to delete workflow "${workflowName}" or workflow not found.\n`)
							}
							break
						}
						case "templates":
						case "init": {
							output.log("\n📋 Creating Template Workflows...")
							output.log("─".repeat(80))

							await workflowManager.createTemplates()
							output.log("✅ Template workflows created!")
							output.log("   • new-feature: Standard feature implementation workflow")
							output.log("   • bug-fix: Standard bug fixing workflow")
							output.log("   • refactor: Standard refactoring workflow")
							output.log("─".repeat(80) + "\n")
							break
						}
						default: {
							output.log("❌ Unknown workflow subcommand:", subcommand)
							output.log("   Usage: /workflow [list|show|run|create|delete|templates]")
						}
					}
				} catch (error) {
					output.log("❌ Error executing workflow command:", error)
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
						output.log(`\n📚 Help: /${command.name}`)
						output.log("─".repeat(80))
						output.log(`Description: ${command.description}`)
						output.log(`Usage: ${command.usage}`)
						if (command.aliases && command.aliases.length > 0) {
							output.log(`Aliases: ${command.aliases.map((a) => `/${a}`).join(", ")}`)
						}
						output.log("─".repeat(80) + "\n")
					} else {
						output.log(`❌ Unknown command: /${commandName}`)
						output.log("   Type /help to see all available commands.")
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
		output.log(`\n❌ Unknown command: /${commandName}`)
		output.log("   Type /help to see available commands.\n")
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
		output.log("\n📚 Available Slash Commands")
		output.log("═".repeat(80))

		const commands = this.getCommands()
		for (const command of commands) {
			output.log(`\n/${command.name.padEnd(15)} ${command.description}`)
			output.log(`${"".padEnd(17)}${command.usage}`)

			if (command.aliases && command.aliases.length > 0) {
				output.log(`${"".padEnd(17)}Aliases: ${command.aliases.map((a) => `/${a}`).join(", ")}`)
			}
		}

		output.log("\n" + "═".repeat(80))
		output.log("💡 Tip: Use /help <command> for detailed help on a specific command.")
		output.log("═".repeat(80) + "\n")
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
