/**
 * Make Middleware Command
 * Creates new Next.js middleware with proper structure and templates
 */

import fs from "fs-extra"
import path from "path"
import { ArtisanCommand, CommandArguments, CommandOptions, CommandResult } from "../../types.js"

export const makeMiddlewareCommand: ArtisanCommand = {
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
			name: "type",
			description: "Type of middleware (auth, cors, rate-limit, logging, custom)",
			type: "string",
			default: "custom",
			alias: "t",
		},
		{
			name: "with-auth",
			description: "Include authentication logic",
			type: "boolean",
			default: false,
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
		{
			name: "with-logging",
			description: "Include request logging",
			type: "boolean",
			default: true,
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
				type: options.type || "custom",
				withAuth: options["with-auth"] || false,
				withCors: options["with-cors"] || false,
				withRateLimit: options["with-rate-limit"] || false,
				withLogging: options["with-logging"] !== false,
				withTests: options["with-tests"] !== false,
			}

			const result = await createMiddleware(config)

			return {
				success: true,
				message: `Middleware "${config.name}" created successfully`,
				data: result,
			}
		} catch (error) {
			return {
				success: false,
				message: `Failed to create middleware "${args.name}"`,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	},
}

async function createMiddleware(config: any): Promise<{ files: string[] }> {
	const files: string[] = []
	const baseDir = process.cwd()

	// Determine middleware directory
	const middlewareDir = path.join(baseDir, "src/middleware")

	// Ensure directory exists
	await fs.ensureDir(middlewareDir)

	// Generate middleware file
	const middlewarePath = path.join(middlewareDir, `${config.name}.ts`)
	const middlewareContent = generateMiddlewareContent(config)
	await fs.writeFile(middlewarePath, middlewareContent)
	files.push(middlewarePath)

	// Generate tests if requested
	if (config.withTests) {
		const testPath = path.join(middlewareDir, `${config.name}.test.ts`)
		const testContent = generateTestContent(config)
		await fs.writeFile(testPath, testContent)
		files.push(testPath)
	}

	return { files }
}

function generateMiddlewareContent(config: any): string {
	const pascalName = toPascalCase(config.name)
	const imports = generateImports(config)
	const middlewareFunction = generateMiddlewareFunction(config, pascalName)
	const helperFunctions = generateHelperFunctions(config, pascalName)

	return `${imports}

${middlewareFunction}

${helperFunctions}
`
}

function generateImports(config: any): string {
	const imports = ["import { NextRequest, NextResponse } from 'next/server'"]

	if (config.withAuth) {
		imports.push("import { auth } from '@/lib/auth'")
	}

	if (config.withRateLimit) {
		imports.push("import { rateLimit } from '@/lib/rate-limit'")
	}

	if (config.withCors) {
		imports.push("import { cors } from '@/lib/cors'")
	}

	return imports.join("\n")
}

function generateMiddlewareFunction(config: any, pascalName: string): string {
	const middlewareLogic = generateMiddlewareLogic(config, pascalName)

	return `export function ${pascalName}Middleware(request: NextRequest): NextResponse | void {
  try {
    // Log request if enabled
    ${config.withLogging ? `logRequest(request)` : ""}
    
    // Apply middleware logic
    ${middlewareLogic}
    
    // Continue to next middleware or route
    return NextResponse.next()
  } catch (error) {
    console.error('${pascalName} middleware error:', error)
    return NextResponse.json(
      { error: 'Middleware error' },
      { status: 500 }
    )
  }
}`
}

function generateMiddlewareLogic(config: any, _pascalName: string): string {
	const logic: string[] = []

	if (config.withAuth) {
		logic.push(`
    // Authentication check
    const authResult = checkAuthentication(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }`)
	}

	if (config.withCors) {
		logic.push(`
    // CORS handling
    const corsResult = handleCors(request)
    if (corsResult) {
      return corsResult
    }`)
	}

	if (config.withRateLimit) {
		logic.push(`
    // Rate limiting
    const rateLimitResult = checkRateLimit(request)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }`)
	}

	// Add custom logic based on type
	switch (config.type) {
		case "auth":
			logic.push(`
    // Custom authentication logic
    if (!isAuthenticated(request)) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }`)
			break

		case "cors":
			logic.push(`
    // Custom CORS logic
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 })
    }`)
			break

		case "rate-limit":
			logic.push(`
    // Custom rate limiting logic
    const clientId = getClientId(request)
    if (isRateLimited(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }`)
			break

		case "logging":
			logic.push(`
    // Custom logging logic
    logRequestDetails(request)`)
			break

		default:
			logic.push(`
    // Custom middleware logic
    // Add your custom logic here`)
	}

	return logic.join("\n")
}

