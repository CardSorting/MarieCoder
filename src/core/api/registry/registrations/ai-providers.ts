import { FireworksProvider } from "../../providers/ai/fireworks"
import { HuggingFaceProvider } from "../../providers/ai/huggingface"
import { LiteLLMProvider } from "../../providers/ai/litellm"
import { MistralProvider } from "../../providers/ai/mistral"
import { TogetherProvider } from "../../providers/ai/together"
import { DeepSeekProvider } from "../../providers/core/deepseek"
import { MoonshotProvider } from "../../providers/core/moonshot"
import { QwenProvider } from "../../providers/core/qwen"
import { XAIProvider } from "../../providers/core/xai"
import { providerRegistry } from "../provider-registry"

/**
 * AI provider registrations
 * These are specialized AI service providers
 * Follows NORMIE DEV methodology: clean, focused, maintainable
 */

/**
 * Register DeepSeek provider
 */
providerRegistry.registerProvider({
	providerId: "deepseek",
	handlerClass: DeepSeekProvider,
	requiredOptions: ["deepSeekApiKey"],
	optionalOptions: ["deepSeekBaseUrl", "deepSeekModelId", "deepSeekModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Fireworks provider
 */
providerRegistry.registerProvider({
	providerId: "fireworks",
	handlerClass: FireworksProvider,
	requiredOptions: ["fireworksApiKey"],
	optionalOptions: ["fireworksBaseUrl", "fireworksModelId", "fireworksModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Together provider
 */
providerRegistry.registerProvider({
	providerId: "together",
	handlerClass: TogetherProvider,
	requiredOptions: ["togetherApiKey"],
	optionalOptions: ["togetherBaseUrl", "togetherModelId", "togetherModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Mistral provider
 */
providerRegistry.registerProvider({
	providerId: "mistral",
	handlerClass: MistralProvider,
	requiredOptions: ["mistralApiKey"],
	optionalOptions: ["mistralBaseUrl", "mistralModelId", "mistralModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register HuggingFace provider
 */
providerRegistry.registerProvider({
	providerId: "huggingface",
	handlerClass: HuggingFaceProvider,
	requiredOptions: ["huggingFaceApiKey"],
	optionalOptions: ["huggingFaceBaseUrl", "huggingFaceModelId", "huggingFaceModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register XAI provider
 */
providerRegistry.registerProvider({
	providerId: "xai",
	handlerClass: XAIProvider,
	requiredOptions: ["xaiApiKey"],
	optionalOptions: ["xaiBaseUrl", "xaiModelId", "xaiModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Moonshot provider
 */
providerRegistry.registerProvider({
	providerId: "moonshot",
	handlerClass: MoonshotProvider,
	requiredOptions: ["moonshotApiKey"],
	optionalOptions: ["moonshotBaseUrl", "moonshotModelId", "moonshotModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register LiteLLM provider
 */
providerRegistry.registerProvider({
	providerId: "litellm",
	handlerClass: LiteLLMProvider,
	requiredOptions: ["litellmApiKey"],
	optionalOptions: ["litellmBaseUrl", "litellmModelId", "litellmModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Qwen provider
 */
providerRegistry.registerProvider({
	providerId: "qwen",
	handlerClass: QwenProvider,
	requiredOptions: ["qwenApiKey"],
	optionalOptions: ["qwenBaseUrl", "qwenModelId", "qwenModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})
