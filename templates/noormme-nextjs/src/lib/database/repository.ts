/**
 * Enhanced Repository Pattern for NOORMME SAAS
 * Following NORMIE DEV methodology - leveraging Kysely's full capabilities
 */

import { Kysely } from "kysely"
import { nanoid } from "nanoid"
import { Database } from "@/types/database"
import { QueryCache } from "./cache"
import { NOORMError, NotFoundError, ValidationError } from "./errors"
import { PaginationOptions, QueryBuilderFactory, SearchOptions } from "./query-builder"

export interface RepositoryOptions {
	enableSoftDelete?: boolean
	auditLog?: boolean
	cache?: boolean
	cacheTTL?: number
	cacheInstance?: QueryCache
}

export interface AuditLogEntry {
	id: string
	action: string
	resourceType: string
	resourceId: string | null
	details: string
	userId?: string
	ipAddress?: string
	userAgent?: string
	createdAt: Date
}

export interface ValidationErrorDetail {
	field: string
	message: string
	value?: unknown
}

export interface CreateResult<T> {
	success: boolean
	data?: T
	error?: string
}

export interface UpdateResult<T> {
	success: boolean
	data?: T
	error?: string
	affectedRows: number
}

export interface DeleteResult {
	success: boolean
	affectedRows: number
	error?: string
}

export interface BulkOperationResult<T> {
	success: boolean
	created: T[]
	failed: Array<{ data: Partial<T>; error: string }>
	totalProcessed: number
}

/**
 * Enhanced Base Repository leveraging Kysely's full capabilities
 * Following NORMIE DEV methodology - clean, type-safe, performant
 */
export abstract class BaseRepository<T extends keyof Database> {
	protected tableName: T
	protected db: Kysely<Database>
	protected queryBuilder: QueryBuilderFactory | null
	protected options: RepositoryOptions
	protected cache: QueryCache | null

	constructor(tableName: T, db: Kysely<Database>, options: RepositoryOptions = {}) {
		this.tableName = tableName
		this.db = db
		this.queryBuilder = null // Will be set by the database instance
		this.cache = options.cacheInstance || null
		this.options = {
			enableSoftDelete: false,
			auditLog: false,
			cache: false,
			cacheTTL: 300, // 5 minutes
			...options,
		}

		// Initialize cache if enabled but no instance provided
		if (this.options.cache && !this.cache) {
			this.cache = new QueryCache({
				enabled: true,
				ttl: this.options.cacheTTL,
				prefix: `${String(tableName)}:`,
			})
		}
	}

	/**
	 * Set the query builder factory
	 */
	setQueryBuilder(queryBuilder: QueryBuilderFactory): void {
		this.queryBuilder = queryBuilder
	}

	/**
	 * Generate a unique ID using nanoid
	 */
	protected generateId(): string {
		return nanoid()
	}

	/**
	 * Validate data for creation
	 */
	protected async validateCreateData(data: Partial<Database[T]>): Promise<void> {
		if (!data || typeof data !== "object") {
			throw new ValidationError("Valid data object is required", "Please provide a valid data object for creation")
		}

		// Add table-specific validation in subclasses
		await this.validateData(data, "create")
	}

	/**
	 * Validate data for updates
	 */
	protected async validateUpdateData(data: Partial<Database[T]>, id: string): Promise<void> {
		if (!data || typeof data !== "object") {
			throw new ValidationError("Valid data object is required", "Please provide a valid data object for update")
		}

		if (!id || typeof id !== "string" || id.trim() === "") {
			throw new ValidationError("Valid ID is required", "Please provide a valid record ID for update")
		}

		// Add table-specific validation in subclasses
		await this.validateData(data, "update")
	}

	/**
	 * Override in subclasses for table-specific validation
	 */
	protected async validateData(_data: Partial<Database[T]>, operation: "create" | "update"): Promise<void> {
		// Default validation - can be overridden in subclasses
		const errors: ValidationErrorDetail[] = []

		// Check for required fields in create operation
		if (operation === "create") {
			// Add specific validation logic here
		}

		if (errors.length > 0) {
			throw new ValidationError(
				`Validation failed: ${errors.map((e) => e.message).join(", ")}`,
				"Please fix the validation errors and try again",
			)
		}
	}

