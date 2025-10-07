import { ApiConfiguration } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { ApiHandler, CommonApiHandlerOptions } from "../index"
import { providerRegistry } from "../registry/provider-registry"
import { ConfigurationService } from "./configuration-service"
import { ErrorService } from "./error-service"

/**
 * Provider factory service for creating API handlers
 * Centralizes provider creation logic and reduces duplication
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class ProviderFactoryService {
	/**
	 * Create API handler for specified provider and mode
	 */
	static createHandler(configuration: ApiConfiguration, mode: Mode, options: CommonApiHandlerOptions = {}): ApiHandler {
		try {
			// Normalize configuration
			const normalizedConfig = ConfigurationService.normalizeConfiguration(configuration)

			// Extract mode-specific configuration
			const modeConfig = ConfigurationService.extractModeConfiguration(normalizedConfig, mode)

			// Validate configuration
			const validation = ConfigurationService.validateConfiguration(normalizedConfig, modeConfig.apiProvider, mode)

			if (!validation.isValid) {
				throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`)
			}

			// Log warnings if any
			if (validation.warnings.length > 0) {
				console.warn(`Configuration warnings: ${validation.warnings.join(", ")}`)
			}

			// Create handler using registry
			return providerRegistry.createHandler(modeConfig.apiProvider, normalizedConfig, mode, options)
		} catch (error) {
			const apiError = ErrorService.parseError(error, modeConfig?.apiProvider)
			ErrorService.logError(apiError, "ProviderFactoryService.createHandler")
			throw apiError
		}
	}

	/**
	 * Get supported providers
	 */
	static getSupportedProviders(): string[] {
		return providerRegistry.getSupportedProviders()
	}

	/**
	 * Check if provider is supported
	 */
	static isProviderSupported(providerId: string): boolean {
		return providerRegistry.hasProvider(providerId)
	}

	/**
	 * Validate configuration for provider
	 */
	static validateProviderConfiguration(providerId: string, configuration: ApiConfiguration, _mode: Mode): boolean {
		return providerRegistry.validateConfiguration(providerId, configuration)
	}

	/**
	 * Get provider configuration
	 */
	static getProviderConfig(providerId: string) {
		return providerRegistry.getProviderConfig(providerId)
	}

	/**
	 * Create handler with fallback provider
	 */
	static createHandlerWithFallback(
		configuration: ApiConfiguration,
		mode: Mode,
		options: CommonApiHandlerOptions = {},
		fallbackProvider: string = "anthropic",
	): ApiHandler {
		try {
			return ProviderFactoryService.createHandler(configuration, mode, options)
		} catch (_error) {
			console.warn(`Failed to create handler for configured provider, falling back to ${fallbackProvider}`)

			// Create fallback configuration
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
		options: CommonApiHandlerOptions = {},
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
	 * Merge configurations with provider defaults
	 */
	static mergeWithDefaults(configuration: ApiConfiguration, providerId: string): ApiConfiguration {
		const defaults = ProviderFactoryService.getDefaultConfiguration(providerId)
		return { ...defaults, ...configuration }
	}

	/**
	 * Create handler for multiple providers (for load balancing or failover)
	 */
	static createMultipleHandlers(
		configurations: ApiConfiguration[],
		mode: Mode,
		options: CommonApiHandlerOptions = {},
	): ApiHandler[] {
		return configurations
			.map((config) => {
				try {
					return ProviderFactoryService.createHandler(config, mode, options)
				} catch (error) {
					console.warn(`Failed to create handler for configuration:`, error)
					return null
				}
			})
			.filter((handler): handler is ApiHandler => handler !== null)
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
		const capabilities: Record<string, any> = {
			anthropic: {
				supportsStreaming: true,
				supportsThinking: true,
				supportsReasoning: true,
				supportsCache: true,
				maxTokens: 200000,
			},
			openai: {
				supportsStreaming: true,
				supportsThinking: false,
				supportsReasoning: true,
				supportsCache: false,
				maxTokens: 128000,
			},
			gemini: {
				supportsStreaming: true,
				supportsThinking: false,
				supportsReasoning: false,
				supportsCache: true,
				maxTokens: 1000000,
			},
			ollama: {
				supportsStreaming: true,
				supportsThinking: false,
				supportsReasoning: false,
				supportsCache: false,
				maxTokens: 32768,
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
