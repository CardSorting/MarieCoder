/**
 * Enhanced Query Builder for NOORMME SAAS
 * Following NORMIE DEV methodology - leveraging Kysely's full capabilities
 */

import { Kysely } from "kysely"
import { Database } from "@/types/database"
import { QueryCache } from "./cache"
import { NOORMError, ValidationError } from "./errors"

// Re-export Kysely types for convenience
export type { Kysely }

export interface QueryOptions {
	limit?: number
	offset?: number
	orderBy?: string
	orderDirection?: "asc" | "desc"
	select?: string[]
}

export interface PaginationOptions {
	page: number
	limit: number
}

export interface SearchOptions extends QueryOptions {
	searchFields: string[]
	searchTerm: string
}

export interface FilterOptions {
	[key: string]: string | number | boolean | Date | null
}

export interface PaginationResult<T> {
	data: T[]
	pagination: {
		page: number
		limit: number
		total: number
		pages: number
		hasNext: boolean
		hasPrev: boolean
	}
}

/**
 * Enhanced Query Builder that leverages Kysely's full capabilities
 * Following NORMIE DEV methodology - clean, type-safe, performant
 */
export class QueryBuilder<T extends keyof Database> {
	private db: Kysely<Database>
	private table: T
	private cache?: QueryCache

	constructor(db: Kysely<Database>, table: T, cache?: QueryCache) {
		this.db = db
		this.table = table
		this.cache = cache
	}

	/**
	 * Get a fresh SelectQueryBuilder for the table
	 */
	select() {
		try {
			return this.db.selectFrom(this.table).selectAll()
		} catch (error) {
			throw new NOORMError(
				`Failed to create select query: ${error instanceof Error ? error.message : "Unknown error"}`,
				"SELECT_QUERY_ERROR",
				"Please check your table name and try again",
			)
		}
	}

	/**
	 * Get InsertQueryBuilder for the table
	 */
	insert() {
		try {
			return this.db.insertInto(this.table)
		} catch (error) {
			throw new NOORMError(
				`Failed to create insert query: ${error instanceof Error ? error.message : "Unknown error"}`,
				"INSERT_QUERY_ERROR",
				"Please check your table name and try again",
			)
		}
	}

	/**
	 * Get UpdateQueryBuilder for the table
	 */
	update() {
		try {
			return this.db.updateTable(this.table)
		} catch (error) {
			throw new NOORMError(
				`Failed to create update query: ${error instanceof Error ? error.message : "Unknown error"}`,
				"UPDATE_QUERY_ERROR",
				"Please check your table name and try again",
			)
		}
	}

	/**
	 * Get DeleteQueryBuilder for the table
	 */
	delete() {
		try {
			return this.db.deleteFrom(this.table)
		} catch (error) {
			throw new NOORMError(
				`Failed to create delete query: ${error instanceof Error ? error.message : "Unknown error"}`,
				"DELETE_QUERY_ERROR",
				"Please check your table name and try again",
			)
		}
	}

