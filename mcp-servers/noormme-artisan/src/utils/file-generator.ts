/**
 * File Generator Utilities
 * Common utilities for generating files and templates
 */

import fs from "fs-extra"
import path from "path"

export interface FileGenerationOptions {
	baseDir: string
	overwrite?: boolean
	createDirectories?: boolean
}

export interface TemplateOptions {
	name: string
	type?: string
	withTests?: boolean
	withStyles?: boolean
	withStory?: boolean
	[key: string]: any
}

export class FileGenerator {
	private baseDir: string
	private overwrite: boolean
	private createDirectories: boolean

	constructor(options: FileGenerationOptions) {
		this.baseDir = options.baseDir
		this.overwrite = options.overwrite || false
		this.createDirectories = options.createDirectories !== false
	}

	/**
	 * Generate a file from a template
	 */
	async generateFile(filePath: string, template: string, variables: Record<string, any> = {}): Promise<string> {
		const fullPath = path.join(this.baseDir, filePath)

		// Check if file exists and overwrite is disabled
		if (!this.overwrite && (await fs.pathExists(fullPath))) {
			throw new Error(`File ${filePath} already exists. Use --force to overwrite.`)
		}

		// Create directory if needed
		if (this.createDirectories) {
			await fs.ensureDir(path.dirname(fullPath))
		}

		// Process template with variables
		const content = this.processTemplate(template, variables)

		// Write file
		await fs.writeFile(fullPath, content)

		return fullPath
	}

	/**
	 * Generate multiple files from templates
	 */
	async generateFiles(
		files: Array<{
			path: string
			template: string
			variables?: Record<string, any>
		}>,
	): Promise<string[]> {
		const generatedFiles: string[] = []

		for (const file of files) {
			const generatedPath = await this.generateFile(file.path, file.template, file.variables || {})
			generatedFiles.push(generatedPath)
		}

		return generatedFiles
	}