	/**
	 * Create a new record with enhanced validation and error handling
	 */
	async create(data: Partial<Database[T]>): Promise<Database[T]> {
		try {
			// Validate input data
			await this.validateCreateData(data)

			const now = new Date()
			const createData = {
				...data,
				id: data.id || this.generateId(),
				createdAt: now.toISOString(),
				updatedAt: now.toISOString(),
			}

			const result = await this.db
				.insertInto(this.tableName)
				.values(createData as any)
				.returningAll()
				.executeTakeFirst()

			if (!result) {
				throw new NOORMError(
					`Failed to create ${String(this.tableName)} record`,
					"CREATE_FAILED",
					"Please check your data and try again",
				)
			}

			// Audit log if enabled
			if (this.options.auditLog) {
				await this.logAudit("CREATE", (result as any).id, createData)
			}

			// Invalidate related cache entries
			if (this.cache) {
				await this.invalidateRelatedCache()
			}

			return result as unknown as Database[T]
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to create ${String(this.tableName)}: ${error instanceof Error ? error.message : "Unknown error"}`,
				"CREATE_ERROR",
				"Please check your data and try again",
			)
		}
	}

	/**
	 * Create multiple records efficiently with transaction support
	 */
	async createMany(dataArray: Partial<Database[T]>[]): Promise<Database[T][]> {
		try {
			if (!dataArray || dataArray.length === 0) {
				throw new ValidationError("No data provided for bulk creation", "Please provide at least one record to create")
			}

			// Validate all data
			for (const data of dataArray) {
				await this.validateCreateData(data)
			}

			const now = new Date()
			const createDataArray = dataArray.map((data) => ({
				...data,
				id: data.id || this.generateId(),
				createdAt: now.toISOString(),
				updatedAt: now.toISOString(),
			}))

			const results = await this.db
				.insertInto(this.tableName)
				.values(createDataArray as any)
				.returningAll()
				.execute()

			// Audit log if enabled
			if (this.options.auditLog) {
				for (const result of results) {
					await this.logAudit("CREATE", (result as any).id, result)
				}
			}

			// Invalidate related cache entries
			if (this.cache) {
				await this.invalidateRelatedCache()
			}

			return results as unknown as Database[T][]
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to create multiple ${String(this.tableName)} records: ${error instanceof Error ? error.message : "Unknown error"}`,
				"BULK_CREATE_ERROR",
				"Please check your data and try again",
			)
		}
	}

	/**
	 * Find record by ID with caching support
	 */
	async findById(id: string): Promise<Database[T] | null> {
		try {
			if (!id || typeof id !== "string" || id.trim() === "") {
				throw new ValidationError("Valid ID is required", "Please provide a valid record ID")
			}

			// Check cache first
			if (this.cache) {
				const cacheKey = `findById:${id}`
				const cached = await this.cache.get(cacheKey)
				if (cached) {
					return cached as Database[T]
				}
			}

			let query = this.db
				.selectFrom(this.tableName)
				.selectAll()
				.where("id" as any, "=", id)

			// Apply soft delete filter if enabled
			if (this.options.enableSoftDelete) {
				query = query.where("status" as any, "!=", "deleted")
			}

			const result = await query.executeTakeFirst()

			// Cache result if found
			if (this.cache && result) {
				const cacheKey = `findById:${id}`
				await this.cache.set(cacheKey, result as unknown as Database[T])
			}

			return (result as unknown as Database[T]) || null
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to find ${String(this.tableName)} by ID: ${error instanceof Error ? error.message : "Unknown error"}`,
				"FIND_BY_ID_ERROR",
				"Please check the ID and try again",
			)
		}
	}

	/**
	 * Update record by ID with validation and caching
	 */
	async update(id: string, data: Partial<Database[T]>): Promise<Database[T]> {
		try {
			await this.validateUpdateData(data, id)

			const now = new Date()
			const updateData = {
				...data,
				updatedAt: now.toISOString(),
			}

			let query = this.db
				.updateTable(this.tableName)
				.set(updateData as any)
				.where("id" as any, "=", id)
				.returningAll()

			// Apply soft delete filter if enabled
			if (this.options.enableSoftDelete) {
				query = query.where("status" as any, "!=", "deleted")
			}

			const result = await query.executeTakeFirst()

			if (!result) {
				throw new NotFoundError(`${String(this.tableName)} record not found`, "Please check the ID and try again")
			}

			// Audit log if enabled
			if (this.options.auditLog) {
				await this.logAudit("UPDATE", id, { oldData: data, newData: result })
			}

			// Invalidate cache
			if (this.cache) {
				await this.invalidateCacheForRecord(id)
			}

			return result as unknown as Database[T]
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to update ${String(this.tableName)}: ${error instanceof Error ? error.message : "Unknown error"}`,
				"UPDATE_ERROR",
				"Please check your data and try again",
			)
		}
	}

	/**
	 * Delete record by ID (hard delete or soft delete based on configuration)
	 */
	async delete(id: string): Promise<DeleteResult> {
		try {
			if (!id || typeof id !== "string" || id.trim() === "") {
				throw new ValidationError("Valid ID is required", "Please provide a valid record ID for deletion")
			}

			// Check if record exists first
			const existingRecord = await this.findById(id)
			if (!existingRecord) {
				throw new NotFoundError(`${String(this.tableName)} record not found`, "Please check the ID and try again")
			}

			let affectedRows = 0

			if (this.options.enableSoftDelete) {
				// Soft delete
				const now = new Date()
				const result = await this.db
					.updateTable(this.tableName)
					.set({
						status: "deleted" as any,
						updatedAt: now.toISOString(),
					} as any)
					.where("id" as any, "=", id)
					.execute()
				affectedRows = result.length
			} else {
				// Hard delete
				const result = await this.db
					.deleteFrom(this.tableName)
					.where("id" as any, "=", id)
					.execute()
				affectedRows = result.length
			}

			// Audit log if enabled
			if (this.options.auditLog) {
				await this.logAudit("DELETE", id, existingRecord)
			}

			// Invalidate cache
			if (this.cache) {
				await this.invalidateCacheForRecord(id)
			}

			return {
				success: true,
				affectedRows: affectedRows || 0,
			}
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			return {
				success: false,
				affectedRows: 0,
				error: error instanceof Error ? error.message : "Unknown error",
			}
		}
	}

	/**
	 * Soft delete record by ID
	 */
	async softDelete(id: string): Promise<Database[T]> {
		try {
			if (!id || typeof id !== "string" || id.trim() === "") {
				throw new ValidationError("Valid ID is required", "Please provide a valid record ID for soft deletion")
			}

			const now = new Date()
			const result = await this.db
				.updateTable(this.tableName)
				.set({
					status: "deleted" as any,
					updatedAt: now.toISOString(),
				} as any)
				.where("id" as any, "=", id)
				.returningAll()
				.executeTakeFirst()

			if (!result) {
				throw new NotFoundError(`${String(this.tableName)} record not found`, "Please check the ID and try again")
			}

			// Audit log if enabled
			if (this.options.auditLog) {
				await this.logAudit("SOFT_DELETE", id, result)
			}

			// Invalidate cache
			if (this.cache) {
				await this.invalidateCacheForRecord(id)
			}

			return result as unknown as Database[T]
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to soft delete ${String(this.tableName)}: ${error instanceof Error ? error.message : "Unknown error"}`,
				"SOFT_DELETE_ERROR",
				"Please check the ID and try again",
			)
		}
	}

	/**
	 * Find records by criteria with advanced filtering
	 */
	async findBy(
		criteria: Record<string, unknown>,
		options: {
			limit?: number
			offset?: number
			orderBy?: string
			orderDirection?: "asc" | "desc"
		} = {},
	): Promise<Database[T][]> {
		try {
			if (!criteria || typeof criteria !== "object") {
				throw new ValidationError(
					"Valid criteria object is required",
					"Please provide a valid criteria object for searching",
				)
			}

			let query = this.db.selectFrom(this.tableName).selectAll()

			// Apply soft delete filter if enabled
			if (this.options.enableSoftDelete) {
				query = query.where("status" as any, "!=", "deleted")
			}

			// Apply criteria
			Object.entries(criteria).forEach(([key, value]) => {
				query = query.where(key as any, "=", value)
			})

			// Apply ordering
			if (options.orderBy) {
				query = query.orderBy(options.orderBy as any, options.orderDirection || "asc")
			}

			// Apply pagination
			if (options.limit) {
				query = query.limit(options.limit)
			}
			if (options.offset) {
				query = query.offset(options.offset)
			}

			const results = await query.execute()
			return results as unknown as Database[T][]
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to find ${String(this.tableName)} records: ${error instanceof Error ? error.message : "Unknown error"}`,
				"FIND_BY_ERROR",
				"Please check your criteria and try again",
			)
		}
	}

	/**
	 * Find single record by criteria
	 */
	async findOneBy(criteria: Record<string, unknown>): Promise<Database[T] | null> {
		try {
			const results = await this.findBy(criteria, { limit: 1 })
			return results.length > 0 ? results[0] : null
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to find ${String(this.tableName)} record: ${error instanceof Error ? error.message : "Unknown error"}`,
				"FIND_ONE_BY_ERROR",
				"Please check your criteria and try again",
			)
		}
	}

	/**
	 * Count records by criteria
	 */
	async count(criteria: Record<string, unknown> = {}): Promise<number> {
		try {
			let query = this.db.selectFrom(this.tableName).select((eb: any) => eb.fn.count("id").as("count"))

			// Apply soft delete filter if enabled
			if (this.options.enableSoftDelete) {
				query = query.where("status" as any, "!=", "deleted")
			}

			// Apply criteria
			Object.entries(criteria).forEach(([key, value]) => {
				query = query.where(key as any, "=", value)
			})

			const result = await query.executeTakeFirst()
			return Number((result as any)?.count) || 0
		} catch (error) {
			throw new NOORMError(
				`Failed to count ${String(this.tableName)} records: ${error instanceof Error ? error.message : "Unknown error"}`,
				"COUNT_ERROR",
				"Please check your criteria and try again",
			)
		}
	}

	/**
	 * Check if record exists by criteria
	 */
	async exists(criteria: Record<string, unknown>): Promise<boolean> {
		try {
			const count = await this.count(criteria)
			return count > 0
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to check existence of ${String(this.tableName)} record: ${error instanceof Error ? error.message : "Unknown error"}`,
				"EXISTS_ERROR",
				"Please check your criteria and try again",
			)
		}
	}

	/**
	 * Search records with pagination using query builder
	 */
	async search(searchOptions: SearchOptions): Promise<{
		data: Database[T][]
		pagination: {
			page: number
			limit: number
			total: number
			pages: number
			hasNext: boolean
			hasPrev: boolean
		}
	}> {
		if (!this.queryBuilder) {
			throw new NOORMError(
				"Query builder not available",
				"QUERY_BUILDER_NOT_AVAILABLE",
				"Please ensure the query builder is properly initialized",
			)
		}

		const queryBuilder = this.queryBuilder.create(this.tableName)
		return await queryBuilder.search(searchOptions.searchTerm, searchOptions.searchFields as any, {
			page: (searchOptions as any).page || 1,
			limit: searchOptions.limit || 20,
		})
	}

	/**
	 * Get paginated results using query builder
	 */
	async paginate(
		options: PaginationOptions,
		criteria?: Record<string, unknown>,
	): Promise<{
		data: Database[T][]
		pagination: {
			page: number
			limit: number
			total: number
			pages: number
			hasNext: boolean
			hasPrev: boolean
		}
	}> {
		if (!this.queryBuilder) {
			throw new NOORMError(
				"Query builder not available",
				"QUERY_BUILDER_NOT_AVAILABLE",
				"Please ensure the query builder is properly initialized",
			)
		}

		const queryBuilder = this.queryBuilder.create(this.tableName)
		return await queryBuilder.findWithPagination(options, criteria)
	}

	/**
	 * Get recent records using query builder
	 */
	async getRecent(days: number = 30, limit: number = 100): Promise<Database[T][]> {
		if (!this.queryBuilder) {
			// Fallback to basic query
			return await this.findBy(
				{},
				{
					limit,
					orderBy: "createdAt",
					orderDirection: "desc",
				},
			)
		}

		const queryBuilder = this.queryBuilder.create(this.tableName)
		return await queryBuilder.getRecent(days, limit)
	}

	/**
	 * Bulk update records
	 */
	async bulkUpdate(updates: Array<{ id: string; data: Partial<Database[T]> }>): Promise<Database[T][]> {
		try {
			if (!updates || updates.length === 0) {
				throw new ValidationError("No updates provided", "Please provide at least one update to process")
			}

			const results: Database[T][] = []
			const now = new Date()

			// Process updates in transaction
			await this.db.transaction().execute(async (trx) => {
				for (const update of updates) {
					const updateData = {
						...update.data,
						updatedAt: now.toISOString(),
					}

					const result = await trx
						.updateTable(this.tableName)
						.set(updateData as any)
						.where("id" as any, "=", update.id)
						.returningAll()
						.executeTakeFirst()

					if (result) {
						results.push(result as unknown as Database[T])
					}
				}
			})

			// Audit log if enabled
			if (this.options.auditLog) {
				for (const update of updates) {
					await this.logAudit("BULK_UPDATE", update.id, update.data)
				}
			}

			// Invalidate cache
			if (this.cache) {
				await this.invalidateRelatedCache()
			}

			return results
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to bulk update ${String(this.tableName)} records: ${error instanceof Error ? error.message : "Unknown error"}`,
				"BULK_UPDATE_ERROR",
				"Please check your update data and try again",
			)
		}
	}

	/**
	 * Log audit entry
	 */
	protected async logAudit(action: string, resourceId: string, details: unknown): Promise<void> {
		try {
			if (!this.options.auditLog) {
				return
			}

			const auditData = {
				id: this.generateId(),
				action,
				resourceType: String(this.tableName),
				resourceId,
				details: JSON.stringify(details),
				createdAt: new Date().toISOString(),
			}

			await this.db
				.insertInto("audit_logs")
				.values(auditData as any)
				.execute()
		} catch (error) {
			// Don't throw error for audit logging failures
			console.error("Failed to log audit entry:", error)
		}
	}

	/**
	 * Invalidate cache for specific record
	 */
	protected async invalidateCacheForRecord(id: string): Promise<void> {
		if (!this.cache) {
			return
		}

		const keys = [`findById:${id}`, `findBy:*`, `count:*`, `exists:*`]

		for (const key of keys) {
			await this.cache.delete(key)
		}
	}

	/**
	 * Invalidate all related cache entries
	 */
	protected async invalidateRelatedCache(): Promise<void> {
		if (!this.cache) {
			return
		}

		await this.cache.clear()
	}
}

/**
 * User Repository with specialized methods
 */
export class UserRepository extends BaseRepository<"users"> {
	constructor(db: Kysely<Database>, cacheInstance?: QueryCache) {
		super("users", db, {
			enableSoftDelete: true,
			auditLog: true,
			cache: true,
			cacheInstance,
		})
	}

	/**
	 * Find user by email
	 */
	async findByEmail(email: string): Promise<Database["users"] | null> {
		try {
			if (!email || typeof email !== "string" || email.trim() === "") {
				throw new ValidationError("Valid email is required", "Please provide a valid email address")
			}

			return await this.findOneBy({ email: email.toLowerCase() })
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to find user by email: ${error instanceof Error ? error.message : "Unknown error"}`,
				"FIND_BY_EMAIL_ERROR",
				"Please check the email address and try again",
			)
		}
	}

	/**
	 * Find active users
	 */
	async findActiveUsers(limit: number = 100): Promise<Database["users"][]> {
		return await this.findBy({ status: "active" }, { limit, orderBy: "createdAt", orderDirection: "desc" })
	}

	/**
	 * Update user last login
	 */
	async updateLastLogin(id: string, ipAddress?: string): Promise<Database["users"]> {
		const updateData: any = {
			lastLoginAt: new Date().toISOString(),
		}

		if (ipAddress) {
			updateData.lastLoginIp = ipAddress
		}

		return await this.update(id, updateData)
	}

	/**
	 * Validate user data
	 */
	protected async validateData(data: Partial<Database["users"]>, operation: "create" | "update"): Promise<void> {
		const errors: ValidationErrorDetail[] = []

		if (operation === "create") {
			if (!data.email || typeof data.email !== "string") {
				errors.push({ field: "email", message: "Email is required" })
			} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
				errors.push({ field: "email", message: "Invalid email format" })
			}

			if (!data.name || typeof data.name !== "string" || data.name.trim() === "") {
				errors.push({ field: "name", message: "Name is required" })
			}
		}

		if (data.email && typeof data.email === "string") {
			// Check for duplicate email
			const existingUser = await this.findByEmail(data.email)
			if (existingUser && existingUser.id !== (data as any).id) {
				errors.push({ field: "email", message: "Email already exists" })
			}
		}

		if (errors.length > 0) {
			throw new ValidationError(
				`Validation failed: ${errors.map((e) => e.message).join(", ")}`,
				"Please fix the validation errors and try again",
			)
		}
	}
}

