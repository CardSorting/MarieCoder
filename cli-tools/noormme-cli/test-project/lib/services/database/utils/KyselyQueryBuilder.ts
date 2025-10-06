/**
 * Kysely Query Builder Utilities
 * Enhanced query building utilities for Kysely with SQLite optimizations
 * Following NOORMME service layer pattern with reusable query components
 */

import { InsertQueryBuilder, Kysely, SelectQueryBuilder, UpdateQueryBuilder } from "kysely"

export interface QueryOptions {
	limit?: number
	offset?: number
	orderBy?: Array<{ column: string; direction: "asc" | "desc" }>
	where?: Record<string, any>
	include?: string[]
	exclude?: string[]
}

export interface PaginationOptions {
	page: number
	pageSize: number
	totalCount?: number
}

export interface QueryResult<T> {
	data: T[]
	pagination?: {
		page: number
		pageSize: number
		totalCount: number
		totalPages: number
		hasNext: boolean
		hasPrevious: boolean
	}
}

export class KyselyQueryBuilder {
	/**
	 * Build a paginated select query
	 */
	static buildPaginatedSelect<T, K extends keyof T>(
		query: SelectQueryBuilder<T, K, any>,
		options: PaginationOptions,
	): SelectQueryBuilder<T, K, any> {
		const { page, pageSize } = options
		const offset = (page - 1) * pageSize

		return query.limit(pageSize).offset(offset)
	}

	/**
	 * Build a filtered select query
	 */
	static buildFilteredSelect<T, K extends keyof T>(
		query: SelectQueryBuilder<T, K, any>,
		filters: Record<string, any>,
	): SelectQueryBuilder<T, K, any> {
		let filteredQuery = query

		for (const [key, value] of Object.entries(filters)) {
			if (value !== undefined && value !== null && value !== "") {
				if (Array.isArray(value)) {
					filteredQuery = filteredQuery.where(key as any, "in", value)
				} else if (typeof value === "string" && value.includes("%")) {
					filteredQuery = filteredQuery.where(key as any, "like", value)
				} else {
					filteredQuery = filteredQuery.where(key as any, "=", value)
				}
			}
		}

		return filteredQuery
	}

	/**
	 * Build an ordered select query
	 */
	static buildOrderedSelect<T, K extends keyof T>(
		query: SelectQueryBuilder<T, K, any>,
		orderBy: Array<{ column: string; direction: "asc" | "desc" }>,
	): SelectQueryBuilder<T, K, any> {
		let orderedQuery = query

		for (const order of orderBy) {
			orderedQuery = orderedQuery.orderBy(order.column as any, order.direction)
		}

		return orderedQuery
	}

	/**
	 * Build a search query with multiple columns
	 */
	static buildSearchQuery<T, K extends keyof T>(
		query: SelectQueryBuilder<T, K, any>,
		searchTerm: string,
		searchColumns: string[],
	): SelectQueryBuilder<T, K, any> {
		if (!searchTerm || searchColumns.length === 0) {
			return query
		}

		const searchPattern = `%${searchTerm}%`
		let searchQuery = query

		// Build OR conditions for search
		const searchConditions = searchColumns.map((column) => `${column} LIKE ?`).join(" OR ")

		// Use raw SQL for complex search conditions
		searchQuery = searchQuery.where((eb) => eb.or(searchColumns.map((column) => eb(column as any, "like", searchPattern))))

		return searchQuery
	}

	/**
	 * Build a date range query
	 */
	static buildDateRangeQuery<T, K extends keyof T>(
		query: SelectQueryBuilder<T, K, any>,
		dateColumn: string,
		startDate?: Date,
		endDate?: Date,
	): SelectQueryBuilder<T, K, any> {
		let dateQuery = query

		if (startDate) {
			dateQuery = dateQuery.where(dateColumn as any, ">=", startDate)
		}

		if (endDate) {
			dateQuery = dateQuery.where(dateColumn as any, "<=", endDate)
		}

		return dateQuery
	}

	/**
	 * Build a soft delete query
	 */
	static buildSoftDeleteQuery<T, K extends keyof T>(
		query: SelectQueryBuilder<T, K, any>,
		deletedAtColumn: string = "deletedAt",
	): SelectQueryBuilder<T, K, any> {
		return query.where(deletedAtColumn as any, "is", null)
	}

	/**
	 * Build an upsert query (INSERT OR REPLACE)
	 */
	static buildUpsertQuery<T, K extends keyof T>(
		query: InsertQueryBuilder<T, K, any>,
		conflictColumns: string[],
	): InsertQueryBuilder<T, K, any> {
		// SQLite doesn't support ON CONFLICT, so we use INSERT OR REPLACE
		return query.onConflict((oc) => conflictColumns.reduce((acc, column) => acc.column(column as any), oc))
	}

