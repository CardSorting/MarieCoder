/**
 * Role Service - Centralized role management operations
 * Handles all role-related business logic and data operations
 */

import { z } from "zod"
import { db } from "../db"
import { AuditService } from "./AuditService"

// Validation schemas
export const CreateRoleSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	permissionIds: z.array(z.string()).optional(),
})

export const UpdateRoleSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	permissionIds: z.array(z.string()).optional(),
})

export const AssignRoleSchema = z.object({
	userId: z.string(),
	roleId: z.string(),
	expiresAt: z.string().optional(),
})

export type CreateRoleData = z.infer<typeof CreateRoleSchema>
export type UpdateRoleData = z.infer<typeof UpdateRoleSchema>
export type AssignRoleData = z.infer<typeof AssignRoleSchema>

export interface RoleWithPermissions {
	id: string
	name: string
	description?: string
	is_system: boolean
	permissions: Array<{
		id: string
		name: string
		resource: string
		action: string
	}>
	user_count: number
	created_at: string
	updated_at: string
}

export interface RoleStats {
	total_roles: number
	system_roles: number
	custom_roles: number
	roles_with_users: number
	most_used_role: string | null
}

export class RoleService {
	private kysely = db.getKysely()
	private auditService = new AuditService()

	/**
	 * Get all roles with their permissions and user counts
	 */
	async getAllRoles(): Promise<RoleWithPermissions[]> {
		try {
			const roles = await this.kysely
				.selectFrom("roles")
				.select(["id", "name", "description", "is_system", "created_at", "updated_at"])
				.orderBy("name")
				.execute()

			const rolesWithPermissions = await Promise.all(
				roles.map(async (role: any) => {
					// Get permissions for this role
					const permissions = await this.kysely
						.selectFrom("role_permissions")
						.innerJoin("permissions", "role_permissions.permission_id", "permissions.id")
						.where("role_permissions.role_id", "=", role.id)
						.select(["permissions.id", "permissions.name", "permissions.resource", "permissions.action"])
						.execute()

					// Get user count for this role
					const userCountResult = await this.kysely
						.selectFrom("user_roles")
						.where("role_id", "=", role.id)
						.where("expires_at", ">", new Date().toISOString())
						.select(this.kysely.fn.count("id").as("count"))
						.executeTakeFirst()

					return {
						...role,
						is_system: !!role.is_system,
						permissions,
						user_count: Number(userCountResult?.count || 0),
					}
				}),
			)

			return rolesWithPermissions
		} catch (error) {
			console.error("Error fetching roles:", error)
			throw new Error("Failed to fetch roles")
		}
	}

	/**
	 * Get role by ID with permissions
	 */
	async getRoleById(roleId: string): Promise<RoleWithPermissions | null> {
		try {
			const role = await this.kysely
				.selectFrom("roles")
				.where("id", "=", roleId)
				.select(["id", "name", "description", "is_system", "created_at", "updated_at"])
				.executeTakeFirst()

			if (!role) return null

			// Get permissions for this role
			const permissions = await this.kysely
				.selectFrom("role_permissions")
				.innerJoin("permissions", "role_permissions.permission_id", "permissions.id")
				.where("role_permissions.role_id", "=", role.id)
				.select(["permissions.id", "permissions.name", "permissions.resource", "permissions.action"])
				.execute()

			// Get user count for this role
			const userCountResult = await this.kysely
				.selectFrom("user_roles")
				.where("role_id", "=", role.id)
				.where("expires_at", ">", new Date().toISOString())
				.select(this.kysely.fn.count("id").as("count"))
				.executeTakeFirst()

			return {
				...role,
				is_system: !!role.is_system,
				permissions,
				user_count: Number(userCountResult?.count || 0),
			}
		} catch (error) {
			console.error("Error fetching role:", error)
			throw new Error("Failed to fetch role")
		}
	}

