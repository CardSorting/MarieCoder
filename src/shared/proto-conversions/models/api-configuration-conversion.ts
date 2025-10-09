import {
	OpenRouterModelInfo,
	ModelsApiConfiguration as ProtoApiConfiguration,
	ApiProvider as ProtoApiProvider,
	ThinkingConfig,
} from "@shared/proto/cline/models"
import { ApiConfiguration, ApiProvider, ModelInfo } from "../../api"

// Convert application ThinkingConfig to proto ThinkingConfig
function convertThinkingConfigToProto(config: ModelInfo["thinkingConfig"]): ThinkingConfig | undefined {
	if (!config) {
		return undefined
	}

	return {
		maxBudget: config.maxBudget,
		outputPrice: config.outputPrice,
		outputPriceTiers:
			config.outputPriceTiers?.map((tier) => ({
				tokenLimit: tier.tokenLimit,
				price: tier.price,
			})) || [],
	}
}

// Convert application ModelInfo to proto OpenRouterModelInfo
function convertModelInfoToProtoOpenRouter(info: ModelInfo | undefined): OpenRouterModelInfo | undefined {
	if (!info) {
		return undefined
	}

	return {
		maxTokens: info.maxTokens,
		contextWindow: info.contextWindow,
		supportsImages: info.supportsImages,
		supportsPromptCache: info.supportsPromptCache,
		inputPrice: info.inputPrice,
		outputPrice: info.outputPrice,
		cacheWritesPrice: info.cacheWritesPrice,
		cacheReadsPrice: info.cacheReadsPrice,
		description: info.description,
		thinkingConfig: convertThinkingConfigToProto(info.thinkingConfig),
		tiers:
			info.tiers?.map((tier) => ({
				contextWindow: tier.contextWindow,
				inputPrice: tier.inputPrice,
				outputPrice: tier.outputPrice,
				cacheWritesPrice: tier.cacheWritesPrice,
				cacheReadsPrice: tier.cacheReadsPrice,
			})) || [],
	}
}

// Convert proto OpenRouterModelInfo to application ModelInfo
function convertProtoToModelInfo(info: OpenRouterModelInfo | undefined): ModelInfo | undefined {
	if (!info) {
		return undefined
	}

	return {
		maxTokens: info.maxTokens,
		contextWindow: info.contextWindow,
		supportsImages: info.supportsImages,
		supportsPromptCache: info.supportsPromptCache,
		inputPrice: info.inputPrice,
		outputPrice: info.outputPrice,
		cacheWritesPrice: info.cacheWritesPrice,
		cacheReadsPrice: info.cacheReadsPrice,
		description: info.description,
		thinkingConfig: info.thinkingConfig
			? {
					maxBudget: info.thinkingConfig.maxBudget,
					outputPrice: info.thinkingConfig.outputPrice,
					outputPriceTiers: info.thinkingConfig.outputPriceTiers?.map((tier) => ({
						tokenLimit: tier.tokenLimit,
						price: tier.price,
					})),
				}
			: undefined,
		tiers: info.tiers?.map((tier) => ({
			contextWindow: tier.contextWindow,
			inputPrice: tier.inputPrice,
			outputPrice: tier.outputPrice,
			cacheWritesPrice: tier.cacheWritesPrice,
			cacheReadsPrice: tier.cacheReadsPrice,
		})),
	}
}

// Convert application ApiProvider to proto ApiProvider
function convertApiProviderToProto(provider: string | undefined): ProtoApiProvider {
	switch (provider) {
		case "anthropic":
			return ProtoApiProvider.ANTHROPIC
		case "openrouter":
			return ProtoApiProvider.OPENROUTER
		default:
			return ProtoApiProvider.ANTHROPIC
	}
}

// Convert proto ApiProvider to application ApiProvider
export function convertProtoToApiProvider(provider: ProtoApiProvider): ApiProvider {
	switch (provider) {
		case ProtoApiProvider.ANTHROPIC:
			return "anthropic"
		case ProtoApiProvider.OPENROUTER:
			return "openrouter"
		default:
			return "anthropic"
	}
}

// Converts application ApiConfiguration to proto ApiConfiguration
export function convertApiConfigurationToProto(config: ApiConfiguration): ProtoApiConfiguration {
	return {
		// Global configuration fields
		apiKey: config.apiKey,
		ulid: config.ulid,
		anthropicBaseUrl: config.anthropicBaseUrl,
		openRouterApiKey: config.openRouterApiKey,
		openRouterProviderSorting: config.openRouterProviderSorting,
		openAiHeaders: {},
		requestTimeoutMs: config.requestTimeoutMs,

		// Plan mode configurations
		planModeApiProvider: config.planModeApiProvider ? convertApiProviderToProto(config.planModeApiProvider) : undefined,
		planModeApiModelId: config.planModeApiModelId,
		planModeThinkingBudgetTokens: config.planModeThinkingBudgetTokens,
		planModeReasoningEffort: config.planModeReasoningEffort,
		planModeOpenRouterModelId: config.planModeOpenRouterModelId,
		planModeOpenRouterModelInfo: convertModelInfoToProtoOpenRouter(config.planModeOpenRouterModelInfo),

		// Act mode configurations
		actModeApiProvider: config.actModeApiProvider ? convertApiProviderToProto(config.actModeApiProvider) : undefined,
		actModeApiModelId: config.actModeApiModelId,
		actModeThinkingBudgetTokens: config.actModeThinkingBudgetTokens,
		actModeReasoningEffort: config.actModeReasoningEffort,
		actModeOpenRouterModelId: config.actModeOpenRouterModelId,
		actModeOpenRouterModelInfo: convertModelInfoToProtoOpenRouter(config.actModeOpenRouterModelInfo),
	}
}

// Converts proto ApiConfiguration to application ApiConfiguration
export function convertProtoToApiConfiguration(protoConfig: ProtoApiConfiguration): ApiConfiguration {
	return {
		apiKey: protoConfig.apiKey,
		openRouterApiKey: protoConfig.openRouterApiKey,
		ulid: protoConfig.ulid,
		anthropicBaseUrl: protoConfig.anthropicBaseUrl,
		openRouterProviderSorting: protoConfig.openRouterProviderSorting,
		requestTimeoutMs: protoConfig.requestTimeoutMs,

		planModeApiProvider: protoConfig.planModeApiProvider
			? convertProtoToApiProvider(protoConfig.planModeApiProvider)
			: undefined,
		planModeApiModelId: protoConfig.planModeApiModelId,
		planModeThinkingBudgetTokens: protoConfig.planModeThinkingBudgetTokens,
		planModeReasoningEffort: protoConfig.planModeReasoningEffort,
		planModeOpenRouterModelId: protoConfig.planModeOpenRouterModelId,
		planModeOpenRouterModelInfo: convertProtoToModelInfo(protoConfig.planModeOpenRouterModelInfo),

		actModeApiProvider: protoConfig.actModeApiProvider
			? convertProtoToApiProvider(protoConfig.actModeApiProvider)
			: undefined,
		actModeApiModelId: protoConfig.actModeApiModelId,
		actModeThinkingBudgetTokens: protoConfig.actModeThinkingBudgetTokens,
		actModeReasoningEffort: protoConfig.actModeReasoningEffort,
		actModeOpenRouterModelId: protoConfig.actModeOpenRouterModelId,
		actModeOpenRouterModelInfo: convertProtoToModelInfo(protoConfig.actModeOpenRouterModelInfo),
	}
}
