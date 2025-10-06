/**
 * Tests for CommandRegistry
 */

import { CommandRegistry } from "../../core/command-registry.js"
import { ArtisanCommand } from "../../types.js"

describe("CommandRegistry", () => {
	let registry: CommandRegistry

	const mockArtisanCommand: ArtisanCommand = {
		name: "test:command",
		description: "Test command",
		signature: "test:command <arg> [options]",
		arguments: [
			{
				name: "arg",
				description: "Test argument",
				type: "string",
				required: true,
			},
		],
		options: [
			{
				name: "option",
				description: "Test option",
				type: "string",
				required: false,
			},
		],
		handler: jest.fn().mockResolvedValue({
			success: true,
			message: "Command executed successfully",
		}),
	}

	beforeEach(() => {
		registry = new CommandRegistry()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe("register", () => {
		it("should register a command", () => {
			registry.register(mockArtisanCommand)

			expect(registry.get("test:command")).toBe(mockArtisanCommand)
		})

		it("should allow registering multiple commands", () => {
			const command1: ArtisanCommand = {
				...mockArtisanCommand,
				name: "test:command1",
			}
			const command2: ArtisanCommand = {
				...mockArtisanCommand,
				name: "test:command2",
			}

			registry.register(command1)
			registry.register(command2)

			expect(registry.get("test:command1")).toBe(command1)
			expect(registry.get("test:command2")).toBe(command2)
		})
	})

	describe("get", () => {
		it("should return registered command", () => {
			registry.register(mockArtisanCommand)

			const command = registry.get("test:command")
			expect(command).toBe(mockArtisanCommand)
		})

		it("should return undefined for non-existent command", () => {
			const command = registry.get("nonexistent:command")
			expect(command).toBeUndefined()
		})
	})

	describe("getAll", () => {
		it("should return all registered commands", () => {
			const command1: ArtisanCommand = {
				...mockArtisanCommand,
				name: "test:command1",
			}
			const command2: ArtisanCommand = {
				...mockArtisanCommand,
				name: "test:command2",
			}

			registry.register(command1)
			registry.register(command2)

			const commands = registry.getAll()
			expect(commands).toHaveLength(2)
			expect(commands).toContain(command1)
			expect(commands).toContain(command2)
		})

		it("should return empty array when no commands registered", () => {
			const commands = registry.getAll()
			expect(commands).toHaveLength(0)
		})
	})

	describe("getByCategory", () => {
		it("should return commands by category", () => {
			const makeCommand: ArtisanCommand = {
				...mockArtisanCommand,
				name: "make:component",
			}
			const dbCommand: ArtisanCommand = {
				...mockArtisanCommand,
				name: "db:migrate",
			}

			registry.register(makeCommand)
			registry.register(dbCommand)

			const makeCommands = registry.getByCategory("make")
			expect(makeCommands).toHaveLength(1)
			expect(makeCommands[0]).toBe(makeCommand)

			const dbCommands = registry.getByCategory("db")
			expect(dbCommands).toHaveLength(1)
			expect(dbCommands[0]).toBe(dbCommand)
		})
	})

	describe("has", () => {
		it("should return true for registered command", () => {
			registry.register(mockArtisanCommand)

			expect(registry.has("test:command")).toBe(true)
		})

		it("should return false for non-registered command", () => {
			expect(registry.has("nonexistent:command")).toBe(false)
		})
	})

	describe("execute", () => {
		it("should execute command successfully", async () => {
			const mockHandler = jest.fn().mockResolvedValue({
				success: true,
				message: "Command executed successfully",
			})

			const command: ArtisanCommand = {
				...mockArtisanCommand,
				handler: mockHandler,
			}

			registry.register(command)

			const result = await registry.execute("test:command", { arg: "value1" }, { option: "value2" })

			expect(result.success).toBe(true)
			expect(result.message).toBe("Command executed successfully")
			expect(mockHandler).toHaveBeenCalledWith({ arg: "value1" }, { option: "value2" })
		})

		it("should handle command not found", async () => {
			const result = await registry.execute("nonexistent:command")

			expect(result.success).toBe(false)
			expect(result.message).toContain('Command "nonexistent:command" not found')
		})

		it("should handle command execution error", async () => {
			const mockHandler = jest.fn().mockRejectedValue(new Error("Command failed"))

			const command: ArtisanCommand = {
				...mockArtisanCommand,
				handler: mockHandler,
			}

			registry.register(command)

			const result = await registry.execute("test:command")

			expect(result.success).toBe(false)
			expect(result.message).toContain("Command execution failed")
			expect(result.error).toContain("Command failed")
		})
	})

	describe("getHelp", () => {
		it("should return help for registered command", () => {
			registry.register(mockArtisanCommand)

			const help = registry.getHelp("test:command")

			expect(help).toContain("test:command")
			expect(help).toContain("Test command")
			expect(help).toContain("test:command <arg> [options]")
			expect(help).toContain("arg (string) [required]: Test argument")
			expect(help).toContain("--option (string): Test option")
		})

		it("should return error message for non-existent command", () => {
			const help = registry.getHelp("nonexistent:command")

			expect(help).toBe('Command "nonexistent:command" not found')
		})
	})

	describe("getAllHelp", () => {
		it("should return help for all commands", () => {
			const command1: ArtisanCommand = {
				...mockArtisanCommand,
				name: "test:command1",
				description: "Test command 1",
			}
			const command2: ArtisanCommand = {
				...mockArtisanCommand,
				name: "test:command2",
				description: "Test command 2",
			}

			registry.register(command1)
			registry.register(command2)

			const help = registry.getAllHelp()

			expect(help).toContain("test:command1")
			expect(help).toContain("Test command 1")
			expect(help).toContain("test:command2")
			expect(help).toContain("Test command 2")
		})

		it("should return message when no commands registered", () => {
			const help = registry.getAllHelp()

			expect(help).toBe("No commands available")
		})
	})
})
