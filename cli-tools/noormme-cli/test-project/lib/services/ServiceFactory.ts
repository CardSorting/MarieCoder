/**
 * Service Factory - Centralized service instantiation and dependency injection
 * Provides singleton instances of all services with proper dependency management
 */

import { AuditService } from "./AuditService"
import { PermissionService } from "./PermissionService"
import { RoleService } from "./RoleService"
import { UserService } from "./UserService"

/**
 * Service Factory class for managing service instances
 */
export class ServiceFactory {
	private static instance: ServiceFactory
	private _roleService: RoleService | null = null
	private _userService: UserService | null = null
	private _permissionService: PermissionService | null = null
	private _auditService: AuditService | null = null

	private constructor() {}

	/**
	 * Get singleton instance of ServiceFactory
	 */
	public static getInstance(): ServiceFactory {
		if (!ServiceFactory.instance) {
			ServiceFactory.instance = new ServiceFactory()
		}
		return ServiceFactory.instance
	}

	/**
	 * Get RoleService instance
	 */
	public getRoleService(): RoleService {
		if (!this._roleService) {
			this._roleService = new RoleService()
		}
		return this._roleService
	}

	/**
	 * Get UserService instance
	 */
	public getUserService(): UserService {
		if (!this._userService) {
			this._userService = new UserService()
		}
		return this._userService
	}

	/**
	 * Get PermissionService instance
	 */
	public getPermissionService(): PermissionService {
		if (!this._permissionService) {
			this._permissionService = new PermissionService()
		}
		return this._permissionService
	}

	/**
	 * Get AuditService instance
	 */
	public getAuditService(): AuditService {
		if (!this._auditService) {
			this._auditService = new AuditService()
		}
		return this._auditService
	}

	/**
	 * Reset all service instances (useful for testing)
	 */
	public reset(): void {
		this._roleService = null
		this._userService = null
		this._permissionService = null
		this._auditService = null
	}
}

// Export singleton instance
export const serviceFactory = ServiceFactory.getInstance()

// Convenience exports for direct service access
export const roleService = () => serviceFactory.getRoleService()
export const userService = () => serviceFactory.getUserService()
export const permissionService = () => serviceFactory.getPermissionService()
export const auditService = () => serviceFactory.getAuditService()

// Service registry for dynamic service access
export const ServiceRegistry = {
	role: () => serviceFactory.getRoleService(),
	user: () => serviceFactory.getUserService(),
	permission: () => serviceFactory.getPermissionService(),
	audit: () => serviceFactory.getAuditService(),
} as const

export type ServiceType = keyof typeof ServiceRegistry
