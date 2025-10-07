import { ApiConfiguration } from "@shared/api"
import { Mode } from "@shared/storage/types"

/**
 * Provider category enumeration for clear organization
 * Follows NORMIE DEV methodology: clean, organized, maintainable
 */
export enum ProviderCategory {
	// Core providers - most commonly used, essential providers
	CORE = "core",

	// Cloud providers - major cloud platform AI services
	CLOUD = "cloud",

	// AI providers - specialized AI service providers
	AI = "ai",

	// Enterprise providers - enterprise-focused AI services
	ENTERPRISE = "enterprise",

	// Platform providers - platform-specific AI integrations
	PLATFORM = "platform",

	// Local providers - local/self-hosted AI services
	LOCAL = "local",

	// Gateway providers - API gateway and proxy services
	GATEWAY = "gateway",
}

/**
 * Provider capability flags for feature detection
 */
export interface ProviderCapabilities {
	// Core capabilities
	streaming?: boolean
	functionCalling?: boolean
	vision?: boolean
	reasoning?: boolean

	// Advanced features
	toolUse?: boolean
	codeGeneration?: boolean
	imageGeneration?: boolean
	audioGeneration?: boolean

	// Performance features
	caching?: boolean
	rateLimitHandling?: boolean
	retryLogic?: boolean

	// Security features
	encryption?: boolean
	authentication?: string[] // ['api_key', 'oauth', 'jwt', etc.]
}

/**
 * Provider status for lifecycle management
 */
export enum ProviderStatus {
	ACTIVE = "active",
	DEPRECATED = "deprecated",
	EXPERIMENTAL = "experimental",
	MAINTENANCE = "maintenance",
	DISCONTINUED = "discontinued",
}

/**
 * Provider documentation and metadata
 */
export interface ProviderDocumentation {
	name: string
	description: string
	website?: string
	documentationUrl?: string
	apiReferenceUrl?: string
	pricingUrl?: string

	// Feature descriptions
	features?: string[]

	// Configuration examples
	configurationExamples?: {
		[key: string]: {
			description: string
			example: Partial<ApiConfiguration>
		}
	}

	// Known limitations
	limitations?: string[]

	// Best practices
	bestPractices?: string[]
}

/**
 * Provider configuration schema for validation
 */
export interface ProviderConfigurationSchema {
	requiredOptions: {
		[key: string]: {
			type: "string" | "number" | "boolean" | "object" | "array"
			description: string
			example?: any
			validation?: (value: any) => boolean | string
		}
	}

	optionalOptions: {
		[key: string]: {
			type: "string" | "number" | "boolean" | "object" | "array"
			description: string
			default?: any
			example?: any
			validation?: (value: any) => boolean | string
		}
	}
}

/**
 * Enhanced provider metadata interface
 * Provides comprehensive information about each provider
 */
export interface ProviderMetadata {
	// Basic identification
	providerId: string
	category: ProviderCategory
	status: ProviderStatus

	// Provider information
	documentation: ProviderDocumentation

	// Technical capabilities
	capabilities: ProviderCapabilities

	// Configuration schema
	configurationSchema: ProviderConfigurationSchema

	// Mode support
	modeSupport: {
		plan?: boolean
		act?: boolean
	}

	// Version and compatibility
	version?: string
	minimumApiVersion?: string
	maximumApiVersion?: string

	// Dependencies and requirements
	dependencies?: string[]
	requirements?: {
		nodeVersion?: string
		platform?: string[]
		architecture?: string[]
	}

	// Performance characteristics
	performance?: {
		averageLatency?: number // milliseconds
		maxThroughput?: number // requests per second
		costPerToken?: number // estimated cost
	}

	// Tags for search and filtering
	tags?: string[]

	// Last updated timestamp
	lastUpdated: Date

	// Provider-specific metadata
	customMetadata?: Record<string, any>
}

/**
 * Provider registration interface with enhanced metadata
 */
export interface EnhancedProviderConfig {
	// Core registration data
	providerId: string
	handlerClass: new (options: any) => any

	// Enhanced metadata
	metadata: ProviderMetadata

	// Legacy compatibility (for backward compatibility)
	requiredOptions?: string[]
	optionalOptions?: string[]
	modeSupport?: {
		plan?: boolean
		act?: boolean
	}
}

/**
 * Provider search and filter options
 */
export interface ProviderSearchOptions {
	category?: ProviderCategory
	status?: ProviderStatus
	capabilities?: Partial<ProviderCapabilities>
	mode?: Mode
	tags?: string[]
	searchQuery?: string
}

/**
 * Provider comparison interface for decision making
 */
export interface ProviderComparison {
	providerId: string
	score: number
	reasons: string[]
	metadata: ProviderMetadata
}

/**
 * Provider validation result
 */
export interface ProviderValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
	suggestions: string[]
	configuration: Partial<ApiConfiguration>
}
