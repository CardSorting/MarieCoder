/**
 * Service Generator for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - clean, type-safe service generation
 */

import path from "path"
import { FileManager } from "../core/file-manager.js"
import { TemplateEngine } from "../core/template-engine.js"
import { GenerationResult, ServiceConfig, TemplateFile } from "../types.js"

export class ServiceGenerator {
	private fileManager: FileManager
	private templateEngine: TemplateEngine

	constructor() {
		this.fileManager = new FileManager()
		this.templateEngine = new TemplateEngine()
	}

	/**
	 * Generate a service class
	 */
	async generate(config: ServiceConfig): Promise<GenerationResult> {
		try {
			console.log(`⚙️ Generating service: ${config.name}`)

			// Validate configuration
			this.validateConfig(config)

			// Generate service files
			const files: TemplateFile[] = []

			// Main service file
			const servicePath = this.getServicePath(config)
			files.push(await this.generateServiceFile(config, servicePath))

			// Repository file (if requested)
			if (config.includeRepository) {
				const repositoryPath = this.getRepositoryPath(config)
				files.push(await this.generateRepositoryFile(config, repositoryPath))
			}

			// Test file (if requested)
			if (config.includeTests) {
				const testPath = this.getTestPath(config)
				files.push(await this.generateTestFile(config, testPath))
			}

			// Write files
			await this.fileManager.writeFiles(files)

			console.log(`✅ Service ${config.name} generated successfully`)

			return {
				success: true,
				message: `Service '${config.name}' generated successfully`,
				files: files.map((f) => f.path),
			}
		} catch (error) {
			console.error("❌ Service generation failed:", error)
			return {
				success: false,
				message: `Service generation failed: ${error instanceof Error ? error.message : String(error)}`,
				files: [],
				errors: [error instanceof Error ? error.message : String(error)],
			}
		}
	}

	/**
	 * Validate service configuration
	 */
	private validateConfig(config: ServiceConfig): void {
		if (!config.name || typeof config.name !== "string") {
			throw new Error("Service name is required and must be a string")
		}

		if (!config.tableName || typeof config.tableName !== "string") {
			throw new Error("Table name is required and must be a string")
		}

		if (!config.projectPath || typeof config.projectPath !== "string") {
			throw new Error("Project path is required and must be a string")
		}

		// Validate service name format
		const serviceName = this.sanitizeServiceName(config.name)
		if (serviceName !== config.name) {
			throw new Error(`Invalid service name '${config.name}'. Use PascalCase (e.g., 'UserService')`)
		}

		// Validate table name format
		if (!/^[a-z][a-z0-9_]*$/.test(config.tableName)) {
			throw new Error(`Invalid table name '${config.tableName}'. Use snake_case (e.g., 'user_profiles')`)
		}
	}

	/**
	 * Get service file path
	 */
	private getServicePath(config: ServiceConfig): string {
		const fileName = `${config.name}Service.ts`
		return path.join(config.projectPath, "src", "lib", "services", fileName)
	}

	/**
	 * Get repository file path
	 */
	private getRepositoryPath(config: ServiceConfig): string {
		const entityName = config.name.replace("Service", "")
		const fileName = `${entityName}Repository.ts`
		return path.join(config.projectPath, "src", "lib", "repositories", fileName)
	}

	/**
	 * Get test file path
	 */
	private getTestPath(config: ServiceConfig): string {
		const fileName = `${config.name}Service.test.ts`
		return path.join(config.projectPath, "src", "lib", "services", fileName)
	}

	/**
	 * Generate service file
	 */
	private async generateServiceFile(config: ServiceConfig, filePath: string): Promise<TemplateFile> {
		const template = this.getServiceTemplate(config)
		const content = await this.templateEngine.renderContent(template, {
			serviceName: config.name,
			tableName: config.tableName,
			entityName: config.name.replace("Service", ""),
			includeRepository: config.includeRepository,
			includeBusinessLogic: config.includeBusinessLogic,
			includeValidation: config.includeValidation,
		})

		return {
			path: filePath,
			content,
			isTemplate: true,
		}
	}

	/**
	 * Generate repository file
	 */
	private async generateRepositoryFile(config: ServiceConfig, filePath: string): Promise<TemplateFile> {
		const template = this.getRepositoryTemplate(config)
		const content = await this.templateEngine.renderContent(template, {
			entityName: config.name.replace("Service", ""),
			tableName: config.tableName,
		})

		return {
			path: filePath,
			content,
			isTemplate: true,
		}
	}

	/**
	 * Generate test file
	 */
	private async generateTestFile(config: ServiceConfig, filePath: string): Promise<TemplateFile> {
		const template = this.getTestTemplate(config)
		const content = await this.templateEngine.renderContent(template, {
			serviceName: config.name,
			entityName: config.name.replace("Service", ""),
			tableName: config.tableName,
		})

		return {
			path: filePath,
			content,
			isTemplate: true,
		}
	}

