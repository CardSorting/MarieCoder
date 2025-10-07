import { ApiConfiguration, ModelInfo } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { ErrorService } from "./services/error-service"
import { ApiStream, ApiStreamUsageChunk } from "./transform/stream"

// Import legacy provider registrations to ensure they are loaded
import "./registry/registrations"

// Import enhanced provider system
import { EnhancedApiService } from "./enhanced-api"
import { ProviderCapabilities, ProviderCategory, ProviderSearchOptions, ProviderStatus } from "./registry/provider-metadata"

/**
 * Common API handler options interface
 */
export type CommonApiHandlerOptions = {
	onRetryAttempt?: ApiConfiguration["onRetryAttempt"]
}

/**
 * API handler interface for standardized provider interaction
 */
export interface ApiHandler {
	createMessage(systemPrompt: string, messages: any[]): ApiStream
	getModel(): ApiHandlerModel
	getApiStreamUsage?(): Promise<ApiStreamUsageChunk | undefined>
}

/**
 * API handler model interface
 */
export interface ApiHandlerModel {
	id: string
	info: ModelInfo
}

/**
 * API provider information interface
 */
export interface ApiProviderInfo {
	providerId: string
	model: ApiHandlerModel
	customPrompt?: string
	autoCondenseThreshold?: number
}

/**
 * Single completion handler interface
 */
export interface SingleCompletionHandler {
	completePrompt(prompt: string): Promise<string>
}

/**
 * Build API handler using the enhanced provider system
 * Provides advanced provider management and discovery capabilities
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export function buildApiHandler(configuration: ApiConfiguration, mode: Mode): ApiHandler {
	try {
		// Use the enhanced API service for better provider management
		return EnhancedApiService.createHandler(configuration, mode)
	} catch (error) {
		const apiError = ErrorService.parseError(error)
		ErrorService.logError(apiError, "buildApiHandler")
		throw apiError
	}
}

/**
 * Build API handler with fallback support
 */
export function buildApiHandlerWithFallback(
	configuration: ApiConfiguration,
	mode: Mode,
	fallbackProvider: string = "anthropic",
): ApiHandler {
	try {
		return EnhancedApiService.createHandlerWithFallback(configuration, mode, {}, [fallbackProvider])
	} catch (error) {
		const apiError = ErrorService.parseError(error)
		ErrorService.logError(apiError, "buildApiHandlerWithFallback")
		throw apiError
	}
}

/**
 * Build API handler with retry logic
 */
export async function buildApiHandlerWithRetry(
	configuration: ApiConfiguration,
	mode: Mode,
	maxRetries: number = 3,
): Promise<ApiHandler> {
	try {
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
	} catch (error) {
		const apiError = ErrorService.parseError(error)
		ErrorService.logError(apiError, "buildApiHandlerWithRetry")
		throw apiError
	}
}

/**
 * Get supported providers
 */
export function getSupportedProviders(): string[] {
	return EnhancedApiService.getSupportedProviders()
}

/**
 * Check if provider is supported
 */
export function isProviderSupported(providerId: string): boolean {
	return EnhancedApiService.isProviderSupported(providerId)
}

/**
 * Validate configuration for provider
 */
export function validateProviderConfiguration(providerId: string, configuration: ApiConfiguration, mode: Mode): boolean {
	return EnhancedApiService.validateProviderConfiguration(providerId, configuration, mode)
}

/**
 * Get provider capabilities
 */
export function getProviderCapabilities(providerId: string): ProviderCapabilities | undefined {
	return EnhancedApiService.getProviderCapabilities(providerId)
}

/**
 * Get default configuration for provider
 */
export function getDefaultProviderConfiguration(providerId: string): Partial<ApiConfiguration> {
	return EnhancedApiService.getDefaultProviderConfiguration(providerId)
}

// Export enhanced discovery and management functions
export function getProviderRecommendations(
	requirements: Partial<ProviderCapabilities> & { mode?: Mode },
	options?: {
		excludeDeprecated?: boolean
		excludeExperimental?: boolean
		maxResults?: number
	},
) {
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
) {
	return EnhancedApiService.compareProviders(providerIds, criteria)
}

export function getProviderInsights() {
	return EnhancedApiService.getProviderInsights()
}

export function getRecommendationsForUseCase(
	useCase: "development" | "production" | "experimentation" | "cost-optimized" | "performance-optimized",
	mode?: Mode,
) {
	return EnhancedApiService.getRecommendationsForUseCase(useCase, mode)
}

// Export clean, unified architecture
export { BaseProvider, HttpProvider } from "./base"
// Export enhanced provider system
export { enhancedProviderRegistry, ProviderDiscoveryService } from "./registry/enhanced-registrations"
export * from "./registry/provider-metadata"
export { providerRegistry } from "./registry/provider-registry"
export { ConfigurationService } from "./services/configuration-service"
export { ApiError, ApiErrorType, ErrorService } from "./services/error-service"
export { ProviderFactoryService } from "./services/provider-factory"
export type { ApiStream, ApiStreamUsageChunk } from "./transform/stream"
export { convertMessages, validateMessageFormat } from "./utils/message-transformers"
