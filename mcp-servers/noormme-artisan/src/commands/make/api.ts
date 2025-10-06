/**
 * Make API Command
 * Creates new Next.js API routes with proper structure and templates
 */

import fs from "fs-extra"
import path from "path"
import { ArtisanCommand, CommandArguments, CommandOptions, CommandResult } from "../../types.js"

export const makeApiCommand: ArtisanCommand = {
	name: "make:api",
	description: "Create a new Next.js API route",
	signature: "make:api <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the API route (route path)",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "methods",
			description: "HTTP methods to support (comma-separated)",
			type: "string",
			default: "GET,POST",
			alias: "m",
		},
		{
			name: "with-auth",
			description: "Include authentication middleware",
			type: "boolean",
			default: false,
		},
		{
			name: "with-validation",
			description: "Include request validation",
			type: "boolean",
			default: true,
		},
		{
			name: "with-rate-limit",
			description: "Include rate limiting",
			type: "boolean",
			default: false,
		},
		{
			name: "with-tests",
			description: "Include test file",
			type: "boolean",
			default: true,
		},
	],
	handler: async (args: CommandArguments, options: CommandOptions): Promise<CommandResult> => {
		try {
			const config = {
				name: args.name as string,
				methods: ((options.methods as string) || "GET,POST").split(",").map((m) => m.trim().toUpperCase()),
				withAuth: options["with-auth"] || false,
				withValidation: options["with-validation"] !== false,
				withRateLimit: options["with-rate-limit"] || false,
				withTests: options["with-tests"] !== false,
			}

			const result = await createApiRoute(config)

			return {
				success: true,
				message: `API route "${config.name}" created successfully`,
				data: result,
			}
		} catch (error) {
			return {
				success: false,
				message: `Failed to create API route "${args.name}"`,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	},
}

async function createApiRoute(config: any): Promise<{ files: string[] }> {
	const files: string[] = []
	const baseDir = process.cwd()

	// Determine API route directory
	const routePath = config.name.startsWith("/") ? config.name.slice(1) : config.name
	const apiDir = path.join(baseDir, "src/app/api", routePath)

	// Ensure directory exists
	await fs.ensureDir(apiDir)

	// Generate route handler
	const routePath_file = path.join(apiDir, "route.ts")
	const routeContent = generateRouteContent(config)
	await fs.writeFile(routePath_file, routeContent)
	files.push(routePath_file)

	// Generate tests if requested
	if (config.withTests) {
		const testPath = path.join(apiDir, "route.test.ts")
		const testContent = generateTestContent(config)
		await fs.writeFile(testPath, testContent)
		files.push(testPath)
	}

	return { files }
}

function generateRouteContent(config: any): string {
	const pascalName = toPascalCase(config.name)
	const imports = generateImports(config)
	const middleware = generateMiddleware(config)
	const handlers = generateHandlers(config, pascalName)
	const validation = config.withValidation ? generateValidation(config) : ""

	return `${imports}${validation}

${middleware}

${handlers}
`
}

function generateImports(config: any): string {
	const imports = ["import { NextRequest, NextResponse } from 'next/server'"]

	if (config.withAuth) {
		imports.push("import { auth } from '@/lib/auth'")
	}

	if (config.withValidation) {
		imports.push("import { z } from 'zod'")
	}

	if (config.withRateLimit) {
		imports.push("import { rateLimit } from '@/lib/rate-limit'")
	}

	return imports.join("\n")
}

function generateValidation(config: any): string {
	const pascalName = toPascalCase(config.name)

	return `
// Validation schemas
const ${pascalName}RequestSchema = z.object({
  // Add request validation fields here
  // Example:
  // name: z.string().min(1, 'Name is required'),
  // email: z.string().email('Invalid email format'),
})

const ${pascalName}ResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
  error: z.string().optional(),
})

type ${pascalName}Request = z.infer<typeof ${pascalName}RequestSchema>
type ${pascalName}Response = z.infer<typeof ${pascalName}ResponseSchema>
`
}

function generateMiddleware(config: any): string {
	if (!config.withAuth && !config.withRateLimit) {
		return ""
	}

	let middleware = `
// Middleware functions
async function withMiddleware(handler: Function) {
  return async (request: NextRequest) => {`

	if (config.withAuth) {
		middleware += `
    // Authentication check
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }`
	}

	if (config.withRateLimit) {
		middleware += `
    // Rate limiting
    const rateLimitResult = await rateLimit(request)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429 }
      )
    }`
	}

	middleware += `
    
    return handler(request)
  }
}`

	return middleware
}

function generateHandlers(config: any, pascalName: string): string {
	const handlers: string[] = []

	for (const method of config.methods) {
		const _handlerName = `handle${method}`
		const handlerContent = generateMethodHandler(method, pascalName, config)
		handlers.push(handlerContent)
	}

	// Generate the main route handler
	const routeHandler = generateRouteHandler(config, handlers)
	handlers.push(routeHandler)

	return handlers.join("\n\n")
}

function generateMethodHandler(method: string, pascalName: string, config: any): string {
	const handlerName = `handle${method}`
	const validation = config.withValidation
		? `
    // Validate request body for POST/PUT/PATCH
    ${
		["POST", "PUT", "PATCH"].includes(method)
			? `
    let body: any = {}
    try {
      body = await request.json()
      ${pascalName}RequestSchema.parse(body)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      )
    }`
			: ""
	}
  `
		: ""

	const businessLogic = generateBusinessLogic(method, pascalName)

	return `async function ${handlerName}(request: NextRequest): Promise<NextResponse> {
    try {${validation}
      // Business logic
      ${businessLogic}
      
      return NextResponse.json({
        success: true,
        message: '${method} request processed successfully',
        data: result
      })
    } catch (error) {
      console.error('${method} handler error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error'
        },
        { status: 500 }
      )
    }
  }`
}

