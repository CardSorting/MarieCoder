/**
 * Mock Utilities
 * Mock implementations for utility functions
 */

import { ProjectStructure } from "../../types.js"

export const mockProjectAnalyzer = {
	analyzeProject: jest.fn().mockResolvedValue({
		projectPath: "/mock/project",
		hasNextjs: true,
		hasDatabase: true,
		hasAuth: true,
		hasAdmin: true,
		components: ["src/components/ui/Button.tsx", "src/components/ui/Input.tsx", "src/components/auth/LoginForm.tsx"],
		services: ["src/lib/services/UserService.ts", "src/lib/services/AuthService.ts"],
		repositories: ["src/lib/repositories/UserRepository.ts", "src/lib/repositories/AuthRepository.ts"],
		pages: ["src/app/page.tsx", "src/app/dashboard/page.tsx", "src/app/admin/page.tsx"],
		apiRoutes: ["src/app/api/users/route.ts", "src/app/api/auth/route.ts"],
	} as ProjectStructure),

	getProjectPath: jest.fn().mockReturnValue("/mock/project"),
	hasNextjs: jest.fn().mockReturnValue(true),
	hasDatabase: jest.fn().mockReturnValue(true),
	hasAuth: jest.fn().mockReturnValue(true),
	hasAdmin: jest.fn().mockReturnValue(true),
	getComponents: jest
		.fn()
		.mockReturnValue(["src/components/ui/Button.tsx", "src/components/ui/Input.tsx", "src/components/auth/LoginForm.tsx"]),
	getServices: jest.fn().mockReturnValue(["src/lib/services/UserService.ts", "src/lib/services/AuthService.ts"]),
	getRepositories: jest
		.fn()
		.mockReturnValue(["src/lib/repositories/UserRepository.ts", "src/lib/repositories/AuthRepository.ts"]),
	getPages: jest.fn().mockReturnValue(["src/app/page.tsx", "src/app/dashboard/page.tsx", "src/app/admin/page.tsx"]),
	getApiRoutes: jest.fn().mockReturnValue(["src/app/api/users/route.ts", "src/app/api/auth/route.ts"]),
}

export const mockFileGenerator = {
	generateComponent: jest.fn().mockResolvedValue({
		success: true,
		message: "Component generated successfully",
		data: {
			files: ["src/components/TestComponent.tsx"],
			directories: ["src/components"],
		},
	}),

	generateService: jest.fn().mockResolvedValue({
		success: true,
		message: "Service generated successfully",
		data: {
			files: ["src/lib/services/TestService.ts"],
			directories: ["src/lib/services"],
		},
	}),

	generateMigration: jest.fn().mockResolvedValue({
		success: true,
		message: "Migration generated successfully",
		data: {
			files: ["src/lib/database/migrations/20240101000000_create_test_table.ts"],
			directories: ["src/lib/database/migrations"],
		},
	}),

	generatePage: jest.fn().mockResolvedValue({
		success: true,
		message: "Page generated successfully",
		data: {
			files: ["src/app/test/page.tsx"],
			directories: ["src/app/test"],
		},
	}),

	generateApi: jest.fn().mockResolvedValue({
		success: true,
		message: "API route generated successfully",
		data: {
			files: ["src/app/api/test/route.ts"],
			directories: ["src/app/api/test"],
		},
	}),

	generateMiddleware: jest.fn().mockResolvedValue({
		success: true,
		message: "Middleware generated successfully",
		data: {
			files: ["src/middleware.ts"],
			directories: ["src"],
		},
	}),

	generateProject: jest.fn().mockResolvedValue({
		success: true,
		message: "Project generated successfully",
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
	}),

	generateAuth: jest.fn().mockResolvedValue({
		success: true,
		message: "Authentication generated successfully",
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
	}),

	generateAdmin: jest.fn().mockResolvedValue({
		success: true,
		message: "Admin panel generated successfully",
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
	}),
}

