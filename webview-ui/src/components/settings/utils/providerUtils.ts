import {
	ApiConfiguration,
	ApiProvider,
	anthropicDefaultModelId,
	anthropicModels,
	ModelInfo,
	openRouterDefaultModelId,
	openRouterDefaultModelInfo,
} from "@shared/api"
import { Mode } from "@shared/storage/types"

/**
 * Interface for normalized API configuration
 */
export interface NormalizedApiConfig {
	selectedProvider: ApiProvider
	selectedModelId: string
	selectedModelInfo: ModelInfo
}

/**
 * Normalizes API configuration to ensure consistent values
 * Only supports Anthropic and OpenRouter providers
 */
export function normalizeApiConfiguration(
	apiConfiguration: ApiConfiguration | undefined,
	currentMode: Mode,
): NormalizedApiConfig {
	const provider =
		(currentMode === "plan" ? apiConfiguration?.planModeApiProvider : apiConfiguration?.actModeApiProvider) || "anthropic"
	const modelId = currentMode === "plan" ? apiConfiguration?.planModeApiModelId : apiConfiguration?.actModeApiModelId

	const getProviderData = (models: Record<string, ModelInfo>, defaultId: string) => {
		let selectedModelId: string
		let selectedModelInfo: ModelInfo
		if (modelId && modelId in models) {
			selectedModelId = modelId
			selectedModelInfo = models[modelId]
		} else {
			selectedModelId = defaultId
			selectedModelInfo = models[defaultId]
		}
		return {
			selectedProvider: provider,
			selectedModelId,
			selectedModelInfo,
		}
	}

	switch (provider) {
		case "anthropic":
			return getProviderData(anthropicModels, anthropicDefaultModelId)
		case "openrouter":
			const openRouterModelId =
				currentMode === "plan" ? apiConfiguration?.planModeOpenRouterModelId : apiConfiguration?.actModeOpenRouterModelId
			const openRouterModelInfo =
				currentMode === "plan"
					? apiConfiguration?.planModeOpenRouterModelInfo
					: apiConfiguration?.actModeOpenRouterModelInfo
			return {
				selectedProvider: provider,
				selectedModelId: openRouterModelId || openRouterDefaultModelId,
				selectedModelInfo: openRouterModelInfo || openRouterDefaultModelInfo,
			}
		default:
			return getProviderData(anthropicModels, anthropicDefaultModelId)
	}
}

/**
 * Gets mode-specific field values from API configuration
 * @param apiConfiguration The API configuration object
 * @param mode The current mode ("plan" or "act")
 * @returns Object containing mode-specific field values for clean destructuring
 */
export function getModeSpecificFields(apiConfiguration: ApiConfiguration | undefined, mode: Mode) {
	if (!apiConfiguration) {
		return {
			apiProvider: undefined,
			apiModelId: undefined,
			openRouterModelId: undefined,
			openRouterModelInfo: undefined,
			lmStudioModelId: undefined,
			thinkingBudgetTokens: undefined,
			reasoningEffort: undefined,
		}
	}

	return {
		apiProvider: mode === "plan" ? apiConfiguration.planModeApiProvider : apiConfiguration.actModeApiProvider,
		apiModelId: mode === "plan" ? apiConfiguration.planModeApiModelId : apiConfiguration.actModeApiModelId,
		openRouterModelId:
			mode === "plan" ? apiConfiguration.planModeOpenRouterModelId : apiConfiguration.actModeOpenRouterModelId,
		openRouterModelInfo:
			mode === "plan" ? apiConfiguration.planModeOpenRouterModelInfo : apiConfiguration.actModeOpenRouterModelInfo,
		lmStudioModelId: mode === "plan" ? apiConfiguration.planModeLmStudioModelId : apiConfiguration.actModeLmStudioModelId,
		thinkingBudgetTokens:
			mode === "plan" ? apiConfiguration.planModeThinkingBudgetTokens : apiConfiguration.actModeThinkingBudgetTokens,
		reasoningEffort: mode === "plan" ? apiConfiguration.planModeReasoningEffort : apiConfiguration.actModeReasoningEffort,
	}
}

/**
 * Determines if the model supports thinking budget
 */
export function supportsThinkingBudget(provider: ApiProvider | undefined): boolean {
	return provider === "anthropic"
}

/**
 * Updates mode-specific fields when copying configuration between modes
 */
export function createModeSpecificUpdates(sourceFields: ReturnType<typeof getModeSpecificFields>, targetMode: Mode) {
	const updates: Partial<ApiConfiguration> = {}
	const prefix = targetMode === "plan" ? "planMode" : "actMode"

	// Core fields
	updates[`${prefix}ApiProvider` as keyof ApiConfiguration] = sourceFields.apiProvider as any
	updates[`${prefix}ApiModelId` as keyof ApiConfiguration] = sourceFields.apiModelId as any
	updates[`${prefix}ThinkingBudgetTokens` as keyof ApiConfiguration] = sourceFields.thinkingBudgetTokens as any
	updates[`${prefix}ReasoningEffort` as keyof ApiConfiguration] = sourceFields.reasoningEffort as any

	// OpenRouter-specific fields
	updates[`${prefix}OpenRouterModelId` as keyof ApiConfiguration] = sourceFields.openRouterModelId as any
	updates[`${prefix}OpenRouterModelInfo` as keyof ApiConfiguration] = sourceFields.openRouterModelInfo as any

	return updates
}

/**
 * Synchronizes configuration between modes
 */
export async function syncModeConfigurations(
	apiConfiguration: ApiConfiguration | undefined,
	sourceMode: Mode,
	handleFieldsChange: (updates: Partial<ApiConfiguration>) => void,
) {
	if (!apiConfiguration) {
		return
	}

	const sourceFields = getModeSpecificFields(apiConfiguration, sourceMode)
	const targetMode: Mode = sourceMode === "plan" ? "act" : "plan"
	const updates = createModeSpecificUpdates(sourceFields, targetMode)

	handleFieldsChange(updates)
}
