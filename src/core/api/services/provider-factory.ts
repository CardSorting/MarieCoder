import { ApiConfiguration } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { ApiHandler, ApiHandlerOptions } from "../index"
import { simpleRegistry } from "../registry/enhanced-registrations"
import { ConfigurationService } from "./configuration-service"
import { ErrorService } from "./error-service"

/**
 * Provider factory service for creating API handlers
 * Only supports Anthropic and OpenRouter
 * Follows NORMIE DEV methodology: ruthlessly simple
 */
export class ProviderFactoryService {
	/**
	 * Create API handler for specified provider and mode
	 */
	static createHandler(configuration: ApiConfiguration, mode: Mode, options: ApiHandlerOptions = {}): ApiHandler {
		const normalizedConfig = ConfigurationService.normalizeConfiguration(configuration)
		const modeConfig = ConfigurationService.extractModeConfiguration(normalizedConfig, mode)

		try {
			if (!modeConfig.apiProvider) {
				throw new Error(`API provider is required for ${mode} mode`)
			}

			const validation = ConfigurationService.validateConfiguration(normalizedConfig, modeConfig.apiProvider, mode)

			if (!validation.isValid) {
				throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`)
			}

			if (validation.warnings.length > 0) {
				console.warn(`Configuration warnings: ${validation.warnings.join(", ")}`)
			}

			return simpleRegistry.createHandler(modeConfig.apiProvider, normalizedConfig, mode, options)
		} catch (error) {
			const apiError = ErrorService.parseError(error, modeConfig.apiProvider)
			ErrorService.logError(apiError, "ProviderFactoryService.createHandler")
			throw apiError
		}
	}

	/**
	 * Get supported providers
	 */
	static getSupportedProviders(): string[] {
		return simpleRegistry.getSupportedProviders()
	}

	/**
	 * Check if provider is supported
	 */
	static isProviderSupported(providerId: string): boolean {
		return simpleRegistry.isSupported(providerId)
	}

	/**
	 * Create handler with fallback provider
	 */
	static createHandlerWithFallback(
		configuration: ApiConfiguration,
		mode: Mode,
		options: ApiHandlerOptions = {},
		fallbackProvider: string = "anthropic",
	): ApiHandler {
		try {
			return ProviderFactoryService.createHandler(configuration, mode, options)
		} catch (_error) {
			console.warn(`Failed to create handler for configured provider, falling back to ${fallbackProvider}`)

			const fallbackConfig = {
				...configuration,
				[`${mode}ModeApiProvider`]: fallbackProvider,
			}

			return ProviderFactoryService.createHandler(fallbackConfig, mode, options)
		}
	}

	/**
	 * Create handler with error handling and retry logic
	 */
	static async createHandlerWithRetry(
		configuration: ApiConfiguration,
		mode: Mode,
		options: ApiHandlerOptions = {},
		maxRetries: number = 3,
	): Promise<ApiHandler> {
		let lastError: Error | undefined

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				return ProviderFactoryService.createHandler(configuration, mode, options)
			} catch (error) {
				lastError = error as Error
				const apiError = ErrorService.parseError(error)

				if (!ErrorService.shouldRetry(apiError, attempt, maxRetries)) {
					throw apiError
				}

				if (attempt < maxRetries - 1) {
					const delay = ErrorService.getRetryDelay(apiError, attempt)
					console.warn(`Retrying handler creation in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
					await new Promise((resolve) => setTimeout(resolve, delay))
				}
			}
		}

		throw lastError || new Error("Failed to create handler after maximum retries")
	}

	/**
	 * Get default configuration for provider
	 */
	static getDefaultConfiguration(providerId: string): Partial<ApiConfiguration> {
		return ConfigurationService.getDefaultConfiguration(providerId)
	}

	/**
	 * Get provider capabilities
	 */
	static getProviderCapabilities(providerId: string): {
		supportsStreaming: boolean
		supportsThinking: boolean
		supportsReasoning: boolean
		supportsCache: boolean
		maxTokens?: number
	} {
		const capabilities: Record<
			string,
			{
				supportsStreaming: boolean
				supportsThinking: boolean
				supportsReasoning: boolean
				supportsCache: boolean
				maxTokens?: number
			}
		> = {
			anthropic: {
				supportsStreaming: true,
				supportsThinking: true,
				supportsReasoning: true,
				supportsCache: true,
				maxTokens: 200000,
			},
			openrouter: {
				supportsStreaming: true,
				supportsThinking: true,
				supportsReasoning: true,
				supportsCache: false,
				maxTokens: 200000,
			},
		}

		return (
			capabilities[providerId] || {
				supportsStreaming: true,
				supportsThinking: false,
				supportsReasoning: false,
				supportsCache: false,
			}
		)
	}
}
