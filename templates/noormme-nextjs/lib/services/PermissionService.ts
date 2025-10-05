/**
 * Permission Service - Centralized permission management operations
 * Handles all permission-related business logic and data operations
 */

import { z } from "zod"
import { db } from "../db"
import { AuditService } from "./AuditService"

// Validation schemas
export const CreatePermissionSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	resource: z.string().min(1).max(50),
	action: z.string().min(1).max(50),
})

export const UpdatePermissionSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
})

export type CreatePermissionData = z.infer<typeof CreatePermissionSchema>
export type UpdatePermissionData = z.infer<typeof UpdatePermissionSchema>

export interface PermissionWithUsage {
	id: string
	name: string
	description?: string
	resource: string
	action: string
	created_at: string
	updated_at: string
	role_count: number
	user_count: number
}

export interface PermissionStats {
	total_permissions: number
	permissions_by_resource: Record<string, number>
	most_used_permissions: Array<{
		permission: string
		usage_count: number
	}>
	unused_permissions: number
}

export interface ResourcePermission {
	resource: string
	actions: string[]
	permissions: Array<{
		id: string
		name: string
		description?: string
	}>
}

export class PermissionService {
	private kysely = db.getKysely()
	private auditService = new AuditService()

	/**
	 * Get all permissions with usage statistics
	 */
	async getAllPermissions(): Promise<PermissionWithUsage[]> {
		try {
			const permissions = await this.kysely
				.selectFrom("permissions")
				.select(["id", "name", "description", "resource", "action", "created_at", "updated_at"])
				.orderBy("resource")
				.orderBy("action")
				.execute()

			const permissionsWithUsage = await Promise.all(
				permissions.map(async (permission) => {
					// Get role count for this permission
					const roleCountResult = await this.kysely
						.selectFrom("role_permissions")
						.where("permission_id", "=", permission.id)
						.select(this.kysely.fn.count("id").as("count"))
						.executeTakeFirst()

					// Get user count for this permission (through roles)
					const userCountResult = await this.kysely
						.selectFrom("role_permissions")
						.innerJoin("user_roles", "role_permissions.role_id", "user_roles.role_id")
						.where("role_permissions.permission_id", "=", permission.id)
						.where("user_roles.expires_at", ">", new Date().toISOString())
						.select(this.kysely.fn.countDistinct("user_roles.user_id").as("count"))
						.executeTakeFirst()

					return {
						...permission,
						role_count: Number(roleCountResult?.count || 0),
						user_count: Number(userCountResult?.count || 0),
					}
				}),
			)

			return permissionsWithUsage
		} catch (error) {
			console.error("Error fetching permissions:", error)
			throw new Error("Failed to fetch permissions")
		}
	}

	/**
	 * Get permission by ID with usage statistics
	 */
	async getPermissionById(permissionId: string): Promise<PermissionWithUsage | null> {
		try {
			const permission = await this.kysely
				.selectFrom("permissions")
				.where("id", "=", permissionId)
				.select(["id", "name", "description", "resource", "action", "created_at", "updated_at"])
				.executeTakeFirst()

			if (!permission) return null

			// Get role count for this permission
			const roleCountResult = await this.kysely
				.selectFrom("role_permissions")
				.where("permission_id", "=", permission.id)
				.select(this.kysely.fn.count("id").as("count"))
				.executeTakeFirst()

			// Get user count for this permission (through roles)
			const userCountResult = await this.kysely
				.selectFrom("role_permissions")
				.innerJoin("user_roles", "role_permissions.role_id", "user_roles.role_id")
				.where("role_permissions.permission_id", "=", permission.id)
				.where("user_roles.expires_at", ">", new Date().toISOString())
				.select(this.kysely.fn.countDistinct("user_roles.user_id").as("count"))
				.executeTakeFirst()

			return {
				...permission,
				role_count: Number(roleCountResult?.count || 0),
				user_count: Number(userCountResult?.count || 0),
			}
		} catch (error) {
			console.error("Error fetching permission:", error)
			throw new Error("Failed to fetch permission")
		}
	}