/**
 * Subscription Repository with specialized methods
 */
export class SubscriptionRepository extends BaseRepository<"subscriptions"> {
	constructor(db: Kysely<Database>, cacheInstance?: QueryCache) {
		super("subscriptions", db, {
			enableSoftDelete: true,
			auditLog: true,
			cache: true,
			cacheInstance,
		})
	}

	/**
	 * Find active subscriptions for user
	 */
	async findActiveByUserId(userId: string): Promise<Database["subscriptions"][]> {
		return await this.findBy({ userId, status: "active" }, { orderBy: "createdAt", orderDirection: "desc" })
	}

	/**
	 * Find subscription by user and plan
	 */
	async findByUserAndPlan(userId: string, planId: string): Promise<Database["subscriptions"] | null> {
		return await this.findOneBy({ userId, planId })
	}

	/**
	 * Cancel subscription
	 */
	async cancel(id: string): Promise<Database["subscriptions"]> {
		return await this.update(id, {
			status: "canceled",
			canceledAt: new Date().toISOString(),
		})
	}

	/**
	 * Validate subscription data
	 */
	protected async validateData(data: Partial<Database["subscriptions"]>, operation: "create" | "update"): Promise<void> {
		const errors: ValidationErrorDetail[] = []

		if (operation === "create") {
			if (!data.userId || typeof data.userId !== "string") {
				errors.push({ field: "userId", message: "User ID is required" })
			}

			if (!data.planId || typeof data.planId !== "string") {
				errors.push({ field: "planId", message: "Plan ID is required" })
			}
		}

		if (errors.length > 0) {
			throw new ValidationError(
				`Validation failed: ${errors.map((e) => e.message).join(", ")}`,
				"Please fix the validation errors and try again",
			)
		}
	}
}

