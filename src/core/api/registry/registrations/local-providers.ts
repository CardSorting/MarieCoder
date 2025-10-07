import { LmStudioProvider } from "../../providers/local/lmstudio"
import { OllamaProvider } from "../../providers/local/ollama"
import { providerRegistry } from "../provider-registry"

/**
 * Local provider registrations
 * These are self-hosted and locally running AI providers
 * Follows NORMIE DEV methodology: clean, focused, maintainable
 */

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

/**
 * Register LMStudio provider
 */
providerRegistry.registerProvider({
	providerId: "lmstudio",
	handlerClass: LmStudioProvider,
	requiredOptions: ["lmStudioBaseUrl"],
	optionalOptions: ["lmStudioApiKey", "lmStudioModelId", "lmStudioModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})
