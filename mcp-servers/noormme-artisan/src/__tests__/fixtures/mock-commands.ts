/**
 * Mock Commands
 * Mock implementations for Artisan commands
 */

import { ArtisanCommand, CommandResult } from "../types.js"

export const mockMakeComponentCommand: ArtisanCommand = {
	name: "make:component",
	description: "Create a new React component",
	signature: "make:component <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the component",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "type",
			description: "Type of component",
			type: "string",
			default: "ui",
		},
		{
			name: "with-tests",
			description: "Include test file",
			type: "boolean",
			default: true,
		},
		{
			name: "with-styles",
			description: "Include styles file",
			type: "boolean",
			default: false,
		},
		{
			name: "with-story",
			description: "Include Storybook story",
			type: "boolean",
			default: false,
		},
		{
			name: "with-props",
			description: "Include props interface",
			type: "boolean",
			default: true,
		},
	],
	handler: jest.fn().mockResolvedValue({
		success: true,
		message: "Component created successfully",
		data: {
			files: ["src/components/TestComponent.tsx"],
			directories: ["src/components"],
		},
	} as CommandResult),
}

export const mockMakeServiceCommand: ArtisanCommand = {
	name: "make:service",
	description: "Create a new service class",
	signature: "make:service <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the service",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "with-repository",
			description: "Include repository",
			type: "boolean",
			default: true,
		},
		{
			name: "with-tests",
			description: "Include test file",
			type: "boolean",
			default: true,
		},
		{
			name: "with-validation",
			description: "Include validation schema",
			type: "boolean",
			default: true,
		},
	],
	handler: jest.fn().mockResolvedValue({
		success: true,
		message: "Service created successfully",
		data: {
			files: ["src/lib/services/TestService.ts"],
			directories: ["src/lib/services"],
		},
	} as CommandResult),
}

export const mockMakeMigrationCommand: ArtisanCommand = {
	name: "make:migration",
	description: "Create a new database migration",
	signature: "make:migration <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the migration",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "action",
			description: "Migration action",
			type: "string",
			default: "create",
		},
		{
			name: "table",
			description: "Table name",
			type: "string",
			required: true,
		},
		{
			name: "columns",
			description: "Table columns",
			type: "array",
			default: [],
		},
	],
	handler: jest.fn().mockResolvedValue({
		success: true,
		message: "Migration created successfully",
		data: {
			files: ["src/lib/database/migrations/20240101000000_create_test_table.ts"],
			directories: ["src/lib/database/migrations"],
		},
	} as CommandResult),
}

export const mockMakePageCommand: ArtisanCommand = {
	name: "make:page",
	description: "Create a new Next.js page",
	signature: "make:page <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the page",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "route",
			description: "Page route",
			type: "string",
			required: true,
		},
		{
			name: "with-layout",
			description: "Include layout file",
			type: "boolean",
			default: false,
		},
		{
			name: "with-loading",
			description: "Include loading file",
			type: "boolean",
			default: false,
		},
		{
			name: "with-error",
			description: "Include error file",
			type: "boolean",
			default: false,
		},
		{
			name: "with-not-found",
			description: "Include not-found file",
			type: "boolean",
			default: false,
		},
	],
	handler: jest.fn().mockResolvedValue({
		success: true,
		message: "Page created successfully",
		data: {
			files: ["src/app/test/page.tsx"],
			directories: ["src/app/test"],
		},
	} as CommandResult),
}

export const mockMakeApiCommand: ArtisanCommand = {
	name: "make:api",
	description: "Create a new Next.js API route",
	signature: "make:api <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the API route",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "route",
			description: "API route path",
			type: "string",
			required: true,
		},
		{
			name: "methods",
			description: "HTTP methods",
			type: "array",
			default: ["GET"],
		},
		{
			name: "with-validation",
			description: "Include validation schema",
			type: "boolean",
			default: true,
		},
		{
			name: "with-auth",
			description: "Include authentication",
			type: "boolean",
			default: false,
		},
	],
	handler: jest.fn().mockResolvedValue({
		success: true,
		message: "API route created successfully",
		data: {
			files: ["src/app/api/test/route.ts"],
			directories: ["src/app/api/test"],
		},
	} as CommandResult),
}

export const mockMakeMiddlewareCommand: ArtisanCommand = {
	name: "make:middleware",
	description: "Create a new Next.js middleware",
	signature: "make:middleware <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the middleware",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "with-auth",
			description: "Include authentication",
			type: "boolean",
			default: true,
		},
		{
			name: "with-cors",
			description: "Include CORS handling",
			type: "boolean",
			default: false,
		},
		{
			name: "with-rate-limit",
			description: "Include rate limiting",
			type: "boolean",
			default: false,
		},
	],
	handler: jest.fn().mockResolvedValue({
		success: true,
		message: "Middleware created successfully",
		data: {
			files: ["src/middleware.ts"],
			directories: ["src"],
		},
	} as CommandResult),
}

