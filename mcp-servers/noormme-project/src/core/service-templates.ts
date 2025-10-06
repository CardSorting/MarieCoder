/**
 * Service Templates for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - clean, type-safe service templates
 */

export class ServiceTemplates {
	/**
	 * Get service template
	 */
	getServiceTemplate(): string {
		return `import { BaseService } from './BaseService'
import { getDatabase } from '@/lib/db'
<% if (includeRepository) { %>
import { <%= entityName %>Repository } from '@/lib/repositories/<%= entityName %>Repository'
<% } %>

export interface <%= entityName %> {
	id: string
	createdAt: string
	updatedAt: string
	// Add other properties as needed
}

export interface Create<%= entityName %>Data {
	// Define creation data structure
}

export interface Update<%= entityName %>Data {
	// Define update data structure
}

export class <%= serviceName %> extends BaseService<<%= entityName %>, Create<%= entityName %>Data, Update<%= entityName %>Data> {
<% if (includeRepository) { %>
	private repository: <%= entityName %>Repository

	constructor() {
		super()
		const db = getDatabase()
		this.repository = new <%= entityName %>Repository(db)
	}
<% } else { %>
	constructor() {
		super()
	}
<% } %>

<% if (includeBusinessLogic) { %>
	/**
	 * Business logic methods
	 */
	async create<%= entityName %>(data: Create<%= entityName %>Data): Promise<<%= entityName %>> {
		try {
			// Validate input data
			await this.validateCreateData(data)

			// Business logic before creation
			const processedData = await this.processCreateData(data)

			// Create the record
			const result = await this.repository.create(processedData)

			// Business logic after creation
			await this.handlePostCreation(result)

			return result
		} catch (error) {
			throw new Error(\`Failed to create <%= entityName.toLowerCase() %>: \${error instanceof Error ? error.message : 'Unknown error'}\`)
		}
	}

	async update<%= entityName %>(id: string, data: Update<%= entityName %>Data): Promise<<%= entityName %>> {
		try {
			// Validate input data
			await this.validateUpdateData(data)

			// Business logic before update
			const processedData = await this.processUpdateData(data)

			// Update the record
			const result = await this.repository.update(id, processedData)

			// Business logic after update
			await this.handlePostUpdate(result)

			return result
		} catch (error) {
			throw new Error(\`Failed to update <%= entityName.toLowerCase() %>: \${error instanceof Error ? error.message : 'Unknown error'}\`)
		}
	}

	async delete<%= entityName %>(id: string): Promise<boolean> {
		try {
			// Business logic before deletion
			await this.handlePreDeletion(id)

			// Delete the record
			const result = await this.repository.delete(id)

			// Business logic after deletion
			await this.handlePostDeletion(id)

			return result
		} catch (error) {
			throw new Error(\`Failed to delete <%= entityName.toLowerCase() %>: \${error instanceof Error ? error.message : 'Unknown error'}\`)
		}
	}

	/**
	 * Validation methods
	 */
	private async validateCreateData(data: Create<%= entityName %>Data): Promise<void> {
		// Add validation logic
		if (!data) {
			throw new Error('Create data is required')
		}
	}

	private async validateUpdateData(data: Update<%= entityName %>Data): Promise<void> {
		// Add validation logic
		if (!data) {
			throw new Error('Update data is required')
		}
	}

	/**
	 * Data processing methods
	 */
	private async processCreateData(data: Create<%= entityName %>Data): Promise<any> {
		// Add data processing logic
		return {
			...data,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}
	}

	private async processUpdateData(data: Update<%= entityName %>Data): Promise<any> {
		// Add data processing logic
		return {
			...data,
			updatedAt: new Date().toISOString(),
		}
	}

	/**
	 * Event handlers
	 */
	private async handlePostCreation(result: <%= entityName %>): Promise<void> {
		// Add post-creation logic (e.g., notifications, cache updates)
		console.log(\`<%= entityName %> created with ID: \${result.id}\`)
	}

	private async handlePostUpdate(result: <%= entityName %>): Promise<void> {
		// Add post-update logic
		console.log(\`<%= entityName %> updated with ID: \${result.id}\`)
	}

	private async handlePreDeletion(id: string): Promise<void> {
		// Add pre-deletion logic (e.g., dependency checks)
		console.log(\`Preparing to delete <%= entityName.toLowerCase() %> with ID: \${id}\`)
	}

	private async handlePostDeletion(id: string): Promise<void> {
		// Add post-deletion logic (e.g., cleanup, notifications)
		console.log(\`<%= entityName %> deleted with ID: \${id}\`)
	}
<% } %>

	/**
	 * Get repository instance
	 */
	getRepository() {
		return this.repository
	}
}`
	}

