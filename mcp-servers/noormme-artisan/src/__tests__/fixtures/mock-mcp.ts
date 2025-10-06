/**
 * Mock MCP Server
 * Mock implementations for MCP server operations
 */

// Mock MCP SDK types and schemas
const CallToolRequestSchema = { method: "tools/call" }
const ListToolsRequestSchema = { method: "tools/list" }

export class MockMCPServer {
	private tools: Map<string, any> = new Map()
	private handlers: Map<string, Function> = new Map()

	constructor() {
		// Mock constructor - no actual server needed for testing
	}

	// Mock server methods
	async start(): Promise<void> {
		// Mock start - in real implementation this would start the server
	}

	async stop(): Promise<void> {
		// Mock stop - in real implementation this would stop the server
	}

	// Mock tool registration
	registerTool(tool: any): void {
		this.tools.set(tool.name, tool)
	}

	// Mock tool handler registration
	setRequestHandler(schema: any, handler: Function): void {
		this.handlers.set(schema.method, handler)
	}

	// Mock tool execution
	async executeTool(name: string, arguments_: any): Promise<any> {
		const tool = this.tools.get(name)
		if (!tool) {
			throw new Error(`Tool '${name}' not found`)
		}

		const handler = this.handlers.get("tools/call")
		if (!handler) {
			throw new Error("Tool handler not registered")
		}

		return await handler({
			method: "tools/call",
			params: {
				name,
				arguments: arguments_,
			},
		})
	}

	// Mock list tools
	async listTools(): Promise<any[]> {
		return Array.from(this.tools.values())
	}

	// Get registered tools
	getTools(): Map<string, any> {
		return this.tools
	}

	// Get registered handlers
	getHandlers(): Map<string, Function> {
		return this.handlers
	}

	// Reset mock state
	reset(): void {
		this.tools.clear()
		this.handlers.clear()
	}
}

// Create a singleton instance
export const mockMCPServer = new MockMCPServer()

// Mock MCP SDK modules
export const mockMCPSDK = {
	Server: jest.fn().mockImplementation(() => ({
		setRequestHandler: jest.fn(),
		onerror: null,
		connect: jest.fn(),
		close: jest.fn(),
	})),
	StdioServerTransport: jest.fn().mockImplementation(() => ({
		start: jest.fn(),
		stop: jest.fn(),
	})),
	CallToolRequestSchema: CallToolRequestSchema,
	ListToolsRequestSchema: ListToolsRequestSchema,
}

