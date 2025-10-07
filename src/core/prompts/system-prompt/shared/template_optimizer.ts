/**
 * Template Optimization Service
 *
 * Centralized service for template optimization and management to reduce duplication
 * and improve consistency across template definitions.
 */

import { SystemPromptSection } from "../templates/section_definitions"
import { TemplateUtils } from "./utils"

/**
 * Standard template patterns
 */
export const TEMPLATE_PATTERNS = {
	/**
	 * Standard component separator
	 */
	COMPONENT_SEPARATOR: "\n\n====\n\n",

	/**
	 * Lightweight component separator (for XS models)
	 */
	LIGHTWEIGHT_SEPARATOR: "\n\n",

	/**
	 * Compact component separator (for minimal templates)
	 */
	COMPACT_SEPARATOR: "\n",

	/**
	 * Standard section header format
	 */
	SECTION_HEADER: (section: string) => `${section.toUpperCase()}\n\n`,

	/**
	 * Compact section header format
	 */
	COMPACT_HEADER: (section: string) => `${section.toUpperCase()}\n`,
} as const

/**
 * Template optimization service
 */
export class TemplateOptimizationService {
	/**
	 * Generate a template from component order
	 */
	static generateTemplate(
		components: readonly SystemPromptSection[],
		options: {
			separator?: string
			includeHeaders?: boolean
			compact?: boolean
		} = {},
	): string {
		const { separator = TEMPLATE_PATTERNS.COMPONENT_SEPARATOR, includeHeaders = false, compact = false } = options

		if (!components.length) {
			throw new Error("Cannot generate template from empty component order")
		}

		return components
			.map((component) => {
				const placeholder = `{{${component}}}`

				if (includeHeaders) {
					const header = compact
						? TEMPLATE_PATTERNS.COMPACT_HEADER(component.replace(/_/g, " "))
						: TEMPLATE_PATTERNS.SECTION_HEADER(component.replace(/_/g, " "))
					return header + placeholder
				}

				return placeholder
			})
			.map((item, componentIndex) => (componentIndex < components.length - 1 ? item + separator : item))
			.join("")
	}

	/**
	 * Optimize template for specific model family
	 */
	static optimizeForModelFamily(
		template: string,
		modelFamily: string,
		options: {
			maxLength?: number
			preserveStructure?: boolean
		} = {},
	): string {
		const { maxLength = 8000, preserveStructure = true } = options

		// For XS models, use more compact formatting
		if (modelFamily === "xs" || modelFamily === "lightweight") {
			return TemplateOptimizationService.makeCompact(template, preserveStructure)
		}

		// For other models, ensure template fits within length limits
		if (template.length > maxLength) {
			return TemplateOptimizationService.compressTemplate(template, maxLength)
		}

		return template
	}

	/**
	 * Make template more compact
	 */
	static makeCompact(template: string, preserveStructure = true): string {
		if (!preserveStructure) {
			// Remove extra whitespace and line breaks
			return template
				.replace(/\n{3,}/g, "\n\n")
				.replace(/[ \t]+/g, " ")
				.trim()
		}

		// Replace standard separators with compact ones
		return template
			.replace(new RegExp(TEMPLATE_PATTERNS.COMPONENT_SEPARATOR, "g"), TEMPLATE_PATTERNS.LIGHTWEIGHT_SEPARATOR)
			.replace(/\n{4,}/g, "\n\n")
	}

	/**
	 * Compress template to fit within length limits
	 */
	static compressTemplate(template: string, maxLength: number): string {
		if (template.length <= maxLength) {
			return template
		}

		// Try making it compact first
		const compressed = TemplateOptimizationService.makeCompact(template, false)

		if (compressed.length <= maxLength) {
			return compressed
		}

		// If still too long, remove less critical sections
		// This is a simplified approach - in practice, you might want more sophisticated logic
		const lines = compressed.split("\n")
		const result: string[] = []
		let currentLength = 0

		for (const line of lines) {
			if (currentLength + line.length + 1 <= maxLength) {
				result.push(line)
				currentLength += line.length + 1
			} else {
				break
			}
		}

		return result.join("\n")
	}