	/**
	 * Find record by ID with caching
	 */
	async findById(id: string): Promise<Database[T] | null> {
		try {
			if (!id || typeof id !== "string" || id.trim() === "") {
				throw new ValidationError("Valid ID is required", "Please provide a valid record ID")
			}

			const cacheKey = `findById:${this.table}:${id}`

			// Check cache first
			if (this.cache) {
				const cached = this.cache.get<Database[T]>(cacheKey)
				if (cached) {
					return cached
				}
			}

			const result = await this.db
				.selectFrom(this.table)
				.selectAll()
				.where("id" as any, "=", id)
				.executeTakeFirst()

			// Cache result if found
			if (this.cache && result) {
				this.cache.set(cacheKey, result as unknown as Database[T])
			}

			return (result as unknown as Database[T]) || null
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to find ${String(this.table)} by ID: ${error instanceof Error ? error.message : "Unknown error"}`,
				"FIND_BY_ID_ERROR",
				"Please check the ID and try again",
			)
		}
	}

	/**
	 * Find records with pagination and caching
	 */
	async findWithPagination(
		options: PaginationOptions,
		whereConditions?: Record<string, any>,
	): Promise<PaginationResult<Database[T]>> {
		try {
			if (!options.page || options.page < 1) {
				throw new ValidationError("Page must be a positive integer", "Please provide a valid page number")
			}

			if (!options.limit || options.limit < 1 || options.limit > 1000) {
				throw new ValidationError("Limit must be between 1 and 1000", "Please provide a valid limit between 1 and 1000")
			}

			const offset = (options.page - 1) * options.limit
			const cacheKey = `findWithPagination:${this.table}:${JSON.stringify({ options, whereConditions })}`

			// Check cache first
			if (this.cache) {
				const cached = this.cache.get<PaginationResult<Database[T]>>(cacheKey)
				if (cached) {
					return cached
				}
			}

			// Build base query
			let dataQuery = this.db.selectFrom(this.table).selectAll()
			let countQuery = this.db.selectFrom(this.table).select((eb) => eb.fn.count("id").as("count"))

			// Apply where conditions
			if (whereConditions) {
				Object.entries(whereConditions).forEach(([key, value]) => {
					dataQuery = dataQuery.where(key as any, "=", value)
					countQuery = countQuery.where(key as any, "=", value)
				})
			}

			// Execute queries in parallel
			const [data, countResult] = await Promise.all([
				dataQuery.limit(options.limit).offset(offset).execute(),
				countQuery.executeTakeFirst(),
			])

			const total = Number(countResult?.count || 0)
			const pages = Math.ceil(total / options.limit)

			const result: PaginationResult<Database[T]> = {
				data: data as Database[T][],
				pagination: {
					page: options.page,
					limit: options.limit,
					total,
					pages,
					hasNext: options.page < pages,
					hasPrev: options.page > 1,
				},
			}

			// Cache result
			if (this.cache && data.length > 0) {
				this.cache.set(cacheKey, result)
			}

			return result
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to find ${String(this.table)} with pagination: ${error instanceof Error ? error.message : "Unknown error"}`,
				"FIND_WITH_PAGINATION_ERROR",
				"Please check your options and try again",
			)
		}
	}

	/**
	 * Search records with full-text search capabilities
	 */
	async search(
		searchTerm: string,
		fields: (keyof Database[T])[],
		options?: PaginationOptions,
	): Promise<PaginationResult<Database[T]>> {
		try {
			if (!searchTerm || typeof searchTerm !== "string" || searchTerm.trim() === "") {
				throw new ValidationError("Valid search term is required", "Please provide a non-empty search term")
			}

			if (!fields || fields.length === 0) {
				throw new ValidationError("Search fields are required", "Please provide at least one field to search")
			}

			const limit = options?.limit || 20
			const page = options?.page || 1
			const offset = (page - 1) * limit

			const cacheKey = `search:${this.table}:${searchTerm}:${JSON.stringify({ fields, options })}`

			// Check cache first
			if (this.cache) {
				const cached = this.cache.get<PaginationResult<Database[T]>>(cacheKey)
				if (cached) {
					return cached
				}
			}

			// Build search query using Kysely's expression builder
			const searchQuery = this.db
				.selectFrom(this.table)
				.selectAll()
				.where((eb) => eb.or(fields.map((field) => eb(field as any, "like", `%${searchTerm}%`))))

			// Build count query
			const countQuery = this.db
				.selectFrom(this.table)
				.select((eb) => eb.fn.count("id").as("count"))
				.where((eb) => eb.or(fields.map((field) => eb(field as any, "like", `%${searchTerm}%`))))

			// Execute queries in parallel
			const [data, countResult] = await Promise.all([
				searchQuery.limit(limit).offset(offset).execute(),
				countQuery.executeTakeFirst(),
			])

			const total = Number(countResult?.count || 0)
			const pages = Math.ceil(total / limit)

			const result: PaginationResult<Database[T]> = {
				data: data as Database[T][],
				pagination: {
					page,
					limit,
					total,
					pages,
					hasNext: page < pages,
					hasPrev: page > 1,
				},
			}

			// Cache result
			if (this.cache && data.length > 0) {
				this.cache.set(cacheKey, result)
			}

			return result
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to search ${String(this.table)}: ${error instanceof Error ? error.message : "Unknown error"}`,
				"SEARCH_ERROR",
				"Please check your search term and fields",
			)
		}
	}

	/**
	 * Count records with optional where conditions
	 */
	async count(whereConditions?: Record<string, any>): Promise<number> {
		try {
			const cacheKey = `count:${this.table}:${JSON.stringify(whereConditions || {})}`

			// Check cache first
			if (this.cache) {
				const cached = this.cache.get<number>(cacheKey)
				if (cached !== null) {
					return cached
				}
			}

			let query = this.db.selectFrom(this.table).select((eb) => eb.fn.count("id").as("count"))

			// Apply where conditions
			if (whereConditions) {
				Object.entries(whereConditions).forEach(([key, value]) => {
					query = query.where(key as any, "=", value)
				})
			}

			const result = await query.executeTakeFirst()
			const count = Number(result?.count || 0)

			// Cache result
			if (this.cache) {
				this.cache.set(cacheKey, count)
			}

			return count
		} catch (error) {
			throw new NOORMError(
				`Failed to count ${String(this.table)} records: ${error instanceof Error ? error.message : "Unknown error"}`,
				"COUNT_ERROR",
				"Please check your conditions and try again",
			)
		}
	}

	/**
	 * Check if record exists
	 */
	async exists(whereConditions: Record<string, any>): Promise<boolean> {
		try {
			if (!whereConditions || Object.keys(whereConditions).length === 0) {
				throw new ValidationError(
					"Where conditions are required for existence check",
					"Please provide at least one condition",
				)
			}

			const count = await this.count(whereConditions)
			return count > 0
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to check existence of ${String(this.table)} record: ${error instanceof Error ? error.message : "Unknown error"}`,
				"EXISTS_ERROR",
				"Please check your conditions and try again",
			)
		}
	}

	/**
	 * Get recent records
	 */
	async getRecent(days: number = 30, limit: number = 100): Promise<Database[T][]> {
		try {
			if (days < 1 || days > 365) {
				throw new ValidationError("Days must be between 1 and 365", "Please provide a valid number of days")
			}

			if (limit < 1 || limit > 1000) {
				throw new ValidationError("Limit must be between 1 and 1000", "Please provide a valid limit")
			}

			const date = new Date()
			date.setDate(date.getDate() - days)

			const cacheKey = `getRecent:${this.table}:${days}:${limit}`

			// Check cache first
			if (this.cache) {
				const cached = this.cache.get<Database[T][]>(cacheKey)
				if (cached) {
					return cached
				}
			}

			const results = await this.db
				.selectFrom(this.table)
				.selectAll()
				.where("createdAt" as any, ">=", date.toISOString())
				.orderBy("createdAt" as any, "desc")
				.limit(limit)
				.execute()

			// Cache results
			if (this.cache && results.length > 0) {
				this.cache.set(cacheKey, results as unknown as Database[T][])
			}

			return results as unknown as Database[T][]
		} catch (error) {
			if (error instanceof NOORMError) {
				throw error
			}
			throw new NOORMError(
				`Failed to get recent ${String(this.table)} records: ${error instanceof Error ? error.message : "Unknown error"}`,
				"GET_RECENT_ERROR",
				"Please check your parameters and try again",
			)
		}
	}

	/**
	 * Invalidate cache for this table
	 */
	invalidateCache(): void {
		if (!this.cache) {
			return
		}

		const patterns = [
			`findById:${this.table}:*`,
			`findWithPagination:${this.table}:*`,
			`search:${this.table}:*`,
			`count:${this.table}:*`,
			`getRecent:${this.table}:*`,
		]

		patterns.forEach((pattern) => {
			this.cache!.invalidatePattern(pattern)
		})
	}
}