function generateBusinessLogic(method: string, _pascalName: string): string {
	switch (method) {
		case "GET":
			return `// GET logic - fetch data
      const result = {
        message: 'Data fetched successfully',
        timestamp: new Date().toISOString()
      }`

		case "POST":
			return `// POST logic - create new resource
      const result = {
        id: 'generated-id',
        message: 'Resource created successfully',
        timestamp: new Date().toISOString()
      }`

		case "PUT":
			return `// PUT logic - update resource
      const result = {
        message: 'Resource updated successfully',
        timestamp: new Date().toISOString()
      }`

		case "PATCH":
			return `// PATCH logic - partial update
      const result = {
        message: 'Resource partially updated successfully',
        timestamp: new Date().toISOString()
      }`

		case "DELETE":
			return `// DELETE logic - remove resource
      const result = {
        message: 'Resource deleted successfully',
        timestamp: new Date().toISOString()
      }`

		default:
			return `// ${method} logic
      const result = {
        message: '${method} request processed',
        timestamp: new Date().toISOString()
      }`
	}
}

function generateRouteHandler(config: any, _handlers: string[]): string {
	const methodHandlers = config.methods
		.map((method: string) => {
			const handlerName = `handle${method}`
			const wrappedHandler = config.withAuth || config.withRateLimit ? `withMiddleware(${handlerName})` : handlerName

			return `    case '${method}':
      return ${wrappedHandler}(request)`
		})
		.join("\n")

	return `// Main route handler
export async function GET(request: NextRequest) {
  return handleRequest('GET', request)
}

export async function POST(request: NextRequest) {
  return handleRequest('POST', request)
}

export async function PUT(request: NextRequest) {
  return handleRequest('PUT', request)
}

export async function PATCH(request: NextRequest) {
  return handleRequest('PATCH', request)
}

export async function DELETE(request: NextRequest) {
  return handleRequest('DELETE', request)
}

async function handleRequest(method: string, request: NextRequest): Promise<NextResponse> {
  switch (method) {
${methodHandlers}
    default:
      return NextResponse.json(
        { success: false, error: 'Method not allowed' },
        { status: 405 }
      )
  }
}`
}

function generateTestContent(config: any): string {
	const _pascalName = toPascalCase(config.name)

	return `import { NextRequest } from 'next/server'
import { GET, POST, PUT, PATCH, DELETE } from './route'

// Mock NextResponse
const mockNextResponse = {
  json: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
}

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: jest.fn().mockReturnValue(data),
      status: jest.fn().mockReturnValue(options?.status || 200),
    })),
  },
}))

describe('/api/${config.name}', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

${config.methods
	.map(
		(method: string) => `
  describe('${method}', () => {
    it('should handle ${method} requests successfully', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/${config.name}', {
        method: '${method}',
        ${
			["POST", "PUT", "PATCH"].includes(method)
				? `
        body: JSON.stringify({ test: 'data' }),
        headers: { 'Content-Type': 'application/json' },`
				: ""
		}
      })

      // Act
      const response = await ${method}(request)

      // Assert
      expect(response).toBeDefined()
      // Add more specific assertions based on your API logic
    })

    it('should handle ${method} requests with invalid data', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/${config.name}', {
        method: '${method}',
        ${
			["POST", "PUT", "PATCH"].includes(method)
				? `
        body: JSON.stringify({ invalid: 'data' }),
        headers: { 'Content-Type': 'application/json' },`
				: ""
		}
      })

      // Act
      const response = await ${method}(request)

      // Assert
      expect(response).toBeDefined()
      // Add assertions for error handling
    })
  })`,
	)
	.join("\n")}
})
`
}

function toPascalCase(str: string): string {
	return str
		.split(/[-_\s/]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("")
}
