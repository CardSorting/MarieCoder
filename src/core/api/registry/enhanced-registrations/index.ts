/**
 * Enhanced Provider Registration Index
 * This file imports all enhanced provider registrations to ensure they are loaded
 * Follows NORMIE DEV methodology: clean, organized, maintainable
 *
 * Features:
 * - Clear categorization by provider type
 * - Comprehensive metadata for each provider
 * - Enhanced validation and error reporting
 * - Provider discovery and recommendation capabilities
 */

// Import all enhanced provider registration files
import "./core-providers"
import "./cloud-providers"
import "./ai-providers"
import "./enterprise-providers"
import "./platform-providers"
import "./local-providers"

// Export the enhanced registry for external use
export { enhancedProviderRegistry } from "../enhanced-provider-registry"
export { ProviderDiscoveryService } from "../provider-discovery"
export * from "../provider-metadata"
