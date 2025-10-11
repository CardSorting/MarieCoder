/**
 * Model validation utilities
 * Only supports Anthropic and OpenRouter
 * Follows MARIECODER methodology: ruthlessly simple
 */

/**
 * Validates if a model is suitable for chat completions
 * @param rawModel The raw model object from the provider API
 * @param exclusionPatterns Model ID patterns to exclude (e.g., ['whisper', 'tts', 'embedding'])
 * @returns true if the model is valid for chat completions
 */
export function validateChatModel(rawModel: any, exclusionPatterns: string[] = []): boolean {
	// Check if model is active (if the property exists)
	if (Object.hasOwn(rawModel, "active") && !rawModel.active) {
		return false
	}

	// Validate basic structure
	if (!rawModel.id || rawModel.object !== "model") {
		return false
	}

	// Check against exclusion patterns
	const modelIdLower = rawModel.id.toLowerCase()
	for (const pattern of exclusionPatterns) {
		if (modelIdLower.includes(pattern.toLowerCase())) {
			return false
		}
	}

	return true
}

/**
 * Common exclusion patterns for non-chat models
 */
export const COMMON_EXCLUSIONS = ["whisper", "tts", "guard", "embedding", "moderation", "allam"] as const

/**
 * Detects if a model supports image input based on various heuristics
 */
export function detectImageSupport(modelId: string, staticInfo?: { supportsImages?: boolean }): boolean {
	// Use static info if available
	if (staticInfo?.supportsImages !== undefined) {
		return staticInfo.supportsImages
	}

	// Detect based on model name patterns
	const modelIdLower = modelId.toLowerCase()
	const visionKeywords = ["vision", "maverick", "scout", "multimodal"]

	return visionKeywords.some((keyword) => modelIdLower.includes(keyword))
}

/**
 * Validates API key format for supported providers
 * Only Anthropic and OpenRouter
 */
export function validateApiKeyFormat(apiKey: string, provider: string): { valid: boolean; error?: string } {
	const cleanKey = apiKey.trim()

	if (!cleanKey) {
		return { valid: false, error: "API key cannot be empty" }
	}

	switch (provider) {
		case "anthropic":
			if (!cleanKey.startsWith("sk-ant-")) {
				return { valid: false, error: "Anthropic API keys should start with 'sk-ant-'" }
			}
			break
		case "openrouter":
			if (!cleanKey.startsWith("sk-or-")) {
				return { valid: false, error: "OpenRouter API keys should start with 'sk-or-'" }
			}
			break
		default:
			// Unknown provider
			return { valid: false, error: `Unsupported provider: ${provider}. Only 'anthropic' and 'openrouter' are supported.` }
	}

	return { valid: true }
}
