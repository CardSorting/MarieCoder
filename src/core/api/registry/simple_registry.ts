import { ApiConfiguration } from "@shared/api"
import { Mode } from "@shared/storage/types"
import type { ApiHandler, ApiHandlerOptions } from "../index"

/**
 * Simple Provider Registry
 * Only supports Anthropic and OpenRouter
 * Follows NORMIE DEV methodology: ruthlessly simple
 */

export interface ProviderConfig {
	providerId: "anthropic" | "openrouter"
	handlerClass: new (options: any) => ApiHandler
	requiredFields: string[]
}

/**
 * Simplified registry for exactly 2 providers
 * No complex discovery, no metadata, just what we need
 */
class SimpleProviderRegistry {
	private providers: Map<string, ProviderConfig> = new Map()

	/**
	 * Register a provider
	 */
	register(config: ProviderConfig): void {
		this.providers.set(config.providerId, config)
	}

	/**
	 * Get all supported provider IDs
	 */
	getSupportedProviders(): string[] {
		return ["anthropic", "openrouter"]
	}

	/**
	 * Check if provider is supported
	 */
	isSupported(providerId: string): boolean {
		return providerId === "anthropic" || providerId === "openrouter"
	}

	/**
	 * Create a handler for the specified provider
	 */
	createHandler(providerId: string, configuration: ApiConfiguration, mode: Mode, options: ApiHandlerOptions): ApiHandler {
		if (!this.isSupported(providerId)) {
			throw new Error(`Unsupported provider: ${providerId}. Only 'anthropic' and 'openrouter' are supported.`)
		}

		const config = this.providers.get(providerId)
		if (!config) {
			throw new Error(`Provider not registered: ${providerId}`)
		}

		// Validate required fields
		this.validateConfiguration(providerId, configuration, mode)

		// Build provider options
		const providerOptions = this.buildProviderOptions(providerId, configuration, mode, options)

		// Create and return handler
		return new config.handlerClass(providerOptions)
	}

	/**
	 * Validate configuration for provider
	 */
	private validateConfiguration(providerId: string, configuration: ApiConfiguration, mode: Mode): void {
		const config = this.providers.get(providerId)
		if (!config) {
			throw new Error(`Provider not registered: ${providerId}`)
		}

		// Check required fields
		for (const field of config.requiredFields) {
			const modePrefix = mode === "plan" ? "planMode" : "actMode"
			const modeField = `${modePrefix}${field.charAt(0).toUpperCase()}${field.slice(1)}`

			const hasField = (configuration as any)[field] || (configuration as any)[modeField]
			if (!hasField) {
				throw new Error(`Missing required field for ${providerId}: ${field}`)
			}
		}
	}

	/**
	 * Build provider-specific options from configuration
	 */
	private buildProviderOptions(
		providerId: string,
		configuration: ApiConfiguration,
		mode: Mode,
		commonOptions: ApiHandlerOptions,
	): any {
		const options: any = { ...commonOptions }

		// Get mode-specific values
		const getModeValue = (key: string): any => {
			const modePrefix = mode === "plan" ? "planMode" : "actMode"
			const modeKey = `${modePrefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`
			return (configuration as any)[modeKey] ?? (configuration as any)[key]
		}

		if (providerId === "anthropic") {
			options.apiKey = getModeValue("apiKey")
			options.anthropicBaseUrl = configuration.anthropicBaseUrl
			options.apiModelId = getModeValue("apiModelId")
			options.thinkingBudgetTokens = getModeValue("thinkingBudgetTokens")
		} else if (providerId === "openrouter") {
			options.openRouterApiKey = configuration.openRouterApiKey || getModeValue("openRouterApiKey")
			options.openRouterModelId = configuration.openRouterModelId || getModeValue("openRouterModelId")
			options.openRouterModelInfo = configuration.openRouterModelInfo
			options.openRouterProviderSorting = configuration.openRouterProviderSorting
			options.reasoningEffort = getModeValue("reasoningEffort")
			options.thinkingBudgetTokens = getModeValue("thinkingBudgetTokens")
		}

		return options
	}
}

/**
 * Global simple registry instance
 */
export const simpleRegistry = new SimpleProviderRegistry()
