import type { ExpressionBuilder, NOORMME } from "@/types/database"
import { BaseService } from "./BaseService"

export interface Notification {
	id: string
	userId: string
	type: string
	title: string
	message: string
	data: Record<string, any>
	isRead: boolean
	readAt?: Date
	createdAt: Date
}

export interface CreateNotificationData {
	userId: string
	type: string
	title: string
	message: string
	data?: Record<string, any>
}

export interface NotificationStats {
	totalNotifications: number
	unreadNotifications: number
	notificationsByType: Record<string, number>
}

/**
 * Notification service following NORMIE DEV methodology
 * Handles user notifications and messaging
 */
export class NotificationService extends BaseService<Notification> {
	constructor(db: NOORMME) {
		super(db.getRepository("notifications"), db)
	}

	/**
	 * Create a new notification
	 */
	async createNotification(data: CreateNotificationData): Promise<Notification> {
		const notificationData = {
			...data,
			data: data.data || {},
			isRead: false,
		}

		return await this.create(notificationData)
	}

	/**
	 * Get user's notifications
	 */
	async getUserNotifications(
		userId: string,
		page = 1,
		limit = 20,
		unreadOnly = false,
	): Promise<{ notifications: Notification[]; total: number; pages: number }> {
		const offset = (page - 1) * limit

		let query = this.db.getKysely().selectFrom("notifications").selectAll().where("userId", "=", userId)

		if (unreadOnly) {
			query = query.where("isRead", "=", false)
		}

		const notifications = await query.orderBy("createdAt", "desc").limit(limit).offset(offset).execute()

		const total = unreadOnly
			? await this.repository.count({ userId, isRead: false })
			: await this.repository.count({ userId })

		return {
			notifications,
			total,
			pages: Math.ceil(total / limit),
		}
	}

	/**
	 * Mark notification as read
	 */
	async markAsRead(notificationId: string, userId: string): Promise<Notification> {
		const notification = await this.findById(notificationId)
		if (!notification) {
			throw new Error("Notification not found")
		}

		if (notification.userId !== userId) {
			throw new Error("Unauthorized")
		}

		return await this.update(notificationId, {
			isRead: true,
			readAt: new Date(),
		})
	}

	/**
	 * Mark all notifications as read for a user
	 */
	async markAllAsRead(userId: string): Promise<void> {
		await this.db
			.getKysely()
			.updateTable("notifications")
			.set({
				isRead: true,
				readAt: new Date(),
			})
			.where("userId", "=", userId)
			.where("isRead", "=", false)
			.execute()
	}

	/**
	 * Delete notification
	 */
	async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
		const notification = await this.findById(notificationId)
		if (!notification) {
			throw new Error("Notification not found")
		}

		if (notification.userId !== userId) {
			throw new Error("Unauthorized")
		}

		return await this.delete(notificationId)
	}

	/**
	 * Get unread notification count
	 */
	async getUnreadCount(userId: string): Promise<number> {
		return await this.repository.count({ userId, isRead: false })
	}

	/**
	 * Send welcome notification
	 */
	async sendWelcomeNotification(userId: string): Promise<Notification> {
		return await this.createNotification({
			userId,
			type: "welcome",
			title: "Welcome to our platform!",
			message: "Thanks for signing up. Get started by exploring our features.",
			data: {
				cta: "Get Started",
				ctaUrl: "/dashboard",
			},
		})
	}

	/**
	 * Send payment success notification
	 */
	async sendPaymentSuccessNotification(
		userId: string,
		amount: number,
		currency: string,
		planName: string,
	): Promise<Notification> {
		return await this.createNotification({
			userId,
			type: "payment_success",
			title: "Payment Successful",
			message: `Your ${planName} subscription has been renewed for ${currency} ${amount}.`,
			data: {
				amount,
				currency,
				planName,
			},
		})
	}

	/**
	 * Send payment failed notification
	 */
	async sendPaymentFailedNotification(
		userId: string,
		amount: number,
		currency: string,
		planName: string,
	): Promise<Notification> {
		return await this.createNotification({
			userId,
			type: "payment_failed",
			title: "Payment Failed",
			message: `We couldn't process your payment for ${planName} (${currency} ${amount}). Please update your payment method.`,
			data: {
				amount,
				currency,
				planName,
				cta: "Update Payment",
				ctaUrl: "/billing",
			},
		})
	}

	/**
	 * Send subscription canceled notification
	 */
	async sendSubscriptionCanceledNotification(userId: string, planName: string, endDate: Date): Promise<Notification> {
		return await this.createNotification({
			userId,
			type: "subscription_canceled",
			title: "Subscription Canceled",
			message: `Your ${planName} subscription has been canceled and will end on ${endDate.toLocaleDateString()}.`,
			data: {
				planName,
				endDate: endDate.toISOString(),
			},
		})
	}

	/**
	 * Send feature update notification
	 */
	async sendFeatureUpdateNotification(
		userId: string,
		featureName: string,
		description: string,
		url?: string,
	): Promise<Notification> {
		return await this.createNotification({
			userId,
			type: "feature_update",
			title: "New Feature Available",
			message: `Check out our new ${featureName}: ${description}`,
			data: {
				feature: featureName,
				description,
				url: url || "/features",
			},
		})
	}

	/**
	 * Send system maintenance notification
	 */
	async sendMaintenanceNotification(userId: string, startTime: Date, endTime: Date): Promise<Notification> {
		return await this.createNotification({
			userId,
			type: "maintenance",
			title: "Scheduled Maintenance",
			message: `We'll be performing maintenance from ${startTime.toLocaleString()} to ${endTime.toLocaleString()}.`,
			data: {
				startTime: startTime.toISOString(),
				endTime: endTime.toISOString(),
			},
		})
	}

	/**
	 * Get notification statistics
	 */
	async getNotificationStats(): Promise<NotificationStats> {
		const totalNotifications = await this.repository.count()
		const unreadNotifications = await this.repository.count({ isRead: false })

		const notificationsByType = await this.db
			.getKysely()
			.selectFrom("notifications")
			.select(["type", (eb: ExpressionBuilder<any, any, any>) => eb.fn.count("id").as("count")])
			.groupBy("type")
			.execute()

		const typeStats = notificationsByType.reduce(
			(acc: Record<string, number>, row: any) => {
				acc[row.type] = Number(row.count)
				return acc
			},
			{} as Record<string, number>,
		)

		return {
			totalNotifications,
			unreadNotifications,
			notificationsByType: typeStats,
		}
	}

	/**
	 * Clean up old notifications
	 */
	async cleanupOldNotifications(daysOld = 90): Promise<number> {
		const cutoffDate = new Date()
		cutoffDate.setDate(cutoffDate.getDate() - daysOld)

		const result = await this.db
			.getKysely()
			.deleteFrom("notifications")
			.where("createdAt", "<", cutoffDate.toISOString())
			.where("isRead", "=", true)
			.execute()

		return result.length
	}

	/**
	 * Send bulk notification to multiple users
	 */
	async sendBulkNotification(
		userIds: string[],
		type: string,
		title: string,
		message: string,
		data?: Record<string, any>,
	): Promise<Notification[]> {
		const notifications: Notification[] = []

		for (const userId of userIds) {
			const notification = await this.createNotification({
				userId,
				type,
				title,
				message,
				data,
			})
			notifications.push(notification)
		}

		return notifications
	}
}
