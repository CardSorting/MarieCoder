/**
 * Cline Error Types and Classes
 * Provides structured error handling for Cline API errors
 */

export enum ClineErrorType {
	Balance = "balance",
	RateLimit = "rate_limit",
	Authentication = "authentication",
	Auth = "authentication", // Alias for Authentication
	Network = "network",
	Unknown = "unknown",
}

interface ParsedError {
	type?: string
	message?: string
	request_id?: string
	details?: {
		buy_credits_url?: string
		current_balance?: number
		message?: string
		total_promotions?: number
		total_spent?: number
	}
}

export class ClineError extends Error {
	public readonly type: ClineErrorType
	public readonly _error?: ParsedError
	public readonly providerId?: string

	constructor(message: string, type: ClineErrorType = ClineErrorType.Unknown, error?: ParsedError, providerId?: string) {
		super(message)
		this.name = "ClineError"
		this.type = type
		this._error = error
		this.providerId = providerId
	}

	/**
	 * Parse an error message string into a ClineError
	 */
	static parse(errorMessage: string | null | undefined): ClineError | null {
		if (!errorMessage) return null

		try {
			// Try to parse as JSON first
			const parsed = JSON.parse(errorMessage)

			// Determine error type based on the parsed content
			let errorType = ClineErrorType.Unknown
			if (parsed.type === "balance" || parsed.error?.type === "balance") {
				errorType = ClineErrorType.Balance
			} else if (parsed.type === "rate_limit" || parsed.error?.type === "rate_limit") {
				errorType = ClineErrorType.RateLimit
			} else if (parsed.type === "authentication" || parsed.error?.type === "authentication") {
				errorType = ClineErrorType.Authentication
			} else if (parsed.type === "network" || parsed.error?.type === "network") {
				errorType = ClineErrorType.Network
			}

			return new ClineError(parsed.message || parsed.error?.message || errorMessage, errorType, parsed.error || parsed)
		} catch {
			// If not JSON, check for common error patterns in the string
			let errorType = ClineErrorType.Unknown
			const lowerMessage = errorMessage.toLowerCase()

			if (lowerMessage.includes("credit") || lowerMessage.includes("balance") || lowerMessage.includes("quota")) {
				errorType = ClineErrorType.Balance
			} else if (lowerMessage.includes("rate limit")) {
				errorType = ClineErrorType.RateLimit
			} else if (lowerMessage.includes("authentication") || lowerMessage.includes("unauthorized")) {
				errorType = ClineErrorType.Authentication
			} else if (lowerMessage.includes("network") || lowerMessage.includes("connection")) {
				errorType = ClineErrorType.Network
			}

			return new ClineError(errorMessage, errorType)
		}
	}

	/**
	 * Check if this error is of a specific type
	 */
	isErrorType(type: ClineErrorType): boolean {
		return this.type === type
	}
}
