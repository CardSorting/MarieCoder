import { isGPT5ModelFamily, isLocalModel, isNextGenModelFamily } from "@utils/model-utils"
import { ModelFamily } from "@/shared/prompts"
import { PromptRegistry } from "./registry"
import type { SystemPromptContext } from "./types"

export { ClineToolSet, PromptBuilder, PromptRegistry } from "./registry"
export * from "./templates"
export { TemplateEngine } from "./templates"
export * from "./types"
export { VariantBuilder, validateVariant } from "./variants"

import { ProviderInfo } from "@/core/api"

/**
 * Extract model family from model ID (e.g., "claude-4" -> "claude")
 */
export function getModelFamily(providerInfo: ProviderInfo): ModelFamily {
	if (isGPT5ModelFamily(providerInfo.model.id)) {
		return ModelFamily.GPT_5
	}
	// Check for next-gen models first
	if (isNextGenModelFamily(providerInfo.model.id)) {
		return ModelFamily.NEXT_GEN
	}
	if (providerInfo.customPrompt === "compact" && isLocalModel(providerInfo)) {
		return ModelFamily.XS
	}
	// Default fallback
	return ModelFamily.GENERIC
}

/**
 * Get the system prompt by id
 */
export async function getSystemPrompt(context: SystemPromptContext): Promise<string> {
	const registry = PromptRegistry.getInstance()
	return await registry.get(context)
}
