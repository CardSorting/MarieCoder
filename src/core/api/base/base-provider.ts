import { ModelInfo } from "@shared/api"
import { ApiStream } from "../transform/stream"
import { ApiHandler, ApiHandlerModel, CommonApiHandlerOptions } from "../types"

/**
 * Base configuration interface for all providers
 */
export interface BaseProviderOptions extends CommonApiHandlerOptions {
	apiModelId?: string
	requestTimeoutMs?: number
}

/**
 * Base provider class that implements common functionality
 * Follows NORMIE DEV methodology: clean, unified patterns
 */
export abstract class BaseProvider implements ApiHandler {
	protected options: BaseProviderOptions
	protected client: any
	protected modelInfo: ModelInfo | undefined

	constructor(options: BaseProviderOptions) {
		this.options = options
	}

	/**
	 * Abstract method to create the API client
	 */
	protected abstract createClient(): any

	/**
	 * Abstract method to get model information
	 */
	protected abstract getModelInfo(): ModelInfo

	/**
	 * Abstract method to create the message stream
	 */
	abstract createMessage(systemPrompt: string, messages: any[]): ApiStream

	/**
	 * Get the model handler
	 */
	getModel(): ApiHandlerModel {
		return {
			id: this.options.apiModelId || this.getDefaultModelId(),
			info: this.getModelInfo(),
		}
	}

	/**
	 * Get default model ID (to be overridden by subclasses)
	 */
	protected getDefaultModelId(): string {
		return "default-model"
	}

	/**
	 * Ensure client is initialized
	 */
	protected ensureClient(): any {
		if (!this.client) {
			this.client = this.createClient()
		}
		return this.client
	}

	/**
	 * Validate required options
	 */
	protected validateRequiredOptions(requiredOptions: string[]): void {
		for (const option of requiredOptions) {
			if (!(this.options as any)[option]) {
				throw new Error(`${option} is required for this provider`)
			}
		}
	}

	/**
	 * Create standardized error
	 */
	protected createError(message: string, originalError?: any): Error {
		const error = new Error(message)
		if (originalError) {
			error.cause = originalError
		}
		return error
	}

	/**
	 * Handle API errors consistently
	 */
	protected handleApiError(error: any, operation: string): never {
		if (error.status === 429) {
			throw this.createError(`Rate limit exceeded for ${operation}`, error)
		}

		if (error.status >= 500) {
			throw this.createError(`Server error during ${operation}`, error)
		}

		if (error.status === 401) {
			throw this.createError(`Authentication failed for ${operation}`, error)
		}

		throw this.createError(`API error during ${operation}: ${error.message}`, error)
	}
}