export const mockNewProjectCommand: ArtisanCommand = {
	name: "new:project",
	description: "Create a new Next.js project",
	signature: "new:project <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the project",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "template",
			description: "Project template",
			type: "string",
			default: "basic",
		},
		{
			name: "with-database",
			description: "Include database setup",
			type: "boolean",
			default: true,
		},
		{
			name: "with-auth",
			description: "Include authentication",
			type: "boolean",
			default: false,
		},
		{
			name: "with-admin",
			description: "Include admin panel",
			type: "boolean",
			default: false,
		},
		{
			name: "with-tailwind",
			description: "Include Tailwind CSS",
			type: "boolean",
			default: true,
		},
		{
			name: "with-typescript",
			description: "Include TypeScript",
			type: "boolean",
			default: true,
		},
	],
	handler: jest.fn().mockResolvedValue({
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
	} as CommandResult),
}

export const mockInstallAuthCommand: ArtisanCommand = {
	name: "install:auth",
	description: "Install authentication system",
	signature: "install:auth [options]",
	arguments: [],
	options: [
		{
			name: "provider",
			description: "Authentication provider",
			type: "string",
			default: "all",
		},
		{
			name: "with-database",
			description: "Include database tables",
			type: "boolean",
			default: true,
		},
		{
			name: "with-middleware",
			description: "Include middleware",
			type: "boolean",
			default: true,
		},
		{
			name: "with-pages",
			description: "Include auth pages",
			type: "boolean",
			default: true,
		},
	],
	handler: jest.fn().mockResolvedValue({
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
	} as CommandResult),
}

export const mockInstallAdminCommand: ArtisanCommand = {
	name: "install:admin",
	description: "Install admin panel",
	signature: "install:admin [options]",
	arguments: [],
	options: [
		{
			name: "with-dashboard",
			description: "Include dashboard",
			type: "boolean",
			default: true,
		},
		{
			name: "with-users",
			description: "Include user management",
			type: "boolean",
			default: true,
		},
		{
			name: "with-roles",
			description: "Include role management",
			type: "boolean",
			default: true,
		},
		{
			name: "with-permissions",
			description: "Include permission management",
			type: "boolean",
			default: true,
		},
		{
			name: "with-audit",
			description: "Include audit logging",
			type: "boolean",
			default: false,
		},
	],
	handler: jest.fn().mockResolvedValue({
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
	} as CommandResult),
}

export const mockDbMigrateCommand: ArtisanCommand = {
	name: "db:migrate",
	description: "Run database migrations",
	signature: "db:migrate [options]",
	arguments: [],
	options: [
		{
			name: "step",
			description: "Number of migrations to run",
			type: "number",
		},
		{
			name: "force",
			description: "Force migration",
			type: "boolean",
			default: false,
		},
		{
			name: "pretend",
			description: "Show SQL without executing",
			type: "boolean",
			default: false,
		},
	],
	handler: jest.fn().mockResolvedValue({
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
	} as CommandResult),
}

export const mockDbSeedCommand: ArtisanCommand = {
	name: "db:seed",
	description: "Seed the database",
	signature: "db:seed [options]",
	arguments: [],
	options: [
		{
			name: "seederClass",
			description: "Specific seeder to run",
			type: "string",
		},
		{
			name: "force",
			description: "Force seeding",
			type: "boolean",
			default: false,
		},
	],
	handler: jest.fn().mockResolvedValue({
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
	} as CommandResult),
}

export const mockServeCommand: ArtisanCommand = {
	name: "serve",
	description: "Start development server",
	signature: "serve [options]",
	arguments: [],
	options: [
		{
			name: "port",
			description: "Port to run on",
			type: "number",
			default: 3000,
		},
		{
			name: "host",
			description: "Host to bind to",
			type: "string",
			default: "localhost",
		},
		{
			name: "with-database",
			description: "Start with database",
			type: "boolean",
			default: true,
		},
	],
	handler: jest.fn().mockResolvedValue({
		success: true,
		message: "Development server started",
		data: {
			url: "http://localhost:3000",
			port: 3000,
			host: "localhost",
			pid: 12345,
		},
	} as CommandResult),
}

export const mockTestCommand: ArtisanCommand = {
	name: "test",
	description: "Run project tests",
	signature: "test [options]",
	arguments: [],
	options: [
		{
			name: "pattern",
			description: "Test pattern to run",
			type: "string",
		},
		{
			name: "watch",
			description: "Run in watch mode",
			type: "boolean",
			default: false,
		},
		{
			name: "coverage",
			description: "Generate coverage report",
			type: "boolean",
			default: false,
		},
		{
			name: "verbose",
			description: "Verbose output",
			type: "boolean",
			default: false,
		},
	],
	handler: jest.fn().mockResolvedValue({
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
	} as CommandResult),
}

// Export all mock commands
export const mockCommands = [
	mockMakeComponentCommand,
	mockMakeServiceCommand,
	mockMakeMigrationCommand,
	mockMakePageCommand,
	mockMakeApiCommand,
	mockMakeMiddlewareCommand,
	mockNewProjectCommand,
	mockInstallAuthCommand,
	mockInstallAdminCommand,
	mockDbMigrateCommand,
	mockDbSeedCommand,
	mockServeCommand,
	mockTestCommand,
]

// Setup function for tests
export function setupMockCommands(): void {
	// Reset all mock handlers
	for (const command of mockCommands) {
		if (command.handler && jest.isMockFunction(command.handler)) {
			command.handler.mockClear()
		}
	}
}

// Teardown function for tests
export function teardownMockCommands(): void {
	// Clear all mock handlers
	for (const command of mockCommands) {
		if (command.handler && jest.isMockFunction(command.handler)) {
			command.handler.mockClear()
		}
	}
}
