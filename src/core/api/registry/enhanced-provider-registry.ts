import { ApiConfiguration } from "@shared/api"
import { Mode } from "@shared/storage/types"
import type { ApiHandler, ApiHandlerOptions } from "../index"
import {
	EnhancedProviderConfig,
	ProviderCapabilities,
	ProviderCategory,
	ProviderComparison,
	ProviderMetadata,
	ProviderSearchOptions,
	ProviderStatus,
	ProviderValidationResult,
} from "./provider-metadata"

/**
 * Enhanced Provider Registry with comprehensive management capabilities
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 *
 * Features:
 * - Clear categorization and organization
 * - Comprehensive metadata and documentation
 * - Advanced search and filtering
 * - Provider comparison and recommendations
 * - Enhanced validation and error reporting
 * - Lifecycle management (deprecation, maintenance, etc.)
 */
export class EnhancedProviderRegistry {
	private providers: Map<string, EnhancedProviderConfig> = new Map()
	private categoryIndex: Map<ProviderCategory, Set<string>> = new Map()
	private statusIndex: Map<ProviderStatus, Set<string>> = new Map()
	private capabilityIndex: Map<string, Set<string>> = new Map()
	private tagIndex: Map<string, Set<string>> = new Map()

	/**
	 * Register a new provider with enhanced metadata
	 */
	registerProvider(config: EnhancedProviderConfig): void {
		// Validate provider configuration
		this.validateProviderConfig(config)

		// Store provider configuration
		this.providers.set(config.providerId, config)

		// Update indexes for efficient searching
		this.updateIndexes(config)

		console.log(`✅ Registered provider: ${config.providerId} (${config.metadata.category})`)
	}

	/**
	 * Get all registered provider IDs
	 */
	getSupportedProviders(): string[] {
		return Array.from(this.providers.keys())
	}

	/**
	 * Get providers by category
	 */
	getProvidersByCategory(category: ProviderCategory): string[] {
		const providerIds = this.categoryIndex.get(category)
		return providerIds ? Array.from(providerIds) : []
	}

	/**
	 * Get providers by status
	 */
	getProvidersByStatus(status: ProviderStatus): string[] {
		const providerIds = this.statusIndex.get(status)
		return providerIds ? Array.from(providerIds) : []
	}

	/**
	 * Search providers with advanced filtering
	 */
	searchProviders(options: ProviderSearchOptions): ProviderMetadata[] {
		let results = Array.from(this.providers.values()).map((config) => config.metadata)

		// Filter by category
		if (options.category) {
			results = results.filter((metadata) => metadata.category === options.category)
		}

		// Filter by status
		if (options.status) {
			results = results.filter((metadata) => metadata.status === options.status)
		}

		// Filter by capabilities
		if (options.capabilities) {
			results = results.filter((metadata) => {
				return this.hasCapabilities(metadata.capabilities, options.capabilities!)
			})
		}

		// Filter by mode support
		if (options.mode) {
			results = results.filter((metadata) => metadata.modeSupport[options.mode!] === true)
		}

		// Filter by tags
		if (options.tags) {
			results = results.filter((metadata) => {
				return options.tags!.some((tag) => metadata.tags?.includes(tag))
			})
		}

		// Text search
		if (options.searchQuery) {
			const query = options.searchQuery.toLowerCase()
			results = results.filter((metadata) => {
				return (
					metadata.providerId.toLowerCase().includes(query) ||
					metadata.documentation.name.toLowerCase().includes(query) ||
					metadata.documentation.description.toLowerCase().includes(query) ||
					metadata.tags?.some((tag) => tag.toLowerCase().includes(query))
				)
			})
		}

		return results
	}

	/**
	 * Get provider recommendations based on requirements
	 */
	getProviderRecommendations(
		requirements: Partial<ProviderCapabilities> & { mode?: Mode },
		limit: number = 5,
	): ProviderComparison[] {
		const allProviders = Array.from(this.providers.values())
		const comparisons: ProviderComparison[] = []

		for (const config of allProviders) {
			if (config.metadata.status !== ProviderStatus.ACTIVE) {
				continue
			}

			const score = this.calculateProviderScore(config.metadata, requirements)
			const reasons = this.generateRecommendationReasons(config.metadata, requirements)

			comparisons.push({
				providerId: config.providerId,
				score,
				reasons,
				metadata: config.metadata,
			})
		}

		return comparisons.sort((a, b) => b.score - a.score).slice(0, limit)
	}

