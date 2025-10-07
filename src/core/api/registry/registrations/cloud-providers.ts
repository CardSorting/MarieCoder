import { BedrockProvider } from "../../providers/cloud/bedrock"
import { GroqProvider } from "../../providers/cloud/groq"
import { OpenRouterProvider } from "../../providers/cloud/openrouter"
import { providerRegistry } from "../provider-registry"

/**
 * Cloud provider registrations
 * These are cloud-based AI service providers
 * Follows NORMIE DEV methodology: clean, focused, maintainable
 */

/**
 * Register Bedrock provider
 */
providerRegistry.registerProvider({
	providerId: "bedrock",
	handlerClass: BedrockProvider,
	requiredOptions: ["awsAccessKey", "awsSecretKey", "awsRegion"],
	optionalOptions: [
		"awsSessionToken",
		"awsAuthentication",
		"awsBedrockApiKey",
		"awsUseCrossRegionInference",
		"awsBedrockUsePromptCache",
		"awsUseProfile",
		"awsProfile",
		"awsBedrockEndpoint",
		"awsBedrockCustomSelected",
		"awsBedrockCustomModelBaseId",
		"thinkingBudgetTokens",
	],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Groq provider
 */
providerRegistry.registerProvider({
	providerId: "groq",
	handlerClass: GroqProvider,
	requiredOptions: ["groqApiKey"],
	optionalOptions: ["groqModelId", "groqModelInfo", "apiModelId"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register OpenRouter provider
 */
providerRegistry.registerProvider({
	providerId: "openrouter",
	handlerClass: OpenRouterProvider,
	requiredOptions: ["openRouterApiKey"],
	optionalOptions: [
		"openRouterModelId",
		"openRouterModelInfo",
		"openRouterProviderSorting",
		"reasoningEffort",
		"thinkingBudgetTokens",
	],
	modeSupport: {
		plan: true,
		act: true,
	},
})
