/**
 * Make Service Command
 * Creates new service classes with repository and business logic
 */

import fs from "fs-extra"
import path from "path"
import { ArtisanCommand, CommandArguments, CommandOptions, CommandResult, ServiceConfig } from "../../types.js"

export const makeServiceCommand: ArtisanCommand = {
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
			name: "table",
			description: "Database table name",
			type: "string",
			alias: "t",
		},
		{
			name: "with-repository",
			description: "Include repository class",
			type: "boolean",
			default: true,
		},
		{
			name: "with-business-logic",
			description: "Include business logic methods",
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
			description: "Include validation schemas",
			type: "boolean",
			default: true,
		},
	],
	handler: async (args: CommandArguments, options: CommandOptions): Promise<CommandResult> => {
		try {
			const config: ServiceConfig = {
				name: args.name as string,
				tableName: options.table as string,
				includeRepository: options["with-repository"] !== false,
				includeBusinessLogic: options["with-business-logic"] !== false,
				includeTests: options["with-tests"] !== false,
				includeValidation: options["with-validation"] !== false,
			}

			const result = await createService(config)

			return {
				success: true,
				message: `Service "${config.name}" created successfully`,
				data: result,
			}
		} catch (error) {
			return {
				success: false,
				message: `Failed to create service "${args.name}"`,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	},
}

async function createService(config: ServiceConfig): Promise<{ files: string[] }> {
	const files: string[] = []
	const baseDir = process.cwd()
	const servicesDir = path.join(baseDir, "src/lib/services")

	// Ensure services directory exists
	await fs.ensureDir(servicesDir)

	// Generate service file
	const servicePath = path.join(servicesDir, `${config.name}.service.ts`)
	const serviceContent = generateServiceContent(config)
	await fs.writeFile(servicePath, serviceContent)
	files.push(servicePath)

	// Generate repository if requested
	if (config.includeRepository) {
		const repositoryPath = path.join(servicesDir, `${config.name}.repository.ts`)
		const repositoryContent = generateRepositoryContent(config)
		await fs.writeFile(repositoryPath, repositoryContent)
		files.push(repositoryPath)
	}

	// Generate tests if requested
	if (config.includeTests) {
		const testPath = path.join(servicesDir, `${config.name}.service.test.ts`)
		const testContent = generateTestContent(config)
		await fs.writeFile(testPath, testContent)
		files.push(testPath)
	}

	// Generate validation schemas if requested
	if (config.includeValidation) {
		const validationPath = path.join(servicesDir, `${config.name}.validation.ts`)
		const validationContent = generateValidationContent(config)
		await fs.writeFile(validationPath, validationContent)
		files.push(validationPath)
	}

	return { files }
}

function generateServiceContent(config: ServiceConfig): string {
	const pascalName = toPascalCase(config.name)
	const repositoryImport = config.includeRepository
		? `import { ${pascalName}Repository } from './${config.name}.repository.js'\n`
		: ""
	const repositoryProperty = config.includeRepository ? `  private repository: ${pascalName}Repository\n` : ""
	const repositoryInit = config.includeRepository ? `    this.repository = new ${pascalName}Repository()\n` : ""
	const businessLogic = config.includeBusinessLogic ? generateBusinessLogicMethods(config) : ""

	return `import { BaseService } from '../base/BaseService.js'${repositoryImport}
import { NOORMError } from '../errors/NOORMError.js'

/**
 * ${pascalName} Service
 * Handles business logic for ${config.name} operations
 */
export class ${pascalName}Service extends BaseService {
${repositoryProperty}
  constructor() {
    super()${repositoryInit}
  }
${businessLogic}
}
`
}

function generateBusinessLogicMethods(config: ServiceConfig): string {
	const pascalName = toPascalCase(config.name)
	const _tableName = config.tableName || config.name.toLowerCase() + "s"

	return `
  /**
   * Create a new ${config.name}
   */
  async create(data: Create${pascalName}Data): Promise<${pascalName}> {
    try {
      // Validate input data
      this.validateCreateData(data)
      
      // Create record
      const ${config.name} = await this.repository.create(data)
      
      // Additional business logic (e.g., send notifications, update caches)
      
      return ${config.name}
    } catch (error) {
      throw new NOORMError(
        \`Failed to create ${config.name}: \${error instanceof Error ? error.message : 'Unknown error'}\`,
        'CREATE_ERROR',
        'Please check your data and try again'
      )
    }
  }

  /**
   * Get ${config.name} by ID
   */
  async findById(id: string): Promise<${pascalName} | null> {
    try {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new NOORMError('Valid ID is required', 'VALIDATION_ERROR')
      }
      
      return await this.repository.findById(id)
    } catch (error) {
      if (error instanceof NOORMError) {
        throw error
      }
      throw new NOORMError(
        \`Failed to find ${config.name}: \${error instanceof Error ? error.message : 'Unknown error'}\`,
        'FIND_ERROR'
      )
    }
  }

  /**
   * Get all ${config.name}s
   */
  async findAll(options?: FindOptions): Promise<${pascalName}[]> {
    try {
      return await this.repository.findAll(options)
    } catch (error) {
      throw new NOORMError(
        \`Failed to find ${config.name}s: \${error instanceof Error ? error.message : 'Unknown error'}\`,
        'FIND_ALL_ERROR'
      )
    }
  }

  /**
   * Update ${config.name}
   */
  async update(id: string, data: Update${pascalName}Data): Promise<${pascalName}> {
    try {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new NOORMError('Valid ID is required', 'VALIDATION_ERROR')
      }
      
      // Validate input data
      this.validateUpdateData(data)
      
      // Check if record exists
      const existing = await this.repository.findById(id)
      if (!existing) {
        throw new NOORMError(\`${pascalName} not found\`, 'NOT_FOUND')
      }
      
      // Update record
      const updated = await this.repository.update(id, data)
      
      // Additional business logic
      
      return updated
    } catch (error) {
      if (error instanceof NOORMError) {
        throw error
      }
      throw new NOORMError(
        \`Failed to update ${config.name}: \${error instanceof Error ? error.message : 'Unknown error'}\`,
        'UPDATE_ERROR'
      )
    }
  }

  /**
   * Delete ${config.name}
   */
  async delete(id: string): Promise<boolean> {
    try {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new NOORMError('Valid ID is required', 'VALIDATION_ERROR')
      }
      
      // Check if record exists
      const existing = await this.repository.findById(id)
      if (!existing) {
        throw new NOORMError(\`${pascalName} not found\`, 'NOT_FOUND')
      }
      
      // Delete record
      const deleted = await this.repository.delete(id)
      
      // Additional cleanup logic
      
      return deleted
    } catch (error) {
      if (error instanceof NOORMError) {
        throw error
      }
      throw new NOORMError(
        \`Failed to delete ${config.name}: \${error instanceof Error ? error.message : 'Unknown error'}\`,
        'DELETE_ERROR'
      )
    }
  }

  /**
   * Validate create data
   */
  private validateCreateData(data: Create${pascalName}Data): void {
    // Add validation logic here
    if (!data) {
      throw new NOORMError('Data is required', 'VALIDATION_ERROR')
    }
  }

  /**
   * Validate update data
   */
  private validateUpdateData(data: Update${pascalName}Data): void {
    // Add validation logic here
    if (!data) {
      throw new NOORMError('Data is required', 'VALIDATION_ERROR')
    }
  }

// Types
export interface ${pascalName} {
  id: string
  createdAt: string
  updatedAt: string
}

export interface Create${pascalName}Data {
  // Add create data fields here
}

export interface Update${pascalName}Data {
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

function generateRepositoryContent(config: ServiceConfig): string {
	const pascalName = toPascalCase(config.name)
	const tableName = config.tableName || config.name.toLowerCase() + "s"

	return `import { BaseRepository } from '../base/BaseRepository.js'
import { ${pascalName} } from './${config.name}.service.js'

/**
 * ${pascalName} Repository
 * Handles data access for ${config.name} operations
 */
export class ${pascalName}Repository extends BaseRepository<typeof '${tableName}'> {
  constructor() {
    super('${tableName}')
  }

  /**
   * Find ${config.name} by custom field
   */
  async findByField(field: string, value: any): Promise<${pascalName} | null> {
    try {
      const result = await this.db
        .selectFrom('${tableName}')
        .selectAll()
        .where(field as any, '=', value)
        .executeTakeFirst()

      return (result as unknown as ${pascalName}) || null
    } catch (error) {
      throw new Error(\`Failed to find ${config.name} by \${field}: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }

  /**
   * Find ${config.name}s with custom conditions
   */
  async findByConditions(conditions: Record<string, any>): Promise<${pascalName}[]> {
    try {
      let query = this.db.selectFrom('${tableName}').selectAll()

      for (const [field, value] of Object.entries(conditions)) {
        query = query.where(field as any, '=', value)
      }

      const results = await query.execute()
      return results as unknown as ${pascalName}[]
    } catch (error) {
      throw new Error(\`Failed to find ${config.name}s: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }
}
`
}

function generateTestContent(config: ServiceConfig): string {
	const pascalName = toPascalCase(config.name)

	return `import { ${pascalName}Service } from './${config.name}.service.js'
import { ${pascalName}Repository } from './${config.name}.repository.js'

// Mock the repository
jest.mock('./${config.name}.repository.js')
const MockRepository = ${pascalName}Repository as jest.MockedClass<typeof ${pascalName}Repository>

describe('${pascalName}Service', () => {
  let service: ${pascalName}Service
  let mockRepository: jest.Mocked<${pascalName}Repository>

  beforeEach(() => {
    mockRepository = new MockRepository() as jest.Mocked<${pascalName}Repository>
    service = new ${pascalName}Service()
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create a ${config.name} successfully', async () => {
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

    it('should throw error for invalid data', async () => {
      // Arrange
      const invalidData = null

      // Act & Assert
      await expect(service.create(invalidData as any)).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should return ${config.name} when found', async () => {
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

    it('should return null when not found', async () => {
      // Arrange
      const id = 'nonexistent'
      mockRepository.findById.mockResolvedValue(null)

      // Act
      const result = await service.findById(id)

      // Assert
      expect(result).toBeNull()
    })
  })
})
`
}

function generateValidationContent(config: ServiceConfig): string {
	const pascalName = toPascalCase(config.name)

	return `import { z } from 'zod'

/**
 * Validation schemas for ${config.name}
 */

export const Create${pascalName}Schema = z.object({
  // Add validation fields here
  // Example:
  // name: z.string().min(1, 'Name is required'),
  // email: z.string().email('Invalid email format'),
})

export const Update${pascalName}Schema = z.object({
  // Add validation fields here
  // Example:
  // name: z.string().min(1).optional(),
  // email: z.string().email().optional(),
})

export type Create${pascalName}Data = z.infer<typeof Create${pascalName}Schema>
export type Update${pascalName}Data = z.infer<typeof Update${pascalName}Schema>

/**
 * Validate create data
 */
export function validateCreate${pascalName}Data(data: unknown): Create${pascalName}Data {
  return Create${pascalName}Schema.parse(data)
}

/**
 * Validate update data
 */
export function validateUpdate${pascalName}Data(data: unknown): Update${pascalName}Data {
  return Update${pascalName}Schema.parse(data)
}
`
}

function toPascalCase(str: string): string {
	return str
		.split(/[-_\s]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("")
}
