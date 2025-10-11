import type { ApiConfiguration } from "@shared/api"
import type { GlobalStateManager } from "../managers/global_state_manager"
import type { SecretsManager } from "../managers/secrets_manager"
import type { TaskStateManager } from "../managers/task_state_manager"

/**
 * Convenience service for managing API configuration
 * Composes API configuration from multiple state managers
 */
export class ApiConfigurationService {
	constructor(
		private readonly globalStateManager: GlobalStateManager,
		private readonly taskStateManager: TaskStateManager,
		private readonly secretsManager: SecretsManager,
	) {}

	/**
	 * Get complete API configuration
	 * Combines settings from secrets, global state, and task overrides
	 */
	getConfiguration(): ApiConfiguration {
		return {
			// Secrets
			apiKey: this.secretsManager.get("apiKey"),
			openRouterApiKey: this.secretsManager.get("openRouterApiKey"),

			// Global state with task overrides
			anthropicBaseUrl:
				this.taskStateManager.get("anthropicBaseUrl") || this.globalStateManager.getSettingsKey("anthropicBaseUrl"),
			openRouterProviderSorting:
				this.taskStateManager.get("openRouterProviderSorting") ||
				this.globalStateManager.getSettingsKey("openRouterProviderSorting"),
			requestTimeoutMs:
				this.taskStateManager.get("requestTimeoutMs") || this.globalStateManager.getSettingsKey("requestTimeoutMs"),

			// Plan mode configurations
			planModeApiProvider:
				this.taskStateManager.get("planModeApiProvider") || this.globalStateManager.getSettingsKey("planModeApiProvider"),
			planModeApiModelId:
				this.taskStateManager.get("planModeApiModelId") || this.globalStateManager.getSettingsKey("planModeApiModelId"),
			planModeThinkingBudgetTokens:
				this.taskStateManager.get("planModeThinkingBudgetTokens") ||
				this.globalStateManager.getSettingsKey("planModeThinkingBudgetTokens"),
			planModeReasoningEffort:
				this.taskStateManager.get("planModeReasoningEffort") ||
				this.globalStateManager.getSettingsKey("planModeReasoningEffort"),
			planModeOpenRouterModelId:
				this.taskStateManager.get("planModeOpenRouterModelId") ||
				this.globalStateManager.getSettingsKey("planModeOpenRouterModelId"),
			planModeOpenRouterModelInfo:
				this.taskStateManager.get("planModeOpenRouterModelInfo") ||
				this.globalStateManager.getSettingsKey("planModeOpenRouterModelInfo"),

			// Act mode configurations
			actModeApiProvider:
				this.taskStateManager.get("actModeApiProvider") || this.globalStateManager.getSettingsKey("actModeApiProvider"),
			actModeApiModelId:
				this.taskStateManager.get("actModeApiModelId") || this.globalStateManager.getSettingsKey("actModeApiModelId"),
			actModeThinkingBudgetTokens:
				this.taskStateManager.get("actModeThinkingBudgetTokens") ||
				this.globalStateManager.getSettingsKey("actModeThinkingBudgetTokens"),
			actModeReasoningEffort:
				this.taskStateManager.get("actModeReasoningEffort") ||
				this.globalStateManager.getSettingsKey("actModeReasoningEffort"),
			actModeOpenRouterModelId:
				this.taskStateManager.get("actModeOpenRouterModelId") ||
				this.globalStateManager.getSettingsKey("actModeOpenRouterModelId"),
			actModeOpenRouterModelInfo:
				this.taskStateManager.get("actModeOpenRouterModelInfo") ||
				this.globalStateManager.getSettingsKey("actModeOpenRouterModelInfo"),
		}
	}

	/**
	 * Set API configuration
	 * Decomposes configuration to appropriate state managers
	 * Returns keys for persistence scheduling
	 */
	setConfiguration(config: ApiConfiguration): {
		globalStateKeys: string[]
		secretKeys: string[]
	} {
		const {
			apiKey,
			openRouterApiKey,
			anthropicBaseUrl,
			openRouterProviderSorting,
			requestTimeoutMs,
			// Plan mode configurations
			planModeApiProvider,
			planModeApiModelId,
			planModeThinkingBudgetTokens,
			planModeReasoningEffort,
			planModeOpenRouterModelId,
			planModeOpenRouterModelInfo,
			// Act mode configurations
			actModeApiProvider,
			actModeApiModelId,
			actModeThinkingBudgetTokens,
			actModeReasoningEffort,
			actModeOpenRouterModelId,
			actModeOpenRouterModelInfo,
		} = config

		// Update global state batch
		this.globalStateManager.setBatch({
			// Plan mode configuration updates
			planModeApiProvider,
			planModeApiModelId,
			planModeThinkingBudgetTokens,
			planModeReasoningEffort,
			planModeOpenRouterModelId,
			planModeOpenRouterModelInfo,

			// Act mode configuration updates
			actModeApiProvider,
			actModeApiModelId,
			actModeThinkingBudgetTokens,
			actModeReasoningEffort,
			actModeOpenRouterModelId,
			actModeOpenRouterModelInfo,

			// Global state updates
			anthropicBaseUrl,
			openRouterProviderSorting,
			requestTimeoutMs,
		})

		// Update secrets batch
		this.secretsManager.setBatch({
			apiKey,
			openRouterApiKey,
		})

		return {
			globalStateKeys: [
				"planModeApiProvider",
				"planModeApiModelId",
				"planModeThinkingBudgetTokens",
				"planModeReasoningEffort",
				"planModeOpenRouterModelId",
				"planModeOpenRouterModelInfo",
				"actModeApiProvider",
				"actModeApiModelId",
				"actModeThinkingBudgetTokens",
				"actModeReasoningEffort",
				"actModeOpenRouterModelId",
				"actModeOpenRouterModelInfo",
				"anthropicBaseUrl",
				"openRouterProviderSorting",
				"requestTimeoutMs",
			],
			secretKeys: ["apiKey", "openRouterApiKey"],
		}
	}
}
