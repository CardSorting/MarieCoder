import { ApiConfiguration, ModelInfo } from "@shared/api"
import { Mode } from "@shared/storage/types"

/**
 * Configuration validation result
 */
export interface ConfigurationValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
}

/**
 * Mode-specific configuration extractor
 */
export interface ModeConfiguration {
	apiProvider: string
	apiModelId: string
	modelInfo?: ModelInfo
	thinkingBudgetTokens?: number
	reasoningEffort?: string
	[key: string]: any
}

/**
 * Configuration management service
 * Centralizes configuration handling and validation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class ConfigurationService {
	/**
	 * Extract mode-specific configuration from full configuration
	 */
	static extractModeConfiguration(configuration: ApiConfiguration, mode: Mode): ModeConfiguration {
		const _modePrefix = mode === "plan" ? "planMode" : "actMode"

		return {
			apiProvider: mode === "plan" ? configuration.planModeApiProvider : configuration.actModeApiProvider,
			apiModelId: ConfigurationService.getModeValue(configuration, "apiModelId", mode),
			modelInfo: ConfigurationService.getModeValue(configuration, "modelInfo", mode),
			thinkingBudgetTokens: ConfigurationService.getModeValue(configuration, "thinkingBudgetTokens", mode),
			reasoningEffort: ConfigurationService.getModeValue(configuration, "reasoningEffort", mode),
			// Add other mode-specific configurations as needed
			...ConfigurationService.extractProviderSpecificConfig(configuration, mode),
		}
	}

	/**
	 * Validate configuration for a specific provider and mode
	 */
	static validateConfiguration(configuration: ApiConfiguration, providerId: string, mode: Mode): ConfigurationValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		// Extract mode-specific configuration
		const modeConfig = ConfigurationService.extractModeConfiguration(configuration, mode)

		// Validate provider is set
		if (!modeConfig.apiProvider) {
			errors.push(`API provider is required for ${mode} mode`)
		}

		// Validate model ID is set
		if (!modeConfig.apiModelId) {
			errors.push(`API model ID is required for ${mode} mode`)
		}

		// Provider-specific validation
		ConfigurationService.validateProviderSpecificConfig(configuration, providerId, mode, errors, warnings)

		// Validate thinking budget tokens
		if (modeConfig.thinkingBudgetTokens && modeConfig.thinkingBudgetTokens < 0) {
			errors.push("Thinking budget tokens must be non-negative")
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Get mode-specific value from configuration
	 */
	private static getModeValue<T>(configuration: ApiConfiguration, key: string, mode: Mode): T | undefined {
		const modePrefix = mode === "plan" ? "planMode" : "actMode"
		const modeKey = `${modePrefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`

		return (configuration as any)[modeKey] ?? (configuration as any)[key]
	}

	/**
	 * Extract provider-specific configuration
	 */
	private static extractProviderSpecificConfig(configuration: ApiConfiguration, mode: Mode): Record<string, any> {
		const providerConfig: Record<string, any> = {}
		const _modePrefix = mode === "plan" ? "planMode" : "actMode"

		// Extract common provider configurations
		const commonKeys = [
			"apiKey",
			"baseUrl",
			"headers",
			"timeout",
			"openAiApiKey",
			"openAiBaseUrl",
			"azureApiVersion",
			"anthropicBaseUrl",
			"geminiApiKey",
			"geminiBaseUrl",
			"ollamaBaseUrl",
			"ollamaApiKey",
			"ollamaModelId",
			"vertexProjectId",
			"vertexRegion",
			"awsAccessKey",
			"awsSecretKey",
			"awsRegion",
			"groqApiKey",
			"groqModelId",
			"fireworksApiKey",
			"fireworksModelId",
			"togetherApiKey",
			"togetherModelId",
			"mistralApiKey",
			"deepSeekApiKey",
			"qwenApiKey",
			"doubaoApiKey",
			"moonshotApiKey",
			"huggingFaceApiKey",
			"nebiusApiKey",
			"asksageApiKey",
			"xaiApiKey",
			"sambanovaApiKey",
			"cerebrasApiKey",
			"basetenApiKey",
			"sapAiCoreClientId",
			"sapAiCoreClientSecret",
			"claudeCodePath",
			"huaweiCloudMaasApiKey",
			"difyApiKey",
			"vercelAiGatewayApiKey",
			"zaiApiKey",
			"ocaBaseUrl",
			"liteLlmApiKey",
			"liteLlmBaseUrl",
			"liteLlmModelId",
			"openRouterApiKey",
			"openRouterModelId",
			"clineAccountId",
		]

		for (const key of commonKeys) {
			const value = ConfigurationService.getModeValue(configuration, key, mode)
			if (value !== undefined) {
				providerConfig[key] = value
			}
		}

		return providerConfig
	}

	/**
	 * Validate provider-specific configuration
	 */
	private static validateProviderSpecificConfig(
		configuration: ApiConfiguration,
		providerId: string,
		mode: Mode,
		errors: string[],
		warnings: string[],
	): void {
		const modeConfig = ConfigurationService.extractModeConfiguration(configuration, mode)

		switch (providerId) {
			case "anthropic":
				if (!modeConfig.apiKey && !configuration.apiKey) {
					errors.push("Anthropic API key is required")
				}
				break

			case "openai":
				if (!modeConfig.openAiApiKey && !configuration.openAiApiKey) {
					errors.push("OpenAI API key is required")
				}
				break

			case "gemini":
				if (!modeConfig.geminiApiKey && !configuration.geminiApiKey) {
					if (!modeConfig.vertexProjectId && !configuration.vertexProjectId) {
						errors.push("Gemini API key or Vertex project ID is required")
					}
				}
				break

			case "ollama":
				if (!modeConfig.ollamaModelId && !configuration.ollamaModelId) {
					errors.push("Ollama model ID is required")
				}
				break

			case "bedrock":
				if (!modeConfig.awsAccessKey && !configuration.awsAccessKey) {
					errors.push("AWS access key is required for Bedrock")
				}
				if (!modeConfig.awsSecretKey && !configuration.awsSecretKey) {
					errors.push("AWS secret key is required for Bedrock")
				}
				if (!modeConfig.awsRegion && !configuration.awsRegion) {
					errors.push("AWS region is required for Bedrock")
				}
				break

			case "vertex":
				if (!modeConfig.vertexProjectId && !configuration.vertexProjectId) {
					errors.push("Vertex project ID is required")
				}
				break

			// Add more provider-specific validations as needed
			default:
				// Generic validation for unknown providers
				if (!modeConfig.apiKey && !configuration.apiKey) {
					warnings.push(`API key not found for provider: ${providerId}`)
				}
				break
		}
	}

	/**
	 * Normalize configuration for consistent handling
	 */
	static normalizeConfiguration(configuration: ApiConfiguration): ApiConfiguration {
		// Remove undefined values and normalize structure
		const normalized = { ...configuration }

		// Ensure mode-specific providers are set
		if (!normalized.planModeApiProvider && normalized.actModeApiProvider) {
			normalized.planModeApiProvider = normalized.actModeApiProvider
		}
		if (!normalized.actModeApiProvider && normalized.planModeApiProvider) {
			normalized.actModeApiProvider = normalized.planModeApiProvider
		}

		return normalized
	}

	/**
	 * Get default configuration for a provider
	 */
	static getDefaultConfiguration(providerId: string): Partial<ApiConfiguration> {
		const defaults: Record<string, Partial<ApiConfiguration>> = {
			anthropic: {
				apiKey: "",
				anthropicBaseUrl: "https://api.anthropic.com",
			},
			openai: {
				openAiApiKey: "",
				openAiBaseUrl: "https://api.openai.com/v1",
			},
			gemini: {
				geminiApiKey: "",
				geminiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
			},
			ollama: {
				ollamaBaseUrl: "http://localhost:11434",
			},
		}

		return defaults[providerId] || {}
	}
}
