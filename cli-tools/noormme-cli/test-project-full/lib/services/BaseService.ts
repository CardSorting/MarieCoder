/**
 * Base service class providing common functionality for all services
 */
export abstract class BaseService<T> {
	protected repository: any
	protected db: any

	constructor(repository: any, db: any) {
		this.repository = repository
		this.db = db
	}

	/**
	 * Find entity by ID
	 */
	async findById(id: string): Promise<T | null> {
		return await this.repository.findById(id)
	}

	/**
	 * Find all entities
	 */
	async findAll(): Promise<T[]> {
		return await this.repository.findAll()
	}

	/**
	 * Create new entity
	 */
	async create(data: Partial<T>): Promise<T> {
		return await this.repository.create(data)
	}

	/**
	 * Update entity
	 */
	async update(id: string, data: Partial<T>): Promise<T | null> {
		return await this.repository.update(id, data)
	}

	/**
	 * Delete entity
	 */
	async delete(id: string): Promise<boolean> {
		return await this.repository.delete(id)
	}

	/**
	 * Check if entity exists
	 */
	async exists(id: string): Promise<boolean> {
		const entity = await this.findById(id)
		return entity !== null
	}
}
