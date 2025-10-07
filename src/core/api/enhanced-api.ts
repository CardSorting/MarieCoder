import { ApiConfiguration, ModelInfo } from "@shared/api"
import { Mode } from "@shared/storage/types"
// Import enhanced provider system
import { enhancedProviderRegistry, ProviderDiscoveryService } from "./registry/enhanced-registrations"
import {
    ProviderCapabilities,
    ProviderCategory,
    ProviderComparison,
    ProviderSearchOptions,
    ProviderStatus,
} from "./registry/provider-metadata"
import { ErrorService } from "./services/error-service"
import { ApiStream, ApiStreamUsageChunk } from "./transform/stream"

/**
 * Enhanced API handler options interface
 */
export type EnhancedApiHandlerOptions = {
	onRetryAttempt?: ApiConfiguration["onRetryAttempt"]
	providerPreferences?: string[]
	fallbackProviders?: string[]
	enableProviderDiscovery?: boolean
}

/**
 * Enhanced API handler interface with advanced capabilities
 */
export interface EnhancedApiHandler {
	createMessage(systemPrompt: string, messages: any[]): ApiStream
	getModel(): EnhancedApiHandlerModel
	getApiStreamUsage?(): Promise<ApiStreamUsageChunk | undefined>
	getProviderMetadata(): any
	getCapabilities(): ProviderCapabilities
}

/**
 * Enhanced API handler model interface
 */
export interface EnhancedApiHandlerModel {
	id: string
	info: ModelInfo
	providerMetadata: any
	capabilities: ProviderCapabilities
	performance?: {
		averageLatency?: number
		maxThroughput?: number
		costPerToken?: number
	}
}

/**
 * Enhanced API provider information interface
 */
export interface EnhancedApiProviderInfo {
	providerId: string
	model: EnhancedApiHandlerModel
	customPrompt?: string
	autoCondenseThreshold?: number
	capabilities: ProviderCapabilities
	status: ProviderStatus
	category: ProviderCategory
}

/**
 * Enhanced API service class
 * Provides advanced provider management and discovery capabilities
 */
export class EnhancedApiService {
	/**
	 * Create API handler using enhanced provider system
	 */
	static createHandler(
		configuration: ApiConfiguration,
		mode: Mode,
		options: EnhancedApiHandlerOptions = {},
	): EnhancedApiHandler {
		try {
			// Use provider discovery if enabled
			if (options.enableProviderDiscovery) {
				const bestProvider = EnhancedApiService.findBestProviderForConfiguration(
					configuration,
					mode,
					options.providerPreferences,
				)
				if (bestProvider) {
					return EnhancedApiService.createHandlerForProvider(bestProvider.providerId, configuration, mode, options)
				}
			}

			// Fall back to specified provider or default
			const providerId = EnhancedApiService.determineProviderId(configuration, mode, options)
			return EnhancedApiService.createHandlerForProvider(providerId, configuration, mode, options)
		} catch (error) {
			const apiError = ErrorService.parseError(error)
			ErrorService.logError(apiError, "EnhancedApiService.createHandler")
			throw apiError
		}
	}

	/**
	 * Create handler with automatic fallback support
	 */
	static createHandlerWithFallback(
		configuration: ApiConfiguration,
		mode: Mode,
		options: EnhancedApiHandlerOptions = {},
		fallbackProviders: string[] = ["anthropic", "openai"],
	): EnhancedApiHandler {
		try {
			return EnhancedApiService.createHandler(configuration, mode, {
				...options,
				fallbackProviders: fallbackProviders,
			})
		} catch (error) {
			// Try fallback providers
			for (const fallbackProvider of fallbackProviders) {
				try {
					return EnhancedApiService.createHandlerForProvider(fallbackProvider, configuration, mode, options)
				} catch (fallbackError) {
					console.warn(`Fallback provider ${fallbackProvider} failed:`, fallbackError)
				}
			}

			const apiError = ErrorService.parseError(error)
			ErrorService.logError(apiError, "EnhancedApiService.createHandlerWithFallback")
			throw apiError
		}
	}

