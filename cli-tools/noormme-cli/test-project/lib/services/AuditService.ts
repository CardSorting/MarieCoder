/**
 * Audit Service - Centralized audit logging operations
 * Handles all audit logging and activity tracking
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { db } from "../db"

// Validation schemas
export const AuditLogSchema = z.object({
	action: z.string().min(1).max(100),
	resource_type: z.string().min(1).max(50),
	resource_id: z.string().min(1).max(100),
	details: z.record(z.any()).optional(),
	ip_address: z.string().optional(),
	user_agent: z.string().optional(),
})

export const AuditSearchSchema = z.object({
	userId: z.string().optional(),
	action: z.string().optional(),
	resourceType: z.string().optional(),
	resourceId: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	page: z.number().min(1).default(1),
	limit: z.number().min(1).max(100).default(20),
})

export type AuditLogData = z.infer<typeof AuditLogSchema>
export type AuditSearchData = z.infer<typeof AuditSearchSchema>

export interface AuditLogEntry {
	id: string
	user_id?: string
	user_name?: string
	user_email?: string
	action: string
	resource_type: string
	resource_id: string
	details: string
	ip_address?: string
	user_agent?: string
	created_at: string
}

export interface AuditStats {
	total_logs: number
	logs_today: number
	logs_this_week: number
	logs_this_month: number
	most_active_users: Array<{
		user_id: string
		user_name: string
		user_email: string
		action_count: number
	}>
	most_common_actions: Array<{
		action: string
		count: number
	}>
	logs_by_resource: Record<string, number>
}

export interface AuditSearchResult {
	logs: AuditLogEntry[]
	pagination: {
		page: number
		limit: number
		total: number
		pages: number
	}
}

export class AuditService {
	private kysely = db.getKysely()

	/**
	 * Log an audit action
	 */
	async logAction(
		logData: Omit<AuditLogData, "ip_address" | "user_agent">,
		userId?: string,
		request?: NextRequest,
	): Promise<void> {
		try {
			const now = new Date().toISOString()
			const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

			// Extract IP and User Agent from request if provided
			let ipAddress: string | undefined
			let userAgent: string | undefined

			if (request) {
				ipAddress = this.getClientIP(request)
				userAgent = request.headers.get("user-agent") || undefined
			}

			await this.kysely
				.insertInto("audit_logs")
				.values({
					id: auditId,
					user_id: userId,
					action: logData.action,
					resource_type: logData.resource_type,
					resource_id: logData.resource_id,
					details: JSON.stringify(logData.details || {}),
					ip_address: ipAddress,
					user_agent: userAgent,
					created_at: now,
				})
				.execute()
		} catch (error) {
			console.error("Error logging audit action:", error)
			// Don't throw error to avoid breaking the main operation
		}
	}

	/**
	 * Search audit logs with filtering and pagination
	 */
	async searchLogs(searchData: AuditSearchData): Promise<AuditSearchResult> {
		try {
			const { page, limit, userId, action, resourceType, resourceId, startDate, endDate } = searchData
			const offset = (page - 1) * limit

			// Build base query
			let query = this.kysely
				.selectFrom("audit_logs")
				.leftJoin("users", "audit_logs.user_id", "users.id")
				.select([
					"audit_logs.id",
					"audit_logs.user_id",
					"audit_logs.action",
					"audit_logs.resource_type",
					"audit_logs.resource_id",
					"audit_logs.details",
					"audit_logs.ip_address",
					"audit_logs.user_agent",
					"audit_logs.created_at",
					"users.name as user_name",
					"users.email as user_email",
				])

			// Apply filters
			if (userId) {
				query = query.where("audit_logs.user_id", "=", userId)
			}

			if (action) {
				query = query.where("audit_logs.action", "like", `%${action}%`)
			}

			if (resourceType) {
				query = query.where("audit_logs.resource_type", "=", resourceType)
			}

			if (resourceId) {
				query = query.where("audit_logs.resource_id", "=", resourceId)
			}

			if (startDate) {
				query = query.where("audit_logs.created_at", ">=", startDate)
			}

			if (endDate) {
				query = query.where("audit_logs.created_at", "<=", endDate)
			}

			// Get total count
			const totalQuery = query.select(this.kysely.fn.count("audit_logs.id").as("total"))
			const totalResult = await totalQuery.executeTakeFirst()
			const total = Number(totalResult?.total || 0)

			// Get logs with pagination
			const logs = await query.orderBy("audit_logs.created_at", "desc").limit(limit).offset(offset).execute()

			return {
				logs: logs.map((log) => ({
					...log,
					details: log.details,
				})),
				pagination: {
					page,
					limit,
					total,
					pages: Math.ceil(total / limit),
				},
			}
		} catch (error) {
			console.error("Error searching audit logs:", error)
			throw new Error("Failed to search audit logs")
		}
	}

	/**
	 * Get audit log by ID
	 */
	async getLogById(logId: string): Promise<AuditLogEntry | null> {
		try {
			const log = await this.kysely
				.selectFrom("audit_logs")
				.leftJoin("users", "audit_logs.user_id", "users.id")
				.where("audit_logs.id", "=", logId)
				.select([
					"audit_logs.id",
					"audit_logs.user_id",
					"audit_logs.action",
					"audit_logs.resource_type",
					"audit_logs.resource_id",
					"audit_logs.details",
					"audit_logs.ip_address",
					"audit_logs.user_agent",
					"audit_logs.created_at",
					"users.name as user_name",
					"users.email as user_email",
				])
				.executeTakeFirst()

			if (!log) return null

			return {
				...log,
				details: log.details,
			}
		} catch (error) {
			console.error("Error fetching audit log:", error)
			throw new Error("Failed to fetch audit log")
		}
	}

	/**
	 * Get audit statistics
	 */
	async getAuditStats(): Promise<AuditStats> {
		try {
			const now = new Date()
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
			const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString()

			const [totalLogs, logsToday, logsThisWeek, logsThisMonth, mostActiveUsers, mostCommonActions, logsByResource] =
				await Promise.all([
					// Total logs
					this.kysely
						.selectFrom("audit_logs")
						.select(this.kysely.fn.count("id").as("count"))
						.executeTakeFirst(),

					// Logs today
					this.kysely
						.selectFrom("audit_logs")
						.where("created_at", ">=", today)
						.select(this.kysely.fn.count("id").as("count"))
						.executeTakeFirst(),

					// Logs this week
					this.kysely
						.selectFrom("audit_logs")
						.where("created_at", ">=", weekAgo)
						.select(this.kysely.fn.count("id").as("count"))
						.executeTakeFirst(),

					// Logs this month
					this.kysely
						.selectFrom("audit_logs")
						.where("created_at", ">=", monthAgo)
						.select(this.kysely.fn.count("id").as("count"))
						.executeTakeFirst(),

					// Most active users
					this.kysely
						.selectFrom("audit_logs")
						.innerJoin("users", "audit_logs.user_id", "users.id")
						.select([
							"users.id as user_id",
							"users.name as user_name",
							"users.email as user_email",
							this.kysely.fn.count("audit_logs.id").as("action_count"),
						])
						.groupBy("users.id", "users.name", "users.email")
						.orderBy("action_count", "desc")
						.limit(10)
						.execute(),

					// Most common actions
					this.kysely
						.selectFrom("audit_logs")
						.select(["action", this.kysely.fn.count("id").as("count")])
						.groupBy("action")
						.orderBy("count", "desc")
						.limit(10)
						.execute(),

					// Logs by resource type
					this.kysely
						.selectFrom("audit_logs")
						.select(["resource_type", this.kysely.fn.count("id").as("count")])
						.groupBy("resource_type")
						.execute(),
				])

			// Convert logs by resource to object
			const resourceMap: Record<string, number> = {}
			logsByResource.forEach((item) => {
				resourceMap[item.resource_type] = Number(item.count)
			})

			return {
				total_logs: Number(totalLogs?.count || 0),
				logs_today: Number(logsToday?.count || 0),
				logs_this_week: Number(logsThisWeek?.count || 0),
				logs_this_month: Number(logsThisMonth?.count || 0),
				most_active_users: mostActiveUsers.map((user) => ({
					user_id: user.user_id,
					user_name: user.user_name,
					user_email: user.user_email,
					action_count: Number(user.action_count),
				})),
				most_common_actions: mostCommonActions.map((action) => ({
					action: action.action,
					count: Number(action.count),
				})),
				logs_by_resource: resourceMap,
			}
		} catch (error) {
			console.error("Error fetching audit stats:", error)
			throw new Error("Failed to fetch audit statistics")
		}
	}

	/**
	 * Clean up old audit logs (older than specified days)
	 */
	async cleanupOldLogs(daysOld: number = 90): Promise<number> {
		try {
			const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString()

			const result = await this.kysely.deleteFrom("audit_logs").where("created_at", "<", cutoffDate).execute()

			return result.length
		} catch (error) {
			console.error("Error cleaning up old audit logs:", error)
			throw new Error("Failed to clean up old audit logs")
		}
	}

	/**
	 * Get client IP address from request
	 */
	private getClientIP(request: NextRequest): string {
		const forwarded = request.headers.get("x-forwarded-for")
		const realIP = request.headers.get("x-real-ip")
		const cfConnectingIP = request.headers.get("cf-connecting-ip")

		if (cfConnectingIP) return cfConnectingIP
		if (realIP) return realIP
		if (forwarded) return forwarded.split(",")[0].trim()

		return "unknown"
	}

	/**
	 * Get recent audit logs for a specific user
	 */
	async getUserRecentLogs(userId: string, limit: number = 10): Promise<AuditLogEntry[]> {
		try {
			const logs = await this.kysely
				.selectFrom("audit_logs")
				.leftJoin("users", "audit_logs.user_id", "users.id")
				.where("audit_logs.user_id", "=", userId)
				.select([
					"audit_logs.id",
					"audit_logs.user_id",
					"audit_logs.action",
					"audit_logs.resource_type",
					"audit_logs.resource_id",
					"audit_logs.details",
					"audit_logs.ip_address",
					"audit_logs.user_agent",
					"audit_logs.created_at",
					"users.name as user_name",
					"users.email as user_email",
				])
				.orderBy("audit_logs.created_at", "desc")
				.limit(limit)
				.execute()

			return logs.map((log) => ({
				...log,
				details: log.details,
			}))
		} catch (error) {
			console.error("Error fetching user recent logs:", error)
			return []
		}
	}

	/**
	 * Get audit logs for a specific resource
	 */
	async getResourceLogs(resourceType: string, resourceId: string, limit: number = 20): Promise<AuditLogEntry[]> {
		try {
			const logs = await this.kysely
				.selectFrom("audit_logs")
				.leftJoin("users", "audit_logs.user_id", "users.id")
				.where("audit_logs.resource_type", "=", resourceType)
				.where("audit_logs.resource_id", "=", resourceId)
				.select([
					"audit_logs.id",
					"audit_logs.user_id",
					"audit_logs.action",
					"audit_logs.resource_type",
					"audit_logs.resource_id",
					"audit_logs.details",
					"audit_logs.ip_address",
					"audit_logs.user_agent",
					"audit_logs.created_at",
					"users.name as user_name",
					"users.email as user_email",
				])
				.orderBy("audit_logs.created_at", "desc")
				.limit(limit)
				.execute()

			return logs.map((log) => ({
				...log,
				details: log.details,
			}))
		} catch (error) {
			console.error("Error fetching resource logs:", error)
			return []
		}
	}

	/**
	 * Validate audit log data
	 */
	validateAuditLog(data: unknown): AuditLogData {
		return AuditLogSchema.parse(data)
	}

	validateAuditSearch(data: unknown): AuditSearchData {
		return AuditSearchSchema.parse(data)
	}
}