	/**
	 * Get permissions grouped by resource
	 */
	async getPermissionsByResource(): Promise<ResourcePermission[]> {
		try {
			const permissions = await this.getAllPermissions()

			const resourceMap = new Map<string, ResourcePermission>()

			permissions.forEach((permission) => {
				if (!resourceMap.has(permission.resource)) {
					resourceMap.set(permission.resource, {
						resource: permission.resource,
						actions: [],
						permissions: [],
					})
				}

				const resource = resourceMap.get(permission.resource)!

				if (!resource.actions.includes(permission.action)) {
					resource.actions.push(permission.action)
				}

				resource.permissions.push({
					id: permission.id,
					name: permission.name,
					description: permission.description,
				})
			})

			// Sort actions and permissions
			resourceMap.forEach((resource) => {
				resource.actions.sort()
				resource.permissions.sort((a, b) => a.name.localeCompare(b.name))
			})

			return Array.from(resourceMap.values()).sort((a, b) => a.resource.localeCompare(b.resource))
		} catch (error) {
			console.error("Error fetching permissions by resource:", error)
			throw new Error("Failed to fetch permissions by resource")
		}
	}

	/**
	 * Create a new permission
	 */
	async createPermission(data: CreatePermissionData, createdBy: string): Promise<PermissionWithUsage> {
		try {
			const now = new Date().toISOString()
			const permissionId = `${data.resource}.${data.action}`

			// Check if permission already exists
			const existingPermission = await this.kysely
				.selectFrom("permissions")
				.where("id", "=", permissionId)
				.select("id")
				.executeTakeFirst()

			if (existingPermission) {
				throw new Error("Permission already exists")
			}

			// Create permission
			const newPermission = await this.kysely
				.insertInto("permissions")
				.values({
					id: permissionId,
					name: data.name,
					description: data.description,
					resource: data.resource,
					action: data.action,
					created_at: now,
					updated_at: now,
				})
				.returning(["id", "name", "description", "resource", "action", "created_at", "updated_at"])
				.executeTakeFirst()

			if (!newPermission) {
				throw new Error("Failed to create permission")
			}

			// Log audit event
			await this.auditService.logAction(
				{
					action: "permission.created",
					resource_type: "permission",
					resource_id: newPermission.id,
					details: {
						name: newPermission.name,
						resource: newPermission.resource,
						action: newPermission.action,
					},
				},
				createdBy,
			)

			// Return permission with usage stats
			return (await this.getPermissionById(newPermission.id)) as PermissionWithUsage
		} catch (error) {
			console.error("Error creating permission:", error)
			throw error
		}
	}

	/**
	 * Update permission
	 */
	async updatePermission(permissionId: string, data: UpdatePermissionData, updatedBy: string): Promise<PermissionWithUsage> {
		try {
			// Check if permission exists
			const existingPermission = await this.kysely
				.selectFrom("permissions")
				.where("id", "=", permissionId)
				.select(["id", "name"])
				.executeTakeFirst()

			if (!existingPermission) {
				throw new Error("Permission not found")
			}

			const now = new Date().toISOString()
			const updateData: any = {
				updated_at: now,
			}

			if (data.name) updateData.name = data.name
			if (data.description !== undefined) updateData.description = data.description

			// Update permission
			const updatedPermission = await this.kysely
				.updateTable("permissions")
				.set(updateData)
				.where("id", "=", permissionId)
				.returning(["id", "name", "description", "resource", "action", "created_at", "updated_at"])
				.executeTakeFirst()

			if (!updatedPermission) {
				throw new Error("Failed to update permission")
			}

			// Log audit event
			await this.auditService.logAction(
				{
					action: "permission.updated",
					resource_type: "permission",
					resource_id: permissionId,
					details: { changes: data },
				},
				updatedBy,
			)

			// Return updated permission with usage stats
			return (await this.getPermissionById(permissionId)) as PermissionWithUsage
		} catch (error) {
			console.error("Error updating permission:", error)
			throw error
		}
	}

