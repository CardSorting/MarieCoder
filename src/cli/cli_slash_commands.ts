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
			description: "Create or restore a checkpoint",
			usage: "/checkpoint [create|restore|list]",
			aliases: ["cp", "save"],
			handler: async (args, _context) => {
				const subcommand = args[0] || "create"

				switch (subcommand) {
					case "create":
					case "save": {
						console.log("\n💾 Creating checkpoint...")
						console.log("─".repeat(80))
						console.log("💡 A checkpoint would be created here.")
						console.log("   Current task state would be saved.")
						console.log("─".repeat(80) + "\n")
						break
					}
					case "restore":
					case "load": {
						console.log("\n⏮️  Restoring checkpoint...")
						console.log("─".repeat(80))
						console.log("💡 Task state would be restored from checkpoint.")
						console.log("─".repeat(80) + "\n")
						break
					}
					case "list": {
						console.log("\n📋 Available Checkpoints")
						console.log("─".repeat(80))
						console.log("💡 List of saved checkpoints would be shown here.")
						console.log("─".repeat(80) + "\n")
						break
					}
					default: {
						console.log("❌ Unknown checkpoint subcommand:", subcommand)
						console.log("   Usage: /checkpoint [create|restore|list]")
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