export const mockTemplateManager = {
	getTemplate: jest.fn().mockImplementation((templateName: string) => {
		const templates: Record<string, string> = {
			component: `import React from 'react'

interface {{name}}Props {
  // Add props here
}

export function {{name}}(props: {{name}}Props) {
  return (
    <div>
      <h1>{{name}}</h1>
      {/* Component content */}
    </div>
  )
}

export default {{name}}
`,
			service: `import { BaseService } from '../base/BaseService'
import { {{name}}Repository } from '../repositories/{{name}}Repository'

export class {{name}}Service extends BaseService {
  private repository: {{name}}Repository

  constructor() {
    super()
    this.repository = new {{name}}Repository()
  }

  async create(data: Create{{name}}Data): Promise<{{name}}> {
    try {
      // Validate input data
      this.validateCreateData(data)
      
      // Create record
      const {{nameLower}} = await this.repository.create(data)
      
      return {{nameLower}}
    } catch (error) {
      throw new Error(\`Failed to create {{nameLower}}: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }

  private validateCreateData(data: Create{{name}}Data): void {
    if (!data) {
      throw new Error('Data is required')
    }
  }
}

// Types
export interface {{name}} {
  id: string
  createdAt: string
  updatedAt: string
}

export interface Create{{name}}Data {
  // Add create data fields here
}
`,
			migration: `/**
 * Migration: {{name}}
 * {{description}}
 */

import { Kysely, sql } from 'kysely'
import type { Database } from '../../../types/database.js'

export const {{name}}Migration = {
  name: '{{name}}',
  version: '{{version}}',
  
  /**
   * Run the migration
   */
  async up(db: Kysely<Database>): Promise<void> {
    {{upSql}}
  },

  /**
   * Rollback the migration
   */
  async down(db: Kysely<Database>): Promise<void> {
    {{downSql}}
  }
}

export default {{name}}Migration
`,
			page: `export default function {{name}}Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{{name}}</h1>
      <p>Welcome to the {{name}} page!</p>
    </div>
  )
}
`,
			api: `import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // GET logic
    const data = {
      message: '{{name}} API endpoint',
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // POST logic
    const result = {
      id: Date.now(),
      ...body,
      createdAt: new Date().toISOString()
    }
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    )
  }
}
`,
			middleware: `import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  // Add your middleware logic here
  {{middlewareLogic}}
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
`,
			test: `import React from 'react'
import { render, screen } from '@testing-library/react'
import { {{name}} } from './{{name}}'

describe('{{name}}', () => {
  it('renders without crashing', () => {
    render(<{{name}} />)
    expect(screen.getByText('{{name}}')).toBeInTheDocument()
  })

  it('displays the component title', () => {
    render(<{{name}} />)
    const title = screen.getByRole('heading', { name: '{{name}}' })
    expect(title).toBeInTheDocument()
  })
})
`,
		}

		return templates[templateName] || ""
	}),

	renderTemplate: jest.fn().mockImplementation((template: string, variables: Record<string, string>) => {
		let rendered = template
		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`{{${key}}}`, "g")
			rendered = rendered.replace(regex, value)
		}
		return rendered
	}),

	getTemplatePath: jest.fn().mockImplementation((templateName: string) => {
		return `templates/${templateName}.hbs`
	}),

	templateExists: jest.fn().mockImplementation((templateName: string) => {
		const templates = ["component", "service", "migration", "page", "api", "middleware", "test"]
		return templates.includes(templateName)
	}),
}