	/**
	 * Delete permission
	 */
	async deletePermission(permissionId: string, deletedBy: string): Promise<void> {
		try {
			// Check if permission exists
			const existingPermission = await this.kysely
				.selectFrom("permissions")
				.where("id", "=", permissionId)
				.select(["id", "name"])
				.executeTakeFirst()

			if (!existingPermission) {
				throw new Error("Permission not found")
			}

			// Check if permission is assigned to any roles
			const roleCountResult = await this.kysely
				.selectFrom("role_permissions")
				.where("permission_id", "=", permissionId)
				.select(this.kysely.fn.count("id").as("count"))
				.executeTakeFirst()

			if (Number(roleCountResult?.count || 0) > 0) {
				throw new Error("Cannot delete permission that is assigned to roles")
			}

			// Delete permission
			const result = await this.kysely.deleteFrom("permissions").where("id", "=", permissionId).execute()

			if (result.length === 0) {
				throw new Error("Failed to delete permission")
			}

			// Log audit event
			await this.auditService.logAction(
				{
					action: "permission.deleted",
					resource_type: "permission",
					resource_id: permissionId,
					details: { permission_name: existingPermission.name },
				},
				deletedBy,
			)
		} catch (error) {
			console.error("Error deleting permission:", error)
			throw error
		}
	}

	/**
	 * Get permission statistics
	 */
	async getPermissionStats(): Promise<PermissionStats> {
		try {
			const [totalPermissions, permissionsByResource, mostUsedPermissions, unusedPermissions] = await Promise.all([
				// Total permissions
				this.kysely
					.selectFrom("permissions")
					.select(this.kysely.fn.count("id").as("count"))
					.executeTakeFirst(),

				// Permissions by resource
				this.kysely
					.selectFrom("permissions")
					.select(["resource", this.kysely.fn.count("id").as("count")])
					.groupBy("resource")
					.execute(),

				// Most used permissions
				this.kysely
					.selectFrom("role_permissions")
					.innerJoin("permissions", "role_permissions.permission_id", "permissions.id")
					.select(["permissions.name as permission", this.kysely.fn.count("role_permissions.id").as("usage_count")])
					.groupBy("permissions.id", "permissions.name")
					.orderBy("usage_count", "desc")
					.limit(10)
					.execute(),

				// Unused permissions
				this.kysely
					.selectFrom("permissions")
					.leftJoin("role_permissions", "permissions.id", "role_permissions.permission_id")
					.where("role_permissions.permission_id", "is", null)
					.select(this.kysely.fn.count("permissions.id").as("count"))
					.executeTakeFirst(),
			])

			// Convert permissions by resource to object
			const resourceMap: Record<string, number> = {}
			permissionsByResource.forEach((item) => {
				resourceMap[item.resource] = Number(item.count)
			})

			return {
				total_permissions: Number(totalPermissions?.count || 0),
				permissions_by_resource: resourceMap,
				most_used_permissions: mostUsedPermissions.map((item) => ({
					permission: item.permission,
					usage_count: Number(item.usage_count),
				})),
				unused_permissions: Number(unusedPermissions?.count || 0),
			}
		} catch (error) {
			console.error("Error fetching permission stats:", error)
			throw new Error("Failed to fetch permission statistics")
		}
	}

	/**
	 * Check if user has specific permission
	 */
	async userHasPermission(userId: string, resource: string, action: string): Promise<boolean> {
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
			console.error("Error checking user permission:", error)
			return false
		}
	}

	/**
	 * Get user permissions
	 */
	async getUserPermissions(userId: string): Promise<Array<{ resource: string; action: string; permission_id: string }>> {
		try {
			return await this.kysely
				.selectFrom("user_roles")
				.innerJoin("role_permissions", "user_roles.role_id", "role_permissions.role_id")
				.innerJoin("permissions", "role_permissions.permission_id", "permissions.id")
				.where("user_roles.user_id", "=", userId)
				.where("user_roles.expires_at", ">", new Date().toISOString())
				.select(["permissions.resource", "permissions.action", "permissions.id as permission_id"])
				.execute()
		} catch (error) {
			console.error("Error fetching user permissions:", error)
			return []
		}
	}

	/**
	 * Validate permission data
	 */
	validateCreatePermission(data: unknown): CreatePermissionData {
		return CreatePermissionSchema.parse(data)
	}

	validateUpdatePermission(data: unknown): UpdatePermissionData {
		return UpdatePermissionSchema.parse(data)
	}
}
