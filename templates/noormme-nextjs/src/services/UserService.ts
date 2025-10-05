import { db } from "@/lib/db"
import { BaseService } from "./BaseService"

export interface User {
	id: string
	email: string
	name: string
	createdAt: Date
	updatedAt: Date
}

export interface CreateUserData {
	email: string
	name: string
}

/**
 * User service for managing user operations
 */
export class UserService extends BaseService<User> {
	constructor() {
		super(db.getRepository("users"), db)
	}

	/**
	 * Create a new user
	 */
	async createUser(data: CreateUserData): Promise<User> {
		const userData = {
			...data,
			id: this.generateId(),
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		return await this.create(userData)
	}

	/**
	 * Find user by email
	 */
	async findByEmail(email: string): Promise<User | null> {
		// This would use actual database query
		const users = await this.findAll()
		return users.find((user) => user.email === email) || null
	}

	/**
	 * Update user profile
	 */
	async updateProfile(id: string, data: Partial<CreateUserData>): Promise<User | null> {
		const updateData = {
			...data,
			updatedAt: new Date(),
		}

		return await this.update(id, updateData)
	}

	/**
	 * Generate unique ID
	 */
	private generateId(): string {
		return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}
}
