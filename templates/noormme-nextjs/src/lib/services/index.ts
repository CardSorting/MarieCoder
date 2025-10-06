/**
 * Unified service exports following NORMIE DEV methodology
 * Single source of truth for all services
 */

export { BaseService } from "./BaseService"
export { type CreatePaymentData, type Payment, PaymentService } from "./PaymentService"
export { type CreateUserData, type User, UserService } from "./UserService"

// Service factory for dependency injection
export class ServiceFactory {
	private static services: Map<string, any> = new Map()

	static getService<T>(serviceName: string, db: any): T {
		if (!ServiceFactory.services.has(serviceName)) {
			switch (serviceName) {
				case "user":
					ServiceFactory.services.set(serviceName, new UserService(db))
					break
				case "payment":
					ServiceFactory.services.set(serviceName, new PaymentService(db))
					break
				default:
					throw new Error(`Unknown service: ${serviceName}`)
			}
		}
		return ServiceFactory.services.get(serviceName)
	}

	static clearServices(): void {
		ServiceFactory.services.clear()
	}
}
