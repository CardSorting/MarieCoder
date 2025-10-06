/**
 * Enhanced Error Handling for NOORMME SAAS
 * Following NORMIE DEV methodology - clean, actionable error messages
 */

export class NOORMError extends Error {
	public readonly code: string
	public readonly actionable?: string
	public readonly timestamp: Date
	public readonly context?: Record<string, any>

	constructor(message: string, code: string, actionable?: string, context?: Record<string, any>) {
		super(message)
		this.name = "NOORMError"
		this.code = code
		this.actionable = actionable
		this.timestamp = new Date()
		this.context = context

		// Maintain proper stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, NOORMError)
		}
	}

	/**
	 * Convert error to JSON for logging
	 */
	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			actionable: this.actionable,
			timestamp: this.timestamp.toISOString(),
			context: this.context,
			stack: this.stack,
		}
	}

	/**
	 * Get user-friendly error message
	 */
	getUserMessage(): string {
		if (this.actionable) {
			return `${this.message}. ${this.actionable}`
		}
		return this.message
	}
}

/**
 * Database-specific errors
 */
export class DatabaseError extends NOORMError {
	constructor(message: string, actionable?: string, context?: Record<string, any>) {
		super(message, "DATABASE_ERROR", actionable, context)
		this.name = "DatabaseError"
	}
}

export class ValidationError extends NOORMError {
	constructor(message: string, actionable?: string, context?: Record<string, any>) {
		super(message, "VALIDATION_ERROR", actionable, context)
		this.name = "ValidationError"
	}
}

export class NotFoundError extends NOORMError {
	constructor(resource: string, id: string) {
		super(`${resource} with ID ${id} not found`, "NOT_FOUND", "Please check the ID and try again")
		this.name = "NotFoundError"
	}
}

export class DuplicateError extends NOORMError {
	constructor(resource: string, field: string, value: any) {
		super(
			`${resource} with ${field} '${value}' already exists`,
			"DUPLICATE_ERROR",
			"Please use a different value or update the existing record",
		)
		this.name = "DuplicateError"
	}
}

export class PermissionError extends NOORMError {
	constructor(action: string, resource: string) {
		super(
			`Permission denied: Cannot ${action} ${resource}`,
			"PERMISSION_ERROR",
			"Please check your permissions or contact an administrator",
		)
		this.name = "PermissionError"
	}
}

export class RateLimitError extends NOORMError {
	constructor(limit: number, window: string) {
		super(
			`Rate limit exceeded: ${limit} requests per ${window}`,
			"RATE_LIMIT_ERROR",
			"Please wait before making another request",
		)
		this.name = "RateLimitError"
	}
}

/**
 * Error handler utility
 */
export class ErrorHandler {
	/**
	 * Handle and format errors for API responses
	 */
	static handleError(error: unknown): {
		error: string
		code: string
		actionable?: string
		timestamp: string
	} {
		if (error instanceof NOORMError) {
			return {
				error: error.message,
				code: error.code,
				actionable: error.actionable,
				timestamp: error.timestamp.toISOString(),
			}
		}

		if (error instanceof Error) {
			return {
				error: error.message,
				code: "UNKNOWN_ERROR",
				actionable: "Please try again or contact support",
				timestamp: new Date().toISOString(),
			}
		}

		return {
			error: "An unexpected error occurred",
			code: "UNKNOWN_ERROR",
			actionable: "Please try again or contact support",
			timestamp: new Date().toISOString(),
		}
	}

	/**
	 * Log error with context
	 */
	static logError(error: unknown, context?: Record<string, any>): void {
		const errorInfo =
			error instanceof NOORMError
				? error.toJSON()
				: {
						name: error instanceof Error ? error.name : "Unknown",
						message: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined,
						context,
					}

		console.error("🚨 Error occurred:", errorInfo)
	}

	/**
	 * Check if error is a known error type
	 */
	static isKnownError(error: unknown): error is NOORMError {
		return error instanceof NOORMError
	}

	/**
	 * Retry logic for transient errors
	 */
	static async withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3, delay: number = 1000): Promise<T> {
		let lastError: unknown

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await operation()
			} catch (error) {
				lastError = error

				// Don't retry on validation or permission errors
				if (error instanceof ValidationError || error instanceof PermissionError) {
					throw error
				}

				if (attempt === maxRetries) {
					break
				}

				// Exponential backoff
				const waitTime = delay * 2 ** (attempt - 1)
				await new Promise((resolve) => setTimeout(resolve, waitTime))
			}
		}

		throw lastError
	}
}

/**
 * Error codes enum for consistency
 */
export const ErrorCodes = {
	// General errors
	UNKNOWN_ERROR: "UNKNOWN_ERROR",
	VALIDATION_ERROR: "VALIDATION_ERROR",
	NOT_FOUND: "NOT_FOUND",
	DUPLICATE_ERROR: "DUPLICATE_ERROR",
	PERMISSION_ERROR: "PERMISSION_ERROR",
	RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",

	// Database errors
	DATABASE_ERROR: "DATABASE_ERROR",
	CONNECTION_ERROR: "CONNECTION_ERROR",
	QUERY_ERROR: "QUERY_ERROR",
	TRANSACTION_ERROR: "TRANSACTION_ERROR",

	// Repository errors
	CREATE_ERROR: "CREATE_ERROR",
	CREATE_FAILED: "CREATE_FAILED",
	BULK_CREATE_ERROR: "BULK_CREATE_ERROR",
	BULK_CREATE_FAILED: "BULK_CREATE_FAILED",
	UPDATE_ERROR: "UPDATE_ERROR",
	DELETE_ERROR: "DELETE_ERROR",
	FIND_BY_ID_ERROR: "FIND_BY_ID_ERROR",
	INVALID_ID: "INVALID_ID",
	RECORD_NOT_FOUND: "RECORD_NOT_FOUND",

	// Cache errors
	CACHE_ERROR: "CACHE_ERROR",
	CACHE_MISS: "CACHE_MISS",

	// Authentication errors
	AUTH_ERROR: "AUTH_ERROR",
	TOKEN_EXPIRED: "TOKEN_EXPIRED",
	INVALID_TOKEN: "INVALID_TOKEN",

	// Business logic errors
	BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
	INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
	SUBSCRIPTION_EXPIRED: "SUBSCRIPTION_EXPIRED",
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
