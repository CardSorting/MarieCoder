import type { ExpressionBuilder, NOORMME } from "@/types/database"
import { BaseService } from "./BaseService"

export interface AuditLog {
	id: string
	userId?: string
	adminId?: string
	action: string
	resourceType: string
	resourceId?: string
	details: Record<string, any>
	ipAddress?: string
	userAgent?: string
	createdAt: Date
}

export interface SystemSetting {
	id: string
	key: string
	value: string
	type: "string" | "number" | "boolean" | "json"
	description?: string
	isPublic: boolean
	updatedBy?: string
	createdAt: Date
	updatedAt: Date
}

export interface SystemStats {
	totalUsers: number
	activeUsers: number
	totalSubscriptions: number
	activeSubscriptions: number
	totalRevenue: number
	monthlyRevenue: number
	systemUptime: number
	errorRate: number
}

/**
 * Admin service following NORMIE DEV methodology
 * Handles administrative functions and system management
 */
export class AdminService extends BaseService<AuditLog> {
	constructor(db: NOORMME) {
		super(db.getRepository("audit_logs"), db)
	}

	/**
	 * Get system statistics
	 */
	async getSystemStats(): Promise<SystemStats> {
		const userRepo = this.db.getRepository("users")
		const subscriptionRepo = this.db.getRepository("subscriptions")

		const totalUsers = await userRepo.count()
		const activeUsers = await userRepo.count({ status: "active" })
		const totalSubscriptions = await subscriptionRepo.count()
		const activeSubscriptions = await subscriptionRepo.count({ status: "active" })

		const totalRevenue = await this.db
			.getKysely()
			.selectFrom("payments")
			.select((eb: ExpressionBuilder<any, any, any>) => eb.fn.sum("amount").as("total"))
			.where("status", "=", "succeeded")
			.executeTakeFirst()

		const startOfMonth = new Date()
		startOfMonth.setDate(1)
		startOfMonth.setHours(0, 0, 0, 0)

		const monthlyRevenue = await this.db
			.getKysely()
			.selectFrom("payments")
			.select((eb: ExpressionBuilder<any, any, any>) => eb.fn.sum("amount").as("total"))
			.where("status", "=", "succeeded")
			.where("createdAt", ">=", startOfMonth.toISOString())
			.executeTakeFirst()

		// In a real system, you'd get these from monitoring services
		const systemUptime = 99.9 // Mock value
		const errorRate = 0.1 // Mock value

		return {
			totalUsers,
			activeUsers,
			totalSubscriptions,
			activeSubscriptions,
			totalRevenue: Number(totalRevenue?.total || 0),
			monthlyRevenue: Number(monthlyRevenue?.total || 0),
			systemUptime,
			errorRate,
		}
	}

