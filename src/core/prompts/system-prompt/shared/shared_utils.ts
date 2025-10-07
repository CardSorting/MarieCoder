/**
 * Shared Utilities
 *
 * Common utility functions used across the system prompt architecture
 * to reduce duplication and improve maintainability.
 */

import { ModelFamily } from "@/shared/prompts"
import type { PromptVariant, SystemPromptContext } from "../types"

/**
 * Utility functions for variant configuration
 */
export const VariantUtils = {
	/**
	 * Get the appropriate model family display name
	 */
	getDisplayName(family: ModelFamily): string {
		switch (family) {
			case ModelFamily.NEXT_GEN:
				return "Next Generation"
			case ModelFamily.GENERIC:
				return "Generic"
			case ModelFamily.XS:
				return "Extra Small"
			default:
				return family
		}
	},

	/**
	 * Check if a variant is production-ready
	 */
	isProductionReady(variant: PromptVariant): boolean {
		return variant.tags?.includes("production") || variant.labels?.production === variant.version
	},

	/**
	 * Check if a variant is stable
	 */
	isStable(variant: PromptVariant): boolean {
		return variant.tags?.includes("stable") || variant.labels?.stable === variant.version
	},

	/**
	 * Get variant maturity level
	 */
	getMaturityLevel(variant: PromptVariant): "experimental" | "stable" | "production" {
		if (this.isProductionReady(variant)) {
			return "production"
		}
		if (this.isStable(variant)) {
			return "stable"
		}
		return "experimental"
	},

	/**
	 * Get variant complexity score (number of components + tools)
	 */
	getComplexityScore(variant: PromptVariant): number {
		const componentCount = variant.componentOrder?.length || 0
		const toolCount = variant.tools?.length || 0
		return componentCount + toolCount
	},

	/**
	 * Check if variant is suitable for lightweight models
	 */
	isLightweight(variant: PromptVariant): boolean {
		const complexity = this.getComplexityScore(variant)
		return complexity <= 20 // Threshold for lightweight models
	},
} as const

/**
 * Utility functions for context processing
 */
export const ContextUtils = {
	/**
	 * Check if context supports browser operations
	 */
	supportsBrowser(context: SystemPromptContext): boolean {
		return context.supportsBrowserUse === true
	},

	/**
	 * Check if context supports MCP operations
	 */
	supportsMCP(context: SystemPromptContext): boolean {
		return !!(context as any).mcpServers && (context as any).mcpServers.length > 0
	},

	/**
	 * Get context complexity score
	 */
	getComplexityScore(context: SystemPromptContext): number {
		let score = 0

		if (context.supportsBrowserUse) {
			score += 5
		}
		if ((context as any).mcpServers?.length) {
			score += (context as any).mcpServers.length * 2
		}
		if ((context as any).userInstructions?.length) {
			score += 1
		}
		if (context.yoloModeToggled) {
			score += 1
		}

		return score
	},

	/**
	 * Check if context is suitable for lightweight models
	 */
	isLightweight(context: SystemPromptContext): boolean {
		return this.getComplexityScore(context) <= 5
	},
} as const

/**
 * Utility functions for template processing
 */
