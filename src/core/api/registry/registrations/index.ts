/**
 * Provider registration index
 * This file imports all provider registrations to ensure they are loaded
 * Follows NORMIE DEV methodology: clean, organized, maintainable
 */

// Import all provider registration files
import "./core-providers"
import "./cloud-providers"
import "./ai-providers"
import "./enterprise-providers"
import "./platform-providers"
import "./local-providers"

// Export the registry for external use
export { providerRegistry } from "../provider-registry"
