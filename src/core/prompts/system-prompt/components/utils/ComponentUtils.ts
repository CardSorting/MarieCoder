/**
 * Component Utilities
 *
 * Utility functions for common component operations following NOORMME patterns.
 * Provides clean, reusable functions for component management.
 */

import { SystemPromptSection } from "../../templates/placeholders"
import { TemplateEngine } from "../../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../../types"

/**
 * Template resolution utilities
 */
export const TemplateUtils = {
	/**
	 * Resolve a template with context and placeholders
	 */
	resolve: (template: string, context: SystemPromptContext, placeholders: Record<string, any> = {}): string => {
		const templateEngine = new TemplateEngine()
		return templateEngine.resolve(template, context, {
			CWD: context.cwd || process.cwd(),
			IDE: context.ide || "",
			...placeholders,
		})
	},

	/**
	 * Resolve multiple templates and combine them
	 */
	resolveMultiple: (
		templates: Array<{ template: string; placeholders?: Record<string, any> }>,
		context: SystemPromptContext,
	): string => {
		return templates
			.map(({ template, placeholders = {} }) => TemplateUtils.resolve(template, context, placeholders))
			.join("\n\n")
	},

	/**
	 * Create a conditional template
	 */
	createConditional: (
		condition: (context: SystemPromptContext) => boolean,
		template: string,
		fallback: string = "",
	): string => {
		return `{{#if ${condition.toString()}}}${template}{{else}}${fallback}{{/if}}`
	},
} as const

/**
 * Component validation utilities
 */