export const TemplateUtils = {
	/**
	 * Extract placeholders from template text
	 */
	extractPlaceholders(template: string): string[] {
		const placeholderRegex = /\{\{([^}]+)\}\}/g
		const placeholders: string[] = []
		let match: RegExpExecArray | null

		match = placeholderRegex.exec(template)
		while (match !== null) {
			placeholders.push(match[1])
			match = placeholderRegex.exec(template)
		}

		return [...new Set(placeholders)] // Remove duplicates
	},

	/**
	 * Check if template has required placeholders
	 */
	hasRequiredPlaceholders(template: string, required: string[]): boolean {
		const found = this.extractPlaceholders(template)
		return required.every((placeholder) => found.includes(placeholder))
	},

	/**
	 * Validate template structure
	 */
	validateTemplate(template: string): { isValid: boolean; errors: string[] } {
		const errors: string[] = []

		// Check for unmatched braces
		const openBraces = (template.match(/\{\{/g) || []).length
		const closeBraces = (template.match(/\}\}/g) || []).length

		if (openBraces !== closeBraces) {
			errors.push("Template has unmatched placeholder braces")
		}

		// Check for empty placeholders
		const emptyPlaceholders = template.match(/\{\{\s*\}\}/g)
		if (emptyPlaceholders) {
			errors.push("Template contains empty placeholders")
		}

		// Check for malformed placeholders
		const malformedPlaceholders = template.match(/\{[^{]|\}[^}]/g)
		if (malformedPlaceholders) {
			errors.push("Template contains malformed placeholders")
		}

		return {
			isValid: errors.length === 0,
			errors,
		}
	},
} as const

/**
 * Utility functions for configuration management
 */
export const ConfigUtils = {
	/**
	 * Merge configuration objects safely
	 */
	mergeConfigs<T extends Record<string, any>>(base: T, override: Partial<T>): T {
		return { ...base, ...override }
	},

	/**
	 * Deep merge configuration objects
	 */
	deepMergeConfigs<T extends Record<string, any>>(base: T, override: Partial<T>): T {
		const result = { ...base }

		for (const key in override) {
			if (Object.hasOwn(override, key)) {
				const baseValue = result[key]
				const overrideValue = override[key]

				if (
					typeof baseValue === "object" &&
					typeof overrideValue === "object" &&
					!Array.isArray(baseValue) &&
					!Array.isArray(overrideValue) &&
					baseValue !== null &&
					overrideValue !== null
				) {
					result[key] = this.deepMergeConfigs(baseValue, overrideValue) as T[Extract<keyof T, string>]
				} else {
					result[key] = overrideValue as T[Extract<keyof T, string>]
				}
			}
		}

		return result
	},

	/**
	 * Validate configuration structure
	 */
	validateConfigStructure(config: any, schema: Record<string, string>): { isValid: boolean; errors: string[] } {
		const errors: string[] = []

		for (const [key, expectedType] of Object.entries(schema)) {
			if (!(key in config)) {
				errors.push(`Missing required field: ${key}`)
				continue
			}

			const actualType = typeof config[key]
			if (actualType !== expectedType) {
				errors.push(`Field '${key}' should be ${expectedType}, got ${actualType}`)
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		}
	},
} as const

/**
 * Utility functions for debugging and logging
 */
export const DebugUtils = {
	/**
	 * Create a summary of variant configuration
	 */
	createVariantSummary(variant: PromptVariant): string {
		const maturity = VariantUtils.getMaturityLevel(variant)
		const complexity = VariantUtils.getComplexityScore(variant)
		const componentCount = variant.componentOrder?.length || 0
		const toolCount = variant.tools?.length || 0

		return [
			`Variant: ${variant.id}`,
			`Family: ${variant.family}`,
			`Maturity: ${maturity}`,
			`Complexity: ${complexity}`,
			`Components: ${componentCount}`,
			`Tools: ${toolCount}`,
			`Tags: ${variant.tags?.join(", ") || "none"}`,
		].join(" | ")
	},

	/**
	 * Create a summary of context configuration
	 */
	createContextSummary(context: SystemPromptContext): string {
		const complexity = ContextUtils.getComplexityScore(context)
		const features = [
			context.supportsBrowserUse && "browser",
			(context as any).mcpServers?.length && "mcp",
			(context as any).userInstructions?.length && "custom-instructions",
			context.yoloModeToggled && "yolo-mode",
		]
			.filter(Boolean)
			.join(", ")

		return [`Complexity: ${complexity}`, `Features: ${features || "none"}`, `CWD: ${context.cwd || "unknown"}`].join(" | ")
	},
} as const