	/**
	 * Process template with variables
	 */
	private processTemplate(template: string, variables: Record<string, any>): string {
		let processed = template

		// Replace variables in the format {{variable}}
		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`{{${key}}}`, "g")
			processed = processed.replace(regex, String(value))
		}

		// Replace conditional blocks in the format {{#if condition}}...{{/if}}
		processed = this.processConditionals(processed, variables)

		// Replace loops in the format {{#each array}}...{{/each}}
		processed = this.processLoops(processed, variables)

		return processed
	}

	/**
	 * Process conditional blocks
	 */
	private processConditionals(template: string, variables: Record<string, any>): string {
		const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g

		return template.replace(conditionalRegex, (_match, condition, content) => {
			if (variables[condition]) {
				return content
			}
			return ""
		})
	}

	/**
	 * Process loop blocks
	 */
	private processLoops(template: string, variables: Record<string, any>): string {
		const loopRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g

		return template.replace(loopRegex, (_match, arrayName, content) => {
			const array = variables[arrayName]
			if (Array.isArray(array)) {
				return array
					.map((item) => {
						let itemContent = content
						for (const [key, value] of Object.entries(item)) {
							const regex = new RegExp(`{{${key}}}`, "g")
							itemContent = itemContent.replace(regex, String(value))
						}
						return itemContent
					})
					.join("")
			}
			return ""
		})
	}

	/**
	 * Generate component files
	 */
	async generateComponent(options: TemplateOptions): Promise<string[]> {
		const files: string[] = []
		const pascalName = this.toPascalCase(options.name)
		const kebabName = this.toKebabCase(options.name)

		// Generate main component file
		const componentTemplate = this.getComponentTemplate(options.type || "ui")
		const componentPath = await this.generateFile(
			`src/components/${options.type || "ui"}/${pascalName}.tsx`,
			componentTemplate,
			{
				name: pascalName,
				kebabName,
				withStyles: options.withStyles,
				withProps: true,
			},
		)
		files.push(componentPath)

		// Generate styles if requested
		if (options.withStyles) {
			const stylesTemplate = this.getStylesTemplate()
			const stylesPath = await this.generateFile(
				`src/components/${options.type || "ui"}/${pascalName}.module.css`,
				stylesTemplate,
				{ kebabName },
			)
			files.push(stylesPath)
		}

		// Generate tests if requested
		if (options.withTests) {
			const testTemplate = this.getTestTemplate()
			const testPath = await this.generateFile(
				`src/components/${options.type || "ui"}/${pascalName}.test.tsx`,
				testTemplate,
				{ name: pascalName },
			)
			files.push(testPath)
		}

		// Generate story if requested
		if (options.withStory) {
			const storyTemplate = this.getStoryTemplate()
			const storyPath = await this.generateFile(
				`src/components/${options.type || "ui"}/${pascalName}.stories.tsx`,
				storyTemplate,
				{ name: pascalName },
			)
			files.push(storyPath)
		}

		return files
	}

	/**
	 * Generate service files
	 */
	async generateService(options: TemplateOptions): Promise<string[]> {
		const files: string[] = []
		const pascalName = this.toPascalCase(options.name)

		// Generate service file
		const serviceTemplate = this.getServiceTemplate()
		const servicePath = await this.generateFile(`src/lib/services/${pascalName}Service.ts`, serviceTemplate, {
			name: pascalName,
			tableName: this.toSnakeCase(options.name) + "s",
		})
		files.push(servicePath)

		// Generate repository file
		const repositoryTemplate = this.getRepositoryTemplate()
		const repositoryPath = await this.generateFile(`src/lib/repositories/${pascalName}Repository.ts`, repositoryTemplate, {
			name: pascalName,
			tableName: this.toSnakeCase(options.name) + "s",
		})
		files.push(repositoryPath)

		// Generate tests if requested
		if (options.withTests) {
			const testTemplate = this.getServiceTestTemplate()
			const testPath = await this.generateFile(`src/lib/services/${pascalName}Service.test.ts`, testTemplate, {
				name: pascalName,
			})
			files.push(testPath)
		}

		return files
	}

	/**
	 * Generate page files
	 */
	async generatePage(options: TemplateOptions): Promise<string[]> {
		const files: string[] = []
		const pascalName = this.toPascalCase(options.name)
		const routePath = this.toKebabCase(options.name)

		// Generate page file
		const pageTemplate = this.getPageTemplate(options.type || "page")
		const pagePath = await this.generateFile(`src/app/${routePath}/page.tsx`, pageTemplate, {
			name: pascalName,
			routePath,
		})
		files.push(pagePath)

		// Generate tests if requested
		if (options.withTests) {
			const testTemplate = this.getPageTestTemplate()
			const testPath = await this.generateFile(`src/app/${routePath}/page.test.tsx`, testTemplate, { name: pascalName })
			files.push(testPath)
		}

		return files
	}

	/**
	 * Generate API route files
	 */
	async generateApiRoute(options: TemplateOptions): Promise<string[]> {
		const files: string[] = []
		const pascalName = this.toPascalCase(options.name)
		const routePath = this.toKebabCase(options.name)

		// Generate API route file
		const apiTemplate = this.getApiTemplate()
		const apiPath = await this.generateFile(`src/app/api/${routePath}/route.ts`, apiTemplate, {
			name: pascalName,
			routePath,
		})
		files.push(apiPath)

		// Generate tests if requested
		if (options.withTests) {
			const testTemplate = this.getApiTestTemplate()
			const testPath = await this.generateFile(`src/app/api/${routePath}/route.test.ts`, testTemplate, {
				name: pascalName,
				routePath,
			})
			files.push(testPath)
		}

		return files
	}

	// Template getters
	private getComponentTemplate(type: string): string {
		const baseTemplate = `import React from 'react'{{#if withStyles}}
import styles from './{{name}}.module.css'{{/if}}

{{#if withProps}}
interface {{name}}Props {
  // Add props here
}
{{/if}}

export function {{name}}({{#if withProps}}props: {{name}}Props{{/if}}) {
  return (
    <div{{#if withStyles}} className={styles.{{kebabName}}}{{/if}}>
      <h1>{{name}}</h1>
      {/* Component content */}
    </div>
  )
}

export default {{name}}
`

		switch (type) {
			case "page":
				return `import React from 'react'

export default function {{name}}Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{{name}}</h1>
      <p>Welcome to the {{name}} page!</p>
    </div>
  )
}
`
			case "layout":
				return `import React from 'react'

export default function {{name}}Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="{{kebabName}}-layout">
      {children}
    </div>
  )
}
`
			default:
				return baseTemplate
		}
	}

	private getStylesTemplate(): string {
		return `.{{kebabName}} {
  /* Component styles */
}
`
	}

	private getTestTemplate(): string {
		return `import React from 'react'
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
`
	}

	private getStoryTemplate(): string {
		return `import type { Meta, StoryObj } from '@storybook/react'
import { {{name}} } from './{{name}}'

const meta: Meta<typeof {{name}}> = {
  title: 'Components/{{name}}',
  component: {{name}},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}
`
	}

	private getServiceTemplate(): string {
		return `import { BaseService } from '../base/BaseService'
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
      const {{name.toLowerCase()}} = await this.repository.create(data)
      
      return {{name.toLowerCase()}}
    } catch (error) {
      throw new Error(\`Failed to create {{name.toLowerCase()}}: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }

  async findById(id: string): Promise<{{name}} | null> {
    try {
      return await this.repository.findById(id)
    } catch (error) {
      throw new Error(\`Failed to find {{name.toLowerCase()}}: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }

  async findAll(options?: FindOptions): Promise<{{name}}[]> {
    try {
      return await this.repository.findAll(options)
    } catch (error) {
      throw new Error(\`Failed to find {{name.toLowerCase()}}s: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }

  async update(id: string, data: Update{{name}}Data): Promise<{{name}}> {
    try {
      // Validate input data
      this.validateUpdateData(data)
      
      // Update record
      const updated = await this.repository.update(id, data)
      
      return updated
    } catch (error) {
      throw new Error(\`Failed to update {{name.toLowerCase()}}: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      return await this.repository.delete(id)
    } catch (error) {
      throw new Error(\`Failed to delete {{name.toLowerCase()}}: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }

  private validateCreateData(data: Create{{name}}Data): void {
    if (!data) {
      throw new Error('Data is required')
    }
  }

  private validateUpdateData(data: Update{{name}}Data): void {
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

export interface Update{{name}}Data {
  // Add update data fields here
}

export interface FindOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}
`
	}

	private getRepositoryTemplate(): string {
		return `import { BaseRepository } from '../base/BaseRepository'
import { {{name}} } from '../services/{{name}}Service'

export class {{name}}Repository extends BaseRepository<typeof '{{tableName}}'> {
  constructor() {
    super('{{tableName}}')
  }

  async findByField(field: string, value: any): Promise<{{name}} | null> {
    try {
      const result = await this.db
        .selectFrom('{{tableName}}')
        .selectAll()
        .where(field as any, '=', value)
        .executeTakeFirst()

      return (result as unknown as {{name}}) || null
    } catch (error) {
      throw new Error(\`Failed to find {{name.toLowerCase()}} by \${field}: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }

  async findByConditions(conditions: Record<string, any>): Promise<{{name}}[]> {
    try {
      let query = this.db.selectFrom('{{tableName}}').selectAll()

      for (const [field, value] of Object.entries(conditions)) {
        query = query.where(field as any, '=', value)
      }

      const results = await query.execute()
      return results as unknown as {{name}}[]
    } catch (error) {
      throw new Error(\`Failed to find {{name.toLowerCase()}}s: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }
}
`
	}

	private getServiceTestTemplate(): string {
		return `import { {{name}}Service } from './{{name}}Service'
import { {{name}}Repository } from '../repositories/{{name}}Repository'

// Mock the repository
jest.mock('../repositories/{{name}}Repository')
const MockRepository = {{name}}Repository as jest.MockedClass<typeof {{name}}Repository>

describe('{{name}}Service', () => {
  let service: {{name}}Service
  let mockRepository: jest.Mocked<{{name}}Repository>

  beforeEach(() => {
    mockRepository = new MockRepository() as jest.Mocked<{{name}}Repository>
    service = new {{name}}Service()
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create a {{name.toLowerCase()}} successfully', async () => {
      // Arrange
      const createData = {
        // Add test data here
      }
      const expectedResult = {
        id: '1',
        ...createData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockRepository.create.mockResolvedValue(expectedResult)

      // Act
      const result = await service.create(createData)

      // Assert
      expect(result).toEqual(expectedResult)
      expect(mockRepository.create).toHaveBeenCalledWith(createData)
    })
  })

  describe('findById', () => {
    it('should return {{name.toLowerCase()}} when found', async () => {
      // Arrange
      const id = '1'
      const expectedResult = {
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockRepository.findById.mockResolvedValue(expectedResult)

      // Act
      const result = await service.findById(id)

      // Assert
      expect(result).toEqual(expectedResult)
      expect(mockRepository.findById).toHaveBeenCalledWith(id)
    })
  })
})
`
	}

	private getPageTemplate(type: string): string {
		switch (type) {
			case "loading":
				return `export default function {{name}}Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>
  )
}
`
			case "error":
				return `'use client'

export default function {{name}}Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
`
			case "not-found":
				return `export default function {{name}}NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Not Found</h2>
        <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
        <a
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Home
        </a>
      </div>
    </div>
  )
}
`
			default:
				return `export default function {{name}}Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{{name}}</h1>
      <p>Welcome to the {{name}} page!</p>
    </div>
  )
}
`
		}
	}

	private getPageTestTemplate(): string {
		return `import { render, screen } from '@testing-library/react'
import {{name}}Page from './page'

describe('{{name}}Page', () => {
  it('renders without crashing', () => {
    render(<{{name}}Page />)
    expect(screen.getByText('{{name}}')).toBeInTheDocument()
  })

  it('displays the page title', () => {
    render(<{{name}}Page />)
    const title = screen.getByRole('heading', { name: '{{name}}' })
    expect(title).toBeInTheDocument()
  })
})
`
	}

	private getApiTemplate(): string {
		return `import { NextRequest, NextResponse } from 'next/server'

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
`
	}

	private getApiTestTemplate(): string {
		return `import { NextRequest } from 'next/server'
import { GET, POST } from './route'

describe('/api/{{routePath}}', () => {
  describe('GET', () => {
    it('should return data successfully', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/{{routePath}}')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.message).toBe('{{name}} API endpoint')
    })
  })

  describe('POST', () => {
    it('should create resource successfully', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/{{routePath}}', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
    })
  })
})
`
	}

	// Utility methods
	private toPascalCase(str: string): string {
		return str
			.split(/[-_\s/]+/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join("")
	}

	private toKebabCase(str: string): string {
		return str
			.replace(/([a-z])([A-Z])/g, "$1-$2")
			.replace(/[\s_]+/g, "-")
			.toLowerCase()
	}

	private toSnakeCase(str: string): string {
		return str
			.replace(/([a-z])([A-Z])/g, "$1_$2")
			.replace(/[\s-]+/g, "_")
			.toLowerCase()
	}
}
