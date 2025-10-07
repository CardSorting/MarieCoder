/**
 * Standardized error types for API operations
 */
export enum ApiErrorType {
	AUTHENTICATION = "AUTHENTICATION",
	AUTHORIZATION = "AUTHORIZATION",
	RATE_LIMIT = "RATE_LIMIT",
	QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
	INVALID_REQUEST = "INVALID_REQUEST",
	SERVER_ERROR = "SERVER_ERROR",
	NETWORK_ERROR = "NETWORK_ERROR",
	TIMEOUT = "TIMEOUT",
	UNKNOWN = "UNKNOWN",
}

/**
 * Standardized API error class
 */
export class ApiError extends Error {
	public readonly type: ApiErrorType
	public readonly statusCode?: number
	public readonly retryAfter?: number
	public readonly provider?: string
	public readonly originalError?: any

	constructor(
		message: string,
		type: ApiErrorType = ApiErrorType.UNKNOWN,
		options: {
			statusCode?: number
			retryAfter?: number
			provider?: string
			originalError?: any
		} = {},
	) {
		super(message)
		this.name = "ApiError"
		this.type = type
		this.statusCode = options.statusCode
		this.retryAfter = options.retryAfter
		this.provider = options.provider
		this.originalError = options.originalError
	}

	/**
	 * Check if error is retriable
	 */
	isRetriable(): boolean {
		return [
			ApiErrorType.RATE_LIMIT,
			ApiErrorType.QUOTA_EXCEEDED,
			ApiErrorType.SERVER_ERROR,
			ApiErrorType.NETWORK_ERROR,
			ApiErrorType.TIMEOUT,
		].includes(this.type)
	}

	/**
	 * Get retry delay in milliseconds
	 */
	getRetryDelay(): number {
		if (this.retryAfter) {
			return this.retryAfter * 1000
		}

		// Default retry delays based on error type
		switch (this.type) {
			case ApiErrorType.RATE_LIMIT:
				return 1000
			case ApiErrorType.QUOTA_EXCEEDED:
				return 60000
			case ApiErrorType.SERVER_ERROR:
				return 2000
			case ApiErrorType.NETWORK_ERROR:
				return 1000
			case ApiErrorType.TIMEOUT:
				return 5000
			default:
				return 1000
		}
	}
}

/**
 * Error handling service for consistent error management
 * Follows NORMIE DEV methodology: clean, unified error handling
 */
export class ErrorService {
	/**
	 * Parse error from various sources and convert to standardized ApiError
	 */
	static parseError(error: any, provider?: string): ApiError {
		// Handle already parsed ApiError
		if (error instanceof ApiError) {
			return error
		}

		// Handle HTTP errors
		if (error.status || error.statusCode) {
			return ErrorService.parseHttpError(error, provider)
		}

		// Handle network errors
		if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
			return new ApiError(`Network error: ${error.message}`, ApiErrorType.NETWORK_ERROR, { provider, originalError: error })
		}

		// Handle timeout errors
		if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
			return new ApiError(`Request timeout: ${error.message}`, ApiErrorType.TIMEOUT, { provider, originalError: error })
		}

		// Handle generic errors
		return new ApiError(error.message || "Unknown error occurred", ApiErrorType.UNKNOWN, { provider, originalError: error })
	}

	/**
	 * Parse HTTP error responses
	 */
	private static parseHttpError(error: any, provider?: string): ApiError {
		const status = error.status || error.statusCode || 500
		const message = error.message || error.error?.message || "HTTP error occurred"

		switch (status) {
			case 401:
				return new ApiError(`Authentication failed: ${message}`, ApiErrorType.AUTHENTICATION, {
					statusCode: status,
					provider,
					originalError: error,
				})

			case 403:
				return new ApiError(`Authorization failed: ${message}`, ApiErrorType.AUTHORIZATION, {
					statusCode: status,
					provider,
					originalError: error,
				})

			case 429:
				const retryAfter = ErrorService.extractRetryAfter(error)
				return new ApiError(`Rate limit exceeded: ${message}`, ApiErrorType.RATE_LIMIT, {
					statusCode: status,
					retryAfter,
					provider,
					originalError: error,
				})

			case 402:
			case 429:
				return new ApiError(`Quota exceeded: ${message}`, ApiErrorType.QUOTA_EXCEEDED, {
					statusCode: status,
					provider,
					originalError: error,
				})

			case 400:
			case 422:
				return new ApiError(`Invalid request: ${message}`, ApiErrorType.INVALID_REQUEST, {
					statusCode: status,
					provider,
					originalError: error,
				})

			case 500:
			case 502:
			case 503:
			case 504:
				return new ApiError(`Server error: ${message}`, ApiErrorType.SERVER_ERROR, {
					statusCode: status,
					provider,
					originalError: error,
				})

			default:
				return new ApiError(`HTTP ${status}: ${message}`, ApiErrorType.UNKNOWN, {
					statusCode: status,
					provider,
					originalError: error,
				})
		}
	}

	/**
	 * Extract retry-after value from error response
	 */
	private static extractRetryAfter(error: any): number | undefined {
		// Check various retry-after headers
		const headers = error.headers || error.response?.headers || {}
		const retryAfter =
			headers["retry-after"] || headers["x-ratelimit-reset"] || headers["ratelimit-reset"] || error.retryAfter

		if (retryAfter) {
			const value = parseInt(retryAfter, 10)
			if (!isNaN(value)) {
				// Handle both delta-seconds and Unix timestamp formats
				if (value > Date.now() / 1000) {
					// Unix timestamp
					return Math.max(0, value - Math.floor(Date.now() / 1000))
				} else {
					// Delta seconds
					return value
				}
			}
		}

		return undefined
	}

	/**
	 * Create provider-specific error messages
	 */
	static createProviderErrorMessage(provider: string, error: ApiError): string {
		const baseMessage = error.message

		switch (provider) {
			case "anthropic":
				return `Anthropic API error: ${baseMessage}`
			case "openai":
				return `OpenAI API error: ${baseMessage}`
			case "gemini":
				return `Google Gemini API error: ${baseMessage}`
			case "ollama":
				return `Ollama API error: ${baseMessage}`
			case "bedrock":
				return `AWS Bedrock API error: ${baseMessage}`
			default:
				return `${provider} API error: ${baseMessage}`
		}
	}

	/**
	 * Log error with appropriate level
	 */
	static logError(error: ApiError, context?: string): void {
		const message = context ? `${context}: ${error.message}` : error.message

		if (error.type === ApiErrorType.SERVER_ERROR || error.type === ApiErrorType.UNKNOWN) {
			console.error(message, error.originalError)
		} else if (error.type === ApiErrorType.RATE_LIMIT || error.type === ApiErrorType.QUOTA_EXCEEDED) {
			console.warn(message)
		} else {
			console.error(message)
		}
	}

	/**
	 * Check if error should be retried
	 */
	static shouldRetry(error: ApiError, attempt: number, maxRetries: number): boolean {
		if (attempt >= maxRetries) {
			return false
		}

		return error.isRetriable()
	}

	/**
	 * Get retry delay with exponential backoff
	 */
	static getRetryDelay(error: ApiError, attempt: number, baseDelay: number = 1000): number {
		const errorDelay = error.getRetryDelay()
		const backoffDelay = baseDelay * 2 ** attempt

		return Math.min(errorDelay, backoffDelay)
	}
}