	/**
	 * Get provider recommendations for specific requirements
	 */
	static getProviderRecommendations(
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
	 * Get providers by category
	 */
	static getProvidersByCategory(category: ProviderCategory): string[] {
		return enhancedProviderRegistry.getProvidersByCategory(category)
	}

	/**
	 * Get providers by status
	 */
	static getProvidersByStatus(status: ProviderStatus): string[] {
		return enhancedProviderRegistry.getProvidersByStatus(status)
	}

	/**
	 * Search providers with advanced filtering
	 */
	static searchProviders(options: ProviderSearchOptions) {
		return enhancedProviderRegistry.searchProviders(options)
	}

	/**
	 * Compare multiple providers
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
	 * Get provider insights and statistics
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
	 * Get provider metadata
	 */
	static getProviderMetadata(providerId: string) {
		return enhancedProviderRegistry.getProviderMetadata(providerId)
	}

	/**
	 * Get provider configuration schema
	 */
	static getProviderConfigurationSchema(providerId: string) {
		return enhancedProviderRegistry.getProviderConfigurationSchema(providerId)
	}

	/**
	 * Get supported providers
	 */
	static getSupportedProviders(): string[] {
		return enhancedProviderRegistry.getSupportedProviders()
	}

	/**
	 * Check if provider is supported
	 */
	static isProviderSupported(providerId: string): boolean {
		return enhancedProviderRegistry.hasProvider(providerId)
	}

	/**
	 * Validate configuration for provider
	 */
	static validateProviderConfiguration(providerId: string, configuration: ApiConfiguration, mode: Mode): boolean {
		const validation = enhancedProviderRegistry.validateProviderConfiguration(providerId, configuration, mode)
		return validation.isValid
	}

	/**
	 * Get provider capabilities
	 */
	static getProviderCapabilities(providerId: string): ProviderCapabilities | undefined {
		const metadata = enhancedProviderRegistry.getProviderMetadata(providerId)
		return metadata?.capabilities
	}

	/**
	 * Get default configuration for provider
	 */
	static getDefaultProviderConfiguration(providerId: string): Partial<ApiConfiguration> {
		const schema = enhancedProviderRegistry.getProviderConfigurationSchema(providerId)
		if (!schema) return {}

		const defaultConfig: Partial<ApiConfiguration> = {}

		// Set default values for optional options
		Object.entries(schema.optionalOptions).forEach(([option, config]) => {
			if (config.default !== undefined) {
				;(defaultConfig as any)[option] = config.default
			}
		})

		return defaultConfig
	}

	/**
	 * Get recommendations for specific use cases
	 */
	static getRecommendationsForUseCase(
		useCase: "development" | "production" | "experimentation" | "cost-optimized" | "performance-optimized",
		mode?: Mode,
	): ProviderComparison[] {
		return ProviderDiscoveryService.getRecommendationsForUseCase(useCase, mode)
	}

	/**
	 * Private helper methods
	 */

	private static findBestProviderForConfiguration(
		configuration: ApiConfiguration,
		mode: Mode,
		preferences?: string[],
	): ProviderComparison | null {
		// If preferences are specified, try them first
		if (preferences && preferences.length > 0) {
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

		// Fall back to automatic discovery
		return ProviderDiscoveryService.findBestProviderForConfiguration(configuration, mode)
	}

	private static determineProviderId(configuration: ApiConfiguration, mode: Mode, options: EnhancedApiHandlerOptions): string {
		// Try to extract provider from configuration
		const configuredProvider = (configuration as any).apiProvider
		if (configuredProvider && enhancedProviderRegistry.hasProvider(configuredProvider)) {
			return configuredProvider
		}

		// Use first preference if available
		if (options.providerPreferences && options.providerPreferences.length > 0) {
			return options.providerPreferences[0]
		}

		// Default to Anthropic for reliability
		return "anthropic"
	}

	private static createHandlerForProvider(
		providerId: string,
		configuration: ApiConfiguration,
		mode: Mode,
		options: EnhancedApiHandlerOptions,
	): EnhancedApiHandler {
		const handler = enhancedProviderRegistry.createHandler(providerId, configuration, mode, options)
		const metadata = enhancedProviderRegistry.getProviderMetadata(providerId)

		if (!metadata) {
			throw new Error(`No metadata found for provider: ${providerId}`)
		}

		// Wrap the handler with enhanced capabilities
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

// Export enhanced API functions for backward compatibility
export function buildApiHandler(configuration: ApiConfiguration, mode: Mode): EnhancedApiHandler {
	return EnhancedApiService.createHandler(configuration, mode)
}

export function buildApiHandlerWithFallback(
	configuration: ApiConfiguration,
	mode: Mode,
	fallbackProvider: string = "anthropic",
): EnhancedApiHandler {
	return EnhancedApiService.createHandlerWithFallback(configuration, mode, {}, [fallbackProvider])
}

export async function buildApiHandlerWithRetry(
	configuration: ApiConfiguration,
	mode: Mode,
	maxRetries: number = 3,
): Promise<EnhancedApiHandler> {
	// Implement retry logic with enhanced error handling
	let lastError: Error | null = null

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return EnhancedApiService.createHandler(configuration, mode)
		} catch (error) {
			lastError = error as Error
			if (attempt < maxRetries - 1) {
				// Wait before retry (exponential backoff)
				await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000))
			}
		}
	}

