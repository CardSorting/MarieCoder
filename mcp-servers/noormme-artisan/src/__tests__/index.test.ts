/**
 * Main Index Tests
 * Test the main MCP server functionality
 */

// Mock the dependencies first
import { mockMCPSDK, setupMockMCP, teardownMockMCP } from "./fixtures/index.js"

jest.mock("@modelcontextprotocol/sdk/server/index.js", () => mockMCPSDK)
jest.mock("@modelcontextprotocol/sdk/server/stdio.js", () => mockMCPSDK)

// Import after mocking
import { NoormmeArtisanServer } from "../index.js"

describe("NoormmeArtisanServer", () => {
	let server: NoormmeArtisanServer

	beforeEach(() => {
		setupMockMCP()
		server = new NoormmeArtisanServer()
	})

	afterEach(() => {
		teardownMockMCP()
		jest.clearAllMocks()
	})

	describe("server initialization", () => {
		it("should initialize server successfully", () => {
			expect(server).toBeDefined()
			expect(server).toBeInstanceOf(NoormmeArtisanServer)
		})

		it("should register all commands", () => {
			const commands = server.getCommandRegistry().getAll()
			expect(commands).toHaveLength(13) // Total number of commands
		})

		it("should register make commands", () => {
			const commands = server.getCommandRegistry().getAll()
			const makeCommands = commands.filter((cmd) => cmd.name.startsWith("make:"))
			expect(makeCommands).toHaveLength(6) // component, service, migration, page, api, middleware
		})

		it("should register project commands", () => {
			const commands = server.getCommandRegistry().getAll()
			const projectCommands = commands.filter((cmd) => cmd.name.startsWith("new:"))
			expect(projectCommands).toHaveLength(1) // new:project
		})

		it("should register install commands", () => {
			const commands = server.getCommandRegistry().getAll()
			const installCommands = commands.filter((cmd) => cmd.name.startsWith("install:"))
			expect(installCommands).toHaveLength(2) // install:auth, install:admin
		})

		it("should register database commands", () => {
			const commands = server.getCommandRegistry().getAll()
			const dbCommands = commands.filter((cmd) => cmd.name.startsWith("db:"))
			expect(dbCommands).toHaveLength(2) // db:migrate, db:seed
		})

		it("should register development commands", () => {
			const commands = server.getCommandRegistry().getAll()
			const devCommands = commands.filter((cmd) => cmd.name === "serve" || cmd.name === "test")
			expect(devCommands).toHaveLength(2) // serve, test
		})
	})

	describe("command registration", () => {
		it("should register make:component command", () => {
			const command = server.getCommandRegistry().get("make:component")
			expect(command).toBeDefined()
			expect(command?.name).toBe("make:component")
			expect(command?.description).toBe("Create a new React component")
		})

		it("should register make:service command", () => {
			const command = server.getCommandRegistry().get("make:service")
			expect(command).toBeDefined()
			expect(command?.name).toBe("make:service")
			expect(command?.description).toBe("Create a new service class")
		})

		it("should register make:migration command", () => {
			const command = server.getCommandRegistry().get("make:migration")
			expect(command).toBeDefined()
			expect(command?.name).toBe("make:migration")
			expect(command?.description).toBe("Create a new database migration")
		})

		it("should register make:page command", () => {
			const command = server.getCommandRegistry().get("make:page")
			expect(command).toBeDefined()
			expect(command?.name).toBe("make:page")
			expect(command?.description).toBe("Create a new Next.js page")
		})

		it("should register make:api command", () => {
			const command = server.getCommandRegistry().get("make:api")
			expect(command).toBeDefined()
			expect(command?.name).toBe("make:api")
			expect(command?.description).toBe("Create a new Next.js API route")
		})

		it("should register make:middleware command", () => {
			const command = server.getCommandRegistry().get("make:middleware")
			expect(command).toBeDefined()
			expect(command?.name).toBe("make:middleware")
			expect(command?.description).toBe("Create a new Next.js middleware")
		})

		it("should register new:project command", () => {
			const command = server.getCommandRegistry().get("new:project")
			expect(command).toBeDefined()
			expect(command?.name).toBe("new:project")
			expect(command?.description).toBe("Create a new Next.js project")
		})

		it("should register install:auth command", () => {
			const command = server.getCommandRegistry().get("install:auth")
			expect(command).toBeDefined()
			expect(command?.name).toBe("install:auth")
			expect(command?.description).toBe("Install authentication system")
		})

		it("should register install:admin command", () => {
			const command = server.getCommandRegistry().get("install:admin")
			expect(command).toBeDefined()
			expect(command?.name).toBe("install:admin")
			expect(command?.description).toBe("Install admin panel")
		})

		it("should register db:migrate command", () => {
			const command = server.getCommandRegistry().get("db:migrate")
			expect(command).toBeDefined()
			expect(command?.name).toBe("db:migrate")
			expect(command?.description).toBe("Run database migrations")
		})

		it("should register db:seed command", () => {
			const command = server.getCommandRegistry().get("db:seed")
			expect(command).toBeDefined()
			expect(command?.name).toBe("db:seed")
			expect(command?.description).toBe("Seed the database")
		})

		it("should register serve command", () => {
			const command = server.getCommandRegistry().get("serve")
			expect(command).toBeDefined()
			expect(command?.name).toBe("serve")
			expect(command?.description).toBe("Start development server")
		})

		it("should register test command", () => {
			const command = server.getCommandRegistry().get("test")
			expect(command).toBeDefined()
			expect(command?.name).toBe("test")
			expect(command?.description).toBe("Run project tests")
		})
	})

	describe("tool registration", () => {
		it("should register all tools", () => {
			const tools = server.getTools()
			expect(tools).toHaveLength(13) // Total number of tools
		})

		it("should register make:component tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:make:component")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Create a new React component")
		})

		it("should register make:service tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:make:service")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Create a new service class")
		})

		it("should register make:migration tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:make:migration")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Create a new database migration")
		})

		it("should register make:page tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:make:page")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Create a new Next.js page")
		})

		it("should register make:api tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:make:api")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Create a new Next.js API route")
		})

		it("should register make:middleware tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:make:middleware")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Create a new Next.js middleware")
		})

		it("should register new:project tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:new:project")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Create a new Next.js project")
		})

		it("should register install:auth tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:install:auth")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Install authentication system")
		})

		it("should register install:admin tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:install:admin")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Install admin panel")
		})

		it("should register db:migrate tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:db:migrate")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Run database migrations")
		})

		it("should register db:seed tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:db:seed")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Seed the database")
		})

		it("should register serve tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:serve")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Start development server")
		})

		it("should register test tool", () => {
			const tools = server.getTools()
			const tool = tools.find((t) => t.name === "artisan:test")
			expect(tool).toBeDefined()
			expect(tool?.description).toBe("Run project tests")
		})
	})

	describe("tool execution", () => {
		it("should execute make:component tool", async () => {
			const result = await server.executeTool("artisan:make:component", {
				name: "TestComponent",
				type: "ui",
				"with-tests": true,
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Component created successfully")
			expect(result.data?.files).toContain("src/components/TestComponent.tsx")
		})

		it("should execute make:service tool", async () => {
			const result = await server.executeTool("artisan:make:service", {
				name: "TestService",
				"with-repository": true,
				"with-tests": true,
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Service created successfully")
			expect(result.data?.files).toContain("src/lib/services/TestService.ts")
		})

		it("should execute make:migration tool", async () => {
			const result = await server.executeTool("artisan:make:migration", {
				name: "create_test_table",
				action: "create",
				table: "test_table",
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Migration created successfully")
			expect(result.data?.files).toContain("src/lib/database/migrations/20240101000000_create_test_table.ts")
		})

		it("should execute make:page tool", async () => {
			const result = await server.executeTool("artisan:make:page", {
				name: "TestPage",
				route: "/test",
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Page created successfully")
			expect(result.data?.files).toContain("src/app/test/page.tsx")
		})

		it("should execute make:api tool", async () => {
			const result = await server.executeTool("artisan:make:api", {
				name: "TestApi",
				route: "/api/test",
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("API route created successfully")
			expect(result.data?.files).toContain("src/app/api/test/route.ts")
		})

		it("should execute make:middleware tool", async () => {
			const result = await server.executeTool("artisan:make:middleware", {
				name: "TestMiddleware",
				"with-auth": true,
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Middleware created successfully")
			expect(result.data?.files).toContain("src/middleware.ts")
		})

		it("should execute new:project tool", async () => {
			const result = await server.executeTool("artisan:new:project", {
				name: "test-project",
				template: "basic",
				"with-database": true,
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Project created successfully")
			expect(result.data?.files).toContain("package.json")
		})

		it("should execute install:auth tool", async () => {
			const result = await server.executeTool("artisan:install:auth", {
				provider: "all",
				"with-database": true,
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Authentication installed successfully")
			expect(result.data?.files).toContain("src/lib/auth.ts")
		})

		it("should execute install:admin tool", async () => {
			const result = await server.executeTool("artisan:install:admin", {
				"with-dashboard": true,
				"with-users": true,
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Admin panel installed successfully")
			expect(result.data?.files).toContain("src/app/admin/layout.tsx")
		})

		it("should execute db:migrate tool", async () => {
			const result = await server.executeTool("artisan:db:migrate", {
				step: undefined,
				force: false,
				pretend: false,
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Migrations ran successfully")
			expect(result.data?.executed).toBe(3)
		})

		it("should execute db:seed tool", async () => {
			const result = await server.executeTool("artisan:db:seed", {
				seederClass: undefined,
				force: false,
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Database seeded successfully")
			expect(result.data?.seeders).toEqual(["UserSeeder", "RoleSeeder", "PermissionSeeder"])
		})

		it("should execute serve tool", async () => {
			const result = await server.executeTool("artisan:serve", {
				port: 3000,
				host: "localhost",
				"with-database": true,
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Development server started")
			expect(result.data?.url).toBe("http://localhost:3000")
		})

		it("should execute test tool", async () => {
			const result = await server.executeTool("artisan:test", {
				pattern: undefined,
				watch: false,
				coverage: false,
				verbose: false,
			})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Tests completed successfully")
			expect(result.data?.passed).toBe(25)
		})
	})

	describe("error handling", () => {
		it("should handle unknown tool execution", async () => {
			const result = await server.executeTool("unknown:tool", {})

			expect(result.success).toBe(false)
			expect(result.message).toContain("Tool unknown:tool not found")
		})

		it("should handle tool execution errors", async () => {
			// Mock tool execution error
			const result = await server.executeTool("artisan:make:component", {
				name: "", // Invalid name
				type: "ui",
			})

			expect(result.success).toBe(false)
			expect(result.message).toContain("Component name is required")
		})

		it("should handle command execution errors", async () => {
			// Mock command execution error
			const result = await server.executeTool("artisan:make:service", {
				name: "", // Invalid name
				"with-repository": true,
			})

			expect(result.success).toBe(false)
			expect(result.message).toContain("Service name is required")
		})
	})

	describe("server lifecycle", () => {
		it("should start server successfully", async () => {
			await expect(server.start()).resolves.not.toThrow()
		})

		it("should stop server successfully", async () => {
			await expect(server.stop()).resolves.not.toThrow()
		})

		it("should handle server start errors", async () => {
			// Mock server start error by overriding the start method
			const originalStart = server.start
			server.start = jest.fn().mockRejectedValue(new Error("Server start failed"))

			await expect(server.start()).rejects.toThrow("Server start failed")

			// Restore original method
			server.start = originalStart
		})

		it("should handle server stop errors", async () => {
			// Mock server stop error by overriding the stop method
			const originalStop = server.stop
			server.stop = jest.fn().mockRejectedValue(new Error("Server stop failed"))

			await expect(server.stop()).rejects.toThrow("Server stop failed")

			// Restore original method
			server.stop = originalStop
		})
	})

	describe("command registry access", () => {
		it("should provide access to command registry", () => {
			const registry = server.getCommandRegistry()
			expect(registry).toBeDefined()
			expect(registry.getAll()).toHaveLength(13)
		})

		it("should allow command execution through registry", async () => {
			const registry = server.getCommandRegistry()
			const result = await registry.execute("make:component", { name: "TestComponent" }, {})

			expect(result.success).toBe(true)
			expect(result.message).toContain("Component created successfully")
		})
	})

	describe("tool schema validation", () => {
		it("should validate tool input schemas", () => {
			const tools = server.getTools()

			for (const tool of tools) {
				expect(tool.inputSchema).toBeDefined()
				expect(tool.inputSchema.type).toBe("object")
				expect(tool.inputSchema.properties).toBeDefined()
			}
		})

		it("should have required properties in tool schemas", () => {
			const tools = server.getTools()

			for (const tool of tools) {
				if (tool.name.includes("make:") || tool.name.includes("new:")) {
					expect(tool.inputSchema.required).toContain("name")
				}
			}
		})

		it("should have correct property types in tool schemas", () => {
			const tools = server.getTools()

			for (const tool of tools) {
				const schema = tool.inputSchema
				for (const [, propSchema] of Object.entries(schema.properties)) {
					expect(propSchema).toHaveProperty("type")
					expect(["string", "number", "boolean", "array", "object"]).toContain((propSchema as any).type)
				}
			}
		})
	})
})
