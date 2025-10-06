/**
 * Unified service exports following NORMIE DEV methodology
 * Single source of truth for all services
 */

export type { AuditLog, SystemSetting, SystemStats } from "./AdminService"
export { AdminService } from "./AdminService"
export { BaseService } from "./BaseService"
export type { CreateNotificationData, Notification, NotificationStats } from "./NotificationService"
export { NotificationService } from "./NotificationService"
export type { PaymentStats } from "./PaymentService"
export { type CreatePaymentData, type Payment, PaymentService } from "./PaymentService"
export type { CreateSubscriptionData, Plan, Subscription, SubscriptionStats } from "./SubscriptionService"
export { SubscriptionService } from "./SubscriptionService"
// Export all types
export type { UpdateUserData, UserStats } from "./UserService"
export { type CreateUserData, type User, UserService } from "./UserService"

// Import service classes for type checking
import { AdminService } from "./AdminService"
import { NotificationService } from "./NotificationService"
import { PaymentService } from "./PaymentService"
import { SubscriptionService } from "./SubscriptionService"
import { UserService } from "./UserService"

// Service factory for dependency injection
export class ServiceFactory {
	private static services: Map<
		string,
		UserService | PaymentService | SubscriptionService | NotificationService | AdminService
	> = new Map()

	static getService(serviceName: "user", db: any): UserService
	static getService(serviceName: "payment", db: any): PaymentService
	static getService(serviceName: "subscription", db: any): SubscriptionService
	static getService(serviceName: "notification", db: any): NotificationService
	static getService(serviceName: "admin", db: any): AdminService
	static getService(
		serviceName: string,
		db: any,
	): UserService | PaymentService | SubscriptionService | NotificationService | AdminService {
		if (!ServiceFactory.services.has(serviceName)) {
			switch (serviceName) {
				case "user":
					ServiceFactory.services.set(serviceName, new UserService(db))
					break
				case "payment":
					ServiceFactory.services.set(serviceName, new PaymentService(db))
					break
				case "subscription":
					ServiceFactory.services.set(serviceName, new SubscriptionService(db))
					break
				case "notification":
					ServiceFactory.services.set(serviceName, new NotificationService(db))
					break
				case "admin":
					ServiceFactory.services.set(serviceName, new AdminService(db))
					break
				default:
					throw new Error(`Unknown service: ${serviceName}`)
			}
		}
		return ServiceFactory.services.get(serviceName)!
	}

	static clearServices(): void {
		ServiceFactory.services.clear()
	}
}
