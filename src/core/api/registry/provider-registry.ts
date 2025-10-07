import { ApiConfiguration } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { ApiHandler, ApiHandlerOptions } from "../index"

/**
 * Provider configuration interface for standardized provider setup
 */
export interface ProviderConfig {
	providerId: string
	handlerClass: new (options: any) => ApiHandler
	requiredOptions: string[]
	optionalOptions?: string[]
	modeSupport?: {
		plan?: boolean
		act?: boolean
	}
}

/**
 * Provider factory interface for creating handlers with proper configuration
 */
export interface ProviderFactory {
	createHandler(providerId: string, configuration: ApiConfiguration, mode: Mode, options: ApiHandlerOptions): ApiHandler
	getSupportedProviders(): string[]
	validateConfiguration(providerId: string, configuration: ApiConfiguration): boolean
}

/**
 * Centralized provider registry that manages all API providers
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class ProviderRegistry implements ProviderFactory {
	private providers: Map<string, ProviderConfig> = new Map()

	/**
	 * Register a new provider configuration
	 */
	registerProvider(config: ProviderConfig): void {
		this.providers.set(config.providerId, config)
	}

	/**
	 * Get all registered provider IDs
	 */
	getSupportedProviders(): string[] {
		return Array.from(this.providers.keys())
	}

	/**
	 * Validate configuration for a specific provider
	 */
	validateConfiguration(providerId: string, configuration: ApiConfiguration): boolean {
		const provider = this.providers.get(providerId)
		if (!provider) {
			return false
		}

		// Check if provider supports the current mode
		const mode = this.getCurrentMode(configuration)
		if (provider.modeSupport && !provider.modeSupport[mode]) {
			return false
		}

		// Validate required options are present
		return provider.requiredOptions.every((option) => {
			return this.hasConfigurationOption(configuration, option)
		})
	}

	/**
	 * Create a handler for the specified provider
	 */
	createHandler(providerId: string, configuration: ApiConfiguration, mode: Mode, options: ApiHandlerOptions): ApiHandler {
		const provider = this.providers.get(providerId)
		if (!provider) {
			throw new Error(`Unknown provider: ${providerId}`)
		}

		if (!this.validateConfiguration(providerId, configuration)) {
			throw new Error(`Invalid configuration for provider: ${providerId}`)
		}

		const providerOptions = this.buildProviderOptions(providerId, configuration, mode, options)
		return new provider.handlerClass(providerOptions)
	}

	/**
	 * Get provider configuration
	 */
	getProviderConfig(providerId: string): ProviderConfig | undefined {
		return this.providers.get(providerId)
	}

	/**
	 * Check if provider is registered
	 */
	hasProvider(providerId: string): boolean {
		return this.providers.has(providerId)
	}

	/**
	 * Get current mode from configuration
	 */
	private getCurrentMode(_configuration: ApiConfiguration): Mode {
		// This is a simplified version - in practice, you'd determine this from context
		return "act" // Default mode
	}

	/**
	 * Check if configuration has a specific option
	 */
	private hasConfigurationOption(configuration: ApiConfiguration, option: string): boolean {
		return (configuration as any)[option] !== undefined && (configuration as any)[option] !== null
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
		const provider = this.providers.get(providerId)!
		const options: any = { ...commonOptions }

		// Add provider-specific options based on configuration
		const allOptions = [...provider.requiredOptions, ...(provider.optionalOptions || [])]

		for (const option of allOptions) {
			const value = this.getConfigurationValue(configuration, option, mode)
			if (value !== undefined) {
				options[option] = value
			}
		}

		return options
	}

	/**
	 * Get configuration value, handling mode-specific options
	 */
	private getConfigurationValue(configuration: ApiConfiguration, option: string, mode: Mode): any {
		// Handle mode-specific options
		const modePrefix = mode === "plan" ? "planMode" : "actMode"
		const modeSpecificOption = `${modePrefix}${option.charAt(0).toUpperCase()}${option.slice(1)}`

		// Try mode-specific option first, then fall back to general option
		return (configuration as any)[modeSpecificOption] ?? (configuration as any)[option]
	}
}

/**
 * Global provider registry instance
 */
export const providerRegistry = new ProviderRegistry()
