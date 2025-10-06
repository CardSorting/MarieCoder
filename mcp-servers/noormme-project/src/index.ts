#!/usr/bin/env node
/**
 * NOORMME Project MCP Server
 * Enhanced project generation with modular architecture
 * Following NORMIE DEV methodology - clean, performant, type-safe
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js"
import { FileManager } from "./core/file-manager.js"
// Core modules
import { ProjectGenerator } from "./core/project-generator.js"
import { ComponentGenerator } from "./generators/component-generator.js"
import { CursorRulesGenerator } from "./generators/cursor-rules-generator.js"
import { ServiceGenerator } from "./generators/service-generator.js"

// Types
import { ComponentConfig, CursorRulesConfig, DatabaseSetupConfig, MCPToolResult, ProjectConfig, ServiceConfig } from "./types.js"

class NoormmeProjectServer {
	private server: Server
	private projectGenerator: ProjectGenerator
	private componentGenerator: ComponentGenerator
	private serviceGenerator: ServiceGenerator
	private cursorRulesGenerator: CursorRulesGenerator
	private fileManager: FileManager

	constructor() {
		this.server = new Server(
			{
				name: "noormme-project",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {},
				},
			},
		)

		// Initialize generators
		this.fileManager = new FileManager()
		this.projectGenerator = new ProjectGenerator()
		this.componentGenerator = new ComponentGenerator()
		this.serviceGenerator = new ServiceGenerator()
		this.cursorRulesGenerator = new CursorRulesGenerator()

		this.setupToolHandlers()
		this.setupErrorHandling()
	}

	private setupToolHandlers() {
		// List available tools
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			return {
				tools: [
					{
						name: "create_nextjs_project",
						description: "Create a new Next.js project with NOORMME integration and enhanced modular structure",
						inputSchema: {
							type: "object",
							properties: {
								projectName: {
									type: "string",
									description: "Name of the project to create",
								},
								projectPath: {
									type: "string",
									description: "Path where the project should be created",
								},
								template: {
									type: "string",
									enum: ["nextjs", "nextjs-auth", "nextjs-admin", "nextjs-saas"],
									default: "nextjs",
									description: "Project template to use",
								},
								includeAuth: {
									type: "boolean",
									default: false,
									description: "Include authentication features",
								},
								includeAdmin: {
									type: "boolean",
									default: false,
									description: "Include admin panel features",
								},
								includeTailwind: {
									type: "boolean",
									default: true,
									description: "Include Tailwind CSS styling",
								},
								includeTests: {
									type: "boolean",
									default: false,
									description: "Include test setup",
								},
								includeQueue: {
									type: "boolean",
									default: false,
									description: "Include queue system for background jobs",
								},
								includePayments: {
									type: "boolean",
									default: false,
									description: "Include payment processing features",
								},
								includeSubscriptions: {
									type: "boolean",
									default: false,
									description: "Include subscription management features",
								},
								databasePath: {
									type: "string",
									description: "Custom database path (default: ./database.sqlite)",
								},
								appUrl: {
									type: "string",
									description: "Application URL for configuration",
								},
								description: {
									type: "string",
									description: "Project description",
								},
								author: {
									type: "string",
									description: "Project author",
								},
								version: {
									type: "string",
									description: "Project version",
									default: "0.1.0",
								},
							},
							required: ["projectName", "projectPath"],
						},
					},
					{
						name: "generate_component",
						description: "Generate a new React component following NOORMME patterns and best practices",
						inputSchema: {
							type: "object",
							properties: {
								name: {
									type: "string",
									description: "Name of the component to generate (PascalCase)",
								},
								type: {
									type: "string",
									enum: ["ui", "page", "layout", "feature", "admin", "auth"],
									default: "ui",
									description: "Type of component to generate",
								},
								projectPath: {
									type: "string",
									description: "Path to the project where component should be created",
								},
								includeStyles: {
									type: "boolean",
									default: true,
									description: "Include CSS/Tailwind styles",
								},
								includeTests: {
									type: "boolean",
									default: false,
									description: "Include test file",
								},
								includeStorybook: {
									type: "boolean",
									default: false,
									description: "Include Storybook stories",
								},
							},
							required: ["name", "type", "projectPath"],
						},
					},
					{
						name: "generate_service",
						description: "Generate a new service class following NOORMME patterns with repository integration",
						inputSchema: {
							type: "object",
							properties: {
								name: {
									type: "string",
									description: "Name of the service to generate (PascalCase)",
								},
								tableName: {
									type: "string",
									description: "Database table name this service will work with (snake_case)",
								},
								projectPath: {
									type: "string",
									description: "Path to the project where service should be created",
								},
								includeRepository: {
									type: "boolean",
									default: true,
									description: "Include repository pattern methods",
								},
								includeBusinessLogic: {
									type: "boolean",
									default: true,
									description: "Include example business logic methods",
								},
								includeValidation: {
									type: "boolean",
									default: true,
									description: "Include Zod validation schemas",
								},
								includeTests: {
									type: "boolean",
									default: false,
									description: "Include test file",
								},
							},
							required: ["name", "tableName", "projectPath"],
						},
					},
					{
						name: "generate_cursor_rules",
						description: "Generate comprehensive Cursor IDE rules for NOORMME project development",
						inputSchema: {
							type: "object",
							properties: {
								projectPath: {
									type: "string",
									description: "Path to the project where rules should be created",
								},
								includeAllRules: {
									type: "boolean",
									default: true,
									description: "Include all NOORMME rules (architecture, database, coding style)",
								},
								includeArchitecture: {
									type: "boolean",
									default: true,
									description: "Include architecture guidelines",
								},
								includeDatabase: {
									type: "boolean",
									default: true,
									description: "Include database patterns and Kysely integration",
								},
								includeCodingStyle: {
									type: "boolean",
									default: true,
									description: "Include coding style guidelines",
								},
								includeKyselyIntegration: {
									type: "boolean",
									default: true,
									description: "Include Kysely integration patterns",
								},
								includeNextjsPatterns: {
									type: "boolean",
									default: true,
									description: "Include Next.js App Router patterns",
								},
								customRules: {
									type: "array",
									items: { type: "string" },
									description: "Additional custom rules to include",
								},
							},
							required: ["projectPath"],
						},
					},
					{
						name: "setup_database",
						description: "Set up database with initial schema, migrations, and seed data",
						inputSchema: {
							type: "object",
							properties: {
								projectPath: {
									type: "string",
									description: "Path to the project",
								},
								databasePath: {
									type: "string",
									description: "Path to the database file",
									default: "./database.sqlite",
								},
								schema: {
									type: "array",
									items: {
										type: "object",
										properties: {
											name: { type: "string" },
											sql: { type: "string" },
										},
									},
									description: "Database schema to create",
								},
								seedData: {
									type: "object",
									description: "Seed data to insert",
								},
								includeMigrations: {
									type: "boolean",
									default: true,
									description: "Include migration scripts",
								},
								includeSeedScripts: {
									type: "boolean",
									default: true,
									description: "Include seed scripts",
								},
							},
							required: ["projectPath"],
						},
					},
				],
			}
		})

		// Handle tool calls
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params

			try {
				let result: any
				switch (name) {
					case "create_nextjs_project":
						result = await this.createNextjsProject(args)
						break
					case "generate_component":
						result = await this.generateComponent(args)
						break
					case "generate_service":
						result = await this.generateService(args)
						break
					case "generate_cursor_rules":
						result = await this.generateCursorRules(args)
						break
					case "setup_database":
						result = await this.setupDatabase(args)
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
				console.error(`❌ Tool execution failed for ${name}:`, error)
				throw new McpError(
					ErrorCode.InternalError,
					`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		})
	}

	private async createNextjsProject(args: any): Promise<MCPToolResult> {
		const config: ProjectConfig = {
			projectName: args.projectName,
			projectPath: args.projectPath,
			template: args.template || "nextjs",
			includeAuth: args.includeAuth || false,
			includeAdmin: args.includeAdmin || false,
			includeTailwind: args.includeTailwind !== false,
			includeTests: args.includeTests || false,
			includeQueue: args.includeQueue || false,
			includePayments: args.includePayments || false,
			includeSubscriptions: args.includeSubscriptions || false,
			databasePath: args.databasePath,
			appUrl: args.appUrl,
			description: args.description,
			author: args.author,
			version: args.version || "0.1.0",
		}

		const result = await this.projectGenerator.generate(config)
		return result
	}

	private async generateComponent(args: any): Promise<MCPToolResult> {
		const config: ComponentConfig = {
			name: args.name,
			type: args.type || "ui",
			projectPath: args.projectPath,
			includeStyles: args.includeStyles !== false,
			includeTests: args.includeTests || false,
			includeStorybook: args.includeStorybook || false,
		}

		const result = await this.componentGenerator.generate(config)
		return result
	}

	private async generateService(args: any): Promise<MCPToolResult> {
		const config: ServiceConfig = {
			name: args.name,
			tableName: args.tableName,
			projectPath: args.projectPath,
			includeRepository: args.includeRepository !== false,
			includeBusinessLogic: args.includeBusinessLogic !== false,
			includeValidation: args.includeValidation !== false,
			includeTests: args.includeTests || false,
		}

		const result = await this.serviceGenerator.generate(config)
		return result
	}

	private async generateCursorRules(args: any): Promise<MCPToolResult> {
		const config: CursorRulesConfig = {
			projectPath: args.projectPath,
			includeAllRules: args.includeAllRules !== false,
			includeArchitecture: args.includeArchitecture !== false,
			includeDatabase: args.includeDatabase !== false,
			includeCodingStyle: args.includeCodingStyle !== false,
			includeKyselyIntegration: args.includeKyselyIntegration !== false,
			includeNextjsPatterns: args.includeNextjsPatterns !== false,
			customRules: args.customRules,
		}

		const result = await this.cursorRulesGenerator.generate(config)
		return result
	}

	private async setupDatabase(args: any): Promise<MCPToolResult> {
		try {
			console.log("🗄️ Setting up database...")

			const config: DatabaseSetupConfig = {
				projectPath: args.projectPath,
				databasePath: args.databasePath || "./database.sqlite",
				schema: args.schema || [],
				seedData: args.seedData,
				includeMigrations: args.includeMigrations !== false,
				includeSeedScripts: args.includeSeedScripts !== false,
			}

			const files: string[] = []

			// Create database directory
			const dbDir = `${config.projectPath}/database`
			await this.fileManager.ensureDirectory(dbDir)

			// Create database file
			const dbPath = `${config.projectPath}/${config.databasePath}`
			await this.fileManager.writeFile({
				path: dbPath,
				content: "",
				isTemplate: false,
			})
			files.push(dbPath)

			// Create migration script if requested
			if (config.includeMigrations) {
				const migrationScript = this.generateMigrationScript(config)
				const migrationPath = `${config.projectPath}/scripts/migrate.ts`
				await this.fileManager.writeFile({
					path: migrationPath,
					content: migrationScript,
					isTemplate: false,
				})
				files.push(migrationPath)
			}

			// Create seed script if requested and seed data provided
			if (config.includeSeedScripts && config.seedData) {
				const seedScript = this.generateSeedScript(config)
				const seedPath = `${config.projectPath}/scripts/seed.ts`
				await this.fileManager.writeFile({
					path: seedPath,
					content: seedScript,
					isTemplate: false,
				})
				files.push(seedPath)
			}

			console.log("✅ Database setup completed successfully")

			return {
				success: true,
				message: "Database setup completed successfully",
				files,
			}
		} catch (error) {
			console.error("❌ Database setup failed:", error)
			return {
				success: false,
				message: `Database setup failed: ${error instanceof Error ? error.message : String(error)}`,
				files: [],
				errors: [error instanceof Error ? error.message : String(error)],
			}
		}
	}

	private generateMigrationScript(config: DatabaseSetupConfig): string {
		return `import { getDatabase } from '../src/lib/db'

async function migrate() {
  const db = await getDatabase()
  
  console.log('Running migrations...')
  
${
	config.schema
		?.map(
			(table) => `  // Create ${table.name} table
  await db.execute(\`${table.sql}\`)
  console.log('✅ ${table.name} table created')`,
		)
		.join("\n") || "  // No schema migrations provided"
}
  
  console.log('✅ Migrations completed')
}

migrate().catch(console.error)`
	}

	private generateSeedScript(config: DatabaseSetupConfig): string {
		return `import { getDatabase } from '../src/lib/db'

async function seed() {
  const db = await getDatabase()
  
  console.log('Seeding database...')
  
${Object.entries(config.seedData || {})
	.map(
		([table, data]) => `  const ${table}Repo = db.getRepository('${table}')
  
  // Seed ${table} data
${Array.isArray(data) ? data.map((item) => `  await ${table}Repo.create(${JSON.stringify(item, null, 2)});`).join("\n") : `  await ${table}Repo.create(${JSON.stringify(data, null, 2)});`}`,
	)
	.join("\n\n")}
  
  console.log('✅ Database seeded')
}

seed().catch(console.error)`
	}

	private setupErrorHandling(): void {
		this.server.onerror = (error) => {
			console.error("[NOORMME Project MCP Error]", error)
		}

		process.on("SIGINT", async () => {
			await this.server.close()
			process.exit(0)
		})
	}

	async run(): Promise<void> {
		const transport = new StdioServerTransport()
		await this.server.connect(transport)
		console.error("🚀 NOORMME Project MCP Server running on stdio")
	}
}

// Start the server
const server = new NoormmeProjectServer()
server.run().catch((error) => {
	console.error("❌ Failed to start NOORMME Project MCP Server:", error)
	process.exit(1)
})