	/**
	 * Create a new role
	 */
	async createRole(data: CreateRoleData, createdBy: string): Promise<RoleWithPermissions> {
		try {
			const now = new Date().toISOString()
			const roleId = data.name
				.toLowerCase()
				.replace(/\s+/g, "_")
				.replace(/[^a-z0-9_]/g, "")

			// Check if role already exists
			const existingRole = await this.kysely.selectFrom("roles").where("id", "=", roleId).select("id").executeTakeFirst()

			if (existingRole) {
				throw new Error("Role with this name already exists")
			}

			// Create role
			const newRole = await this.kysely
				.insertInto("roles")
				.values({
					id: roleId,
					name: data.name,
					description: data.description,
					is_system: 0,
					created_at: now,
					updated_at: now,
				})
				.returning(["id", "name", "description", "is_system", "created_at", "updated_at"])
				.executeTakeFirst()

			if (!newRole) {
				throw new Error("Failed to create role")
			}

			// Assign permissions
			if (data.permissionIds && data.permissionIds.length > 0) {
				for (const permissionId of data.permissionIds) {
					await this.addPermissionToRole(newRole.id, permissionId)
				}
			}

			// Log audit event
			await this.auditService.logAction(
				{
					action: "role.created",
					resource_type: "role",
					resource_id: newRole.id,
					details: { role_name: newRole.name, permissions: data.permissionIds },
				},
				createdBy,
			)

			// Return role with permissions
			return (await this.getRoleById(newRole.id)) as RoleWithPermissions
		} catch (error) {
			console.error("Error creating role:", error)
			throw error
		}
	}

	/**
	 * Update an existing role
	 */
	async updateRole(roleId: string, data: UpdateRoleData, updatedBy: string): Promise<RoleWithPermissions> {
		try {
			// Check if role exists and is not a system role
			const existingRole = await this.kysely
				.selectFrom("roles")
				.where("id", "=", roleId)
				.where("is_system", "=", 0)
				.select(["id", "name", "is_system"])
				.executeTakeFirst()

			if (!existingRole) {
				throw new Error("Role not found or cannot be updated")
			}

			const now = new Date().toISOString()
			const updateData: any = {
				updated_at: now,
			}

			if (data.name) updateData.name = data.name
			if (data.description !== undefined) updateData.description = data.description

			// Update role
			const updatedRole = await this.kysely
				.updateTable("roles")
				.set(updateData)
				.where("id", "=", roleId)
				.where("is_system", "=", 0)
				.returning(["id", "name", "description", "is_system", "created_at", "updated_at"])
				.executeTakeFirst()

			if (!updatedRole) {
				throw new Error("Failed to update role")
			}

			// Update permissions if provided
			if (data.permissionIds) {
				// Remove existing permissions
				await this.kysely.deleteFrom("role_permissions").where("role_id", "=", roleId).execute()

				// Assign new permissions
				for (const permissionId of data.permissionIds) {
					await this.addPermissionToRole(roleId, permissionId)
				}
			}

			// Log audit event
			await this.auditService.logAction(
				{
					action: "role.updated",
					resource_type: "role",
					resource_id: roleId,
					details: { changes: data },
				},
				updatedBy,
			)

			// Return updated role with permissions
			return (await this.getRoleById(roleId)) as RoleWithPermissions
		} catch (error) {
			console.error("Error updating role:", error)
			throw error
		}
	}

	/**
	 * Delete a role
	 */
	async deleteRole(roleId: string, deletedBy: string): Promise<void> {
		try {
			// Check if role exists and is not a system role
			const existingRole = await this.kysely
				.selectFrom("roles")
				.where("id", "=", roleId)
				.where("is_system", "=", 0)
				.select(["id", "name", "is_system"])
				.executeTakeFirst()

			if (!existingRole) {
				throw new Error("Role not found or cannot be deleted")
			}

			// Check if role is assigned to any users
			const userRoleCount = await this.kysely
				.selectFrom("user_roles")
				.where("role_id", "=", roleId)
				.select(this.kysely.fn.count("id").as("count"))
				.executeTakeFirst()

			if (Number(userRoleCount?.count || 0) > 0) {
				throw new Error("Cannot delete role that is assigned to users")
			}

			// Delete role permissions first
			await this.kysely.deleteFrom("role_permissions").where("role_id", "=", roleId).execute()

			// Delete role
			const result = await this.kysely.deleteFrom("roles").where("id", "=", roleId).where("is_system", "=", 0).execute()

			if (result.length === 0) {
				throw new Error("Failed to delete role")
			}

			// Log audit event
			await this.auditService.logAction(
				{
					action: "role.deleted",
					resource_type: "role",
					resource_id: roleId,
					details: { role_name: existingRole.name },
				},
				deletedBy,
			)
		} catch (error) {
			console.error("Error deleting role:", error)
			throw error
		}
	}