// Mock tool schemas
export const mockToolSchemas = {
	"artisan:make:component": {
		name: "artisan:make:component",
		description: "Create a new React component",
		inputSchema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Name of the component",
				},
				type: {
					type: "string",
					description: "Type of component",
					enum: ["ui", "page", "layout", "form"],
					default: "ui",
				},
				"with-tests": {
					type: "boolean",
					description: "Include test file",
					default: true,
				},
				"with-styles": {
					type: "boolean",
					description: "Include styles file",
					default: false,
				},
				"with-story": {
					type: "boolean",
					description: "Include Storybook story",
					default: false,
				},
				"with-props": {
					type: "boolean",
					description: "Include props interface",
					default: true,
				},
			},
			required: ["name"],
		},
	},
	"artisan:make:service": {
		name: "artisan:make:service",
		description: "Create a new service class",
		inputSchema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Name of the service",
				},
				"with-repository": {
					type: "boolean",
					description: "Include repository",
					default: true,
				},
				"with-tests": {
					type: "boolean",
					description: "Include test file",
					default: true,
				},
				"with-validation": {
					type: "boolean",
					description: "Include validation schema",
					default: true,
				},
			},
			required: ["name"],
		},
	},
	"artisan:make:migration": {
		name: "artisan:make:migration",
		description: "Create a new database migration",
		inputSchema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Name of the migration",
				},
				action: {
					type: "string",
					description: "Migration action",
					enum: ["create", "modify", "drop"],
					default: "create",
				},
				table: {
					type: "string",
					description: "Table name",
				},
				columns: {
					type: "array",
					description: "Table columns",
					items: {
						type: "object",
						properties: {
							name: { type: "string" },
							type: { type: "string" },
							nullable: { type: "boolean", default: false },
							primaryKey: { type: "boolean", default: false },
							autoIncrement: { type: "boolean", default: false },
							unique: { type: "boolean", default: false },
							defaultValue: { type: "string" },
						},
						required: ["name", "type"],
					},
				},
			},
			required: ["name", "action", "table"],
		},
	},
	"artisan:make:page": {
		name: "artisan:make:page",
		description: "Create a new Next.js page",
		inputSchema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Name of the page",
				},
				route: {
					type: "string",
					description: "Page route",
				},
				"with-layout": {
					type: "boolean",
					description: "Include layout file",
					default: false,
				},
				"with-loading": {
					type: "boolean",
					description: "Include loading file",
					default: false,
				},
				"with-error": {
					type: "boolean",
					description: "Include error file",
					default: false,
				},
				"with-not-found": {
					type: "boolean",
					description: "Include not-found file",
					default: false,
				},
			},
			required: ["name", "route"],
		},
	},
	"artisan:make:api": {
		name: "artisan:make:api",
		description: "Create a new Next.js API route",
		inputSchema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Name of the API route",
				},
				route: {
					type: "string",
					description: "API route path",
				},
				methods: {
					type: "array",
					description: "HTTP methods",
					items: {
						type: "string",
						enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
					},
					default: ["GET"],
				},
				"with-validation": {
					type: "boolean",
					description: "Include validation schema",
					default: true,
				},
				"with-auth": {
					type: "boolean",
					description: "Include authentication",
					default: false,
				},
			},
			required: ["name", "route"],
		},
	},
	"artisan:make:middleware": {
		name: "artisan:make:middleware",
		description: "Create a new Next.js middleware",
		inputSchema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Name of the middleware",
				},
				"with-auth": {
					type: "boolean",
					description: "Include authentication",
					default: true,
				},
				"with-cors": {
					type: "boolean",
					description: "Include CORS handling",
					default: false,
				},
				"with-rate-limit": {
					type: "boolean",
					description: "Include rate limiting",
					default: false,
				},
			},
			required: ["name"],
		},
	},
	"artisan:new:project": {
		name: "artisan:new:project",
		description: "Create a new Next.js project",
		inputSchema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Name of the project",
				},
				template: {
					type: "string",
					description: "Project template",
					enum: ["basic", "auth", "admin", "full"],
					default: "basic",
				},
				"with-database": {
					type: "boolean",
					description: "Include database setup",
					default: true,
				},
				"with-auth": {
					type: "boolean",
					description: "Include authentication",
					default: false,
				},
				"with-admin": {
					type: "boolean",
					description: "Include admin panel",
					default: false,
				},
				"with-tailwind": {
					type: "boolean",
					description: "Include Tailwind CSS",
					default: true,
				},
				"with-typescript": {
					type: "boolean",
					description: "Include TypeScript",
					default: true,
				},
			},
			required: ["name"],
		},
	},
	"artisan:install:auth": {
		name: "artisan:install:auth",
		description: "Install authentication system",
		inputSchema: {
			type: "object",
			properties: {
				provider: {
					type: "string",
					description: "Authentication provider",
					enum: ["google", "github", "email", "all"],
					default: "all",
				},
				"with-database": {
					type: "boolean",
					description: "Include database tables",
					default: true,
				},
				"with-middleware": {
					type: "boolean",
					description: "Include middleware",
					default: true,
				},
				"with-pages": {
					type: "boolean",
					description: "Include auth pages",
					default: true,
				},
			},
		},
	},
	"artisan:install:admin": {
		name: "artisan:install:admin",
		description: "Install admin panel",
		inputSchema: {
			type: "object",
			properties: {
				"with-dashboard": {
					type: "boolean",
					description: "Include dashboard",
					default: true,
				},
				"with-users": {
					type: "boolean",
					description: "Include user management",
					default: true,
				},
				"with-roles": {
					type: "boolean",
					description: "Include role management",
					default: true,
				},
				"with-permissions": {
					type: "boolean",
					description: "Include permission management",
					default: true,
				},
				"with-audit": {
					type: "boolean",
					description: "Include audit logging",
					default: false,
				},
			},
		},
	},
	"artisan:db:migrate": {
		name: "artisan:db:migrate",
		description: "Run database migrations",
		inputSchema: {
			type: "object",
			properties: {
				step: {
					type: "number",
					description: "Number of migrations to run",
				},
				force: {
					type: "boolean",
					description: "Force migration",
					default: false,
				},
				pretend: {
					type: "boolean",
					description: "Show SQL without executing",
					default: false,
				},
			},
		},
	},
	"artisan:db:seed": {
		name: "artisan:db:seed",
		description: "Seed the database",
		inputSchema: {
			type: "object",
			properties: {
				seederClass: {
					type: "string",
					description: "Specific seeder to run",
				},
				force: {
					type: "boolean",
					description: "Force seeding",
					default: false,
				},
			},
		},
	},
	"artisan:serve": {
		name: "artisan:serve",
		description: "Start development server",
		inputSchema: {
			type: "object",
			properties: {
				port: {
					type: "number",
					description: "Port to run on",
					default: 3000,
				},
				host: {
					type: "string",
					description: "Host to bind to",
					default: "localhost",
				},
				"with-database": {
					type: "boolean",
					description: "Start with database",
					default: true,
				},
			},
		},
	},
	"artisan:test": {
		name: "artisan:test",
		description: "Run project tests",
		inputSchema: {
			type: "object",
			properties: {
				pattern: {
					type: "string",
					description: "Test pattern to run",
				},
				watch: {
					type: "boolean",
					description: "Run in watch mode",
					default: false,
				},
				coverage: {
					type: "boolean",
					description: "Generate coverage report",
					default: false,
				},
				verbose: {
					type: "boolean",
					description: "Verbose output",
					default: false,
				},
			},
		},
	},
}

