import { NOORMME } from "noormme"

/**
 * Base service class following NORMIE DEV methodology
 * Provides common functionality for all services
 */
export abstract class BaseService<T> {
	protected repository: any
	protected db: NOORMME

	constructor(repository: any, db: NOORMME) {
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
	 * Update entity by ID
	 */
	async update(id: string, data: Partial<T>): Promise<T> {
		return await this.repository.update(id, data)
	}

	/**
	 * Delete entity by ID
	 */
	async delete(id: string): Promise<boolean> {
		return await this.repository.delete(id)
	}

	/**
	 * Find entities by criteria
	 */
	async findBy(criteria: Record<string, any>): Promise<T[]> {
		return await this.repository.findBy(criteria)
	}

	/**
	 * Find single entity by criteria
	 */
	async findOneBy(criteria: Record<string, any>): Promise<T | null> {
		return await this.repository.findOneBy(criteria)
	}
}
