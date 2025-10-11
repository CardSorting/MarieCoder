/**
 * Main API module entry point
 * Only Anthropic and OpenRouter are supported
 * Follows MARIECODER methodology: ruthlessly simple
 */

// Ensure provider registrations are loaded
import "./registry/enhanced-registrations"

export type { ApiHandler, ApiHandlerModel, ApiHandlerOptions, ProviderInfo } from "./api_service"
export { ApiService } from "./api_service"
export { BaseProvider, HttpProvider } from "./base"
export { simpleRegistry } from "./registry/enhanced-registrations"
export type { ProviderCapabilities, ProviderMetadata } from "./registry/provider-metadata"
export { ProviderCategory, ProviderStatus } from "./registry/provider-metadata"
export { ConfigurationService } from "./services/configuration-service"
export { ApiError, ApiErrorType, ErrorService } from "./services/error-service"
export { ProviderFactoryService } from "./services/provider-factory"
export type { ApiStream, ApiStreamUsageChunk } from "./transform/stream"
export { convertMessages, validateMessageFormat } from "./utils/message-transformers"
