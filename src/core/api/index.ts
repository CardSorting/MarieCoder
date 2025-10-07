/**
 * Main API module entry point
 * Clean re-exports following NORMIE DEV methodology
 */

// Ensure provider registrations are loaded
import "./registry/registrations"

export type { ApiHandler, ApiHandlerModel, ApiHandlerOptions, ProviderInfo } from "./api_service"
// Export main API service (use this directly!)
export { ApiService } from "./api_service"

// Export base classes
export { BaseProvider, HttpProvider } from "./base"

// Export registry and discovery services
export { enhancedProviderRegistry, ProviderDiscoveryService } from "./registry/enhanced-registrations"
// Export provider metadata types
export * from "./registry/provider-metadata"
export { providerRegistry } from "./registry/provider-registry"

// Export configuration and error services
export { ConfigurationService } from "./services/configuration-service"
export { ApiError, ApiErrorType, ErrorService } from "./services/error-service"
export { ProviderFactoryService } from "./services/provider-factory"

// Export stream types
export type { ApiStream, ApiStreamUsageChunk } from "./transform/stream"

// Export utility functions
export { convertMessages, validateMessageFormat } from "./utils/message-transformers"