	/**
	 * Get service template
	 */
	private getServiceTemplate(_config: ServiceConfig): string {
		return `import { BaseService } from './BaseService'
import { getDatabase } from '@/lib/db'
<% if (includeRepository) { %>
import { <%= entityName %>Repository } from '@/lib/repositories/<%= entityName %>Repository'
<% } %>
<% if (includeValidation) { %>
import { z } from 'zod'
<% } %>

export interface <%= entityName %> {
  id: string
  createdAt: string
  updatedAt: string
  // Add your entity fields here
}

<% if (includeValidation) { %>
export const <%= entityName.toLowerCase() %>Schema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Add your validation schema here
})

export type <%= entityName %>Input = z.infer<typeof <%= entityName.toLowerCase() %>Schema>
<% } %>

export class <%= serviceName %> extends BaseService<<%= entityName %>> {
  private static instance: <%= serviceName %>
  <% if (includeRepository) { %>
  private repository: <%= entityName %>Repository
  <% } %>

  static async getInstance(): Promise<<%= serviceName %>> {
    if (!<%= serviceName %>.instance) {
      const db = await getDatabase()
      <% if (includeRepository) { %>
      const repository = new <%= entityName %>Repository(db)
      <% serviceName %>.instance = new <%= serviceName %>(repository)
      <% } else { %>
      <% serviceName %>.instance = new <%= serviceName %>(db)
      <% } %>
    }
    return <%= serviceName %>.instance
  }

  <% if (includeRepository) { %>
  constructor(repository: <%= entityName %>Repository) {
    super(repository, repository.getDatabase())
    this.repository = repository
  }
  <% } else { %>
  constructor(db: any) {
    super(db.getRepository('<%= tableName %>'), db)
  }
  <% } %>

  <% if (includeBusinessLogic) { %>
  // Business logic methods

  /**
   * Create a new <%= entityName.toLowerCase() %>
   */
  async create<%= entityName %>(data: Partial<<%= entityName %>>): Promise<<%= entityName %>> {
    <% if (includeValidation) { %>
    const validatedData = <%= entityName.toLowerCase() %>Schema.parse(data)
    <% } else { %>
    const validatedData = data
    <% } %>

    <% if (includeRepository) { %>
    return await this.repository.create(validatedData)
    <% } else { %>
    return await this.repository.create(validatedData)
    <% } %>
  }

  /**
   * Find <%= entityName.toLowerCase() %> by ID
   */
  async findById(id: string): Promise<<%= entityName %> | null> {
    <% if (includeRepository) { %>
    return await this.repository.findById(id)
    <% } else { %>
    return await this.repository.findById(id)
    <% } %>
  }

  /**
   * Find all <%= entityName.toLowerCase() %>s with optional filters
   */
  async findAll(filters?: Partial<<%= entityName %>>): Promise<<%= entityName %>[]> {
    <% if (includeRepository) { %>
    return await this.repository.findAll(filters)
    <% } else { %>
    return await this.repository.findAll(filters)
    <% } %>
  }

  /**
   * Update <%= entityName.toLowerCase() %>
   */
  async update<%= entityName %>(id: string, data: Partial<<%= entityName %>>): Promise<<%= entityName %> | null> {
    <% if (includeValidation) { %>
    const validatedData = <%= entityName.toLowerCase() %>Schema.partial().parse(data)
    <% } else { %>
    const validatedData = data
    <% } %>

    <% if (includeRepository) { %>
    return await this.repository.update(id, validatedData)
    <% } else { %>
    return await this.repository.update(id, validatedData)
    <% } %>
  }

  /**
   * Delete <%= entityName.toLowerCase() %>
   */
  async delete<%= entityName %>(id: string): Promise<boolean> {
    <% if (includeRepository) { %>
    return await this.repository.delete(id)
    <% } else { %>
    return await this.repository.delete(id)
    <% } %>
  }

  /**
   * Get <%= entityName.toLowerCase() %> count
   */
  async getCount(filters?: Partial<<%= entityName %>>): Promise<number> {
    <% if (includeRepository) { %>
    return await this.repository.count(filters)
    <% } else { %>
    return await this.repository.count(filters)
    <% } %>
  }

  // Custom business logic methods
  <% } %>
}`
	}