/**
 * Query Builder Factory that leverages Kysely
 */
export class QueryBuilderFactory {
	constructor(
		private db: Kysely<Database>,
		private cache?: QueryCache,
	) {}

	/**
	 * Create query builder for specific table
	 */
	create<T extends keyof Database>(table: T): QueryBuilder<T> {
		return new QueryBuilder(this.db, table, this.cache)
	}

	/**
	 * Get raw Kysely instance for advanced queries
	 */
	getKysely(): Kysely<Database> {
		return this.db
	}

	/**
	 * Execute raw SQL with parameters
	 */
	async executeRaw<T = any>(sql: string, parameters?: any[]): Promise<T[]> {
		try {
			if (!sql || typeof sql !== "string") {
				throw new ValidationError("Valid SQL string is required", "Please provide a valid SQL query")
			}

			const result = await this.db.executeQuery({
				sql,
				parameters: parameters || [],
			} as any)

			return result.rows as T[]
		} catch (error) {
			throw new NOORMError(
				`Failed to execute raw SQL: ${error instanceof Error ? error.message : "Unknown error"}`,
				"RAW_SQL_ERROR",
				"Please check your SQL query and parameters",
			)
		}
	}

	/**
	 * Begin transaction
	 */
	async transaction<T>(callback: (trx: Kysely<Database>) => Promise<T>): Promise<T> {
		try {
			return await this.db.transaction().execute(callback)
		} catch (error) {
			throw new NOORMError(
				`Transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				"TRANSACTION_ERROR",
				"Please check your transaction logic and try again",
			)
		}
	}
}

/**
 * SAAS-specific query patterns using Kysely
 */
export class SAASQueryPatterns {
	constructor(private queryBuilder: QueryBuilderFactory) {}

	/**
	 * Get active users with proper typing
	 */
	getActiveUsers() {
		return this.queryBuilder.create("users").select().where("status", "=", "active").orderBy("createdAt", "desc")
	}

	/**
	 * Get user subscriptions
	 */
	getUserSubscriptions(userId: string) {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Valid user ID is required", "Please provide a valid user ID")
		}

		return this.queryBuilder
			.create("subscriptions")
			.select()
			.where("userId" as any, "=", userId)
			.where("status" as any, "=", "active")
			.orderBy("createdAt" as any, "desc")
	}

	/**
	 * Get recent payments
	 */
	getRecentPayments(days: number = 30) {
		if (days < 1 || days > 365) {
			throw new ValidationError("Days must be between 1 and 365", "Please provide a valid number of days")
		}

		const date = new Date()
		date.setDate(date.getDate() - days)

		return this.queryBuilder
			.create("payments")
			.select()
			.where("status" as any, "=", "succeeded")
			.where("createdAt" as any, ">=", date.toISOString())
			.orderBy("createdAt" as any, "desc")
	}

	/**
	 * Get unread notifications for user
	 */
	getUnreadNotifications(userId: string) {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Valid user ID is required", "Please provide a valid user ID")
		}

		return this.queryBuilder
			.create("notifications")
			.select()
			.where("userId", "=", userId)
			.where("isRead", "=", false)
			.orderBy("createdAt", "desc")
	}

	/**
	 * Search users with full-text search
	 */
	async searchUsers(searchTerm: string, options?: PaginationOptions) {
		if (!searchTerm || typeof searchTerm !== "string" || searchTerm.trim() === "") {
			throw new ValidationError("Valid search term is required", "Please provide a non-empty search term")
		}

		return this.queryBuilder.create("users").search(searchTerm, ["name", "email"], options)
	}

	/**
	 * Get admin audit logs
	 */
	getAuditLogs(adminId?: string) {
		const query = this.queryBuilder.create("audit_logs").select().orderBy("createdAt", "desc")

		if (adminId) {
			if (typeof adminId !== "string") {
				throw new ValidationError("Valid admin ID is required", "Please provide a valid admin ID")
			}
			query.where("adminId", "=", adminId)
		}

		return query
	}

	/**
	 * Get revenue analytics
	 */
	async getRevenueAnalytics(startDate: Date, endDate: Date) {
		if (!startDate || !endDate || !(startDate instanceof Date) || !(endDate instanceof Date)) {
			throw new ValidationError("Valid start and end dates are required", "Please provide valid Date objects")
		}

		if (startDate >= endDate) {
			throw new ValidationError("Start date must be before end date", "Please provide a valid date range")
		}

		return this.queryBuilder
			.getKysely()
			.selectFrom("payments")
			.select([
				"status",
				"currency",
				(eb) => eb.fn.sum("amount").as("totalAmount"),
				(eb) => eb.fn.count("id").as("paymentCount"),
			])
			.where("status", "=", "succeeded")
			.where("createdAt", ">=", startDate.toISOString())
			.where("createdAt", "<=", endDate.toISOString())
			.groupBy(["status", "currency"])
			.execute()
	}
}