/**
 * Payment Repository with specialized methods
 */
export class PaymentRepository extends BaseRepository<"payments"> {
	constructor(db: Kysely<Database>, cacheInstance?: QueryCache) {
		super("payments", db, {
			enableSoftDelete: false,
			auditLog: true,
			cache: true,
			cacheInstance,
		})
	}

	/**
	 * Find payments by user
	 */
	async findByUserId(userId: string, limit: number = 50): Promise<Database["payments"][]> {
		return await this.findBy({ userId }, { limit, orderBy: "createdAt", orderDirection: "desc" })
	}

	/**
	 * Find successful payments
	 */
	async findSuccessful(limit: number = 100): Promise<Database["payments"][]> {
		return await this.findBy({ status: "succeeded" }, { limit, orderBy: "createdAt", orderDirection: "desc" })
	}

	/**
	 * Get total revenue
	 */
	async getTotalRevenue(): Promise<number> {
		try {
			const result = await this.db
				.selectFrom("payments")
				.select((eb: any) => eb.fn.sum("amount").as("total"))
				.where("status" as any, "=", "succeeded")
				.executeTakeFirst()

			return Number((result as any)?.total) || 0
		} catch (error) {
			throw new NOORMError(
				`Failed to get total revenue: ${error instanceof Error ? error.message : "Unknown error"}`,
				"GET_REVENUE_ERROR",
				"Please try again later",
			)
		}
	}

	/**
	 * Validate payment data
	 */
	protected async validateData(data: Partial<Database["payments"]>, operation: "create" | "update"): Promise<void> {
		const errors: ValidationErrorDetail[] = []

		if (operation === "create") {
			if (!data.userId || typeof data.userId !== "string") {
				errors.push({ field: "userId", message: "User ID is required" })
			}

			if (!data.amount || typeof data.amount !== "number" || data.amount <= 0) {
				errors.push({ field: "amount", message: "Valid amount is required" })
			}

			if (!data.currency || typeof data.currency !== "string") {
				errors.push({ field: "currency", message: "Currency is required" })
			}
		}

		if (errors.length > 0) {
			throw new ValidationError(
				`Validation failed: ${errors.map((e) => e.message).join(", ")}`,
				"Please fix the validation errors and try again",
			)
		}
	}
}
