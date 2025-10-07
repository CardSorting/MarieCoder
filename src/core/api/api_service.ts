import { Anthropic } from "@anthropic-ai/sdk"
import { ApiConfiguration, ModelInfo } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { simpleRegistry } from "./registry/enhanced-registrations"
import { ProviderCapabilities, ProviderMetadata } from "./registry/provider-metadata"
import { ErrorService } from "./services/error-service"
import { ApiStream, ApiStreamUsageChunk } from "./transform/stream"

/**
 * Options for API handler creation
 */
export type ApiHandlerOptions = {
	onRetryAttempt?: ApiConfiguration["onRetryAttempt"]
}

/**
 * API handler interface for message streaming
 */
export interface ApiHandler {
	createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream
	getModel(): ApiHandlerModel
	getCapabilities(): ProviderCapabilities
	getProviderMetadata(): ProviderMetadata
	getApiStreamUsage?(): Promise<ApiStreamUsageChunk | undefined>
}

/**
 * Model information
 */
export interface ApiHandlerModel {
	id: string
	info: ModelInfo
}

/**
 * Provider information
 */
export interface ProviderInfo {
	providerId: string
	model: ApiHandlerModel
	customPrompt?: string
	capabilities?: any
	status?: string
	category?: string
}

/**
 * Simplified API Service
 * Only supports Anthropic and OpenRouter
 * Follows NORMIE DEV methodology: ruthlessly simple
 */
export class ApiService {
	/**
	 * Create API handler for the specified configuration and mode
	 */
	static createHandler(configuration: ApiConfiguration, mode: Mode, options: ApiHandlerOptions = {}): ApiHandler {
		try {
			const providerId = ApiService.determineProviderId(configuration, mode)
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
		fallbackProviders: string[] = ["anthropic", "openrouter"],
	): ApiHandler {
		try {
			return ApiService.createHandler(configuration, mode, options)
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
	 * Get list of all supported provider IDs
	 */
	static getSupportedProviders(): string[] {
		return simpleRegistry.getSupportedProviders()
	}

	/**
	 * Check if a provider ID is supported
	 */
	static isProviderSupported(providerId: string): boolean {
		return simpleRegistry.isSupported(providerId)
	}

	/**
	 * Determine provider ID from configuration
	 */
	private static determineProviderId(configuration: ApiConfiguration, mode: Mode): string {
		// Check mode-specific configuration
		const configuredProvider = mode === "plan" ? configuration.planModeApiProvider : configuration.actModeApiProvider

		if (configuredProvider && simpleRegistry.isSupported(configuredProvider)) {
			return configuredProvider
		}

		// Default to Anthropic
		return "anthropic"
	}

	/**
	 * Create handler instance for specific provider
	 */
	private static createHandlerForProvider(
		providerId: string,
		configuration: ApiConfiguration,
		mode: Mode,
		options: ApiHandlerOptions,
	): ApiHandler {
		return simpleRegistry.createHandler(providerId, configuration, mode, options)
	}
}

// Re-export core components for clean API
export { BaseProvider, HttpProvider } from "./base"
export { simpleRegistry } from "./registry/enhanced-registrations"
export { ConfigurationService } from "./services/configuration-service"
export { ApiError, ApiErrorType, ErrorService } from "./services/error-service"
export { ProviderFactoryService } from "./services/provider-factory"
export type { ApiStream, ApiStreamUsageChunk } from "./transform/stream"
export { convertMessages, validateMessageFormat } from "./utils/message-transformers"
