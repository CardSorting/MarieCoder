import { AnthropicProvider } from "../../providers/core/anthropic"
import { LmStudioProvider } from "../../providers/core/lmstudio"
import { OpenRouterProvider } from "../../providers/core/openrouter"
import { simpleRegistry } from "../simple_registry"

/**
 * Register Supported Providers
 * Anthropic, OpenRouter, and LMStudio
 * Follows MarieCoder standards: clean, intentional additions
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

// Register LMStudio
simpleRegistry.register({
	providerId: "lmstudio",
	handlerClass: LmStudioProvider,
	requiredFields: [], // No API key required for local server
})

// Export for use
export { simpleRegistry }
