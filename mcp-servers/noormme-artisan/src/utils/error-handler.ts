/**
 * Error Handler Utilities
 * Centralized error handling for NOORMME Artisan commands
 */

export interface ErrorContext {
	command?: string
	operation?: string
	timestamp?: Date
	userId?: string
	projectPath?: string
	additionalData?: Record<string, any>
}

export interface ErrorDetails {
	code: string
	message: string
	actionable?: string
	context?: ErrorContext
	originalError?: Error
}

export class ArtisanError extends Error {
	public readonly code: string
	public readonly actionable?: string
	public readonly context?: ErrorContext
	public readonly originalError?: Error

	constructor(details: ErrorDetails) {
		super(details.message)
		this.name = "ArtisanError"
		this.code = details.code
		this.actionable = details.actionable
		this.context = details.context
		this.originalError = details.originalError

		// Maintain proper stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ArtisanError)
		}
	}

	/**
	 * Get formatted error message for user
	 */
	getUserMessage(): string {
		let message = this.message

		if (this.actionable) {
			message += `\n\nActionable: ${this.actionable}`
		}

		return message
	}

	/**
	 * Get error details for logging
	 */
	getErrorDetails(): ErrorDetails {
		return {
			code: this.code,
			message: this.message,
			actionable: this.actionable,
			context: this.context,
			originalError: this.originalError,
		}
	}
}

export class ValidationError extends ArtisanError {
	constructor(message: string, actionable?: string, context?: ErrorContext) {
		super({
			code: "VALIDATION_ERROR",
			message,
			actionable,
			context,
		})
		this.name = "ValidationError"
	}
}

export class FileSystemError extends ArtisanError {
	constructor(message: string, actionable?: string, context?: ErrorContext, originalError?: Error) {
		super({
			code: "FILESYSTEM_ERROR",
			message,
			actionable,
			context,
			originalError,
		})
		this.name = "FileSystemError"
	}
}

export class ProjectError extends ArtisanError {
	constructor(message: string, actionable?: string, context?: ErrorContext, originalError?: Error) {
		super({
			code: "PROJECT_ERROR",
			message,
			actionable,
			context,
			originalError,
		})
		this.name = "ProjectError"
	}
}

export class DatabaseError extends ArtisanError {
	constructor(message: string, actionable?: string, context?: ErrorContext, originalError?: Error) {
		super({
			code: "DATABASE_ERROR",
			message,
			actionable,
			context,
			originalError,
		})
		this.name = "DatabaseError"
	}
}

export class TemplateError extends ArtisanError {
	constructor(message: string, actionable?: string, context?: ErrorContext, originalError?: Error) {
		super({
			code: "TEMPLATE_ERROR",
			message,
			actionable,
			context,
			originalError,
		})
		this.name = "TemplateError"
	}
}

export class CommandError extends ArtisanError {
	constructor(message: string, actionable?: string, context?: ErrorContext, originalError?: Error) {
		super({
			code: "COMMAND_ERROR",
			message,
			actionable,
			context,
			originalError,
		})
		this.name = "CommandError"
	}
}

export class ErrorHandler {
	private static instance: ErrorHandler
	private errorLog: ErrorDetails[] = []

	private constructor() {}

	static getInstance(): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler()
		}
		return ErrorHandler.instance
	}

	/**
	 * Handle and format errors
	 */
	handleError(error: unknown, context?: Partial<ErrorContext>): ArtisanError {
		let artisanError: ArtisanError

		if (error instanceof ArtisanError) {
			artisanError = error
		} else if (error instanceof Error) {
			artisanError = this.createArtisanError(error, context)
		} else {
			artisanError = new ArtisanError({
				code: "UNKNOWN_ERROR",
				message: String(error),
				context: this.createErrorContext(context),
			})
		}

		// Log error
		this.logError(artisanError.getErrorDetails())

		return artisanError
	}

	/**
	 * Create ArtisanError from generic Error
	 */
	private createArtisanError(error: Error, context?: Partial<ErrorContext>): ArtisanError {
		const errorContext = this.createErrorContext(context)

		// Determine error type based on error message or name
		if (error.message.includes("ENOENT") || error.message.includes("file") || error.message.includes("directory")) {
			return new FileSystemError(
				error.message,
				"Check that the file or directory exists and you have proper permissions",
				errorContext,
				error,
			)
		}

		if (error.message.includes("permission") || error.message.includes("EACCES")) {
			return new FileSystemError(
				"Permission denied",
				"Check that you have write permissions for the target directory",
				errorContext,
				error,
			)
		}

		if (error.message.includes("database") || error.message.includes("SQL")) {
			return new DatabaseError(error.message, "Check your database connection and configuration", errorContext, error)
		}

		if (error.message.includes("template") || error.message.includes("render")) {
			return new TemplateError(error.message, "Check your template syntax and variables", errorContext, error)
		}

		if (error.message.includes("validation") || error.message.includes("invalid")) {
			return new ValidationError(error.message, "Check your input parameters and try again", errorContext)
		}

		// Default to generic ArtisanError
		return new ArtisanError({
			code: "GENERIC_ERROR",
			message: error.message,
			context: errorContext,
			originalError: error,
		})
	}

	/**
	 * Create error context
	 */
	private createErrorContext(context?: Partial<ErrorContext>): ErrorContext {
		return {
			command: context?.command || "unknown",
			operation: context?.operation || "unknown",
			timestamp: new Date(),
			userId: context?.userId,
			projectPath: context?.projectPath || process.cwd(),
			additionalData: context?.additionalData,
		}
	}

	/**
	 * Log error details
	 */
	private logError(errorDetails: ErrorDetails): void {
		this.errorLog.push(errorDetails)

		// Log to console in development
		if (process.env.NODE_ENV === "development") {
			console.error("Artisan Error:", {
				code: errorDetails.code,
				message: errorDetails.message,
				actionable: errorDetails.actionable,
				context: errorDetails.context,
				stack: errorDetails.originalError?.stack,
			})
		}
	}

	/**
	 * Get error log
	 */
	getErrorLog(): ErrorDetails[] {
		return [...this.errorLog]
	}

	/**
	 * Clear error log
	 */
	clearErrorLog(): void {
		this.errorLog = []
	}

	/**
	 * Get error statistics
	 */
	getErrorStats(): { total: number; byCode: Record<string, number> } {
		const byCode: Record<string, number> = {}

		for (const error of this.errorLog) {
			byCode[error.code] = (byCode[error.code] || 0) + 1
		}

		return {
			total: this.errorLog.length,
			byCode,
		}
	}
}

