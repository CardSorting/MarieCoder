import { Anthropic } from "@anthropic-ai/sdk"
import { ApiConfiguration, ModelInfo } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { enhancedProviderRegistry, ProviderDiscoveryService } from "./registry/enhanced-registrations"
import {
	ProviderCapabilities,
	ProviderCategory,
	ProviderComparison,
	ProviderMetadata,
	ProviderSearchOptions,
	ProviderStatus,
} from "./registry/provider-metadata"
import { ErrorService } from "./services/error-service"
import { ApiStream, ApiStreamUsageChunk } from "./transform/stream"

/**
 * Options for API handler creation
 */
export type ApiHandlerOptions = {
	onRetryAttempt?: ApiConfiguration["onRetryAttempt"]
	providerPreferences?: string[]
	fallbackProviders?: string[]
	enableProviderDiscovery?: boolean
}

/**
 * API handler interface for message streaming
 */
export interface ApiHandler {
	createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream
	getModel(): ApiHandlerModel
	getApiStreamUsage?(): Promise<ApiStreamUsageChunk | undefined>
	getProviderMetadata(): ProviderMetadata
	getCapabilities(): ProviderCapabilities
}

/**
 * Model information with provider metadata
 */
export interface ApiHandlerModel {
	id: string
	info: ModelInfo
	providerMetadata: ProviderMetadata
	capabilities: ProviderCapabilities
	performance?: {
		averageLatency?: number
		maxThroughput?: number
		costPerToken?: number
	}
}

/**
 * Complete provider information including model and configuration
 */
export interface ProviderInfo {
	providerId: string
	model: ApiHandlerModel
	customPrompt?: string
	autoCondenseThreshold?: number
	capabilities: ProviderCapabilities
	status: ProviderStatus
	category: ProviderCategory
}

/**
 * API service for provider management and handler creation
 * Handles provider discovery, validation, and intelligent fallbacks
 */
export class ApiService {
	/**
	 * Create API handler for the specified configuration and mode
	 */
	static createHandler(configuration: ApiConfiguration, mode: Mode, options: ApiHandlerOptions = {}): ApiHandler {
		try {
			// Use provider discovery if enabled
			if (options.enableProviderDiscovery) {
				const bestProvider = ApiService.findBestProviderForConfiguration(configuration, mode, options.providerPreferences)
				if (bestProvider) {
					return ApiService.createHandlerForProvider(bestProvider.providerId, configuration, mode, options)
				}
			}

			// Fall back to specified provider or default
			const providerId = ApiService.determineProviderId(configuration, mode, options)
			return ApiService.createHandlerForProvider(providerId, configuration, mode, options)
		} catch (error) {
			const apiError = ErrorService.parseError(error)
			ErrorService.logError(apiError, "ApiService.createHandler")
			throw apiError
		}
	}

	/**
	 * Create handler with automatic fallback to alternative providers
	 */
	static createHandlerWithFallback(
		configuration: ApiConfiguration,
		mode: Mode,
		options: ApiHandlerOptions = {},
		fallbackProviders: string[] = ["anthropic", "openai"],
	): ApiHandler {
		try {
			return ApiService.createHandler(configuration, mode, {
				...options,
				fallbackProviders: fallbackProviders,
			})
		} catch (error) {
			// Try fallback providers
			for (const fallbackProvider of fallbackProviders) {
				try {
					return ApiService.createHandlerForProvider(fallbackProvider, configuration, mode, options)
				} catch (fallbackError) {
					console.warn(`Fallback provider ${fallbackProvider} failed:`, fallbackError)
				}
			}

			const apiError = ErrorService.parseError(error)
			ErrorService.logError(apiError, "ApiService.createHandlerWithFallback")
			throw apiError
		}
	}

	/**
	 * Find providers that match specific capability requirements
	 */
	static findProvidersByRequirements(
		requirements: Partial<ProviderCapabilities> & { mode?: Mode },
		options: {
			excludeDeprecated?: boolean
			excludeExperimental?: boolean
			maxResults?: number
		} = {},
	): ProviderComparison[] {
		return ProviderDiscoveryService.findProvidersByRequirements(requirements, options)
	}

	/**
	 * Get all providers in a specific category
	 */
	static getProvidersByCategory(category: ProviderCategory): string[] {
		return enhancedProviderRegistry.getProvidersByCategory(category)
	}

	/**
	 * Get all providers with a specific status
	 */
	static getProvidersByStatus(status: ProviderStatus): string[] {
		return enhancedProviderRegistry.getProvidersByStatus(status)
	}

	/**
	 * Search providers using advanced filtering options
	 */
	static searchProviders(options: ProviderSearchOptions) {
		return enhancedProviderRegistry.searchProviders(options)
	}

	/**
	 * Compare multiple providers against criteria
	 */
	static compareProviders(
		providerIds: string[],
		criteria: {
			mode?: Mode
			capabilities?: Partial<ProviderCapabilities>
			prioritizeCost?: boolean
			prioritizePerformance?: boolean
		} = {},
	): ProviderComparison[] {
		return ProviderDiscoveryService.compareProviders(providerIds, criteria)
	}

	/**
	 * Get statistical insights about all providers
	 */
	static getProviderInsights() {
		return ProviderDiscoveryService.getProviderInsights()
	}

