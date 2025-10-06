/**
 * User Service - Centralized user management operations
 * Handles all user-related business logic and data operations
 */

import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "../db"
import { AuditService } from "./AuditService"

// Validation schemas
export const CreateUserSchema = z.object({
	email: z.string().email().max(255),
	name: z.string().min(1).max(100),
	password: z.string().min(8).max(128),
	roleIds: z.array(z.string()).optional(),
	status: z.enum(["active", "inactive", "suspended"]).optional(),
})

export const UpdateUserSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	email: z.string().email().max(255).optional(),
	status: z.enum(["active", "inactive", "suspended"]).optional(),
	roleIds: z.array(z.string()).optional(),
	password: z.string().min(8).max(128).optional(),
})

export const UserSearchSchema = z.object({
	search: z.string().optional(),
	status: z.enum(["active", "inactive", "suspended"]).optional(),
	roleId: z.string().optional(),
	page: z.number().min(1).default(1),
	limit: z.number().min(1).max(100).default(10),
})

export type CreateUserData = z.infer<typeof CreateUserSchema>
export type UpdateUserData = z.infer<typeof UpdateUserSchema>
export type UserSearchData = z.infer<typeof UserSearchSchema>

export interface UserWithRoles {
	id: string
	email: string
	name: string
	status: "active" | "inactive" | "suspended"
	email_verified: boolean
	image?: string
	last_login?: string
	created_at: string
	updated_at: string
	roles: Array<{
		id: string
		name: string
		description?: string
	}>
}

export interface UserStats {
	total_users: number
	active_users: number
	inactive_users: number
	suspended_users: number
	new_users_this_month: number
	users_without_roles: number
}

export interface UserSearchResult {
	users: UserWithRoles[]
	pagination: {
		page: number
		limit: number
		total: number
		pages: number
	}
}

export class UserService {
	private kysely = db.getKysely()
	private auditService = new AuditService()

	/**
	 * Get users with pagination and filtering
	 */
	async getUsers(searchData: UserSearchData): Promise<UserSearchResult> {
		try {
			const { page, limit, search, status, roleId } = searchData
			const offset = (page - 1) * limit

			// Build base query
			let query = this.kysely
				.selectFrom("users")
				.select(["id", "email", "name", "status", "email_verified", "image", "last_login", "created_at", "updated_at"])

			// Apply filters
			if (search) {
				query = query.where((eb) => eb.or([eb("email", "like", `%${search}%`), eb("name", "like", `%${search}%`)]))
			}

			if (status) {
				query = query.where("status", "=", status)
			}

			// If filtering by role, join with user_roles
			if (roleId) {
				query = query
					.innerJoin("user_roles", "users.id", "user_roles.user_id")
					.where("user_roles.role_id", "=", roleId)
					.where("user_roles.expires_at", ">", new Date().toISOString())
			}

			// Get total count
			const totalQuery = query.select(this.kysely.fn.count("users.id").as("total"))
			const totalResult = await totalQuery.executeTakeFirst()
			const total = Number(totalResult?.total || 0)

			// Get users with pagination
			const users = await query.orderBy("users.created_at", "desc").limit(limit).offset(offset).execute()

			// Get roles for each user
			const usersWithRoles = await Promise.all(
				users.map(async (user) => {
					const userRoles = await this.getUserRoles(user.id)
					return {
						...user,
						roles: userRoles,
					}
				}),
			)

			return {
				users: usersWithRoles,
				pagination: {
					page,
					limit,
					total,
					pages: Math.ceil(total / limit),
				},
			}
		} catch (error) {
			console.error("Error fetching users:", error)
			throw new Error("Failed to fetch users")
		}
	}

	/**
	 * Get user by ID with roles
	 */
	async getUserById(userId: string): Promise<UserWithRoles | null> {
		try {
			const user = await this.kysely
				.selectFrom("users")
				.where("id", "=", userId)
				.select(["id", "email", "name", "status", "email_verified", "image", "last_login", "created_at", "updated_at"])
				.executeTakeFirst()

			if (!user) return null

			const roles = await this.getUserRoles(userId)

			return {
				...user,
				roles,
			}
		} catch (error) {
			console.error("Error fetching user:", error)
			throw new Error("Failed to fetch user")
		}
	}

	/**
	 * Get user roles
	 */
	async getUserRoles(userId: string): Promise<Array<{ id: string; name: string; description?: string }>> {
		try {
			return await this.kysely
				.selectFrom("user_roles")
				.innerJoin("roles", "user_roles.role_id", "roles.id")
				.where("user_roles.user_id", "=", userId)
				.where("user_roles.expires_at", ">", new Date().toISOString())
				.select(["roles.id", "roles.name", "roles.description"])
				.execute()
		} catch (error) {
			console.error("Error fetching user roles:", error)
			return []
		}
	}

