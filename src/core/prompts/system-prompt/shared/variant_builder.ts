/**
 * Enhanced Variant Builder
 *
 * An improved variant builder that uses shared configurations and utilities
 * to reduce duplication and provide better defaults.
 */

import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { SystemPromptSection } from "../templates/section_definitions"
import type { ConfigOverride, PromptVariant } from "../types"
import {
	COMMON_OVERRIDES,
	COMPONENT_ORDERS,
	createPlaceholderConfig,
	getStandardConfig,
	TOOL_CONFIGS,
} from "./model_configurations"
import { validateVariantQuick } from "./validation_utils"

/**
 * Enhanced variant builder with shared configuration support
 */
export class EnhancedVariantBuilder {
	private variant: Partial<PromptVariant> = {}

	constructor(family: ModelFamily) {
		// Initialize with standard configuration for the family
		const standardConfig = getStandardConfig(family)

		this.variant = {
			family: family,
			version: 1,
			componentOrder: standardConfig.componentOrder,
			tools: standardConfig.tools,
			tags: standardConfig.tags,
			labels: standardConfig.labels,
			placeholders: createPlaceholderConfig(family),
			config: {},
			componentOverrides: {},
			toolOverrides: {},
		}
	}

	/**
	 * Set the variant description
	 */
	description(desc: string): this {
		this.variant = {
			...this.variant,
			description: desc,
		}
		return this
	}

	/**
	 * Set the version number
	 */
	version(version: number): this {
		this.variant = {
			...this.variant,
			version: version,
		}
		return this
	}

	/**
	 * Add tags to the variant
	 */
	tags(...tags: string[]): this {
		this.variant = {
			...this.variant,
			tags: [...(this.variant.tags || []), ...tags],
		}
		return this
	}

	/**
	 * Set labels with version mapping
	 */
	labels(labels: Record<string, number>): this {
		this.variant = {
			...this.variant,
			labels: { ...this.variant.labels, ...labels },
		}
		return this
	}

	/**
	 * Set the base template (optional)
	 */
	template(baseTemplate: string): this {
		this.variant = {
			...this.variant,
			baseTemplate: baseTemplate,
		}
		return this
	}

	/**
	 * Configure component order with type safety
	 */
	components(...sections: SystemPromptSection[]): this {
		this.variant = {
			...this.variant,
			componentOrder: sections,
		}
		return this
	}

	/**
	 * Use a predefined component order
	 */
	useComponentOrder(order: keyof typeof COMPONENT_ORDERS): this {
		this.variant = {
			...this.variant,
			componentOrder: COMPONENT_ORDERS[order],
		}
		return this
	}

	/**
	 * Override specific components with type safety
	 */
	overrideComponent(section: SystemPromptSection, override: ConfigOverride): this {
		const current = this.variant.componentOverrides || {}
		this.variant = {
			...this.variant,
			componentOverrides: { ...current, [section]: override },
		}
		return this
	}

	/**
	 * Configure tools with type safety
	 */
	tools(...tools: ClineDefaultTool[]): this {
		this.variant = {
			...this.variant,
			tools: tools,
		}
		return this
	}

	/**
	 * Use a predefined tool configuration
	 */
	useToolConfig(config: keyof typeof TOOL_CONFIGS): this {
		this.variant = {
			...this.variant,
			tools: TOOL_CONFIGS[config],
		}
		return this
	}

	/**
	 * Override specific tools with type safety
	 */
	overrideTool(tool: ClineDefaultTool, override: ConfigOverride): this {
		const current = this.variant.toolOverrides || {}
		this.variant = {
			...this.variant,
			toolOverrides: { ...current, [tool]: override },
		}
		return this
	}

	/**
	 * Set placeholder values
	 */
	placeholders(placeholders: Record<string, string>): this {
		this.variant = {
			...this.variant,
			placeholders: { ...this.variant.placeholders, ...placeholders },
		}
		return this
	}

	/**
	 * Set model-specific configuration
	 */
	config(config: Record<string, any>): this {
		this.variant = {
			...this.variant,
			config: { ...this.variant.config, ...config },
		}
		return this
	}

	/**
	 * Apply common override patterns
	 */
	applyCommonOverrides(overrides: Record<string, ConfigOverride>): this {
		const current = this.variant.componentOverrides || {}
		this.variant = {
			...this.variant,
			componentOverrides: { ...current, ...overrides },
		}
		return this
	}

	/**
	 * Disable specific tools
	 */
	disableTools(...tools: ClineDefaultTool[]): this {
		const toolOverrides = COMMON_OVERRIDES.disableTools(...tools)
		const current = this.variant.toolOverrides || {}
		this.variant = {
			...this.variant,
			toolOverrides: { ...current, ...toolOverrides },
		}
		return this
	}

	/**
	 * Make variant production-ready
	 */
	makeProductionReady(): this {
		this.variant = {
			...this.variant,
			tags: [...(this.variant.tags || []), "production"],
			labels: { ...this.variant.labels, production: this.variant.version || 1 },
		}
		return this
	}

	/**
	 * Make variant lightweight (reduce complexity)
	 */
	makeLightweight(): this {
		this.variant = {
			...this.variant,
			componentOrder: COMPONENT_ORDERS.MINIMAL,
			tools: TOOL_CONFIGS.MINIMAL,
			tags: [...(this.variant.tags || []), "lightweight"],
		}
		return this
	}

	/**
	 * Build the final variant configuration
	 */
	build(): Omit<PromptVariant, "id"> {
		// Validate required fields
		if (!this.variant.componentOrder?.length) {
			throw new Error("Component order is required")
		}
		if (!this.variant.description) {
			throw new Error("Description is required")
		}

		// Auto-generate baseTemplate from componentOrder if not provided
		const baseTemplate = this.variant.baseTemplate || this.generateTemplateFromComponents(this.variant.componentOrder || [])

		const finalVariant = {
			...this.variant,
			baseTemplate,
		} as Omit<PromptVariant, "id">

		// Quick validation
		const validation = validateVariantQuick({ ...finalVariant, id: "temp" })
		if (!validation.isValid) {
			throw new Error(`Variant validation failed: ${validation.errors.join(", ")}`)
		}

		return finalVariant
	}

	/**
	 * Generate a base template from component order
	 */
	private generateTemplateFromComponents(components: readonly SystemPromptSection[]): string {
		if (!components.length) {
			throw new Error("Cannot generate template from empty component order")
		}

		return components
			.map((component, index) => {
				const placeholder = `{{${component}}}`
				return index < components.length - 1 ? `${placeholder}\n\n====\n\n` : placeholder
			})
			.join("")
	}
}

/**
 * Helper function to create an enhanced variant builder
 */
export const createEnhancedVariant = (family: ModelFamily) => new EnhancedVariantBuilder(family)

/**
 * Quick variant creation helpers
 */
export const QuickVariants = {
	/**
	 * Create a minimal variant for lightweight models
	 */
	minimal: (family: ModelFamily, description: string) =>
		createEnhancedVariant(family)
			.description(description)
			.useComponentOrder("MINIMAL")
			.useToolConfig("MINIMAL")
			.tags("minimal", "lightweight"),

	/**
	 * Create a standard variant for most models
	 */
	standard: (family: ModelFamily, description: string) =>
		createEnhancedVariant(family).description(description).useComponentOrder("STANDARD").useToolConfig("STANDARD"),

	/**
	 * Create a full-featured variant for advanced models
	 */
	full: (family: ModelFamily, description: string) =>
		createEnhancedVariant(family)
			.description(description)
			.useComponentOrder("FULL")
			.useToolConfig("FULL")
			.makeProductionReady(),
} as const
