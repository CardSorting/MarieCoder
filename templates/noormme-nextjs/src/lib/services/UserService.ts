import type { NOORMME } from "@/types/database"
import { BaseService } from "./BaseService"

export interface User {
	id: string
	email: string
	name: string
	role: "customer" | "admin" | "super_admin"
	status: "active" | "inactive" | "suspended" | "deleted"
	avatar?: string
	timezone: string
	preferences: Record<string, any>
	lastLoginAt?: Date
	emailVerifiedAt?: Date
	createdAt: Date
	updatedAt: Date
}

export interface CreateUserData {
	email: string
	name: string
	role?: "customer" | "admin" | "super_admin"
	status?: "active" | "inactive" | "suspended" | "deleted"
	avatar?: string
	timezone?: string
	preferences?: Record<string, any>
}

export interface UpdateUserData {
	name?: string
	avatar?: string
	timezone?: string
	preferences?: Record<string, any>
	status?: "active" | "inactive" | "suspended" | "deleted"
}

export interface UserStats {
	totalUsers: number
	activeUsers: number
	newUsersThisMonth: number
	usersByRole: Record<string, number>
}

/**
 * Enhanced User service following NORMIE DEV methodology
 * Handles all user-related business logic for SAAS
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

		// Set defaults
		const userData = {
			...data,
			role: data.role || "customer",
			status: data.status || "active",
			timezone: data.timezone || "UTC",
			preferences: data.preferences || {
				theme: "auto",
				notifications: { email: true, push: true },
				language: "en",
			},
			emailVerifiedAt: new Date(),
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
	 * Update user profile (customer-facing)
	 */
	async updateProfile(userId: string, data: UpdateUserData): Promise<User> {
		// Log the update
		await this.logUserAction(userId, "profile_updated", {
			updatedFields: Object.keys(data),
		})

		return await this.update(userId, {
			...data,
			updatedAt: new Date(),
		})
	}

	/**
	 * Update user status (admin-only)
	 */
	async updateStatus(userId: string, status: User["status"], adminId: string): Promise<User> {
		// Log the status change
		await this.logUserAction(
			userId,
			"status_updated",
			{
				oldStatus: (await this.findById(userId))?.status,
				newStatus: status,
				updatedBy: adminId,
			},
			adminId,
		)

		return await this.update(userId, {
			status,
			updatedAt: new Date(),
		})
	}

	/**
	 * Update user role (admin-only)
	 */
	async updateRole(userId: string, role: User["role"], adminId: string): Promise<User> {
		// Log the role change
		await this.logUserAction(
			userId,
			"role_updated",
			{
				oldRole: (await this.findById(userId))?.role,
				newRole: role,
				updatedBy: adminId,
			},
			adminId,
		)

		return await this.update(userId, {
			role,
			updatedAt: new Date(),
		})
	}

	/**
	 * Get users by role
	 */
	async findByRole(role: User["role"]): Promise<User[]> {
		return await this.findBy({ role })
	}

	/**
	 * Get users by status
	 */
	async findByStatus(status: User["status"]): Promise<User[]> {
		return await this.findBy({ status })
	}

	/**
	 * Get user statistics (admin-only)
	 */
	async getUserStats(): Promise<UserStats> {
		const totalUsers = await this.repository.count()
		const activeUsers = await this.repository.count({ status: "active" })

		// Get new users this month
		const startOfMonth = new Date()
		startOfMonth.setDate(1)
		startOfMonth.setHours(0, 0, 0, 0)

		const newUsersThisMonth = await this.db
			.getKysely()
			.selectFrom("users")
			.select((eb: any) => eb.fn.count("id").as("count"))
			.where("createdAt", ">=", startOfMonth.toISOString())
			.executeTakeFirst()

		// Get users by role
		const usersByRole = await this.db
			.getKysely()
			.selectFrom("users")
			.select(["role", (eb: any) => eb.fn.count("id").as("count")])
			.groupBy("role")
			.execute()

		const roleStats = usersByRole.reduce(
			(acc: Record<string, number>, row: any) => {
				acc[row.role] = Number(row.count)
				return acc
			},
			{} as Record<string, number>,
		)

		return {
			totalUsers,
			activeUsers,
			newUsersThisMonth: Number(newUsersThisMonth?.count || 0),
			usersByRole: roleStats,
		}
	}

	/**
	 * Search users with pagination (admin-only)
	 */
	async searchUsers(query: string, page = 1, limit = 20): Promise<{ users: User[]; total: number; pages: number }> {
		const offset = (page - 1) * limit

		const users = await this.db
			.getKysely()
			.selectFrom("users")
			.selectAll()
			.where((eb: any) => eb.or([eb("name", "like", `%${query}%`), eb("email", "like", `%${query}%`)]))
			.limit(limit)
			.offset(offset)
			.execute()

		const total = await this.db
			.getKysely()
			.selectFrom("users")
			.select((eb: any) => eb.fn.count("id").as("count"))
			.where((eb: any) => eb.or([eb("name", "like", `%${query}%`), eb("email", "like", `%${query}%`)]))
			.executeTakeFirst()

		return {
			users,
			total: Number(total?.count || 0),
			pages: Math.ceil(Number(total?.count || 0) / limit),
		}
	}

	/**
	 * Delete user (soft delete)
	 */
	async deleteUser(userId: string, adminId: string): Promise<boolean> {
		// Log the deletion
		await this.logUserAction(
			userId,
			"user_deleted",
			{
				deletedBy: adminId,
			},
			adminId,
		)

		// Soft delete by setting status to 'deleted'
		await this.update(userId, {
			status: "deleted",
			updatedAt: new Date(),
		})

		return true
	}

	/**
	 * Log user action for audit trail
	 */
	private async logUserAction(userId: string, action: string, details: Record<string, any>, adminId?: string): Promise<void> {
		const auditRepo = this.db.getRepository("audit_logs")
		await auditRepo.create({
			userId,
			adminId,
			action,
			resourceType: "user",
			resourceId: userId,
			details: JSON.stringify(details),
		})
	}
}