	throw lastError || new Error("Max retries exceeded")
}

// Export enhanced functions
export function getSupportedProviders(): string[] {
	return EnhancedApiService.getSupportedProviders()
}

export function isProviderSupported(providerId: string): boolean {
	return EnhancedApiService.isProviderSupported(providerId)
}

export function validateProviderConfiguration(providerId: string, configuration: ApiConfiguration, mode: Mode): boolean {
	return EnhancedApiService.validateProviderConfiguration(providerId, configuration, mode)
}

export function getProviderCapabilities(providerId: string): ProviderCapabilities | undefined {
	return EnhancedApiService.getProviderCapabilities(providerId)
}

export function getDefaultProviderConfiguration(providerId: string): Partial<ApiConfiguration> {
	return EnhancedApiService.getDefaultProviderConfiguration(providerId)
}

// Export enhanced discovery functions
export function getProviderRecommendations(
	requirements: Partial<ProviderCapabilities> & { mode?: Mode },
	options?: {
		excludeDeprecated?: boolean
		excludeExperimental?: boolean
		maxResults?: number
	},
): ProviderComparison[] {
	return EnhancedApiService.getProviderRecommendations(requirements, options)
}

export function getProvidersByCategory(category: ProviderCategory): string[] {
	return EnhancedApiService.getProvidersByCategory(category)
}

export function getProvidersByStatus(status: ProviderStatus): string[] {
	return EnhancedApiService.getProvidersByStatus(status)
}

export function searchProviders(options: ProviderSearchOptions) {
	return EnhancedApiService.searchProviders(options)
}

export function compareProviders(
	providerIds: string[],
	criteria?: {
		mode?: Mode
		capabilities?: Partial<ProviderCapabilities>
		prioritizeCost?: boolean
		prioritizePerformance?: boolean
	},
): ProviderComparison[] {
	return EnhancedApiService.compareProviders(providerIds, criteria)
}

export function getProviderInsights() {
	return EnhancedApiService.getProviderInsights()
}

export function getRecommendationsForUseCase(
	useCase: "development" | "production" | "experimentation" | "cost-optimized" | "performance-optimized",
	mode?: Mode,
): ProviderComparison[] {
	return EnhancedApiService.getRecommendationsForUseCase(useCase, mode)
}

// Export clean, unified architecture
export { BaseProvider, HttpProvider } from "./base"
// Export enhanced registry and discovery
export { enhancedProviderRegistry, ProviderDiscoveryService } from "./registry/enhanced-registrations"
export * from "./registry/provider-metadata"
export { ConfigurationService } from "./services/configuration-service"
export { ApiError, ApiErrorType, ErrorService } from "./services/error-service"
export type { ApiStream, ApiStreamUsageChunk } from "./transform/stream"
export { convertMessages, validateMessageFormat } from "./utils/message-transformers"
