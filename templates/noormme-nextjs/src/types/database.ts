/**
 * Database type definitions for NOORMME SAAS template
 * Following NORMIE DEV methodology - clean, type-safe interfaces
 */

export interface Database {
	users: {
		id: string
		email: string
		name: string
		role: "customer" | "admin" | "super_admin"
		status: "active" | "inactive" | "suspended" | "deleted"
		avatar?: string
		timezone: string
		preferences: string // JSON string
		lastLoginAt?: string
		emailVerifiedAt?: string
		createdAt: string
		updatedAt: string
	}
	subscriptions: {
		id: string
		userId: string
		planId: string
		status: "active" | "canceled" | "past_due" | "unpaid" | "trialing"
		currentPeriodStart: string
		currentPeriodEnd: string
		cancelAtPeriodEnd: boolean
		canceledAt?: string
		trialStart?: string
		trialEnd?: string
		stripeSubscriptionId?: string
		stripeCustomerId?: string
		createdAt: string
		updatedAt: string
	}
	plans: {
		id: string
		name: string
		description?: string
		price: number
		currency: string
		interval: "month" | "year"
		features: string // JSON string
		limits: string // JSON string
		isActive: boolean
		sortOrder: number
		createdAt: string
		updatedAt: string
	}
	payments: {
		id: string
		userId: string
		subscriptionId?: string
		amount: number
		currency: string
		status: "pending" | "succeeded" | "failed" | "canceled" | "refunded"
		provider: "stripe" | "paypal" | "manual"
		providerId?: string
		providerData: string // JSON string
		description?: string
		metadata: string // JSON string
		createdAt: string
		updatedAt: string
	}
	audit_logs: {
		id: string
		userId?: string
		adminId?: string
		action: string
		resourceType: string
		resourceId?: string
		details: string // JSON string
		ipAddress?: string
		userAgent?: string
		createdAt: string
	}
	user_sessions: {
		id: string
		userId: string
		token: string
		expiresAt: string
		ipAddress?: string
		userAgent?: string
		isActive: boolean
		createdAt: string
	}
	notifications: {
		id: string
		userId: string
		type: string
		title: string
		message: string
		data: string // JSON string
		isRead: boolean
		readAt?: string
		createdAt: string
	}
	system_settings: {
		id: string
		key: string
		value: string
		type: "string" | "number" | "boolean" | "json"
		description?: string
		isPublic: boolean
		updatedBy?: string
		createdAt: string
		updatedAt: string
	}
}

// Kysely expression builder type
export type ExpressionBuilder<DB, _TB extends keyof DB, _O> = {
	and: (expression: any) => any
	or: (expressions: any[]) => any
	not: (expression: any) => any
	fn: {
		count: (column: string) => { as: (alias: string) => any }
		sum: (column: string) => { as: (alias: string) => any }
		avg: (column: string) => { as: (alias: string) => any }
		strftime: (format: string, column: string) => { as: (alias: string) => any }
	}
}

// Repository interface
export interface Repository<T> {
	findById(id: string): Promise<T | null>
	findAll(): Promise<T[]>
	findBy(criteria: Record<string, any>): Promise<T[]>
	findOneBy(criteria: Record<string, any>): Promise<T | null>
	findByEmail(email: string): Promise<T | null>
	create(data: Partial<T>): Promise<T>
	update(id: string, data: Partial<T>): Promise<T>
	delete(id: string): Promise<boolean>
	count(criteria?: Record<string, any>): Promise<number>
}

// NOORMME interface
export interface NOORMME {
	getRepository<T>(tableName: string): Repository<T>
	getKysely(): {
		selectFrom: (table: keyof Database) => any
		insertInto: (table: keyof Database) => any
		updateTable: (table: keyof Database) => any
		deleteFrom: (table: keyof Database) => any
	}
	execute(query: string, params?: any[]): Promise<any>
}