	/**
	 * Validate configuration for a specific provider
	 */
	validateProviderConfiguration(providerId: string, configuration: ApiConfiguration, mode: Mode): ProviderValidationResult {
		const config = this.providers.get(providerId)
		if (!config) {
			return {
				isValid: false,
				errors: [`Unknown provider: ${providerId}`],
				warnings: [],
				suggestions: [],
				configuration: {},
			}
		}

		const result: ProviderValidationResult = {
			isValid: true,
			errors: [],
			warnings: [],
			suggestions: [],
			configuration: {},
		}

		// Check mode support
		if (!config.metadata.modeSupport[mode]) {
			result.errors.push(`Provider ${providerId} does not support mode: ${mode}`)
			result.isValid = false
		}

		// Validate required options
		for (const [option, schema] of Object.entries(config.metadata.configurationSchema.requiredOptions)) {
			const value = (configuration as any)[option]

			if (value === undefined || value === null) {
				result.errors.push(`Required option '${option}' is missing`)
				result.isValid = false
			} else {
				// Type validation
				if (schema.validation) {
					const validationResult = schema.validation(value)
					if (validationResult !== true) {
						result.errors.push(`Invalid value for '${option}': ${validationResult}`)
						result.isValid = false
					}
				}

				result.configuration[option as keyof ApiConfiguration] = value
			}
		}

		// Validate optional options
		for (const [option, schema] of Object.entries(config.metadata.configurationSchema.optionalOptions)) {
			const value = (configuration as any)[option]

			if (value !== undefined && value !== null) {
				if (schema.validation) {
					const validationResult = schema.validation(value)
					if (validationResult !== true) {
						result.warnings.push(`Invalid value for '${option}': ${validationResult}`)
					}
				}

				result.configuration[option as keyof ApiConfiguration] = value
			} else if (schema.default !== undefined) {
				result.configuration[option as keyof ApiConfiguration] = schema.default
				result.suggestions.push(`Consider setting '${option}' to: ${schema.default}`)
			}
		}

		// Check for deprecated providers
		if (config.metadata.status === ProviderStatus.DEPRECATED) {
			result.warnings.push(`Provider ${providerId} is deprecated. Consider migrating to a supported provider.`)
		}

		// Check for experimental providers
		if (config.metadata.status === ProviderStatus.EXPERIMENTAL) {
			result.warnings.push(`Provider ${providerId} is experimental. Use with caution in production.`)
		}

		return result
	}

	/**
	 * Create a handler for the specified provider
	 */
	createHandler(providerId: string, configuration: ApiConfiguration, mode: Mode, options: ApiHandlerOptions): ApiHandler {
		const config = this.providers.get(providerId)
		if (!config) {
			throw new Error(`Unknown provider: ${providerId}`)
		}

		// Validate configuration
		const validation = this.validateProviderConfiguration(providerId, configuration, mode)
		if (!validation.isValid) {
			throw new Error(`Invalid configuration for provider ${providerId}: ${validation.errors.join(", ")}`)
		}

		// Log warnings if any
		if (validation.warnings.length > 0) {
			console.warn(`Provider ${providerId} warnings: ${validation.warnings.join(", ")}`)
		}

		// Build provider options
		const providerOptions = this.buildProviderOptions(config, validation.configuration, mode, options)

		try {
			return new config.handlerClass(providerOptions)
		} catch (error) {
			throw new Error(
				`Failed to create handler for provider ${providerId}: ${error instanceof Error ? error.message : "Unknown error"}`,
			)
		}
	}

	/**
	 * Get provider metadata
	 */
	getProviderMetadata(providerId: string): ProviderMetadata | undefined {
		const config = this.providers.get(providerId)
		return config?.metadata
	}

	/**
	 * Get provider configuration schema
	 */
	getProviderConfigurationSchema(providerId: string) {
		const config = this.providers.get(providerId)
		return config?.metadata.configurationSchema
	}

	/**
	 * Check if provider is registered
	 */
	hasProvider(providerId: string): boolean {
		return this.providers.has(providerId)
	}

	/**
	 * Get provider statistics
	 */
	getProviderStatistics() {
		const stats = {
			total: this.providers.size,
			byCategory: {} as Record<ProviderCategory, number>,
			byStatus: {} as Record<ProviderStatus, number>,
			withCapabilities: {} as Record<string, number>,
		}

		// Count by category
		for (const category of Object.values(ProviderCategory)) {
			stats.byCategory[category] = this.categoryIndex.get(category)?.size || 0
		}

		// Count by status
		for (const status of Object.values(ProviderStatus)) {
			stats.byStatus[status] = this.statusIndex.get(status)?.size || 0
		}

		// Count by capabilities
		for (const [capability, providerIds] of this.capabilityIndex) {
			stats.withCapabilities[capability] = providerIds.size
		}

		return stats
	}