	/**
	 * Create a new user
	 */
	async createUser(data: CreateUserData, createdBy: string): Promise<UserWithRoles> {
		try {
			const now = new Date().toISOString()

			// Check if user already exists
			const existingUser = await this.kysely
				.selectFrom("users")
				.where("email", "=", data.email)
				.select("id")
				.executeTakeFirst()

			if (existingUser) {
				throw new Error("User with this email already exists")
			}

			// Hash password
			const passwordHash = await bcrypt.hash(data.password, 12)

			// Generate user ID
			const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

			// Create user
			const newUser = await this.kysely
				.insertInto("users")
				.values({
					id: userId,
					email: data.email,
					name: data.name,
					password_hash: passwordHash,
					email_verified: false,
					status: data.status || "active",
					created_at: now,
					updated_at: now,
				})
				.returning(["id", "email", "name", "status", "email_verified", "image", "last_login", "created_at", "updated_at"])
				.executeTakeFirst()

			if (!newUser) {
				throw new Error("Failed to create user")
			}

			// Assign roles
			const roleIds = data.roleIds || ["user"]
			for (const roleId of roleIds) {
				await this.assignRoleToUser(newUser.id, roleId, createdBy)
			}

			// Log audit event
			await this.auditService.logAction(
				{
					action: "user.created",
					resource_type: "user",
					resource_id: newUser.id,
					details: {
						email: newUser.email,
						name: newUser.name,
						status: newUser.status,
						roles: roleIds,
					},
				},
				createdBy,
			)

			// Return user with roles
			return (await this.getUserById(newUser.id)) as UserWithRoles
		} catch (error) {
			console.error("Error creating user:", error)
			throw error
		}
	}

	/**
	 * Update user
	 */
	async updateUser(userId: string, data: UpdateUserData, updatedBy: string): Promise<UserWithRoles> {
		try {
			const now = new Date().toISOString()

			// Check if user exists
			const existingUser = await this.kysely
				.selectFrom("users")
				.where("id", "=", userId)
				.select(["id", "email"])
				.executeTakeFirst()

			if (!existingUser) {
				throw new Error("User not found")
			}

			// Check if email is being changed and if it's already taken
			if (data.email && data.email !== existingUser.email) {
				const emailExists = await this.kysely
					.selectFrom("users")
					.where("email", "=", data.email)
					.where("id", "!=", userId)
					.select("id")
					.executeTakeFirst()

				if (emailExists) {
					throw new Error("Email is already taken by another user")
				}
			}

			// Prepare update data
			const updateData: any = {
				updated_at: now,
			}

			if (data.name) updateData.name = data.name
			if (data.email) updateData.email = data.email
			if (data.status) updateData.status = data.status

			// Hash new password if provided
			if (data.password) {
				updateData.password_hash = await bcrypt.hash(data.password, 12)
			}

			// Update user
			const updatedUser = await this.kysely
				.updateTable("users")
				.set(updateData)
				.where("id", "=", userId)
				.returning(["id", "email", "name", "status", "email_verified", "image", "last_login", "created_at", "updated_at"])
				.executeTakeFirst()

			if (!updatedUser) {
				throw new Error("Failed to update user")
			}

			// Update roles if provided
			if (data.roleIds) {
				// Remove existing roles
				await this.kysely.deleteFrom("user_roles").where("user_id", "=", userId).execute()

				// Assign new roles
				for (const roleId of data.roleIds) {
					await this.assignRoleToUser(userId, roleId, updatedBy)
				}
			}

			// Log audit event
			await this.auditService.logAction(
				{
					action: "user.updated",
					resource_type: "user",
					resource_id: userId,
					details: { changes: data },
				},
				updatedBy,
			)

			// Return updated user with roles
			return (await this.getUserById(userId)) as UserWithRoles
		} catch (error) {
			console.error("Error updating user:", error)
			throw error
		}
	}