export const mockValidation = {
	validateCommandArguments: jest.fn().mockImplementation((command: any, args: any) => {
		// Mock validation logic
		const errors: string[] = []

		// Check required arguments
		for (const arg of command.arguments || []) {
			if (arg.required && !args[arg.name]) {
				errors.push(`Argument '${arg.name}' is required`)
			}
		}

		// Check argument types
		for (const [key, value] of Object.entries(args)) {
			const arg = command.arguments?.find((a: any) => a.name === key)
			if (arg && arg.type === "string" && typeof value !== "string") {
				errors.push(`Argument '${key}' must be a string`)
			} else if (arg && arg.type === "number" && typeof value !== "number") {
				errors.push(`Argument '${key}' must be a number`)
			} else if (arg && arg.type === "boolean" && typeof value !== "boolean") {
				errors.push(`Argument '${key}' must be a boolean`)
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}),

	validateCommandOptions: jest.fn().mockImplementation((command: any, options: any) => {
		// Mock validation logic
		const errors: string[] = []

		// Check option types
		for (const [key, value] of Object.entries(options)) {
			const option = command.options?.find((o: any) => o.name === key)
			if (option && option.type === "string" && typeof value !== "string") {
				errors.push(`Option '${key}' must be a string`)
			} else if (option && option.type === "number" && typeof value !== "number") {
				errors.push(`Option '${key}' must be a number`)
			} else if (option && option.type === "boolean" && typeof value !== "boolean") {
				errors.push(`Option '${key}' must be a boolean`)
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}),

	validateProjectName: jest.fn().mockImplementation((name: string) => {
		const errors: string[] = []

		if (!name) {
			errors.push("Project name is required")
		} else if (name.length < 3) {
			errors.push("Project name must be at least 3 characters long")
		} else if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
			errors.push("Project name can only contain letters, numbers, hyphens, and underscores")
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}),

	validateComponentName: jest.fn().mockImplementation((name: string) => {
		const errors: string[] = []

		if (!name) {
			errors.push("Component name is required")
		} else if (name.length < 2) {
			errors.push("Component name must be at least 2 characters long")
		} else if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
			errors.push("Component name must start with a capital letter and contain only letters and numbers")
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}),

	validateServiceName: jest.fn().mockImplementation((name: string) => {
		const errors: string[] = []

		if (!name) {
			errors.push("Service name is required")
		} else if (name.length < 2) {
			errors.push("Service name must be at least 2 characters long")
		} else if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
			errors.push("Service name must start with a capital letter and contain only letters and numbers")
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}),

	validateMigrationName: jest.fn().mockImplementation((name: string) => {
		const errors: string[] = []

		if (!name) {
			errors.push("Migration name is required")
		} else if (name.length < 3) {
			errors.push("Migration name must be at least 3 characters long")
		} else if (!/^[a-z_]+$/.test(name)) {
			errors.push("Migration name can only contain lowercase letters and underscores")
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}),

	validateTableName: jest.fn().mockImplementation((name: string) => {
		const errors: string[] = []

		if (!name) {
			errors.push("Table name is required")
		} else if (name.length < 2) {
			errors.push("Table name must be at least 2 characters long")
		} else if (!/^[a-z_]+$/.test(name)) {
			errors.push("Table name can only contain lowercase letters and underscores")
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}),

	validateRoute: jest.fn().mockImplementation((route: string) => {
		const errors: string[] = []

		if (!route) {
			errors.push("Route is required")
		} else if (!route.startsWith("/")) {
			errors.push("Route must start with a forward slash")
		} else if (!/^\/[a-zA-Z0-9/_-]*$/.test(route)) {
			errors.push("Route can only contain letters, numbers, forward slashes, hyphens, and underscores")
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}),
}

export const mockErrorHandler = {
	handleError: jest.fn().mockImplementation((error: Error, context?: string) => {
		const errorMessage = context ? `${context}: ${error.message}` : error.message

		return {
			success: false,
			message: errorMessage,
			error: error.name,
			stack: error.stack,
		}
	}),

	handleValidationError: jest.fn().mockImplementation((errors: string[]) => {
		return {
			success: false,
			message: "Validation failed",
			errors,
			error: "ValidationError",
		}
	}),

	handleFileSystemError: jest.fn().mockImplementation((error: Error, operation: string, path: string) => {
		return {
			success: false,
			message: `File system error during ${operation}: ${error.message}`,
			error: "FileSystemError",
			operation,
			path,
		}
	}),

	handleDatabaseError: jest.fn().mockImplementation((error: Error, operation: string) => {
		return {
			success: false,
			message: `Database error during ${operation}: ${error.message}`,
			error: "DatabaseError",
			operation,
		}
	}),

	handleCommandError: jest.fn().mockImplementation((error: Error, command: string) => {
		return {
			success: false,
			message: `Command '${command}' failed: ${error.message}`,
			error: "CommandError",
			command,
		}
	}),

	handleTemplateError: jest.fn().mockImplementation((error: Error, template: string) => {
		return {
			success: false,
			message: `Template '${template}' error: ${error.message}`,
			error: "TemplateError",
			template,
		}
	}),

	handleProjectError: jest.fn().mockImplementation((error: Error, project: string) => {
		return {
			success: false,
			message: `Project '${project}' error: ${error.message}`,
			error: "ProjectError",
			project,
		}
	}),
}

// Setup function for tests
export function setupMockUtils(): void {
	// Reset all mock functions
	Object.values(mockProjectAnalyzer).forEach((fn) => {
		if (jest.isMockFunction(fn)) {
			fn.mockClear()
		}
	})

	Object.values(mockFileGenerator).forEach((fn) => {
		if (jest.isMockFunction(fn)) {
			fn.mockClear()
		}
	})

	Object.values(mockTemplateManager).forEach((fn) => {
		if (jest.isMockFunction(fn)) {
			fn.mockClear()
		}
	})

	Object.values(mockValidation).forEach((fn) => {
		if (jest.isMockFunction(fn)) {
			fn.mockClear()
		}
	})

	Object.values(mockErrorHandler).forEach((fn) => {
		if (jest.isMockFunction(fn)) {
			fn.mockClear()
		}
	})
}

// Teardown function for tests
export function teardownMockUtils(): void {
	// Clear all mock functions
	Object.values(mockProjectAnalyzer).forEach((fn) => {
		if (jest.isMockFunction(fn)) {
			fn.mockClear()
		}
	})

	Object.values(mockFileGenerator).forEach((fn) => {
		if (jest.isMockFunction(fn)) {
			fn.mockClear()
		}
	})

	Object.values(mockTemplateManager).forEach((fn) => {
		if (jest.isMockFunction(fn)) {
			fn.mockClear()
		}
	})

	Object.values(mockValidation).forEach((fn) => {
		if (jest.isMockFunction(fn)) {
			fn.mockClear()
		}
	})

	Object.values(mockErrorHandler).forEach((fn) => {
		if (jest.isMockFunction(fn)) {
			fn.mockClear()
		}
	})
}
