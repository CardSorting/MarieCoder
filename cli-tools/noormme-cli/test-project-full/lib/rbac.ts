/**
 * Role-Based Access Control (RBAC) utilities
 * Provides functions for checking permissions and managing roles
 */

import { z } from "zod"
import { db } from "./db"

// Validation schemas
export const PermissionSchema = z.object({
	resource: z.string(),
	action: z.string(),
})

export const RoleSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	is_system: z.boolean(),
})

export type Permission = z.infer<typeof PermissionSchema>
export type Role = z.infer<typeof RoleSchema>

export interface UserWithRoles {
	id: string
	email: string
	name: string
	status: "active" | "inactive" | "suspended"
	roles: Array<{
		id: string
		name: string
		description?: string
		permissions: Array<{
			id: string
			name: string
			resource: string
			action: string
		}>
	}>
}

/**
 * RBAC Service for managing roles and permissions
 */
export class RBACService {
	private kysely = db.getKysely()

	/**
	 * Check if user has a specific permission
	 */
	async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
		try {
			const result = await this.kysely
				.selectFrom("user_roles")
				.innerJoin("role_permissions", "user_roles.role_id", "role_permissions.role_id")
				.innerJoin("permissions", "role_permissions.permission_id", "permissions.id")
				.where("user_roles.user_id", "=", userId)
				.where("permissions.resource", "=", resource)
				.where("permissions.action", "=", action)
				.where("user_roles.expires_at", ">", new Date().toISOString())
				.select("permissions.id")
				.executeTakeFirst()

			return !!result
		} catch (error) {
			console.error("Error checking permission:", error)
			return false
		}
	}

	/**
	 * Check if user has any of the specified permissions
	 */
	async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
		for (const permission of permissions) {
			if (await this.hasPermission(userId, permission.resource, permission.action)) {
				return true
			}
		}
		return false
	}

	/**
	 * Check if user has all of the specified permissions
	 */
	async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
		for (const permission of permissions) {
			if (!(await this.hasPermission(userId, permission.resource, permission.action))) {
				return false
			}
		}
		return true
	}

	/**
	 * Get user with their roles and permissions
	 */
	async getUserWithRoles(userId: string): Promise<UserWithRoles | null> {
		try {
			const user = await this.kysely
				.selectFrom("users")
				.where("users.id", "=", userId)
				.select(["id", "email", "name", "status"])
				.executeTakeFirst()

			if (!user) return null

			const roles = await this.kysely
				.selectFrom("user_roles")
				.innerJoin("roles", "user_roles.role_id", "roles.id")
				.where("user_roles.user_id", "=", userId)
				.where("user_roles.expires_at", ">", new Date().toISOString())
				.select(["roles.id", "roles.name", "roles.description"])
				.execute()

			const rolesWithPermissions = await Promise.all(
				roles.map(async (role: any) => {
					const permissions = await this.kysely
						.selectFrom("role_permissions")
						.innerJoin("permissions", "role_permissions.permission_id", "permissions.id")
						.where("role_permissions.role_id", "=", role.id)
						.select(["permissions.id", "permissions.name", "permissions.resource", "permissions.action"])
						.execute()

					return {
						...role,
						permissions,
					}
				}),
			)

			return {
				...user,
				roles: rolesWithPermissions,
			}
		} catch (error) {
			console.error("Error getting user with roles:", error)
			return null
		}
	}

	/**
	 * Assign role to user
	 */
	async assignRole(userId: string, roleId: string, assignedBy: string, expiresAt?: Date): Promise<boolean> {
		try {
			const now = new Date().toISOString()

			await this.kysely
				.insertInto("user_roles")
				.values({
					id: `${userId}-${roleId}-${Date.now()}`,
					user_id: userId,
					role_id: roleId,
					assigned_by: assignedBy,
					expires_at: expiresAt?.toISOString(),
					created_at: now,
					updated_at: now,
				})
				.execute()

			return true
		} catch (error) {
			console.error("Error assigning role:", error)
			return false
		}
	}

	/**
	 * Remove role from user
	 */
	async removeRole(userId: string, roleId: string): Promise<boolean> {
		try {
			await this.kysely.deleteFrom("user_roles").where("user_id", "=", userId).where("role_id", "=", roleId).execute()

			return true
		} catch (error) {
			console.error("Error removing role:", error)
			return false
		}
	}

	/**
	 * Get all roles
	 */
	async getRoles(): Promise<Role[]> {
		try {
			return await this.kysely
				.selectFrom("roles")
				.select(["id", "name", "description", "is_system"])
				.orderBy("name")
				.execute()
		} catch (error) {
			console.error("Error getting roles:", error)
			return []
		}
	}

	/**
	 * Get all permissions
	 */
	async getPermissions(): Promise<Array<{ id: string; name: string; resource: string; action: string }>> {
		try {
			return await this.kysely
				.selectFrom("permissions")
				.select(["id", "name", "resource", "action"])
				.orderBy("resource")
				.orderBy("action")
				.execute()
		} catch (error) {
			console.error("Error getting permissions:", error)
			return []
		}
	}

	/**
	 * Create a new role
	 */
	async createRole(name: string, description?: string, isSystem: boolean = false): Promise<Role | null> {
		try {
			const now = new Date().toISOString()
			const id = name.toLowerCase().replace(/\s+/g, "_")

			const role = await this.kysely
				.insertInto("roles")
				.values({
					id,
					name,
					description,
					is_system: isSystem ? 1 : 0,
					created_at: now,
					updated_at: now,
				})
				.returning(["id", "name", "description", "is_system"])
				.executeTakeFirst()

			return role ? { ...role, is_system: !!role.is_system } : null
		} catch (error) {
			console.error("Error creating role:", error)
			return null
		}
	}

	/**
	 * Add permission to role
	 */
	async addPermissionToRole(roleId: string, permissionId: string): Promise<boolean> {
		try {
			const now = new Date().toISOString()

			await this.kysely
				.insertInto("role_permissions")
				.values({
					id: `${roleId}-${permissionId}`,
					role_id: roleId,
					permission_id: permissionId,
					created_at: now,
					updated_at: now,
				})
				.execute()

			return true
		} catch (error) {
			console.error("Error adding permission to role:", error)
			return false
		}
	}

	/**
	 * Remove permission from role
	 */
	async removePermissionFromRole(roleId: string, permissionId: string): Promise<boolean> {
		try {
			await this.kysely
				.deleteFrom("role_permissions")
				.where("role_id", "=", roleId)
				.where("permission_id", "=", permissionId)
				.execute()

			return true
		} catch (error) {
			console.error("Error removing permission from role:", error)
			return false
		}
	}
}

// Export singleton instance
export const rbac = new RBACService()

// Common permission checks
export const Permissions = {
	// User management
	USERS_CREATE: { resource: "users", action: "create" },
	USERS_READ: { resource: "users", action: "read" },
	USERS_UPDATE: { resource: "users", action: "update" },
	USERS_DELETE: { resource: "users", action: "delete" },

	// Role management
	ROLES_CREATE: { resource: "roles", action: "create" },
	ROLES_READ: { resource: "roles", action: "read" },
	ROLES_UPDATE: { resource: "roles", action: "update" },
	ROLES_DELETE: { resource: "roles", action: "delete" },

	// Payment management
	PAYMENTS_CREATE: { resource: "payments", action: "create" },
	PAYMENTS_READ: { resource: "payments", action: "read" },
	PAYMENTS_UPDATE: { resource: "payments", action: "update" },
	PAYMENTS_DELETE: { resource: "payments", action: "delete" },

	// Admin panel
	ADMIN_ACCESS: { resource: "admin", action: "access" },
	ADMIN_AUDIT: { resource: "admin", action: "audit" },
} as const