	/**
	 * Add permission to role
	 */
	async addPermissionToRole(roleId: string, permissionId: string): Promise<void> {
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
		} catch (error) {
			console.error("Error adding permission to role:", error)
			throw new Error("Failed to add permission to role")
		}
	}

	/**
	 * Remove permission from role
	 */
	async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
		try {
			await this.kysely
				.deleteFrom("role_permissions")
				.where("role_id", "=", roleId)
				.where("permission_id", "=", permissionId)
				.execute()
		} catch (error) {
			console.error("Error removing permission from role:", error)
			throw new Error("Failed to remove permission from role")
		}
	}

	/**
	 * Assign role to user
	 */
	async assignRoleToUser(data: AssignRoleData, assignedBy: string): Promise<void> {
		try {
			const now = new Date().toISOString()

			await this.kysely
				.insertInto("user_roles")
				.values({
					id: `${data.userId}-${data.roleId}-${Date.now()}`,
					user_id: data.userId,
					role_id: data.roleId,
					assigned_by: assignedBy,
					expires_at: data.expiresAt,
					created_at: now,
					updated_at: now,
				})
				.execute()

			// Log audit event
			await this.auditService.logAction(
				{
					action: "user.role_assigned",
					resource_type: "user",
					resource_id: data.userId,
					details: { role_id: data.roleId, expires_at: data.expiresAt },
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
	 * Get role statistics
	 */
	async getRoleStats(): Promise<RoleStats> {
		try {
			const [totalRoles, systemRoles, rolesWithUsers, mostUsedRole] = await Promise.all([
				// Total roles
				this.kysely
					.selectFrom("roles")
					.select(this.kysely.fn.count("id").as("count"))
					.executeTakeFirst(),

				// System roles
				this.kysely
					.selectFrom("roles")
					.where("is_system", "=", 1)
					.select(this.kysely.fn.count("id").as("count"))
					.executeTakeFirst(),

				// Roles with users
				this.kysely
					.selectFrom("user_roles")
					.select(this.kysely.fn.countDistinct("role_id").as("count"))
					.executeTakeFirst(),

				// Most used role
				this.kysely
					.selectFrom("user_roles")
					.innerJoin("roles", "user_roles.role_id", "roles.id")
					.select(["roles.name", this.kysely.fn.count("user_roles.id").as("count")])
					.groupBy("roles.id", "roles.name")
					.orderBy("count", "desc")
					.limit(1)
					.executeTakeFirst(),
			])

			return {
				total_roles: Number(totalRoles?.count || 0),
				system_roles: Number(systemRoles?.count || 0),
				custom_roles: Number(totalRoles?.count || 0) - Number(systemRoles?.count || 0),
				roles_with_users: Number(rolesWithUsers?.count || 0),
				most_used_role: mostUsedRole?.name || null,
			}
		} catch (error) {
			console.error("Error fetching role stats:", error)
			throw new Error("Failed to fetch role statistics")
		}
	}

	/**
	 * Validate role data
	 */
	validateCreateRole(data: unknown): CreateRoleData {
		return CreateRoleSchema.parse(data)
	}

	validateUpdateRole(data: unknown): UpdateRoleData {
		return UpdateRoleSchema.parse(data)
	}

	validateAssignRole(data: unknown): AssignRoleData {
		return AssignRoleSchema.parse(data)
	}
}
