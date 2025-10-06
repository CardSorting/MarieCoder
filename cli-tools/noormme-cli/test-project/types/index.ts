/**
 * Global type definitions for NOORMME Next.js Template
 */

// User types
export interface User {
	id: string
	email: string
	name: string
	status: "active" | "inactive" | "suspended"
	email_verified: boolean
	image?: string
	last_login?: string
	created_at: string
	updated_at: string
	password_hash?: string
}

export interface UserWithRoles extends User {
	roles: Array<{
		id: string
		name: string
		description?: string
	}>
}

// Role types
export interface Role {
	id: string
	name: string
	description?: string
	is_system: boolean
	created_at: string
	updated_at: string
}

export interface RoleWithPermissions extends Role {
	permissions: Array<{
		id: string
		name: string
		resource: string
		action: string
	}>
	user_count: number
}

// Permission types
export interface Permission {
	id: string
	name: string
	description?: string
	resource: string
	action: string
	created_at: string
	updated_at: string
}

export interface PermissionWithUsage extends Permission {
	role_count: number
	user_count: number
}

// Payment types
export interface Payment {
	id: string
	user_id: string
	amount: number
	currency: string
	status: "pending" | "completed" | "failed" | "refunded"
	payment_method: "stripe" | "paypal"
	payment_intent_id?: string
	transaction_id?: string
	metadata?: Record<string, any>
	created_at: string
	updated_at: string
	user_name?: string
}

// Subscription types
export interface Subscription {
	id: string
	user_id: string
	plan_id: string
	status: "active" | "canceled" | "past_due" | "incomplete"
	current_period_start: string
	current_period_end: string
	cancel_at_period_end: boolean
	created_at: string
	updated_at: string
}

// Audit log types
export interface AuditLog {
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

// API Response types
export interface ApiResponse<T = any> {
	data?: T
	message?: string
	error?: string
	pagination?: {
		page: number
		limit: number
		total: number
		pages: number
	}
}

// Statistics types
export interface UserStats {
	total_users: number
	active_users: number
	inactive_users: number
	suspended_users: number
	new_users_this_month: number
	users_without_roles: number
}

export interface RoleStats {
	total_roles: number
	system_roles: number
	custom_roles: number
	roles_with_users: number
	most_used_role: string | null
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

// Search and filter types
export interface UserSearchParams {
	search?: string
	status?: "active" | "inactive" | "suspended"
	roleId?: string
	page?: number
	limit?: number
}

export interface AuditSearchParams {
	userId?: string
	action?: string
	resourceType?: string
	resourceId?: string
	startDate?: string
	endDate?: string
	page?: number
	limit?: number
}

// NextAuth types
export interface NextAuthUser {
	id: string
	email: string
	name: string
	image?: string
}

export interface NextAuthSession {
	user: NextAuthUser
	expires: string
}

// Service types
export interface CreateUserData {
	email: string
	name: string
	password: string
	roleIds?: string[]
	status?: "active" | "inactive" | "suspended"
}

export interface UpdateUserData {
	name?: string
	email?: string
	status?: "active" | "inactive" | "suspended"
	roleIds?: string[]
	password?: string
}

export interface CreateRoleData {
	name: string
	description?: string
	permissionIds?: string[]
}

export interface UpdateRoleData {
	name?: string
	description?: string
	permissionIds?: string[]
}

export interface CreatePermissionData {
	name: string
	description?: string
	resource: string
	action: string
}

export interface UpdatePermissionData {
	name?: string
	description?: string
}

// Database types
export interface DatabaseSchema {
	users: User
	roles: Role
	permissions: Permission
	user_roles: {
		id: string
		user_id: string
		role_id: string
		assigned_by: string
		expires_at?: string
		created_at: string
		updated_at: string
	}
	role_permissions: {
		id: string
		role_id: string
		permission_id: string
		created_at: string
		updated_at: string
	}
	sessions: {
		id: string
		user_id: string
		session_token: string
		expires_at: string
		created_at: string
		updated_at: string
	}
	payments: Payment
	subscriptions: Subscription
	audit_logs: AuditLog
}

// Component props types
export interface AdminDashboardProps {
	session: NextAuthSession
	stats: {
		users: UserStats
		roles: RoleStats
		permissions: PermissionStats
		audit: AuditStats
	}
	recentUsers: UserWithRoles[]
	recentPayments: Payment[]
}

export interface UserListProps {
	users: UserWithRoles[]
	pagination: {
		page: number
		limit: number
		total: number
		pages: number
	}
}

export interface RoleListProps {
	roles: RoleWithPermissions[]
	permissions: PermissionWithUsage[]
}

// Error types
export interface AppError {
	message: string
	code?: string
	statusCode?: number
	actionable?: string
}

// Form types
export interface LoginFormData {
	email: string
	password: string
}

export interface RegisterFormData {
	name: string
	email: string
	password: string
	confirmPassword: string
}

// Utility types
export type Status = "active" | "inactive" | "suspended"
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded"
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "incomplete"
export type PaymentMethod = "stripe" | "paypal"

// Generic types
export type ID = string
export type Timestamp = string
export type JSON = Record<string, any>

// Export all types as a namespace for easy access
export namespace NOORMMETypes {
	export type User = User
	export type UserWithRoles = UserWithRoles
	export type Role = Role
	export type RoleWithPermissions = RoleWithPermissions
	export type Permission = Permission
	export type PermissionWithUsage = PermissionWithUsage
	export type Payment = Payment
	export type Subscription = Subscription
	export type AuditLog = AuditLog
	export type ApiResponse<T> = ApiResponse<T>
	export type UserStats = UserStats
	export type RoleStats = RoleStats
	export type PermissionStats = PermissionStats
	export type AuditStats = AuditStats
	export type NextAuthUser = NextAuthUser
	export type NextAuthSession = NextAuthSession
	export type DatabaseSchema = DatabaseSchema
}
