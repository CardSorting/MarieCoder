/**
 * User Database Service Provider
 * Specialized database service for user-related operations
 * Following NOORMME service layer pattern with Kysely queries
 */

import { Kysely } from "kysely"
import { DatabaseConnectionManager } from "../connection/DatabaseConnectionManager"
import { KyselyQueryBuilder, PaginationOptions, QueryResult } from "../utils/KyselyQueryBuilder"

export interface User {
	id: string
	email: string
	name: string
	avatar?: string
	emailVerified?: Date
	role: string
	status: "active" | "inactive" | "suspended"
	lastLoginAt?: Date
	metadata?: Record<string, any>
	createdAt: Date
	updatedAt: Date
	deletedAt?: Date
}

export interface UserRole {
	id: string
	userId: string
	roleId: string
	assignedAt: Date
	assignedBy: string
}

export interface UserPermission {
	id: string
	userId: string
	permissionId: string
	grantedAt: Date
	grantedBy: string
}

export interface UserDatabaseConfig {
	connectionName?: string
	enableCaching?: boolean
	cacheTTL?: number
	enableMonitoring?: boolean
}

export class UserDatabaseService {
	private db: Kysely<any>
	private connectionManager: DatabaseConnectionManager
	private config: UserDatabaseConfig

	constructor(connectionManager: DatabaseConnectionManager, config: UserDatabaseConfig = {}) {
		this.connectionManager = connectionManager
		this.config = {
			connectionName: "default",
			enableCaching: true,
			cacheTTL: 300000, // 5 minutes
			enableMonitoring: true,
			...config,
		}

		this.db = this.connectionManager.getKysely(this.config.connectionName)
	}

	// User CRUD Operations

	async createUser(data: Partial<User>): Promise<User> {
		const query = () => this.db.insertInto("users").values(data).returningAll().executeTakeFirst()

		const result = await this.executeQuery(query, "createUser")
		return this.mapUser(result)
	}

	async getUserById(id: string): Promise<User | null> {
		const query = () =>
			this.db.selectFrom("users").selectAll().where("id", "=", id).where("deletedAt", "is", null).executeTakeFirst()

		const result = await this.executeQuery(query, "getUserById")
		return result ? this.mapUser(result) : null
	}

	async getUserByEmail(email: string): Promise<User | null> {
		const query = () =>
			this.db.selectFrom("users").selectAll().where("email", "=", email).where("deletedAt", "is", null).executeTakeFirst()

		const result = await this.executeQuery(query, "getUserByEmail")
		return result ? this.mapUser(result) : null
	}

	async getUsers(
		options?: PaginationOptions & {
			search?: string
			role?: string
			status?: string
			orderBy?: Array<{ column: string; direction: "asc" | "desc" }>
		},
	): Promise<QueryResult<User>> {
		let query = this.db.selectFrom("users").selectAll().where("deletedAt", "is", null)

		// Apply filters
		if (options?.search) {
			query = KyselyQueryBuilder.buildSearchQuery(query, options.search, ["name", "email"])
		}

		if (options?.role) {
			query = query.where("role", "=", options.role)
		}

		if (options?.status) {
			query = query.where("status", "=", options.status)
		}

		// Apply ordering
		if (options?.orderBy) {
			query = KyselyQueryBuilder.buildOrderedSelect(query, options.orderBy)
		} else {
			query = query.orderBy("createdAt", "desc")
		}

		if (options?.page && options?.pageSize) {
			return KyselyQueryBuilder.executePaginated(query, {
				page: options.page,
				pageSize: options.pageSize,
			})
		}

		const results = await this.executeQuery(() => query.execute(), "getUsers")
		return { data: results.map(this.mapUser) }
	}

	async updateUser(id: string, data: Partial<User>): Promise<User> {
		const query = () =>
			this.db
				.updateTable("users")
				.set({ ...data, updatedAt: new Date() })
				.where("id", "=", id)
				.where("deletedAt", "is", null)
				.returningAll()
				.executeTakeFirst()

		const result = await this.executeQuery(query, "updateUser")
		return this.mapUser(result)
	}

