/**
 * Unified model validation utilities.
 * Eliminates duplicate validation logic across providers.
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
 * Validates API key format for specific providers
 */
export function validateApiKeyFormat(apiKey: string, provider: string): { valid: boolean; error?: string } {
	const cleanKey = apiKey.trim()

	if (!cleanKey) {
		return { valid: false, error: "API key cannot be empty" }
	}

	switch (provider) {
		case "groq":
			if (!cleanKey.startsWith("gsk_")) {
				return { valid: false, error: "Groq API keys should start with 'gsk_'" }
			}
			break
		// Add more provider-specific validations as needed
	}

	return { valid: true }
}