	/**
	 * Get repository template
	 */
	getRepositoryTemplate(): string {
		return `import { BaseRepository } from './BaseRepository'
import { <%= entityName %> } from '@/lib/services/<%= serviceName %>'

export class <%= entityName %>Repository extends BaseRepository<<%= entityName %>> {
	constructor(db: any) {
		super('<%= tableName %>', db)
	}

	/**
	 * Custom repository methods
	 */
	async findByCustomField(field: string, value: any): Promise<<%= entityName %>[]> {
		return await this.findBy({ [field]: value })
	}

	async findActiveRecords(): Promise<<%= entityName %>[]> {
		return await this.findBy({ status: 'active' })
	}

	async findRecentRecords(limit: number = 10): Promise<<%= entityName %>[]> {
		return await this.findBy({}, {
			orderBy: 'createdAt',
			orderDirection: 'desc',
			limit,
		})
	}

	async countByStatus(status: string): Promise<number> {
		return await this.count({ status })
	}

	async existsByField(field: string, value: any): Promise<boolean> {
		return await this.exists({ [field]: value })
	}

	/**
	 * Bulk operations
	 */
	async bulkCreate(data: Partial<<%= entityName %>>[]): Promise<<%= entityName %>[]> {
		const results: <%= entityName %>[] = []
		
		for (const item of data) {
			const result = await this.create(item)
			results.push(result)
		}
		
		return results
	}

	async bulkUpdate(updates: Array<{ id: string; data: Partial<<%= entityName %>> }>): Promise<<%= entityName %>[]> {
		const results: <%= entityName %>[] = []
		
		for (const update of updates) {
			const result = await this.update(update.id, update.data)
			results.push(result)
		}
		
		return results
	}

	async bulkDelete(ids: string[]): Promise<boolean[]> {
		const results: boolean[] = []
		
		for (const id of ids) {
			const result = await this.delete(id)
			results.push(result)
		}
		
		return results
	}
}`
	}

	/**
	 * Get test template
	 */
	getTestTemplate(): string {
		return `import { <%= serviceName %> } from './<%= serviceName %>'
import { getDatabase } from '@/lib/db'

// Mock the database
jest.mock('@/lib/db', () => ({
	getDatabase: jest.fn(() => ({
		getRepository: jest.fn(() => ({
			findById: jest.fn(),
			findAll: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
		})),
	})),
}))

describe('<%= serviceName %>', () => {
	let service: <%= serviceName %>
	let mockRepository: any

	beforeEach(() => {
		service = new <%= serviceName %>()
		mockRepository = service.getRepository()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('constructor', () => {
		it('should initialize service correctly', () => {
			expect(service).toBeInstanceOf(<%= serviceName %>)
			expect(mockRepository).toBeDefined()
		})
	})

<% if (includeBusinessLogic) { %>
	describe('create<%= entityName %>', () => {
		it('should create a new <%= entityName.toLowerCase() %>', async () => {
			const mockData = {
				// Add test data
			}
			const mockResult = {
				id: 'test-id',
				createdAt: '2023-01-01T00:00:00Z',
				updatedAt: '2023-01-01T00:00:00Z',
			}

			mockRepository.create.mockResolvedValue(mockResult)

			const result = await service.create<%= entityName %>(mockData)

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					...mockData,
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				})
			)
			expect(result).toEqual(mockResult)
		})

		it('should throw error for invalid data', async () => {
			await expect(service.create<%= entityName %>(null as any)).rejects.toThrow('Failed to create <%= entityName.toLowerCase() %>')
		})
	})

	describe('update<%= entityName %>', () => {
		it('should update an existing <%= entityName.toLowerCase() %>', async () => {
			const mockId = 'test-id'
			const mockData = {
				// Add test data
			}
			const mockResult = {
				id: mockId,
				createdAt: '2023-01-01T00:00:00Z',
				updatedAt: expect.any(String),
			}

			mockRepository.update.mockResolvedValue(mockResult)

			const result = await service.update<%= entityName %>(mockId, mockData)

			expect(mockRepository.update).toHaveBeenCalledWith(
				mockId,
				expect.objectContaining({
					...mockData,
					updatedAt: expect.any(String),
				})
			)
			expect(result).toEqual(mockResult)
		})
	})

	describe('delete<%= entityName %>', () => {
		it('should delete an existing <%= entityName.toLowerCase() %>', async () => {
			const mockId = 'test-id'
			mockRepository.delete.mockResolvedValue(true)

			const result = await service.delete<%= entityName %>(mockId)

			expect(mockRepository.delete).toHaveBeenCalledWith(mockId)
			expect(result).toBe(true)
		})
	})
<% } %>

	describe('getRepository', () => {
		it('should return repository instance', () => {
			const repository = service.getRepository()
			expect(repository).toBeDefined()
			expect(repository).toBe(mockRepository)
		})
	})
})`
	}
}