	async deleteUser(id: string): Promise<void> {
		const query = () => this.db.updateTable("users").set({ deletedAt: new Date() }).where("id", "=", id).execute()

		await this.executeQuery(query, "deleteUser")
	}

	async updateUserLastLogin(id: string): Promise<void> {
		const query = () => this.db.updateTable("users").set({ lastLoginAt: new Date() }).where("id", "=", id).execute()

		await this.executeQuery(query, "updateUserLastLogin")
	}

	// User Roles

	async assignRoleToUser(userId: string, roleId: string, assignedBy: string): Promise<UserRole> {
		const query = () =>
			this.db
				.insertInto("user_roles")
				.values({
					userId,
					roleId,
					assignedAt: new Date(),
					assignedBy,
				})
				.returningAll()
				.executeTakeFirst()

		const result = await this.executeQuery(query, "assignRoleToUser")
		return this.mapUserRole(result)
	}

	async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
		const query = () => this.db.deleteFrom("user_roles").where("userId", "=", userId).where("roleId", "=", roleId).execute()

		await this.executeQuery(query, "removeRoleFromUser")
	}

	async getUserRoles(userId: string): Promise<UserRole[]> {
		const query = () =>
			this.db.selectFrom("user_roles").selectAll().where("userId", "=", userId).orderBy("assignedAt", "desc").execute()

		const results = await this.executeQuery(query, "getUserRoles")
		return results.map(this.mapUserRole)
	}

	async getUsersByRole(roleId: string): Promise<User[]> {
		const query = () =>
			this.db
				.selectFrom("users")
				.innerJoin("user_roles", "users.id", "user_roles.userId")
				.selectAll("users")
				.where("user_roles.roleId", "=", roleId)
				.where("users.deletedAt", "is", null)
				.orderBy("users.createdAt", "desc")
				.execute()

		const results = await this.executeQuery(query, "getUsersByRole")
		return results.map(this.mapUser)
	}

	// User Permissions

	async grantPermissionToUser(userId: string, permissionId: string, grantedBy: string): Promise<UserPermission> {
		const query = () =>
			this.db
				.insertInto("user_permissions")
				.values({
					userId,
					permissionId,
					grantedAt: new Date(),
					grantedBy,
				})
				.returningAll()
				.executeTakeFirst()

		const result = await this.executeQuery(query, "grantPermissionToUser")
		return this.mapUserPermission(result)
	}

	async revokePermissionFromUser(userId: string, permissionId: string): Promise<void> {
		const query = () =>
			this.db.deleteFrom("user_permissions").where("userId", "=", userId).where("permissionId", "=", permissionId).execute()

		await this.executeQuery(query, "revokePermissionFromUser")
	}

	async getUserPermissions(userId: string): Promise<UserPermission[]> {
		const query = () =>
			this.db.selectFrom("user_permissions").selectAll().where("userId", "=", userId).orderBy("grantedAt", "desc").execute()

		const results = await this.executeQuery(query, "getUserPermissions")
		return results.map(this.mapUserPermission)
	}

	// Analytics Queries

	async getUserStats(): Promise<{
		totalUsers: number
		activeUsers: number
		inactiveUsers: number
		suspendedUsers: number
		newUsersThisMonth: number
		usersWithRecentLogin: number
	}> {
		const now = new Date()
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

		const query = () =>
			this.db
				.selectFrom("users")
				.select([
					(eb) => eb.fn.count("id").as("totalUsers"),
					(eb) => eb.fn.count("id").filterWhere("status", "=", "active").as("activeUsers"),
					(eb) => eb.fn.count("id").filterWhere("status", "=", "inactive").as("inactiveUsers"),
					(eb) => eb.fn.count("id").filterWhere("status", "=", "suspended").as("suspendedUsers"),
					(eb) => eb.fn.count("id").filterWhere("createdAt", ">=", startOfMonth).as("newUsersThisMonth"),
					(eb) => eb.fn.count("id").filterWhere("lastLoginAt", ">=", thirtyDaysAgo).as("usersWithRecentLogin"),
				])
				.where("deletedAt", "is", null)
				.executeTakeFirst()

		const result = await this.executeQuery(query, "getUserStats")
		return {
			totalUsers: Number(result?.totalUsers || 0),
			activeUsers: Number(result?.activeUsers || 0),
			inactiveUsers: Number(result?.inactiveUsers || 0),
			suspendedUsers: Number(result?.suspendedUsers || 0),
			newUsersThisMonth: Number(result?.newUsersThisMonth || 0),
			usersWithRecentLogin: Number(result?.usersWithRecentLogin || 0),
		}
	}

	async getUsersByDateRange(
		startDate: Date,
		endDate: Date,
	): Promise<
		Array<{
			date: string
			newUsers: number
			activeUsers: number
		}>
	> {
		const query = () =>
			this.db
				.selectFrom("users")
				.select([
					(eb) => eb.fn.date("createdAt").as("date"),
					(eb) => eb.fn.count("id").as("newUsers"),
					(eb) => eb.fn.count("id").filterWhere("lastLoginAt", ">=", eb.fn.date("createdAt")).as("activeUsers"),
				])
				.where("createdAt", ">=", startDate)
				.where("createdAt", "<=", endDate)
				.where("deletedAt", "is", null)
				.groupBy("date")
				.orderBy("date", "asc")
				.execute()

		const results = await this.executeQuery(query, "getUsersByDateRange")
		return results.map((result) => ({
			date: result.date,
			newUsers: Number(result.newUsers || 0),
			activeUsers: Number(result.activeUsers || 0),
		}))
	}

	async getTopUsersByActivity(limit: number = 10): Promise<
		Array<{
			user: User
			loginCount: number
			lastLoginAt: Date
		}>
	> {
		const query = () =>
			this.db
				.selectFrom("users")
				.selectAll("users")
				.where("deletedAt", "is", null)
				.where("lastLoginAt", "is not", null)
				.orderBy("lastLoginAt", "desc")
				.limit(limit)
				.execute()

		const results = await this.executeQuery(query, "getTopUsersByActivity")
		return results.map((result) => ({
			user: this.mapUser(result),
			loginCount: 1, // This would need to be calculated from login logs
			lastLoginAt: new Date(result.lastLoginAt),
		}))
	}

	// Private methods

	private async executeQuery<T>(queryFn: () => Promise<T>, queryName: string): Promise<T> {
		if (this.config.enableMonitoring) {
			return KyselyQueryBuilder.executeWithMonitoring(queryFn, queryName)
		}

		if (this.config.enableCaching) {
			const cacheKey = `${queryName}_${JSON.stringify(arguments)}`
			return KyselyQueryBuilder.executeWithCache(queryFn, cacheKey, this.config.cacheTTL)
		}

		return queryFn()
	}

	// Mapping methods

	private mapUser(data: any): User {
		return {
			id: data.id,
			email: data.email,
			name: data.name,
			avatar: data.avatar,
			emailVerified: data.emailVerified ? new Date(data.emailVerified) : undefined,
			role: data.role,
			status: data.status,
			lastLoginAt: data.lastLoginAt ? new Date(data.lastLoginAt) : undefined,
			metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
			deletedAt: data.deletedAt ? new Date(data.deletedAt) : undefined,
		}
	}

	private mapUserRole(data: any): UserRole {
		return {
			id: data.id,
			userId: data.userId,
			roleId: data.roleId,
			assignedAt: new Date(data.assignedAt),
			assignedBy: data.assignedBy,
		}
	}

	private mapUserPermission(data: any): UserPermission {
		return {
			id: data.id,
			userId: data.userId,
			permissionId: data.permissionId,
			grantedAt: new Date(data.grantedAt),
			grantedBy: data.grantedBy,
		}
	}
}