	/**
	 * Validate configuration across multiple providers
	 */
	static validateConfigurationAcrossProviders(configuration: ApiConfiguration, mode: Mode, providerIds?: string[]) {
		return ProviderDiscoveryService.validateConfigurationAcrossProviders(configuration, mode, providerIds)
	}

	/**
	 * Get metadata for a specific provider
	 */
	static getProviderMetadata(providerId: string) {
		return enhancedProviderRegistry.getProviderMetadata(providerId)
	}

	/**
	 * Get configuration schema for a provider
	 */
	static getProviderConfigurationSchema(providerId: string) {
		return enhancedProviderRegistry.getProviderConfigurationSchema(providerId)
	}

	/**
	 * Get list of all supported provider IDs
	 */
	static getSupportedProviders(): string[] {
		return enhancedProviderRegistry.getSupportedProviders()
	}

	/**
	 * Check if a provider ID is supported
	 */
	static isProviderSupported(providerId: string): boolean {
		return enhancedProviderRegistry.hasProvider(providerId)
	}

	/**
	 * Validate configuration for a specific provider
	 */
	static validateProviderConfiguration(providerId: string, configuration: ApiConfiguration, mode: Mode): boolean {
		const validation = enhancedProviderRegistry.validateProviderConfiguration(providerId, configuration, mode)
		return validation.isValid
	}

	/**
	 * Get capabilities for a specific provider
	 */
	static getProviderCapabilities(providerId: string): ProviderCapabilities | undefined {
		const metadata = enhancedProviderRegistry.getProviderMetadata(providerId)
		return metadata?.capabilities
	}

	/**
	 * Get default configuration for a provider
	 */
	static getDefaultProviderConfiguration(providerId: string): Partial<ApiConfiguration> {
		const schema = enhancedProviderRegistry.getProviderConfigurationSchema(providerId)
		if (!schema) {
			return {}
		}

		const defaultConfig: Partial<ApiConfiguration> = {}

		// Set default values from schema
		Object.entries(schema.optionalOptions).forEach(([option, config]) => {
			if (config.default !== undefined) {
				defaultConfig[option as keyof ApiConfiguration] = config.default
			}
		})

		return defaultConfig
	}

	/**
	 * Get provider recommendations for specific use cases
	 */
	static getRecommendationsForUseCase(
		useCase: "development" | "production" | "experimentation" | "cost-optimized" | "performance-optimized",
		mode?: Mode,
	): ProviderComparison[] {
		return ProviderDiscoveryService.getRecommendationsForUseCase(useCase, mode)
	}

	/**
	 * Find the best provider for given configuration and preferences
	 */
	private static findBestProviderForConfiguration(
		configuration: ApiConfiguration,
		mode: Mode,
		preferences?: string[],
	): ProviderComparison | null {
		// Try user preferences first
		if (preferences?.length) {
			for (const providerId of preferences) {
				if (enhancedProviderRegistry.hasProvider(providerId)) {
					const validation = enhancedProviderRegistry.validateProviderConfiguration(providerId, configuration, mode)
					if (validation.isValid) {
						const metadata = enhancedProviderRegistry.getProviderMetadata(providerId)
						if (metadata) {
							return {
								providerId,
								score: 100,
								reasons: ["Matches user preferences"],
								metadata,
							}
						}
					}
				}
			}
		}

		// Use automatic provider discovery
		return ProviderDiscoveryService.findBestProviderForConfiguration(configuration, mode)
	}

	/**
	 * Determine provider ID from configuration, options, or defaults
	 */
	private static determineProviderId(configuration: ApiConfiguration, mode: Mode, options: ApiHandlerOptions): string {
		// Check mode-specific configuration
		const configuredProvider = mode === "plan" ? configuration.planModeApiProvider : configuration.actModeApiProvider
		if (configuredProvider && enhancedProviderRegistry.hasProvider(configuredProvider)) {
			return configuredProvider
		}

		// Use first preference if available
		if (options.providerPreferences?.length) {
			return options.providerPreferences[0]
		}

		// Default to Anthropic
		return "anthropic"
	}

	/**
	 * Create handler instance for specific provider with metadata
	 */
	private static createHandlerForProvider(
		providerId: string,
		configuration: ApiConfiguration,
		mode: Mode,
		options: ApiHandlerOptions,
	): ApiHandler {
		const handler = enhancedProviderRegistry.createHandler(providerId, configuration, mode, options)
		const metadata = enhancedProviderRegistry.getProviderMetadata(providerId)

		if (!metadata) {
			throw new Error(`Provider metadata not found: ${providerId}`)
		}

		return {
			createMessage: handler.createMessage.bind(handler),
			getModel: () => ({
				id: handler.getModel().id,
				info: handler.getModel().info,
				providerMetadata: metadata,
				capabilities: metadata.capabilities,
				performance: metadata.performance,
			}),
			getApiStreamUsage: handler.getApiStreamUsage?.bind(handler),
			getProviderMetadata: () => metadata,
			getCapabilities: () => metadata.capabilities,
		}
	}
}

// Re-export core components for clean API
export { BaseProvider, HttpProvider } from "./base"
export { enhancedProviderRegistry, ProviderDiscoveryService } from "./registry/enhanced-registrations"
export * from "./registry/provider-metadata"
export { ConfigurationService } from "./services/configuration-service"
export { ApiError, ApiErrorType, ErrorService } from "./services/error-service"
export type { ApiStream, ApiStreamUsageChunk } from "./transform/stream"
export { convertMessages, validateMessageFormat } from "./utils/message-transformers"