export const ValidationUtils = {
	/**
	 * Validate component configuration
	 */
	validateConfig: (config: {
		id: SystemPromptSection
		template: string
		dependencies?: readonly SystemPromptSection[]
	}): { isValid: boolean; errors: string[] } => {
		const errors: string[] = []

		if (!config.id) {
			errors.push("Component ID is required")
		}

		if (!config.template || config.template.trim() === "") {
			errors.push("Component template is required")
		}

		if (config.dependencies) {
			for (const dep of config.dependencies) {
				if (!dep) {
					errors.push("Dependency cannot be empty")
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		}
	},

	/**
	 * Validate template syntax
	 */
	validateTemplate: (template: string): { isValid: boolean; errors: string[] } => {
		const errors: string[] = []

		// Check for unclosed template tags
		const openTags = (template.match(/\{\{/g) || []).length
		const closeTags = (template.match(/\}\}/g) || []).length

		if (openTags !== closeTags) {
			errors.push("Unmatched template tags detected")
		}

		// Check for malformed placeholder syntax
		const malformedPlaceholders = template.match(/\{\{[^}]*$/g)
		if (malformedPlaceholders) {
			errors.push("Malformed placeholder syntax detected")
		}

		return {
			isValid: errors.length === 0,
			errors,
		}
	},
} as const

/**
 * Component composition utilities
 */
export const CompositionUtils = {
	/**
	 * Combine multiple components into a single template
	 */
	combine: (
		components: Array<{
			id: SystemPromptSection
			template: string
			condition?: (context: SystemPromptContext) => boolean
		}>,
		separator: string = "\n\n",
	): string => {
		return components
			.map(({ id, template, condition }) => {
				if (condition) {
					return `{{#if ${condition.toString()}}}${template}{{/if}}`
				}
				return template
			})
			.join(separator)
	},

	/**
	 * Create a sectioned template
	 */
	createSectioned: (
		sections: Array<{
			title: string
			content: string
			condition?: (context: SystemPromptContext) => boolean
		}>,
	): string => {
		return sections
			.map(({ title, content, condition }) => {
				const sectionContent = `## ${title}\n\n${content}`
				if (condition) {
					return `{{#if ${condition.toString()}}}${sectionContent}{{/if}}`
				}
				return sectionContent
			})
			.join("\n\n")
	},

	/**
	 * Create a hierarchical template
	 */
	createHierarchical: (structure: {
		title: string
		content: string
		subsections?: Array<{
			title: string
			content: string
			condition?: (context: SystemPromptContext) => boolean
		}>
	}): string => {
		let result = `# ${structure.title}\n\n${structure.content}`

		if (structure.subsections) {
			result +=
				"\n\n" +
				structure.subsections
					.map(({ title, content, condition }) => {
						const subsectionContent = `### ${title}\n\n${content}`
						if (condition) {
							return `{{#if ${condition.toString()}}}${subsectionContent}{{/if}}`
						}
						return subsectionContent
					})
					.join("\n\n")
		}

		return result
	},
} as const

/**
 * Context utilities
 */
export const ContextUtils = {
	/**
	 * Check if context supports a feature
	 */
	supportsFeature: (context: SystemPromptContext, feature: string): boolean => {
		switch (feature) {
			case "browser":
				return context.supportsBrowserUse === true
			case "mcp":
				return !!(context as any).mcpHub && (context as any).mcpHub !== null
			case "yolo":
				return context.yoloModeToggled === true
			default:
				return false
		}
	},

	/**
	 * Get context-specific placeholders
	 */
	getContextPlaceholders: (context: SystemPromptContext): Record<string, any> => {
		return {
			CWD: context.cwd || process.cwd(),
			IDE: context.ide || "",
			OS: context.os || "",
			USER: context.user || "",
			SUPPORTS_BROWSER: context.supportsBrowserUse ? "true" : "false",
			SUPPORTS_MCP: ContextUtils.supportsFeature(context, "mcp") ? "true" : "false",
			YOLO_MODE: context.yoloModeToggled ? "true" : "false",
		}
	},

	/**
	 * Create context-specific conditions
	 */
	createConditions: (context: SystemPromptContext) => ({
		hasBrowser: () => context.supportsBrowserUse === true,
		hasMcp: () => ContextUtils.supportsFeature(context, "mcp"),
		isYoloMode: () => context.yoloModeToggled === true,
		hasLocalRules: () => !!(context as any).localClineRulesFileInstructions,
		hasCursorRules: () => !!(context as any).localCursorRulesFileInstructions,
	}),
} as const

/**
 * Component factory utilities
 */
export const FactoryUtils = {
	/**
	 * Create a simple text component configuration
	 */
	createTextConfig: (
		id: SystemPromptSection,
		text: string,
		options: {
			contextRequirements?: (context: SystemPromptContext) => boolean
			variantRequirements?: (variant: PromptVariant) => boolean
		} = {},
	) => ({
		id,
		template: text,
		...options,
	}),

	/**
	 * Create a template component configuration
	 */
	createTemplateConfig: (
		id: SystemPromptSection,
		template: string,
		options: {
			dependencies?: readonly SystemPromptSection[]
			contextRequirements?: (context: SystemPromptContext) => boolean
			variantRequirements?: (variant: PromptVariant) => boolean
		} = {},
	) => ({
		id,
		template,
		...options,
	}),

	/**
	 * Create a conditional component configuration
	 */
	createConditionalConfig: (
		id: SystemPromptSection,
		template: string,
		condition: (context: SystemPromptContext) => boolean,
	) => ({
		id,
		template,
		contextRequirements: condition,
	}),
} as const

/**
 * Component debugging utilities
 */
export const DebugUtils = {
	/**
	 * Log component resolution
	 */
	logResolution: (id: SystemPromptSection, context: SystemPromptContext, result: string | undefined): void => {
		if (process.env.NODE_ENV === "development") {
			console.log(`[Component] ${id}:`, {
				resolved: !!result,
				length: result?.length || 0,
				context: {
					cwd: context.cwd,
					ide: context.ide,
					supportsBrowser: context.supportsBrowserUse,
				},
			})
		}
	},

	/**
	 * Validate component output
	 */
	validateOutput: (output: string | undefined): { isValid: boolean; issues: string[] } => {
		const issues: string[] = []

		if (!output) {
			issues.push("Component output is undefined")
			return { isValid: false, issues }
		}

		if (output.trim() === "") {
			issues.push("Component output is empty")
		}

		if (output.length > 10000) {
			issues.push("Component output is very large (>10KB)")
		}

		// Check for unresolved placeholders
		const unresolvedPlaceholders = output.match(/\{\{[^}]+\}\}/g)
		if (unresolvedPlaceholders) {
			issues.push(`Unresolved placeholders: ${unresolvedPlaceholders.join(", ")}`)
		}

		return {
			isValid: issues.length === 0,
			issues,
		}
	},
} as const
