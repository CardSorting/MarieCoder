import { ApiConfiguration } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { enhancedProviderRegistry } from "./enhanced-provider-registry"
import {
	ProviderCapabilities,
	ProviderComparison,
	ProviderSearchOptions,
	ProviderStatus,
	ProviderValidationResult,
} from "./provider-metadata"

/**
 * Provider Discovery Service
 * Provides utilities for finding, comparing, and validating providers
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class ProviderDiscoveryService {
	/**
	 * Find providers by specific requirements
	 */
	static findProvidersByRequirements(
		requirements: Partial<ProviderCapabilities> & { mode?: Mode },
		options: {
			excludeDeprecated?: boolean
			excludeExperimental?: boolean
			maxResults?: number
		} = {},
	): ProviderComparison[] {
		const searchOptions: ProviderSearchOptions = {
			mode: requirements.mode,
			capabilities: requirements,
		}

		// Filter out deprecated/experimental if requested
		if (options.excludeDeprecated) {
			searchOptions.status = ProviderStatus.ACTIVE
		}

		const metadata = enhancedProviderRegistry.searchProviders(searchOptions)

		let results = metadata.map((meta) => ({
			providerId: meta.providerId,
			score: 0,
			reasons: [] as string[],
			metadata: meta,
		}))

		// Calculate scores and reasons
		results = results.map((result) => {
			const score = ProviderDiscoveryService.calculateRequirementScore(result.metadata, requirements)
			const reasons = ProviderDiscoveryService.generateRequirementReasons(result.metadata, requirements)

			return {
				...result,
				score,
				reasons,
			}
		})

		// Filter by status if needed
		if (options.excludeDeprecated) {
			results = results.filter((r) => r.metadata.status !== ProviderStatus.DEPRECATED)
		}

		if (options.excludeExperimental) {
			results = results.filter((r) => r.metadata.status !== ProviderStatus.EXPERIMENTAL)
		}

		// Sort by score and limit results
		results.sort((a, b) => b.score - a.score)

		if (options.maxResults) {
			results = results.slice(0, options.maxResults)
		}

		return results
	}

	/**
	 * Get provider recommendations for a specific use case
	 */
	static getRecommendationsForUseCase(
		useCase: "development" | "production" | "experimentation" | "cost-optimized" | "performance-optimized",
		mode?: Mode,
	): ProviderComparison[] {
		const requirements = ProviderDiscoveryService.getRequirementsForUseCase(useCase, mode)
		return ProviderDiscoveryService.findProvidersByRequirements(requirements, {
			excludeDeprecated: useCase === "production",
			excludeExperimental: useCase === "production",
			maxResults: 5,
		})
	}

	/**
	 * Validate configuration against multiple providers
	 */
	static validateConfigurationAcrossProviders(
		configuration: ApiConfiguration,
		mode: Mode,
		providerIds?: string[],
	): Map<string, ProviderValidationResult> {
		const results = new Map<string, ProviderValidationResult>()
		const providers = providerIds || enhancedProviderRegistry.getSupportedProviders()

		for (const providerId of providers) {
			try {
				const validation = enhancedProviderRegistry.validateProviderConfiguration(providerId, configuration, mode)
				results.set(providerId, validation)
			} catch (error) {
				results.set(providerId, {
					isValid: false,
					errors: [error instanceof Error ? error.message : "Unknown error"],
					warnings: [],
					suggestions: [],
					configuration: {},
				})
			}
		}

		return results
	}

	/**
	 * Find the best provider for a given configuration
	 */
	static findBestProviderForConfiguration(configuration: ApiConfiguration, mode: Mode): ProviderComparison | null {
		const providers = enhancedProviderRegistry.getSupportedProviders()
		const validations = ProviderDiscoveryService.validateConfigurationAcrossProviders(configuration, mode, providers)

		const validProviders = Array.from(validations.entries())
			.filter(([_, validation]) => validation.isValid)
			.map(([providerId, _]) => providerId)

		if (validProviders.length === 0) {
			return null
		}

		// Get recommendations for the first valid provider's capabilities
		const firstProvider = validProviders[0]
		const metadata = enhancedProviderRegistry.getProviderMetadata(firstProvider)
		if (!metadata) {
			return null
		}

		const requirements = {
			mode,
			...metadata.capabilities,
		}

		const recommendations = ProviderDiscoveryService.findProvidersByRequirements(requirements, {
			excludeDeprecated: true,
			maxResults: 1,
		})

		return recommendations.length > 0 ? recommendations[0] : null
	}

	/**
	 * Get provider comparison for decision making
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
		const results: ProviderComparison[] = []

		for (const providerId of providerIds) {
			const metadata = enhancedProviderRegistry.getProviderMetadata(providerId)
			if (!metadata) {
				continue
			}

			let score = 0
			const reasons: string[] = []

			// Base score based on status
			if (metadata.status === ProviderStatus.ACTIVE) {
				score += 100
				reasons.push("Active and supported")
			} else if (metadata.status === ProviderStatus.EXPERIMENTAL) {
				score += 50
				reasons.push("Experimental (use with caution)")
			} else if (metadata.status === ProviderStatus.DEPRECATED) {
				score -= 100
				reasons.push("Deprecated (not recommended)")
			}

			// Mode support
			if (criteria.mode && metadata.modeSupport[criteria.mode]) {
				score += 50
				reasons.push(`Supports ${criteria.mode} mode`)
			}

			// Capability matching
			if (criteria.capabilities) {
				Object.entries(criteria.capabilities).forEach(([capability, required]) => {
					if (required && metadata.capabilities[capability as keyof ProviderCapabilities]) {
						score += 25
						reasons.push(`Supports ${capability}`)
					} else if (required && !metadata.capabilities[capability as keyof ProviderCapabilities]) {
						score -= 25
						reasons.push(`Missing ${capability} support`)
					}
				})
			}

			// Cost optimization
			if (criteria.prioritizeCost && metadata.performance?.costPerToken) {
				if (metadata.performance.costPerToken < 0.001) {
					score += 30
					reasons.push("Low cost per token")
				} else if (metadata.performance.costPerToken > 0.01) {
					score -= 30
					reasons.push("High cost per token")
				}
			}

			// Performance optimization
			if (criteria.prioritizePerformance && metadata.performance?.averageLatency) {
				if (metadata.performance.averageLatency < 500) {
					score += 30
					reasons.push("Fast response time")
				} else if (metadata.performance.averageLatency > 2000) {
					score -= 30
					reasons.push("Slow response time")
				}
			}

			results.push({
				providerId,
				score,
				reasons,
				metadata,
			})
		}

		return results.sort((a, b) => b.score - a.score)
	}

	/**
	 * Get provider statistics and insights
	 */
	static getProviderInsights() {
		const stats = enhancedProviderRegistry.getProviderStatistics()

		const insights = {
			totalProviders: stats.total,
			categoryBreakdown: stats.byCategory,
			statusBreakdown: stats.byStatus,
			capabilityBreakdown: stats.withCapabilities,

			// Additional insights
			mostCommonCapabilities: ProviderDiscoveryService.getMostCommonCapabilities(),
			recommendedForProduction: ProviderDiscoveryService.getRecommendedForProduction(),
			recommendedForDevelopment: ProviderDiscoveryService.getRecommendedForDevelopment(),
		}

		return insights
	}

	/**
	 * Private helper methods
	 */

	private static getRequirementsForUseCase(
		useCase: "development" | "production" | "experimentation" | "cost-optimized" | "performance-optimized",
		mode?: Mode,
	): Partial<ProviderCapabilities> & { mode?: Mode } {
		const base = { mode }

		switch (useCase) {
			case "development":
				return {
					...base,
					streaming: true,
					functionCalling: true,
				}

			case "production":
				return {
					...base,
					streaming: true,
					rateLimitHandling: true,
					retryLogic: true,
					encryption: true,
				}

			case "experimentation":
				return {
					...base,
					streaming: true,
					reasoning: true,
					vision: true,
				}

			case "cost-optimized":
				return {
					...base,
					streaming: true,
				}

			case "performance-optimized":
				return {
					...base,
					streaming: true,
					caching: true,
					rateLimitHandling: true,
				}

			default:
				return base
		}
	}

	private static calculateRequirementScore(
		metadata: any,
		requirements: Partial<ProviderCapabilities> & { mode?: Mode },
	): number {
		let score = 0

		// Status scoring
		if (metadata.status === ProviderStatus.ACTIVE) {
			score += 100
		} else if (metadata.status === ProviderStatus.EXPERIMENTAL) {
			score += 50
		} else if (metadata.status === ProviderStatus.DEPRECATED) {
			score -= 100
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

			const providerHasCapability = metadata.capabilities[capability]
			if (required && providerHasCapability) {
				score += 25
			} else if (required && !providerHasCapability) {
				score -= 25
			}
		})

		return score
	}

	private static generateRequirementReasons(
		metadata: any,
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

			const providerHasCapability = metadata.capabilities[capability]
			if (required && providerHasCapability) {
				reasons.push(`Supports ${capability}`)
			}
		})

		return reasons
	}

	private static getMostCommonCapabilities(): string[] {
		const stats = enhancedProviderRegistry.getProviderStatistics()
		return Object.entries(stats.withCapabilities)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([capability]) => capability)
	}

	private static getRecommendedForProduction(): string[] {
		const recommendations = ProviderDiscoveryService.getRecommendationsForUseCase("production")
		return recommendations.map((r) => r.providerId)
	}

	private static getRecommendedForDevelopment(): string[] {
		const recommendations = ProviderDiscoveryService.getRecommendationsForUseCase("development")
		return recommendations.map((r) => r.providerId)
	}
}
