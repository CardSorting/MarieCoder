import { SystemPromptSection } from "../templates/section_definitions"
import { TemplateEngine } from "../templates/template_engine"
import type { PromptVariant, SystemPromptContext } from "../types"

/**
 * Base Component System - Unified template resolution with mindful design
 *
 * This eliminates duplication across all system prompt components while
 * maintaining clear separation of concerns. Each component focuses on its
 * specific purpose; this handles the common patterns with intention.
 */

/**
 * Component configuration for unified processing
 */
export interface ComponentConfig<T = Record<string, unknown>> {
	/** The section identifier for override lookup */
	section: SystemPromptSection
	/** Default template text or template function */
	defaultTemplate: string | ((context: SystemPromptContext) => string)
	/** Optional function to build template variables */
	buildVariables?: (context: SystemPromptContext) => T | Promise<T>
	/** Optional condition to determine if section should be included */
	shouldInclude?: (context: SystemPromptContext) => boolean | Promise<boolean>
}

/**
 * Unified component resolver - handles all common patterns
 *
 * This function embodies the principle of composition over creation:
 * instead of recreating the same pattern in every file, we compose
 * functionality from this single, well-tested implementation.
 */
export async function resolveComponent<T extends Record<string, unknown>>(
	config: ComponentConfig<T>,
	variant: PromptVariant,
	context: SystemPromptContext,
): Promise<string | undefined> {
	// Check if this section should be included
	if (config.shouldInclude) {
		const shouldInclude = await config.shouldInclude(context)
		if (!shouldInclude) {
			return undefined
		}
	}

	// Get the template (use override if available, otherwise default)
	const overrideTemplate = variant.componentOverrides?.[config.section]?.template
	const template = overrideTemplate ?? config.defaultTemplate

	// Resolve template if it's a function
	const templateText = typeof template === "function" ? template(context) : template

	// Build variables if needed
	const variables = config.buildVariables ? await config.buildVariables(context) : ({} as T)

	// Resolve and return
	return new TemplateEngine().resolve(templateText, context, variables)
}

/**
 * Create a component function with unified behavior
 *
 * This higher-order function creates component functions that follow
 * our standard patterns, reducing boilerplate to near zero.
 */
export function createComponent<T extends Record<string, unknown>>(config: ComponentConfig<T>) {
	return async (variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> => {
		return resolveComponent(config, variant, context)
	}
}

/**
 * Utility: Build template variables from context with common patterns
 */
export const CommonVariables = {
	/** Current working directory */
	cwd: (context: SystemPromptContext) => context.cwd || process.cwd(),

	/** Browser support status */
	browserSupport: (context: SystemPromptContext, whenAvailable: string, whenNot: string = "") =>
		context.supportsBrowserUse ? whenAvailable : whenNot,

	/** YOLO mode status */
	yoloMode: (context: SystemPromptContext, whenEnabled: string, whenDisabled: string) =>
		context.yoloModeToggled === true ? whenEnabled : whenDisabled,

	/** Focus chain status */
	focusChainEnabled: (context: SystemPromptContext) => context.focusChainSettings?.enabled ?? false,
}

/**
 * Utility: Common conditions for section inclusion
 */
export const CommonConditions = {
	/** Include only when focus chain is enabled */
	requiresFocusChain: (context: SystemPromptContext) => context.focusChainSettings?.enabled ?? false,

	/** Include only when there's content to show */
	hasContent: (content?: string) => !!content,

	/** Include only when array has items */
	hasItems: <T>(items?: T[]) => items && items.length > 0,
}
