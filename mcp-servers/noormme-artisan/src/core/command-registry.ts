/**
 * Command Registry for NOORMME Artisan
 * Manages and provides access to all available commands
 */

import { ArtisanCommand, CommandArguments, CommandOptions, CommandResult } from "../types.js"

export class CommandRegistry {
	private commands: Map<string, ArtisanCommand> = new Map()

	/**
	 * Register a command with the registry
	 */
	register(command: ArtisanCommand): void {
		this.commands.set(command.name, command)
	}

	/**
	 * Get a command by name
	 */
	get(name: string): ArtisanCommand | undefined {
		return this.commands.get(name)
	}

	/**
	 * Get all registered commands
	 */
	getAll(): ArtisanCommand[] {
		return Array.from(this.commands.values())
	}

	/**
	 * Get commands by category/group
	 */
	getByCategory(category: string): ArtisanCommand[] {
		return this.getAll().filter((command) => command.name.startsWith(category + ":"))
	}

	/**
	 * Check if a command exists
	 */
	has(name: string): boolean {
		return this.commands.has(name)
	}

	/**
	 * Execute a command
	 */
	async execute(name: string, args: CommandArguments = {}, options: CommandOptions = {}): Promise<CommandResult> {
		const command = this.get(name)

		if (!command) {
			return {
				success: false,
				message: `Command "${name}" not found`,
				error: `Unknown command: ${name}`,
			}
		}

		try {
			// Validate arguments and options
			const validationResult = this.validateCommand(command, args, options)
			if (!validationResult.valid) {
				return {
					success: false,
					message: `Invalid arguments for command "${name}"`,
					error: validationResult.errors.join(", "),
				}
			}

			// Execute the command
			return await command.handler(args, options)
		} catch (error) {
			return {
				success: false,
				message: `Error executing command "${name}"`,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}

	/**
	 * Validate command arguments and options
	 */
	private validateCommand(
		command: ArtisanCommand,
		args: CommandArguments,
		options: CommandOptions,
	): { valid: boolean; errors: string[] } {
		const errors: string[] = []

		// Validate arguments
		if (command.arguments) {
			for (const arg of command.arguments) {
				if (arg.required && !(arg.name in args)) {
					errors.push(`Missing required argument: ${arg.name}`)
				}
			}
		}

		// Validate options
		if (command.options) {
			for (const option of command.options) {
				if (option.required && !(option.name in options)) {
					errors.push(`Missing required option: ${option.name}`)
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}

	/**
	 * Get help information for a command
	 */
	getHelp(name: string): string {
		const command = this.get(name)

		if (!command) {
			return `Command "${name}" not found`
		}

		let help = `Command: ${command.name}\n`
		help += `Description: ${command.description}\n`
		help += `Signature: ${command.signature}\n\n`

		if (command.arguments && command.arguments.length > 0) {
			help += "Arguments:\n"
			for (const arg of command.arguments) {
				help += `  ${arg.name} (${arg.type})${arg.required ? " [required]" : ""}: ${arg.description}\n`
			}
			help += "\n"
		}

		if (command.options && command.options.length > 0) {
			help += "Options:\n"
			for (const option of command.options) {
				help += `  --${option.name}${option.alias ? `, -${option.alias}` : ""} (${option.type})${option.required ? " [required]" : ""}: ${option.description}\n`
			}
		}

		return help
	}

	/**
	 * Get all available commands formatted for help
	 */
	getAllHelp(): string {
		const commands = this.getAll()

		if (commands.length === 0) {
			return "No commands available"
		}

		// Group commands by category
		const categories: Record<string, ArtisanCommand[]> = {}

		for (const command of commands) {
			const category = command.name.includes(":") ? command.name.split(":")[0] : "general"
			if (!categories[category]) {
				categories[category] = []
			}
			categories[category].push(command)
		}

		let help = "Available Commands:\n\n"

		for (const [category, categoryCommands] of Object.entries(categories)) {
			help += `${category.toUpperCase()}:\n`
			for (const command of categoryCommands) {
				help += `  ${command.name.padEnd(30)} ${command.description}\n`
			}
			help += "\n"
		}

		return help
	}
}