	/**
	 * Validate template structure
	 */
	static validateTemplate(template: string): {
		isValid: boolean
		errors: string[]
		warnings: string[]
		metrics: {
			length: number
			placeholderCount: number
			estimatedTokens: number
		}
	} {
		const errors: string[] = []
		const warnings: string[] = []

		// Basic validation
		const validation = TemplateUtils.validateTemplate(template)
		if (!validation.isValid) {
			errors.push(...validation.errors)
		}

		// Extract placeholders
		const placeholders = TemplateUtils.extractPlaceholders(template)
		const placeholderCount = placeholders.length

		// Calculate metrics
		const length = template.length
		const estimatedTokens = Math.ceil(length / 4) // Rough estimation: 4 chars per token

		// Check for potential issues
		if (length > 10000) {
			warnings.push("Template is quite long - consider optimization for better performance")
		}

		if (placeholderCount === 0) {
			warnings.push("Template contains no placeholders - may not be dynamic")
		}

		if (estimatedTokens > 2000) {
			warnings.push("Template may exceed token limits for some models")
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			metrics: {
				length,
				placeholderCount,
				estimatedTokens,
			},
		}
	}

	/**
	 * Get template optimization recommendations
	 */
	static getOptimizationRecommendations(
		template: string,
		modelFamily: string,
	): {
		recommendations: string[]
		optimizations: string[]
	} {
		const recommendations: string[] = []
		const optimizations: string[] = []

		const validation = TemplateOptimizationService.validateTemplate(template)

		// Add validation warnings as recommendations
		recommendations.push(...validation.warnings)

		// Model family specific recommendations
		if (modelFamily === "xs" || modelFamily === "lightweight") {
			recommendations.push("Consider using compact separators for lightweight models")
			optimizations.push("Use TEMPLATE_PATTERNS.LIGHTWEIGHT_SEPARATOR")
		}

		if (validation.metrics.length > 8000) {
			recommendations.push("Template is quite long - consider splitting into smaller components")
			optimizations.push("Break large components into smaller, focused sub-components")
		}

		if (validation.metrics.placeholderCount < 3) {
			recommendations.push("Template has few placeholders - consider adding more dynamic content")
			optimizations.push("Add more placeholders for better customization")
		}

		return { recommendations, optimizations }
	}

	/**
	 * Create optimized template variants
	 */
	static createTemplateVariants(
		baseComponents: readonly SystemPromptSection[],
		modelFamilies: string[],
	): Record<string, string> {
		const variants: Record<string, string> = {}

		for (const family of modelFamilies) {
			const options = TemplateOptimizationService.getTemplateOptionsForFamily(family)
			variants[family] = TemplateOptimizationService.generateTemplate(baseComponents, options)
		}

		return variants
	}

	/**
	 * Get template options for specific model family
	 */
	private static getTemplateOptionsForFamily(modelFamily: string): {
		separator: string
		includeHeaders: boolean
		compact: boolean
	} {
		switch (modelFamily) {
			case "xs":
			case "lightweight":
				return {
					separator: TEMPLATE_PATTERNS.LIGHTWEIGHT_SEPARATOR,
					includeHeaders: false,
					compact: true,
				}
			case "generic":
				return {
					separator: TEMPLATE_PATTERNS.COMPONENT_SEPARATOR,
					includeHeaders: false,
					compact: false,
				}
			case "next-gen":
			case "advanced":
				return {
					separator: TEMPLATE_PATTERNS.COMPONENT_SEPARATOR,
					includeHeaders: true,
					compact: false,
				}
			default:
				return {
					separator: TEMPLATE_PATTERNS.COMPONENT_SEPARATOR,
					includeHeaders: false,
					compact: false,
				}
		}
	}
}

/**
 * Helper functions for template optimization
 */
export const TemplateOptimizationHelpers = {
	/**
	 * Create a lightweight template
	 */
	lightweight: (components: readonly SystemPromptSection[]) =>
		TemplateOptimizationService.generateTemplate(components, {
			separator: TEMPLATE_PATTERNS.LIGHTWEIGHT_SEPARATOR,
			compact: true,
		}),

	/**
	 * Create a standard template
	 */
	standard: (components: readonly SystemPromptSection[]) =>
		TemplateOptimizationService.generateTemplate(components, {
			separator: TEMPLATE_PATTERNS.COMPONENT_SEPARATOR,
			compact: false,
		}),

	/**
	 * Create an advanced template
	 */
	advanced: (components: readonly SystemPromptSection[]) =>
		TemplateOptimizationService.generateTemplate(components, {
			separator: TEMPLATE_PATTERNS.COMPONENT_SEPARATOR,
			includeHeaders: true,
			compact: false,
		}),

	/**
	 * Optimize template for model family
	 */
	optimizeForFamily: (template: string, modelFamily: string) =>
		TemplateOptimizationService.optimizeForModelFamily(template, modelFamily),
} as const
