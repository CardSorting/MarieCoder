import { AnthropicProvider } from "../../providers/core/anthropic"
import { GeminiProvider } from "../../providers/core/gemini"
import { OpenAiProvider } from "../../providers/core/openai"
import { OllamaProvider } from "../../providers/local/ollama"
import { providerRegistry } from "../provider-registry"

/**
 * Core provider registrations
 * These are the most commonly used and essential providers
 * Follows NORMIE DEV methodology: clean, focused, maintainable
 */

/**
 * Register Anthropic provider
 */
providerRegistry.registerProvider({
	providerId: "anthropic",
	handlerClass: AnthropicProvider,
	requiredOptions: ["apiKey"],
	optionalOptions: ["anthropicBaseUrl", "apiModelId", "thinkingBudgetTokens"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register OpenAI provider
 */
providerRegistry.registerProvider({
	providerId: "openai",
	handlerClass: OpenAiProvider,
	requiredOptions: ["openAiApiKey"],
	optionalOptions: ["openAiBaseUrl", "azureApiVersion", "openAiHeaders", "openAiModelId", "openAiModelInfo", "reasoningEffort"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Gemini provider
 */
providerRegistry.registerProvider({
	providerId: "gemini",
	handlerClass: GeminiProvider,
	requiredOptions: ["geminiApiKey", "vertexProjectId"],
	optionalOptions: ["vertexRegion", "geminiBaseUrl", "thinkingBudgetTokens", "apiModelId", "ulid", "isVertex"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Ollama provider
 */
providerRegistry.registerProvider({
	providerId: "ollama",
	handlerClass: OllamaProvider,
	requiredOptions: ["ollamaModelId"],
	optionalOptions: ["ollamaBaseUrl", "ollamaApiKey", "ollamaApiOptionsCtxNum", "requestTimeoutMs"],
	modeSupport: {
		plan: true,
		act: true,
	},
})
