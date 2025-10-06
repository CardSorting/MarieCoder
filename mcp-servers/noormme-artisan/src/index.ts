/**
 * NOORMME Artisan MCP Server
 * Laravel-style commands for Next.js development
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js"
import { migrateCommand } from "./commands/database/migrate.js"
import { seedCommand } from "./commands/database/seed.js"
import { serveCommand } from "./commands/dev/serve.js"
import { testCommand } from "./commands/dev/test.js"
import { installAdminCommand } from "./commands/install/admin.js"
import { installAuthCommand } from "./commands/install/auth.js"
import { makeApiCommand } from "./commands/make/api.js"
// Commands
import { makeComponentCommand } from "./commands/make/component.js"
import { makeMiddlewareCommand } from "./commands/make/middleware.js"
import { makeMigrationCommand } from "./commands/make/migration.js"
import { makePageCommand } from "./commands/make/page.js"
import { makeServiceCommand } from "./commands/make/service.js"
import { newProjectCommand } from "./commands/project/new.js"
// Core modules
import { CommandRegistry } from "./core/command-registry.js"
import { ProjectAnalyzer } from "./core/project-analyzer.js"

// Types
import { MCPToolResult } from "./types.js"

export class NoormmeArtisanServer {
	private server: Server
	private commandRegistry: CommandRegistry
	private projectAnalyzer: ProjectAnalyzer

	constructor() {
		this.server = new Server(
			{
				name: "noormme-artisan",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {},
				},
			},
		)

		this.commandRegistry = new CommandRegistry()
		this.projectAnalyzer = new ProjectAnalyzer(process.cwd())

		this.registerCommands()
		this.setupToolHandlers()
		this.setupErrorHandling()
	}

	/**
	 * Register all available commands
	 */
	private registerCommands(): void {
		// Make commands
		this.commandRegistry.register(makeComponentCommand)
		this.commandRegistry.register(makeServiceCommand)
		this.commandRegistry.register(makeMigrationCommand)
		this.commandRegistry.register(makePageCommand)
		this.commandRegistry.register(makeApiCommand)
		this.commandRegistry.register(makeMiddlewareCommand)

		// Project commands
		this.commandRegistry.register(newProjectCommand)

		// Install commands
		this.commandRegistry.register(installAuthCommand)
		this.commandRegistry.register(installAdminCommand)

		// Database commands
		this.commandRegistry.register(migrateCommand)
		this.commandRegistry.register(seedCommand)

		// Development commands
		this.commandRegistry.register(serveCommand)
		this.commandRegistry.register(testCommand)
	}

	/**
	 * Setup tool handlers for MCP
	 */
	private setupToolHandlers(): void {
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			return {
				tools: [
					{
						name: "artisan_list",
						description: "List all available Artisan commands",
						inputSchema: {
							type: "object",
							properties: {
								category: {
									type: "string",
									description: "Filter commands by category (optional)",
								},
							},
						},
					},
					{
						name: "artisan_help",
						description: "Get help for a specific command",
						inputSchema: {
							type: "object",
							properties: {
								command: {
									type: "string",
									description: "Command name to get help for",
								},
							},
							required: ["command"],
						},
					},
					{
						name: "artisan_execute",
						description: "Execute an Artisan command",
						inputSchema: {
							type: "object",
							properties: {
								command: {
									type: "string",
									description: "Command name to execute",
								},
								args: {
									type: "object",
									description: "Command arguments",
								},
								options: {
									type: "object",
									description: "Command options",
								},
							},
							required: ["command"],
						},
					},
					{
						name: "artisan_project_status",
						description: "Get current project status and structure",
						inputSchema: {
							type: "object",
							properties: {},
						},
					},
				],
			}
		})

		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params

			try {
				let result: MCPToolResult

				switch (name) {
					case "artisan_list":
						result = await this.handleListCommands(args?.category as string)
						break

					case "artisan_help":
						result = await this.handleHelp(args?.command as string)
						break

					case "artisan_execute":
						result = await this.handleExecute(args?.command as string, args?.args || {}, args?.options || {})
						break

					case "artisan_project_status":
						result = await this.handleProjectStatus()
						break

					default:
						throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`)
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(result, null, 2),
						},
					],
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									success: false,
									error: errorMessage,
								},
								null,
								2,
							),
						},
					],
				}
			}
		})
	}

	/**
	 * Handle list commands tool
	 */
	private async handleListCommands(category?: string): Promise<MCPToolResult> {
		try {
			let commands = this.commandRegistry.getAll()

			if (category) {
				commands = this.commandRegistry.getByCategory(category)
			}

			const commandList = commands.map((cmd) => ({
				name: cmd.name,
				description: cmd.description,
				signature: cmd.signature,
			}))

			return {
				success: true,
				message: `Found ${commandList.length} commands`,
				data: {
					commands: commandList,
					category: category || "all",
				},
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}

	/**
	 * Handle help tool
	 */
	private async handleHelp(commandName: string): Promise<MCPToolResult> {
		try {
			if (!commandName) {
				return {
					success: false,
					error: "Command name is required",
				}
			}

			const help = this.commandRegistry.getHelp(commandName)

			if (help.includes("not found")) {
				return {
					success: false,
					error: help,
				}
			}

			return {
				success: true,
				message: `Help for command: ${commandName}`,
				data: { help },
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}

	/**
	 * Handle execute command tool
	 */
	private async handleExecute(commandName: string, args: any, options: any): Promise<MCPToolResult> {
		try {
			if (!commandName) {
				return {
					success: false,
					error: "Command name is required",
				}
			}

			const result = await this.commandRegistry.execute(commandName, args, options)

			return {
				success: result.success,
				message: result.message,
				data: result.data,
				error: result.error,
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}

	/**
	 * Handle project status tool
	 */
	private async handleProjectStatus(): Promise<MCPToolResult> {
		try {
			const projectStructure = await this.projectAnalyzer.analyze()
			const projectConfig = await this.projectAnalyzer.getProjectConfig()

			return {
				success: true,
				message: "Project status retrieved successfully",
				data: {
					structure: projectStructure,
					config: projectConfig,
				},
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}

	/**
	 * Setup error handling
	 */
	private setupErrorHandling(): void {
		this.server.onerror = (error) => {
			console.error("MCP Server error:", error)
		}

		process.on("SIGINT", async () => {
			await this.server.close()
			process.exit(0)
		})
	}

	/**
	 * Start the server
	 */
	async start(): Promise<void> {
		const transport = new StdioServerTransport()
		await this.server.connect(transport)
		console.error("NOORMME Artisan MCP Server started")
	}

	/**
	 * Stop the server
	 */
	async stop(): Promise<void> {
		await this.server.close()
	}

	/**
	 * Get the command registry (for testing)
	 */
	getCommandRegistry(): CommandRegistry {
		return this.commandRegistry
	}

	/**
	 * Get all available tools (for testing)
	 */
	getTools(): any[] {
		return [
			{
				name: "artisan:make:component",
				description: "Create a new React component",
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string", description: "Component name" },
						type: { type: "string", description: "Component type", enum: ["ui", "page", "layout"] },
						"with-tests": { type: "boolean", description: "Generate test file" },
					},
					required: ["name"],
				},
			},
			{
				name: "artisan:make:service",
				description: "Create a new service class",
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string", description: "Service name" },
						"with-repository": { type: "boolean", description: "Generate repository" },
						"with-tests": { type: "boolean", description: "Generate test file" },
					},
					required: ["name"],
				},
			},
			{
				name: "artisan:make:migration",
				description: "Create a new database migration",
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string", description: "Migration name" },
						action: { type: "string", description: "Migration action", enum: ["create", "alter", "drop"] },
						table: { type: "string", description: "Table name" },
					},
					required: ["name"],
				},
			},
			{
				name: "artisan:make:page",
				description: "Create a new Next.js page",
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string", description: "Page name" },
						route: { type: "string", description: "Page route" },
					},
					required: ["name"],
				},
			},
			{
				name: "artisan:make:api",
				description: "Create a new Next.js API route",
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string", description: "API name" },
						route: { type: "string", description: "API route" },
					},
					required: ["name"],
				},
			},
			{
				name: "artisan:make:middleware",
				description: "Create a new Next.js middleware",
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string", description: "Middleware name" },
						"with-auth": { type: "boolean", description: "Include authentication" },
					},
					required: ["name"],
				},
			},
			{
				name: "artisan:new:project",
				description: "Create a new Next.js project",
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string", description: "Project name" },
						template: { type: "string", description: "Project template", enum: ["basic", "full"] },
						"with-database": { type: "boolean", description: "Include database" },
					},
					required: ["name"],
				},
			},
			{
				name: "artisan:install:auth",
				description: "Install authentication system",
				inputSchema: {
					type: "object",
					properties: {
						provider: { type: "string", description: "Auth provider", enum: ["all", "google", "github", "email"] },
						"with-database": { type: "boolean", description: "Include database setup" },
					},
				},
			},
			{
				name: "artisan:install:admin",
				description: "Install admin panel",
				inputSchema: {
					type: "object",
					properties: {
						"with-dashboard": { type: "boolean", description: "Include dashboard" },
						"with-users": { type: "boolean", description: "Include user management" },
					},
				},
			},
			{
				name: "artisan:db:migrate",
				description: "Run database migrations",
				inputSchema: {
					type: "object",
					properties: {
						step: { type: "number", description: "Number of migrations to run" },
						force: { type: "boolean", description: "Force migration" },
						pretend: { type: "boolean", description: "Pretend mode" },
					},
				},
			},
			{
				name: "artisan:db:seed",
				description: "Seed the database",
				inputSchema: {
					type: "object",
					properties: {
						seederClass: { type: "string", description: "Specific seeder class" },
						force: { type: "boolean", description: "Force seeding" },
					},
				},
			},
			{
				name: "artisan:serve",
				description: "Start development server",
				inputSchema: {
					type: "object",
					properties: {
						port: { type: "number", description: "Server port" },
						host: { type: "string", description: "Server host" },
						"with-database": { type: "boolean", description: "Include database" },
					},
				},
			},
			{
				name: "artisan:test",
				description: "Run project tests",
				inputSchema: {
					type: "object",
					properties: {
						pattern: { type: "string", description: "Test pattern" },
						watch: { type: "boolean", description: "Watch mode" },
						coverage: { type: "boolean", description: "Generate coverage" },
						verbose: { type: "boolean", description: "Verbose output" },
					},
				},
			},
		]
	}

	/**
	 * Execute a tool (for testing)
	 */
	async executeTool(toolName: string, args: any): Promise<any> {
		// Map tool names to command names
		const toolToCommandMap: Record<string, string> = {
			"artisan:make:component": "make:component",
			"artisan:make:service": "make:service",
			"artisan:make:migration": "make:migration",
			"artisan:make:page": "make:page",
			"artisan:make:api": "make:api",
			"artisan:make:middleware": "make:middleware",
			"artisan:new:project": "new:project",
			"artisan:install:auth": "install:auth",
			"artisan:install:admin": "install:admin",
			"artisan:db:migrate": "db:migrate",
			"artisan:db:seed": "db:seed",
			"artisan:serve": "serve",
			"artisan:test": "test",
		}

		const commandName = toolToCommandMap[toolName]
		if (!commandName) {
			return {
				success: false,
				message: `Tool ${toolName} not found`,
			}
		}

		try {
			const result = await this.commandRegistry.execute(commandName, args, {})
			return result
		} catch (error) {
			return {
				success: false,
				message: error instanceof Error ? error.message : String(error),
			}
		}
	}
}

// Start the server
const server = new NoormmeArtisanServer()
server.start().catch((error) => {
	console.error("Failed to start server:", error)
	process.exit(1)
})