	/**
	 * Build a batch insert query
	 */
	static buildBatchInsert<T, K extends keyof T>(
		query: InsertQueryBuilder<T, K, any>,
		values: Partial<T>[],
	): InsertQueryBuilder<T, K, any> {
		return query.values(values)
	}

	/**
	 * Build a conditional update query
	 */
	static buildConditionalUpdate<T, K extends keyof T>(
		query: UpdateQueryBuilder<T, K, any>,
		conditions: Record<string, any>,
	): UpdateQueryBuilder<T, K, any> {
		let conditionalQuery = query

		for (const [key, value] of Object.entries(conditions)) {
			if (value !== undefined && value !== null) {
				conditionalQuery = conditionalQuery.where(key as any, "=", value)
			}
		}

		return conditionalQuery
	}

	/**
	 * Build a soft delete update query
	 */
	static buildSoftDeleteUpdate<T, K extends keyof T>(
		query: UpdateQueryBuilder<T, K, any>,
		deletedAtColumn: string = "deletedAt",
	): UpdateQueryBuilder<T, K, any> {
		return query.set({ [deletedAtColumn]: new Date() } as any)
	}

	/**
	 * Execute a query with retry logic
	 */
	static async executeWithRetry<T>(queryFn: () => Promise<T>, maxRetries: number = 3, delay: number = 1000): Promise<T> {
		let lastError: Error

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await queryFn()
			} catch (error) {
				lastError = error as Error

				if (attempt === maxRetries) {
					throw lastError
				}

				// Wait before retry
				await new Promise((resolve) => setTimeout(resolve, delay * attempt))
			}
		}

		throw lastError!
	}

	/**
	 * Build a transaction with automatic retry
	 */
	static async executeTransactionWithRetry<T>(
		db: Kysely<any>,
		callback: (trx: Kysely<any>) => Promise<T>,
		maxRetries: number = 3,
	): Promise<T> {
		return KyselyQueryBuilder.executeWithRetry(() => db.transaction().execute(callback), maxRetries)
	}

	/**
	 * Build a query with performance monitoring
	 */
	static async executeWithMonitoring<T>(queryFn: () => Promise<T>, queryName: string): Promise<T> {
		const startTime = Date.now()

		try {
			const result = await queryFn()
			const duration = Date.now() - startTime

			if (duration > 1000) {
				// Log slow queries
				console.warn(`Slow query detected: ${queryName} took ${duration}ms`)
			}

			return result
		} catch (error) {
			const duration = Date.now() - startTime
			console.error(`Query failed: ${queryName} after ${duration}ms`, error)
			throw error
		}
	}

	/**
	 * Build a query with caching
	 */
	static async executeWithCache<T>(
		queryFn: () => Promise<T>,
		cacheKey: string,
		ttl: number = 300000, // 5 minutes
	): Promise<T> {
		// Simple in-memory cache implementation
		// In production, use Redis or similar
		const cache = new Map<string, { data: T; expires: number }>()

		const cached = cache.get(cacheKey)
		if (cached && cached.expires > Date.now()) {
			return cached.data
		}

		const result = await queryFn()
		cache.set(cacheKey, {
			data: result,
			expires: Date.now() + ttl,
		})

		return result
	}

	/**
	 * Build a query with connection pooling
	 */
	static async executeWithConnection<T>(db: Kysely<any>, queryFn: (connection: Kysely<any>) => Promise<T>): Promise<T> {
		// In a real implementation, this would manage connection pooling
		// For now, we'll just execute the query directly
		return queryFn(db)
	}

	/**
	 * Build a query with automatic pagination
	 */
	static async executePaginated<T>(
		query: SelectQueryBuilder<any, any, any>,
		options: PaginationOptions,
	): Promise<QueryResult<T>> {
		const { page, pageSize } = options

		// Get total count
		const countQuery = query.select((eb) => eb.fn.countAll().as("count"))
		const countResult = await countQuery.execute()
		const totalCount = Number(countResult[0]?.count || 0)

		// Get paginated data
		const paginatedQuery = KyselyQueryBuilder.buildPaginatedSelect(query, options)
		const data = (await paginatedQuery.execute()) as T[]

		const totalPages = Math.ceil(totalCount / pageSize)

		return {
			data,
			pagination: {
				page,
				pageSize,
				totalCount,
				totalPages,
				hasNext: page < totalPages,
				hasPrevious: page > 1,
			},
		}
	}
}