// Mock tool execution results
export const mockToolResults = {
	"artisan:make:component": {
		success: true,
		message: "Component created successfully",
		data: {
			files: ["src/components/TestComponent.tsx"],
			directories: ["src/components"],
		},
	},
	"artisan:make:service": {
		success: true,
		message: "Service created successfully",
		data: {
			files: ["src/lib/services/TestService.ts"],
			directories: ["src/lib/services"],
		},
	},
	"artisan:make:migration": {
		success: true,
		message: "Migration created successfully",
		data: {
			files: ["src/lib/database/migrations/20240101000000_create_test_table.ts"],
			directories: ["src/lib/database/migrations"],
		},
	},
	"artisan:make:page": {
		success: true,
		message: "Page created successfully",
		data: {
			files: ["src/app/test/page.tsx"],
			directories: ["src/app/test"],
		},
	},
	"artisan:make:api": {
		success: true,
		message: "API route created successfully",
		data: {
			files: ["src/app/api/test/route.ts"],
			directories: ["src/app/api/test"],
		},
	},
	"artisan:make:middleware": {
		success: true,
		message: "Middleware created successfully",
		data: {
			files: ["src/middleware.ts"],
			directories: ["src"],
		},
	},
	"artisan:new:project": {
		success: true,
		message: "Project created successfully",
		data: {
			files: [
				"package.json",
				"next.config.js",
				"tsconfig.json",
				"tailwind.config.js",
				".env.example",
				".gitignore",
				"README.md",
				"src/app/layout.tsx",
				"src/app/page.tsx",
				"src/app/globals.css",
				"src/lib/db.ts",
				"src/types/database.ts",
			],
			directories: ["src", "src/app", "src/lib", "src/types"],
		},
	},
	"artisan:install:auth": {
		success: true,
		message: "Authentication installed successfully",
		data: {
			files: [
				"src/lib/auth.ts",
				"src/middleware.ts",
				"src/app/auth/signin/page.tsx",
				"src/app/auth/signup/page.tsx",
				"src/app/auth/error/page.tsx",
			],
			directories: ["src/app/auth", "src/app/auth/signin", "src/app/auth/signup", "src/app/auth/error"],
		},
	},
	"artisan:install:admin": {
		success: true,
		message: "Admin panel installed successfully",
		data: {
			files: [
				"src/app/admin/layout.tsx",
				"src/app/admin/page.tsx",
				"src/app/admin/users/page.tsx",
				"src/app/admin/roles/page.tsx",
				"src/app/admin/permissions/page.tsx",
			],
			directories: ["src/app/admin", "src/app/admin/users", "src/app/admin/roles", "src/app/admin/permissions"],
		},
	},
	"artisan:db:migrate": {
		success: true,
		message: "Migrations ran successfully",
		data: {
			executed: 3,
			pending: 0,
			migrations: [
				"20240101000000_create_users_table",
				"20240101000001_create_posts_table",
				"20240101000002_add_email_to_users",
			],
		},
	},
	"artisan:db:seed": {
		success: true,
		message: "Database seeded successfully",
		data: {
			seeders: ["UserSeeder", "RoleSeeder", "PermissionSeeder"],
			records: 150,
			details: [
				{ name: "UserSeeder", records: 100 },
				{ name: "RoleSeeder", records: 5 },
				{ name: "PermissionSeeder", records: 45 },
			],
		},
	},
	"artisan:serve": {
		success: true,
		message: "Development server started",
		data: {
			url: "http://localhost:3000",
			port: 3000,
			host: "localhost",
			pid: 12345,
		},
	},
	"artisan:test": {
		success: true,
		message: "Tests completed successfully",
		data: {
			passed: 25,
			failed: 0,
			skipped: 0,
			duration: 2.5,
			coverage: {
				statements: 85.5,
				branches: 80.0,
				functions: 90.0,
				lines: 85.5,
			},
		},
	},
}

// Setup function for tests
export function setupMockMCP(): void {
	// Reset mock state
	mockMCPServer.reset()

	// Register all tool schemas
	for (const [_name, schema] of Object.entries(mockToolSchemas)) {
		mockMCPServer.registerTool(schema)
	}

	// Register tool handler
	mockMCPServer.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name } = request.params

		// Simulate tool execution
		const result = mockToolResults[name as keyof typeof mockToolResults]
		if (!result) {
			throw new Error(`Tool '${name}' not found`)
		}

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(result, null, 2),
				},
			],
		}
	})
}

// Teardown function for tests
export function teardownMockMCP(): void {
	mockMCPServer.reset()
}
