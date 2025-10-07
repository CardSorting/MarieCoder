import { DifyProvider } from "../../providers/platform/dify"
import { RequestyProvider } from "../../providers/platform/requesty"
import { VercelAIGatewayProvider } from "../../providers/platform/vercel-ai-gateway"
import { providerRegistry } from "../provider-registry"

/**
 * Platform provider registrations
 * These are platform-specific AI service providers
 * Follows NORMIE DEV methodology: clean, focused, maintainable
 */

/**
 * Register Dify provider
 */
providerRegistry.registerProvider({
	providerId: "dify",
	handlerClass: DifyProvider,
	requiredOptions: ["difyApiKey"],
	optionalOptions: ["difyBaseUrl", "difyModelId", "difyModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Vercel AI Gateway provider
 */
providerRegistry.registerProvider({
	providerId: "vercel-ai-gateway",
	handlerClass: VercelAIGatewayProvider,
	requiredOptions: ["vercelAIGatewayApiKey"],
	optionalOptions: ["vercelAIGatewayBaseUrl", "vercelAIGatewayModelId", "vercelAIGatewayModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Requesty provider
 */
providerRegistry.registerProvider({
	providerId: "requesty",
	handlerClass: RequestyProvider,
	requiredOptions: ["requestyApiKey"],
	optionalOptions: ["requestyBaseUrl", "requestyModelId", "requestyModelInfo", "reasoningEffort", "thinkingBudgetTokens"],
	modeSupport: {
		plan: true,
		act: true,
	},
})
