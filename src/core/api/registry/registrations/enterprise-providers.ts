import { CerebrasProvider } from "../../providers/core/cerebras"
import { ZAIProvider } from "../../providers/core/zai"
import { AskSageProvider } from "../../providers/enterprise/asksage"
import { BasetenProvider } from "../../providers/enterprise/baseten"
import { DoubaoProvider } from "../../providers/enterprise/doubao"
import { NebiusProvider } from "../../providers/enterprise/nebius"
import { OCAProvider } from "../../providers/enterprise/oca"
import { SambanovaProvider } from "../../providers/enterprise/sambanova"
import { providerRegistry } from "../provider-registry"

/**
 * Enterprise provider registrations
 * These are enterprise-focused AI service providers
 * Follows NORMIE DEV methodology: clean, focused, maintainable
 */

/**
 * Register Doubao provider
 */
providerRegistry.registerProvider({
	providerId: "doubao",
	handlerClass: DoubaoProvider,
	requiredOptions: ["doubaoApiKey"],
	optionalOptions: ["doubaoBaseUrl", "doubaoModelId", "doubaoModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Nebius provider
 */
providerRegistry.registerProvider({
	providerId: "nebius",
	handlerClass: NebiusProvider,
	requiredOptions: ["nebiusApiKey"],
	optionalOptions: ["nebiusBaseUrl", "nebiusModelId", "nebiusModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register AskSage provider
 */
providerRegistry.registerProvider({
	providerId: "asksage",
	handlerClass: AskSageProvider,
	requiredOptions: ["askSageApiKey"],
	optionalOptions: ["askSageBaseUrl", "askSageModelId", "askSageModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Sambanova provider
 */
providerRegistry.registerProvider({
	providerId: "sambanova",
	handlerClass: SambanovaProvider,
	requiredOptions: ["sambanovaApiKey"],
	optionalOptions: ["sambanovaBaseUrl", "sambanovaModelId", "sambanovaModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Cerebras provider
 */
providerRegistry.registerProvider({
	providerId: "cerebras",
	handlerClass: CerebrasProvider,
	requiredOptions: ["cerebrasApiKey"],
	optionalOptions: ["cerebrasBaseUrl", "cerebrasModelId", "cerebrasModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register Baseten provider
 */
providerRegistry.registerProvider({
	providerId: "baseten",
	handlerClass: BasetenProvider,
	requiredOptions: ["basetenApiKey"],
	optionalOptions: ["basetenBaseUrl", "basetenModelId", "basetenModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register ZAI provider
 */
providerRegistry.registerProvider({
	providerId: "zai",
	handlerClass: ZAIProvider,
	requiredOptions: ["zaiApiKey"],
	optionalOptions: ["zaiBaseUrl", "zaiModelId", "zaiModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})

/**
 * Register OCA provider
 */
providerRegistry.registerProvider({
	providerId: "oca",
	handlerClass: OCAProvider,
	requiredOptions: ["ocaApiKey"],
	optionalOptions: ["ocaBaseUrl", "ocaModelId", "ocaModelInfo"],
	modeSupport: {
		plan: true,
		act: true,
	},
})
