/**
 * Services Index - Centralized exports for all services
 */

// Payment Services
export type {
	CreatePaymentIntentData,
	CreateSubscriptionData,
	PaymentError,
	PaymentIntent,
	PaymentMethod,
	PaymentTransaction,
	Refund,
	Subscription,
	SubscriptionPlan,
} from "../types/payment"
// Core Services
export type { AuditLogData, AuditLogEntry, AuditSearchData, AuditSearchResult, AuditStats } from "./AuditService"
export { AuditService } from "./AuditService"
// Analytics Services
export * from "./analytics"
// Database Services
export * from "./database"
export type {
	CreatePermissionData,
	PermissionStats,
	PermissionWithUsage,
	ResourcePermission,
	UpdatePermissionData,
} from "./PermissionService"
export { PermissionService } from "./PermissionService"
// Payment Services - Clean unified architecture
export {
	PaymentProviderFactory,
	PaymentService,
	PaymentServiceFactory,
	PayPalProvider,
	StripeProvider,
	UnifiedPaymentService,
} from "./payment"
export type { AssignRoleData, CreateRoleData, RoleStats, RoleWithPermissions, UpdateRoleData } from "./RoleService"
export { RoleService } from "./RoleService"
// Service Factory
export type { ServiceType } from "./ServiceFactory"
export {
	auditService,
	permissionService,
	roleService,
	ServiceFactory,
	ServiceRegistry,
	serviceFactory,
	userService,
} from "./ServiceFactory"
// Legacy services removed - use UnifiedPaymentService instead
export type { CreateUserData, UpdateUserData, UserSearchData, UserSearchResult, UserStats, UserWithRoles } from "./UserService"
export { UserService } from "./UserService"
// Webhook Services - Explicit exports to avoid conflicts
export {
	PayPalWebhookProcessor,
	StripeWebhookProcessor,
	WebhookRetryService,
} from "./webhooks"