	/**
	 * Delete user
	 */
	async deleteUser(userId: string, deletedBy: string): Promise<void> {
		try {
			// Check if user exists
			const existingUser = await this.kysely
				.selectFrom("users")
				.where("id", "=", userId)
				.select(["id", "email", "name"])
				.executeTakeFirst()

			if (!existingUser) {
				throw new Error("User not found")
			}

			// Prevent self-deletion
			if (userId === deletedBy) {
				throw new Error("Cannot delete your own account")
			}

			// Delete user roles first
			await this.kysely.deleteFrom("user_roles").where("user_id", "=", userId).execute()

			// Delete user sessions
			await this.kysely.deleteFrom("sessions").where("user_id", "=", userId).execute()

			// Delete user
			const result = await this.kysely.deleteFrom("users").where("id", "=", userId).execute()

			if (result.length === 0) {
				throw new Error("Failed to delete user")
			}

			// Log audit event
			await this.auditService.logAction(
				{
					action: "user.deleted",
					resource_type: "user",
					resource_id: userId,
					details: {
						email: existingUser.email,
						name: existingUser.name,
					},
				},
				deletedBy,
			)
		} catch (error) {
			console.error("Error deleting user:", error)
			throw error
		}
	}

	/**
	 * Assign role to user
	 */
	async assignRoleToUser(userId: string, roleId: string, assignedBy: string): Promise<void> {
		try {
			const now = new Date().toISOString()

			await this.kysely
				.insertInto("user_roles")
				.values({
					id: `${userId}-${roleId}-${Date.now()}`,
					user_id: userId,
					role_id: roleId,
					assigned_by: assignedBy,
					created_at: now,
					updated_at: now,
				})
				.execute()

			// Log audit event
			await this.auditService.logAction(
				{
					action: "user.role_assigned",
					resource_type: "user",
					resource_id: userId,
					details: { role_id: roleId },
				},
				assignedBy,
			)
		} catch (error) {
			console.error("Error assigning role to user:", error)
			throw new Error("Failed to assign role to user")
		}
	}

	/**
	 * Remove role from user
	 */
	async removeRoleFromUser(userId: string, roleId: string, removedBy: string): Promise<void> {
		try {
			await this.kysely.deleteFrom("user_roles").where("user_id", "=", userId).where("role_id", "=", roleId).execute()

			// Log audit event
			await this.auditService.logAction(
				{
					action: "user.role_removed",
					resource_type: "user",
					resource_id: userId,
					details: { role_id: roleId },
				},
				removedBy,
			)
		} catch (error) {
			console.error("Error removing role from user:", error)
			throw new Error("Failed to remove role from user")
		}
	}

	/**
	 * Get user statistics
	 */
	async getUserStats(): Promise<UserStats> {
		try {
			const now = new Date()
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

			const [totalUsers, activeUsers, inactiveUsers, suspendedUsers, newUsersThisMonth, usersWithoutRoles] =
				await Promise.all([
					// Total users
					this.kysely
						.selectFrom("users")
						.select(this.kysely.fn.count("id").as("count"))
						.executeTakeFirst(),

					// Active users
					this.kysely
						.selectFrom("users")
						.where("status", "=", "active")
						.select(this.kysely.fn.count("id").as("count"))
						.executeTakeFirst(),

					// Inactive users
					this.kysely
						.selectFrom("users")
						.where("status", "=", "inactive")
						.select(this.kysely.fn.count("id").as("count"))
						.executeTakeFirst(),

					// Suspended users
					this.kysely
						.selectFrom("users")
						.where("status", "=", "suspended")
						.select(this.kysely.fn.count("id").as("count"))
						.executeTakeFirst(),

					// New users this month
					this.kysely
						.selectFrom("users")
						.where("created_at", ">=", startOfMonth)
						.select(this.kysely.fn.count("id").as("count"))
						.executeTakeFirst(),

					// Users without roles
					this.kysely
						.selectFrom("users")
						.leftJoin("user_roles", "users.id", "user_roles.user_id")
						.where("user_roles.user_id", "is", null)
						.select(this.kysely.fn.count("users.id").as("count"))
						.executeTakeFirst(),
				])

			return {
				total_users: Number(totalUsers?.count || 0),
				active_users: Number(activeUsers?.count || 0),
				inactive_users: Number(inactiveUsers?.count || 0),
				suspended_users: Number(suspendedUsers?.count || 0),
				new_users_this_month: Number(newUsersThisMonth?.count || 0),
				users_without_roles: Number(usersWithoutRoles?.count || 0),
			}
		} catch (error) {
			console.error("Error fetching user stats:", error)
			throw new Error("Failed to fetch user statistics")
		}
	}

	/**
	 * Validate user data
	 */
	validateCreateUser(data: unknown): CreateUserData {
		return CreateUserSchema.parse(data)
	}

	validateUpdateUser(data: unknown): UpdateUserData {
		return UpdateUserSchema.parse(data)
	}

	validateUserSearch(data: unknown): UserSearchData {
		return UserSearchSchema.parse(data)
	}
}