	/**
	 * Get audit logs with filtering
	 */
	async getAuditLogs(
		filters: {
			userId?: string
			adminId?: string
			action?: string
			resourceType?: string
			startDate?: Date
			endDate?: Date
			page?: number
			limit?: number
		} = {},
	): Promise<{ logs: AuditLog[]; total: number; pages: number }> {
		const { page = 1, limit = 50, ...searchFilters } = filters
		const offset = (page - 1) * limit

		let query = this.db.getKysely().selectFrom("audit_logs").selectAll()

		// Apply filters
		if (searchFilters.userId) {
			query = query.where("userId", "=", searchFilters.userId)
		}
		if (searchFilters.adminId) {
			query = query.where("adminId", "=", searchFilters.adminId)
		}
		if (searchFilters.action) {
			query = query.where("action", "=", searchFilters.action)
		}
		if (searchFilters.resourceType) {
			query = query.where("resourceType", "=", searchFilters.resourceType)
		}
		if (searchFilters.startDate) {
			query = query.where("createdAt", ">=", searchFilters.startDate.toISOString())
		}
		if (searchFilters.endDate) {
			query = query.where("createdAt", "<=", searchFilters.endDate.toISOString())
		}

		const logs = await query.orderBy("createdAt", "desc").limit(limit).offset(offset).execute()

		// Count total for pagination
		let countQuery = this.db
			.getKysely()
			.selectFrom("audit_logs")
			.select((eb: ExpressionBuilder<any, any, any>) => eb.fn.count("id").as("count"))

		// Apply same filters for count
		if (searchFilters.userId) {
			countQuery = countQuery.where("userId", "=", searchFilters.userId)
		}
		if (searchFilters.adminId) {
			countQuery = countQuery.where("adminId", "=", searchFilters.adminId)
		}
		if (searchFilters.action) {
			countQuery = countQuery.where("action", "=", searchFilters.action)
		}
		if (searchFilters.resourceType) {
			countQuery = countQuery.where("resourceType", "=", searchFilters.resourceType)
		}
		if (searchFilters.startDate) {
			countQuery = countQuery.where("createdAt", ">=", searchFilters.startDate.toISOString())
		}
		if (searchFilters.endDate) {
			countQuery = countQuery.where("createdAt", "<=", searchFilters.endDate.toISOString())
		}

		const total = await countQuery.executeTakeFirst()

		return {
			logs,
			total: Number(total?.count || 0),
			pages: Math.ceil(Number(total?.count || 0) / limit),
		}
	}

	/**
	 * Log admin action
	 */
	async logAdminAction(
		adminId: string,
		action: string,
		resourceType: string,
		resourceId: string,
		details: Record<string, any>,
		ipAddress?: string,
		userAgent?: string,
	): Promise<AuditLog> {
		return await this.create({
			adminId,
			action,
			resourceType,
			resourceId,
			details: JSON.stringify(details) as any,
			ipAddress,
			userAgent,
		})
	}

	/**
	 * Get system settings
	 */
	async getSystemSettings(): Promise<SystemSetting[]> {
		const settingsRepo = this.db.getRepository("system_settings")
		return (await settingsRepo.findAll()) as SystemSetting[]
	}

	/**
	 * Get public system settings
	 */
	async getPublicSettings(): Promise<SystemSetting[]> {
		const settingsRepo = this.db.getRepository("system_settings")
		return (await settingsRepo.findBy({ isPublic: true })) as SystemSetting[]
	}

	/**
	 * Get system setting by key
	 */
	async getSetting(key: string): Promise<SystemSetting | null> {
		const settingsRepo = this.db.getRepository("system_settings")
		return (await settingsRepo.findOneBy({ key })) as SystemSetting | null
	}

	/**
	 * Update system setting
	 */
	async updateSetting(key: string, value: string, updatedBy: string): Promise<SystemSetting> {
		const settingsRepo = this.db.getRepository("system_settings")
		const setting = (await settingsRepo.findOneBy({ key })) as SystemSetting | null

		if (!setting) {
			throw new Error("Setting not found")
		}

		// Log the setting change
		await this.logAdminAction(updatedBy, "setting_updated", "system_setting", key, {
			oldValue: setting.value,
			newValue: value,
		})

		return (await settingsRepo.update(setting.id, {
			value,
			updatedBy,
			updatedAt: new Date(),
		})) as SystemSetting
	}

	/**
	 * Create system setting
	 */
	async createSetting(
		settingData: Omit<SystemSetting, "id" | "createdAt" | "updatedAt">,
		createdBy: string,
	): Promise<SystemSetting> {
		const settingsRepo = this.db.getRepository("system_settings")

		// Log the setting creation
		await this.logAdminAction(createdBy, "setting_created", "system_setting", settingData.key, {
			key: settingData.key,
			value: settingData.value,
			type: settingData.type,
		})

		return (await settingsRepo.create({
			...settingData,
			updatedBy: createdBy,
		})) as SystemSetting
	}

