import { NOORMME } from "noormme"
import { BaseService } from "./BaseService"

export interface User {
	id: string
	email: string
	name: string
	role: string
	createdAt: Date
	updatedAt: Date
}

export interface CreateUserData {
	email: string
	name: string
	role?: string
}

/**
 * User service following NORMIE DEV methodology
 * Handles all user-related business logic
 */
export class UserService extends BaseService<User> {
	constructor(db: NOORMME) {
		super(db.getRepository("users"), db)
	}

	/**
	 * Create a new user with validation
	 */
	async createUser(data: CreateUserData): Promise<User> {
		// Validate email uniqueness
		const existingUser = await this.repository.findByEmail(data.email)
		if (existingUser) {
			throw new Error("User with this email already exists")
		}

		// Set default role if not provided
		const userData = {
			...data,
			role: data.role || "user",
		}

		return await this.create(userData)
	}

	/**
	 * Find user by email
	 */
	async findByEmail(email: string): Promise<User | null> {
		return await this.repository.findByEmail(email)
	}

	/**
	 * Update user role
	 */
	async updateRole(userId: string, role: string): Promise<User> {
		return await this.update(userId, { role })
	}

	/**
	 * Get users by role
	 */
	async findByRole(role: string): Promise<User[]> {
		return await this.findBy({ role })
	}
}
