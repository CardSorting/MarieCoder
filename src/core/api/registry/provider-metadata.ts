/**
 * Provider Metadata Types
 * Minimal definitions for provider capabilities and metadata
 * Follows MARIECODER methodology: only what's actually used
 */

/**
 * Provider category classification
 */
export enum ProviderCategory {
	AI = "ai",
	UTILITY = "utility",
	INTEGRATION = "integration",
}

/**
 * Provider operational status
 */
export enum ProviderStatus {
	ACTIVE = "active",
	DEPRECATED = "deprecated",
	EXPERIMENTAL = "experimental",
}

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
	streaming: boolean
	functionCalling?: boolean
	vision?: boolean
	caching?: boolean
}

/**
 * Minimal provider metadata
 */
export interface ProviderMetadata {
	providerId: string
	category: ProviderCategory
	status: ProviderStatus
}