	/**
	 * Delete system setting
	 */
	async deleteSetting(key: string, deletedBy: string): Promise<boolean> {
		const settingsRepo = this.db.getRepository("system_settings")
		const setting = (await settingsRepo.findOneBy({ key })) as SystemSetting | null

		if (!setting) {
			throw new Error("Setting not found")
		}

		// Log the setting deletion
		await this.logAdminAction(deletedBy, "setting_deleted", "system_setting", key, {
			key: setting.key,
			value: setting.value,
		})

		return await settingsRepo.delete(setting.id)
	}

	/**
	 * Get user activity summary
	 */
	async getUserActivitySummary(
		userId: string,
		days = 30,
	): Promise<{
		loginCount: number
		lastLogin: Date | null
		actionsPerformed: number
		recentActions: AuditLog[]
	}> {
		const startDate = new Date()
		startDate.setDate(startDate.getDate() - days)

		const loginCount = await this.repository.count({
			userId,
			action: "user_signin",
		})

		const lastLogin = await this.db
			.getKysely()
			.selectFrom("audit_logs")
			.select("createdAt")
			.where("userId", "=", userId)
			.where("action", "=", "user_signin")
			.orderBy("createdAt", "desc")
			.limit(1)
			.executeTakeFirst()

		const actionsPerformed = await this.repository.count({
			userId,
		})

		const recentActions = await this.db
			.getKysely()
			.selectFrom("audit_logs")
			.selectAll()
			.where("userId", "=", userId)
			.where("createdAt", ">=", startDate.toISOString())
			.orderBy("createdAt", "desc")
			.limit(10)
			.execute()

		return {
			loginCount,
			lastLogin: lastLogin ? new Date(lastLogin.createdAt) : null,
			actionsPerformed,
			recentActions: recentActions as AuditLog[],
		}
	}

	/**
	 * Get system health check
	 */
	async getSystemHealth(): Promise<{
		database: boolean
		services: Record<string, boolean>
		lastCheck: Date
	}> {
		try {
			// Test database connection
			await this.db.execute("SELECT 1")
			const database = true

			// In a real system, you'd check external services here
			const services = {
				email: true,
				payment: true,
				storage: true,
				analytics: true,
			}

			return {
				database,
				services,
				lastCheck: new Date(),
			}
		} catch {
			return {
				database: false,
				services: {
					email: false,
					payment: false,
					storage: false,
					analytics: false,
				},
				lastCheck: new Date(),
			}
		}
	}

	/**
	 * Clean up old audit logs
	 */
	async cleanupAuditLogs(daysOld = 365): Promise<number> {
		const cutoffDate = new Date()
		cutoffDate.setDate(cutoffDate.getDate() - daysOld)

		const result = await this.db
			.getKysely()
			.deleteFrom("audit_logs")
			.where("createdAt", "<", cutoffDate.toISOString())
			.execute()

		return result.length
	}

	/**
	 * Export audit logs
	 */
	async exportAuditLogs(filters: { startDate?: Date; endDate?: Date; format?: "json" | "csv" } = {}): Promise<string> {
		const { startDate, endDate, format = "json" } = filters

		let query = this.db.getKysely().selectFrom("audit_logs").selectAll()

		if (startDate) {
			query = query.where("createdAt", ">=", startDate.toISOString())
		}
		if (endDate) {
			query = query.where("createdAt", "<=", endDate.toISOString())
		}

		const logs = await query.orderBy("createdAt", "desc").execute()

		if (format === "csv") {
			const headers = [
				"ID",
				"User ID",
				"Admin ID",
				"Action",
				"Resource Type",
				"Resource ID",
				"Details",
				"IP Address",
				"User Agent",
				"Created At",
			]
			const rows = logs.map((log: any) => [
				log.id,
				log.userId || "",
				log.adminId || "",
				log.action,
				log.resourceType,
				log.resourceId || "",
				log.details,
				log.ipAddress || "",
				log.userAgent || "",
				log.createdAt,
			])

			return [headers, ...rows].map((row) => row.join(",")).join("\n")
		}

		return JSON.stringify(logs as any, null, 2)
	}
}