function generateHelperFunctions(config: any, _pascalName: string): string {
	const functions: string[] = []

	if (config.withLogging) {
		functions.push(`
function logRequest(request: NextRequest): void {
  console.log(\`[\${new Date().toISOString()}] \${request.method} \${request.url}\`)
}`)
	}

	if (config.withAuth) {
		functions.push(`
function checkAuthentication(request: NextRequest): { success: boolean; user?: any } {
  // Implement authentication check
  // This is a placeholder - implement your actual auth logic
  const token = request.headers.get('authorization')
  
  if (!token) {
    return { success: false }
  }
  
  // Validate token and return user info
  return { success: true, user: { id: '1', email: 'user@example.com' } }
}

function isAuthenticated(request: NextRequest): boolean {
  const authResult = checkAuthentication(request)
  return authResult.success
}`)
	}

	if (config.withCors) {
		functions.push(`
function handleCors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin')
  const allowedOrigins = ['http://localhost:3000', 'https://yourdomain.com']
  
  if (origin && allowedOrigins.includes(origin)) {
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }
  }
  
  return null
}`)
	}

	if (config.withRateLimit) {
		functions.push(`
function checkRateLimit(request: NextRequest): { success: boolean; remaining?: number } {
  // Implement rate limiting logic
  // This is a placeholder - implement your actual rate limiting
  const clientId = getClientId(request)
  
  // Check if client has exceeded rate limit
  // Return success: false if rate limited
  return { success: true, remaining: 100 }
}

function getClientId(request: NextRequest): string {
  // Get client identifier (IP, user ID, etc.)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  return ip
}

function isRateLimited(clientId: string): boolean {
  // Implement rate limiting check
  // This is a placeholder
  return false
}`)
	}

	// Add custom functions based on type
	switch (config.type) {
		case "logging":
			functions.push(`
function logRequestDetails(request: NextRequest): void {
  const details = {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.ip
  }
  
  console.log('Request details:', JSON.stringify(details, null, 2))
}`)
			break
	}

	return functions.join("\n")
}

function generateTestContent(config: any): string {
	const pascalName = toPascalCase(config.name)

	return `import { NextRequest } from 'next/server'
import { ${pascalName}Middleware } from './${config.name}'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn().mockReturnValue({}),
    json: jest.fn().mockReturnValue({}),
    redirect: jest.fn().mockReturnValue({}),
  },
}))

describe('${pascalName}Middleware', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost:3000/test', {
      method: 'GET',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1',
      },
    })
    jest.clearAllMocks()
  })

  it('should process request successfully', () => {
    // Arrange
    const { NextResponse } = require('next/server')

    // Act
    const result = ${pascalName}Middleware(mockRequest)

    // Assert
    expect(NextResponse.next).toHaveBeenCalled()
  })

  it('should handle authentication when enabled', () => {
    // Arrange
    const { NextResponse } = require('next/server')
    ${
		config.withAuth
			? `
    // Test with valid auth
    mockRequest.headers.set('authorization', 'Bearer valid-token')
    
    // Act
    const result = ${pascalName}Middleware(mockRequest)
    
    // Assert
    expect(NextResponse.next).toHaveBeenCalled()`
			: `
    // Test authentication logic if enabled
    // Add specific tests based on your auth implementation`
	}
  })

  it('should handle CORS when enabled', () => {
    // Arrange
    const { NextResponse } = require('next/server')
    ${
		config.withCors
			? `
    // Test CORS preflight
    const optionsRequest = new NextRequest('http://localhost:3000/test', {
      method: 'OPTIONS',
      headers: {
        'origin': 'http://localhost:3000',
        'access-control-request-method': 'POST',
      },
    })
    
    // Act
    const result = ${pascalName}Middleware(optionsRequest)
    
    // Assert
    // Add assertions based on your CORS implementation`
			: `
    // Test CORS logic if enabled
    // Add specific tests based on your CORS implementation`
	}
  })

  it('should handle rate limiting when enabled', () => {
    // Arrange
    const { NextResponse } = require('next/server')
    ${
		config.withRateLimit
			? `
    // Test rate limiting
    // Make multiple requests to test rate limiting
    for (let i = 0; i < 10; i++) {
      ${pascalName}Middleware(mockRequest)
    }
    
    // Assert
    // Add assertions based on your rate limiting implementation`
			: `
    // Test rate limiting logic if enabled
    // Add specific tests based on your rate limiting implementation`
	}
  })

  it('should handle errors gracefully', () => {
    // Arrange
    const { NextResponse } = require('next/server')
    const invalidRequest = new NextRequest('invalid-url')

    // Act
    const result = ${pascalName}Middleware(invalidRequest)

    // Assert
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Middleware error' },
      { status: 500 }
    )
  })
})
`
}

function toPascalCase(str: string): string {
	return str
		.split(/[-_\s/]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("")
}