	/**
	 * Get repository template
	 */
	private getRepositoryTemplate(_config: ServiceConfig): string {
		return `import { BaseRepository } from './BaseRepository'
import { <%= entityName %> } from '@/lib/services/<%= serviceName %>'

export class <%= entityName %>Repository extends BaseRepository<<%= entityName %>> {
  constructor(db: any) {
    super('<%= tableName %>', db)
  }

  // Custom repository methods

  /**
   * Find <%= entityName.toLowerCase() %>s by custom criteria
   */
  async findByCustomField(value: string): Promise<<%= entityName %>[]> {
    return await this.findBy({ customField: value })
  }

  /**
   * Find active <%= entityName.toLowerCase() %>s
   */
  async findActive(): Promise<<%= entityName %>[]> {
    return await this.findBy({ status: 'active' })
  }

  /**
   * Search <%= entityName.toLowerCase() %>s
   */
  async search(query: string): Promise<<%= entityName %>[]> {
    return await this.db
      .selectFrom(this.tableName)
      .selectAll()
      .where('name', 'like', \`%\${query}%\`)
      .execute()
  }

  /**
   * Get <%= entityName.toLowerCase() %> statistics
   */
  async getStats(): Promise<{
    total: number
    active: number
    inactive: number
  }> {
    const total = await this.count()
    const active = await this.count({ status: 'active' })
    const inactive = await this.count({ status: 'inactive' })

    return { total, active, inactive }
  }
}`
	}

	/**
	 * Get test template
	 */
	private getTestTemplate(_config: ServiceConfig): string {
		return `import { <%= serviceName %> } from './<%= serviceName %>'
import { getDatabase } from '@/lib/db'

// Mock the database
jest.mock('@/lib/db', () => ({
  getDatabase: jest.fn(),
}))

describe('<%= serviceName %>', () => {
  let service: <%= serviceName %>
  let mockDb: any

  beforeEach(() => {
    mockDb = {
      getRepository: jest.fn().mockReturnValue({
        create: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      }),
    }

    ;(getDatabase as jest.Mock).mockResolvedValue(mockDb)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getInstance', () => {
    it('should return singleton instance', async () => {
      const instance1 = await <%= serviceName %>.getInstance()
      const instance2 = await <%= serviceName %>.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  <% if (includeBusinessLogic) { %>
  describe('create<%= entityName %>', () => {
    it('should create a new <%= entityName.toLowerCase() %>', async () => {
      service = await <%= serviceName %>.getInstance()
      
      const mock<%= entityName %> = {
        id: 'test-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const repository = mockDb.getRepository('<%= tableName %>')
      repository.create.mockResolvedValue(mock<%= entityName %>)

      const result = await service.create<%= entityName %>(mock<%= entityName %>)

      expect(repository.create).toHaveBeenCalledWith(mock<%= entityName %>)
      expect(result).toEqual(mock<%= entityName %>)
    })
  })

  describe('findById', () => {
    it('should find <%= entityName.toLowerCase() %> by ID', async () => {
      service = await <%= serviceName %>.getInstance()
      
      const mock<%= entityName %> = {
        id: 'test-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const repository = mockDb.getRepository('<%= tableName %>')
      repository.findById.mockResolvedValue(mock<%= entityName %>)

      const result = await service.findById('test-id')

      expect(repository.findById).toHaveBeenCalledWith('test-id')
      expect(result).toEqual(mock<%= entityName %>)
    })

    it('should return null when <%= entityName.toLowerCase() %> not found', async () => {
      service = await <%= serviceName %>.getInstance()
      
      const repository = mockDb.getRepository('<%= tableName %>')
      repository.findById.mockResolvedValue(null)

      const result = await service.findById('non-existent-id')

      expect(repository.findById).toHaveBeenCalledWith('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should find all <%= entityName.toLowerCase() %>s', async () => {
      service = await <%= serviceName %>.getInstance()
      
      const mock<%= entityName %>s = [
        {
          id: 'test-id-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'test-id-2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      const repository = mockDb.getRepository('<%= tableName %>')
      repository.findAll.mockResolvedValue(mock<%= entityName %>s)

      const result = await service.findAll()

      expect(repository.findAll).toHaveBeenCalledWith(undefined)
      expect(result).toEqual(mock<%= entityName %>s)
    })

    it('should find <%= entityName.toLowerCase() %>s with filters', async () => {
      service = await <%= serviceName %>.getInstance()
      
      const filters = { status: 'active' }
      const mock<%= entityName %>s = [
        {
          id: 'test-id-1',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      const repository = mockDb.getRepository('<%= tableName %>')
      repository.findAll.mockResolvedValue(mock<%= entityName %>s)

      const result = await service.findAll(filters)

      expect(repository.findAll).toHaveBeenCalledWith(filters)
      expect(result).toEqual(mock<%= entityName %>s)
    })
  })
  <% } %>
})`
	}

	/**
	 * Sanitize service name
	 */
	private sanitizeServiceName(name: string): string {
		// Convert to PascalCase and ensure it ends with 'Service'
		const pascalCase = name
			.split(/[-_\s]+/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join("")

		return pascalCase.endsWith("Service") ? pascalCase : `${pascalCase}Service`
	}
}
