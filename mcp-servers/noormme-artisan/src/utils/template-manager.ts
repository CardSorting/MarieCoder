/**
 * Template Manager
 * Manages and provides access to file templates
 */

export interface Template {
	name: string
	description: string
	category: string
	content: string
	variables: string[]
	requiredVariables: string[]
}

export class TemplateManager {
	private templates: Map<string, Template> = new Map()

	constructor() {
		this.loadDefaultTemplates()
	}

	/**
	 * Get a template by name
	 */
	getTemplate(name: string): Template | undefined {
		return this.templates.get(name)
	}

	/**
	 * Get all templates
	 */
	getAllTemplates(): Template[] {
		return Array.from(this.templates.values())
	}

	/**
	 * Get templates by category
	 */
	getTemplatesByCategory(category: string): Template[] {
		return this.getAllTemplates().filter((template) => template.category === category)
	}

	/**
	 * Get available categories
	 */
	getCategories(): string[] {
		const categories = new Set(this.getAllTemplates().map((template) => template.category))
		return Array.from(categories)
	}

	/**
	 * Register a new template
	 */
	registerTemplate(template: Template): void {
		this.templates.set(template.name, template)
	}

	/**
	 * Process template with variables
	 */
	processTemplate(templateName: string, variables: Record<string, any>): string {
		const template = this.getTemplate(templateName)
		if (!template) {
			throw new Error(`Template "${templateName}" not found`)
		}

		// Check required variables
		for (const requiredVar of template.requiredVariables) {
			if (!(requiredVar in variables)) {
				throw new Error(`Required variable "${requiredVar}" is missing`)
			}
		}

		return this.processTemplateContent(template.content, variables)
	}

	/**
	 * Process template content with variables
	 */
	private processTemplateContent(content: string, variables: Record<string, any>): string {
		let processed = content

		// Replace variables in the format {{variable}}
		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`{{${key}}}`, "g")
			processed = processed.replace(regex, String(value))
		}

		// Replace conditional blocks in the format {{#if condition}}...{{/if}}
		processed = this.processConditionals(processed, variables)

		// Replace loops in the format {{#each array}}...{{/each}}
		processed = this.processLoops(processed, variables)

		// Replace partials in the format {{> partialName}}
		processed = this.processPartials(processed, variables)

		return processed
	}

	/**
	 * Process conditional blocks
	 */
	private processConditionals(content: string, variables: Record<string, any>): string {
		const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g

		return content.replace(conditionalRegex, (_match, condition, blockContent) => {
			if (variables[condition]) {
				return this.processTemplateContent(blockContent, variables)
			}
			return ""
		})
	}

	/**
	 * Process loop blocks
	 */
	private processLoops(content: string, variables: Record<string, any>): string {
		const loopRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g

		return content.replace(loopRegex, (_match, arrayName, blockContent) => {
			const array = variables[arrayName]
			if (Array.isArray(array)) {
				return array
					.map((item) => {
						const itemVariables = { ...variables, ...item }
						return this.processTemplateContent(blockContent, itemVariables)
					})
					.join("")
			}
			return ""
		})
	}

	/**
	 * Process partials
	 */
	private processPartials(content: string, variables: Record<string, any>): string {
		const partialRegex = /{{>\s*(\w+)}}/g

		return content.replace(partialRegex, (match, partialName) => {
			const partial = this.getTemplate(partialName)
			if (partial) {
				return this.processTemplateContent(partial.content, variables)
			}
			return match // Return original if partial not found
		})
	}

	/**
	 * Load default templates
	 */
	private loadDefaultTemplates(): void {
		// Component templates
		this.registerTemplate({
			name: "component-ui",
			description: "Basic UI component",
			category: "component",
			content: `import React from 'react'{{#if withStyles}}
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

export default {{name}}`,
			variables: ["name", "kebabName", "withStyles", "withProps"],
			requiredVariables: ["name"],
		})

		this.registerTemplate({
			name: "component-page",
			description: "Page component",
			category: "component",
			content: `export default function {{name}}Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{{name}}</h1>
      <p>Welcome to the {{name}} page!</p>
    </div>
  )
}`,
			variables: ["name"],
			requiredVariables: ["name"],
		})

		this.registerTemplate({
			name: "component-layout",
			description: "Layout component",
			category: "component",
			content: `import React from 'react'

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
}`,
			variables: ["name", "kebabName"],
			requiredVariables: ["name"],
		})

		// Service templates
		this.registerTemplate({
			name: "service-basic",
			description: "Basic service class",
			category: "service",
			content: `import { BaseService } from '../base/BaseService'
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
}`,
			variables: ["name"],
			requiredVariables: ["name"],
		})

		// Repository templates
		this.registerTemplate({
			name: "repository-basic",
			description: "Basic repository class",
			category: "repository",
			content: `import { BaseRepository } from '../base/BaseRepository'
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
}`,
			variables: ["name", "tableName"],
			requiredVariables: ["name", "tableName"],
		})

		// API route templates
		this.registerTemplate({
			name: "api-basic",
			description: "Basic API route",
			category: "api",
			content: `import { NextRequest, NextResponse } from 'next/server'

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
}`,
			variables: ["name"],
			requiredVariables: ["name"],
		})

		// Test templates
		this.registerTemplate({
			name: "test-component",
			description: "Component test",
			category: "test",
			content: `import React from 'react'
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
})`,
			variables: ["name"],
			requiredVariables: ["name"],
		})

		this.registerTemplate({
			name: "test-service",
			description: "Service test",
			category: "test",
			content: `import { {{name}}Service } from './{{name}}Service'
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
})`,
			variables: ["name"],
			requiredVariables: ["name"],
		})

		// Migration templates
		this.registerTemplate({
			name: "migration-create-table",
			description: "Create table migration",
			category: "migration",
			content: `/**
 * Migration: {{name}}
 * Create {{tableName}} table
 */

import { Kysely, sql } from 'kysely'
import type { Database } from '../../../types/database.js'

export const {{pascalName}}Migration = {
  name: '{{name}}',
  version: '{{timestamp}}',
  
  /**
   * Run the migration
   */
  async up(db: Kysely<Database>): Promise<void> {
    await db.schema
      .createTable('{{tableName}}')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('created_at', 'text', (col) => col.notNull())
      .addColumn('updated_at', 'text', (col) => col.notNull())
      .execute()
  },

  /**
   * Rollback the migration
   */
  async down(db: Kysely<Database>): Promise<void> {
    await db.schema.dropTable('{{tableName}}').execute()
  }
}

export default {{pascalName}}Migration`,
			variables: ["name", "tableName", "pascalName", "timestamp"],
			requiredVariables: ["name", "tableName"],
		})

		// Seeder templates
		this.registerTemplate({
			name: "seeder-basic",
			description: "Basic seeder",
			category: "seeder",
			content: `/**
 * Seeder: {{name}}
 * Seed {{tableName}} table
 */

import { Kysely } from 'kysely'
import type { Database } from '../../types/database.js'

export class {{pascalName}}Seeder {
  name = '{{name}}'
  table = '{{tableName}}'
  
  data = [
    {
      // Add seed data here
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]

  /**
   * Run the seeder
   */
  async run(db: Kysely<Database>): Promise<void> {
    await db.insertInto('{{tableName}}').values(this.data).execute()
  }

  /**
   * Rollback the seeder
   */
  async rollback(db: Kysely<Database>): Promise<void> {
    await db.deleteFrom('{{tableName}}').execute()
  }
}

export default {{pascalName}}Seeder`,
			variables: ["name", "tableName", "pascalName"],
			requiredVariables: ["name", "tableName"],
		})
	}
}