	/**
	 * Update provider status (for lifecycle management)
	 */
	updateProviderStatus(providerId: string, status: ProviderStatus): void {
		const config = this.providers.get(providerId)
		if (!config) {
			throw new Error(`Unknown provider: ${providerId}`)
		}

		// Remove from old status index
		const oldStatusIndex = this.statusIndex.get(config.metadata.status)
		oldStatusIndex?.delete(providerId)

		// Update metadata
		config.metadata.status = status
		config.metadata.lastUpdated = new Date()

		// Add to new status index
		if (!this.statusIndex.has(status)) {
			this.statusIndex.set(status, new Set())
		}
		this.statusIndex.get(status)!.add(providerId)

		console.log(`📝 Updated provider ${providerId} status to: ${status}`)
	}

	/**
	 * Private helper methods
	 */

	private validateProviderConfig(config: EnhancedProviderConfig): void {
		if (!config.providerId) {
			throw new Error("Provider ID is required")
		}

		if (!config.handlerClass) {
			throw new Error("Handler class is required")
		}

		if (!config.metadata) {
			throw new Error("Provider metadata is required")
		}

		if (config.providerId !== config.metadata.providerId) {
			throw new Error("Provider ID mismatch between config and metadata")
		}
	}

	private updateIndexes(config: EnhancedProviderConfig): void {
		const { providerId, metadata } = config

		// Category index
		if (!this.categoryIndex.has(metadata.category)) {
			this.categoryIndex.set(metadata.category, new Set())
		}
		this.categoryIndex.get(metadata.category)!.add(providerId)

		// Status index
		if (!this.statusIndex.has(metadata.status)) {
			this.statusIndex.set(metadata.status, new Set())
		}
		this.statusIndex.get(metadata.status)!.add(providerId)

		// Capability index
		Object.entries(metadata.capabilities).forEach(([capability, value]) => {
			if (value) {
				if (!this.capabilityIndex.has(capability)) {
					this.capabilityIndex.set(capability, new Set())
				}
				this.capabilityIndex.get(capability)!.add(providerId)
			}
		})

		// Tag index
		metadata.tags?.forEach((tag) => {
			if (!this.tagIndex.has(tag)) {
				this.tagIndex.set(tag, new Set())
			}
			this.tagIndex.get(tag)!.add(providerId)
		})
	}

	private hasCapabilities(
		providerCapabilities: ProviderCapabilities,
		requiredCapabilities: Partial<ProviderCapabilities>,
	): boolean {
		return Object.entries(requiredCapabilities).every(([capability, required]) => {
			if (required === undefined) {
				return true
			}
			return providerCapabilities[capability as keyof ProviderCapabilities] === required
		})
	}

	private calculateProviderScore(
		metadata: ProviderMetadata,
		requirements: Partial<ProviderCapabilities> & { mode?: Mode },
	): number {
		let score = 0

		// Base score for active providers
		if (metadata.status === ProviderStatus.ACTIVE) {
			score += 100
		} else if (metadata.status === ProviderStatus.EXPERIMENTAL) {
			score += 50
		} else if (metadata.status === ProviderStatus.DEPRECATED) {
			score -= 50
		}

		// Mode support
		if (requirements.mode && metadata.modeSupport[requirements.mode]) {
			score += 50
		}

		// Capability matching
		Object.entries(requirements).forEach(([capability, required]) => {
			if (capability === "mode") {
				return
			}

			const providerHasCapability = metadata.capabilities[capability as keyof ProviderCapabilities]
			if (required && providerHasCapability) {
				score += 25
			} else if (required && !providerHasCapability) {
				score -= 25
			}
		})

		// Performance bonus
		if (metadata.performance?.averageLatency && metadata.performance.averageLatency < 1000) {
			score += 10
		}

		return score
	}

	private generateRecommendationReasons(
		metadata: ProviderMetadata,
		requirements: Partial<ProviderCapabilities> & { mode?: Mode },
	): string[] {
		const reasons: string[] = []

		if (metadata.status === ProviderStatus.ACTIVE) {
			reasons.push("Active and well-maintained")
		}

		if (requirements.mode && metadata.modeSupport[requirements.mode]) {
			reasons.push(`Supports ${requirements.mode} mode`)
		}

		Object.entries(requirements).forEach(([capability, required]) => {
			if (capability === "mode") {
				return
			}

			const providerHasCapability = metadata.capabilities[capability as keyof ProviderCapabilities]
			if (required && providerHasCapability) {
				reasons.push(`Supports ${capability}`)
			}
		})

		if (metadata.performance?.averageLatency && metadata.performance.averageLatency < 1000) {
			reasons.push("Low latency performance")
		}

		return reasons
	}

	private buildProviderOptions(
		_config: EnhancedProviderConfig,
		configuration: Partial<ApiConfiguration>,
		_mode: Mode,
		commonOptions: ApiHandlerOptions,
	): any {
		const options: any = { ...commonOptions }

		// Add all configuration options
		Object.assign(options, configuration)

		return options
	}
}

/**
 * Global enhanced provider registry instance
 */
export const enhancedProviderRegistry = new EnhancedProviderRegistry()