/**
 * Error handling decorator for command handlers
 */
export function withErrorHandling<T extends any[], R>(
	commandName: string,
	operation: string,
	handler: (...args: T) => Promise<R>,
) {
	return async (...args: T): Promise<R> => {
		const errorHandler = ErrorHandler.getInstance()

		try {
			return await handler(...args)
		} catch (error) {
			const artisanError = errorHandler.handleError(error, {
				command: commandName,
				operation,
			})
			throw artisanError
		}
	}
}

/**
 * Validation error factory
 */
export function createValidationError(field: string, message: string, context?: Partial<ErrorContext>): ValidationError {
	return new ValidationError(
		`Validation failed for field "${field}": ${message}`,
		"Please check your input and try again",
		context,
	)
}

/**
 * File system error factory
 */
export function createFileSystemError(
	operation: string,
	path: string,
	originalError?: Error,
	context?: Partial<ErrorContext>,
): FileSystemError {
	let message = `File system operation failed: ${operation}`
	let actionable = "Check file permissions and path validity"

	if (originalError) {
		if (originalError.message.includes("ENOENT")) {
			message = `File or directory not found: ${path}`
			actionable = "Check that the file or directory exists"
		} else if (originalError.message.includes("EACCES")) {
			message = `Permission denied: ${path}`
			actionable = "Check that you have read/write permissions"
		} else if (originalError.message.includes("EEXIST")) {
			message = `File or directory already exists: ${path}`
			actionable = "Use --force flag to overwrite existing files"
		}
	}

	return new FileSystemError(message, actionable, context, originalError)
}

/**
 * Project error factory
 */
export function createProjectError(message: string, actionable?: string, context?: Partial<ErrorContext>): ProjectError {
	return new ProjectError(message, actionable || "Check your project configuration", context)
}

/**
 * Database error factory
 */
export function createDatabaseError(operation: string, originalError?: Error, context?: Partial<ErrorContext>): DatabaseError {
	let message = `Database operation failed: ${operation}`
	let actionable = "Check your database connection and configuration"

	if (originalError) {
		if (originalError.message.includes("SQLITE_CANTOPEN")) {
			message = "Cannot open database file"
			actionable = "Check database file path and permissions"
		} else if (originalError.message.includes("SQLITE_BUSY")) {
			message = "Database is busy"
			actionable = "Wait a moment and try again"
		} else if (originalError.message.includes("SQLITE_CONSTRAINT")) {
			message = "Database constraint violation"
			actionable = "Check your data for constraint violations"
		}
	}

	return new DatabaseError(message, actionable, context, originalError)
}

/**
 * Template error factory
 */
export function createTemplateError(templateName: string, originalError?: Error, context?: Partial<ErrorContext>): TemplateError {
	let message = `Template processing failed: ${templateName}`
	let actionable = "Check template syntax and variables"

	if (originalError) {
		if (originalError.message.includes("variable")) {
			message = `Template variable error: ${templateName}`
			actionable = "Check that all required template variables are provided"
		} else if (originalError.message.includes("syntax")) {
			message = `Template syntax error: ${templateName}`
			actionable = "Check template syntax and formatting"
		}
	}

	return new TemplateError(message, actionable, context, originalError)
}

/**
 * Command error factory
 */
export function createCommandError(
	commandName: string,
	message: string,
	actionable?: string,
	context?: Partial<ErrorContext>,
): CommandError {
	return new CommandError(
		`Command "${commandName}" failed: ${message}`,
		actionable || "Check command syntax and parameters",
		context,
	)
}
