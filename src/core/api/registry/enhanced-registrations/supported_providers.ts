import { AnthropicProvider } from "../../providers/core/anthropic"
import { OpenRouterProvider } from "../../providers/core/openrouter"
import { simpleRegistry } from "../simple_registry"

/**
 * Register Supported Providers
 * Only Anthropic and OpenRouter
 * Follows NORMIE DEV methodology: ruthlessly simple
 */

// Register Anthropic
simpleRegistry.register({
	providerId: "anthropic",
	handlerClass: AnthropicProvider,
	requiredFields: ["apiKey"],
})

// Register OpenRouter
simpleRegistry.register({
	providerId: "openrouter",
	handlerClass: OpenRouterProvider,
	requiredFields: ["openRouterApiKey"],
})

// Export for use
export { simpleRegistry }
