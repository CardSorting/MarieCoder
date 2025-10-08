import { ModelFamily } from "@/shared/prompts"
import { QuickVariants } from "../../shared/variant_builder"
import { createValidatedVariantConfig } from "../../shared/variant_configurator"
import { SystemPromptSection } from "../../templates"
import { xsComponentOverrides } from "./overrides"
import { baseTemplate } from "./template"

// Type-safe variant configuration using the enhanced builder pattern
export const config = QuickVariants.minimal(ModelFamily.XS, "Prompt for models with a small context window.")
	.version(1)
	.tags("local", "xs", "compact")
	.labels({
		stable: 1,
		production: 1,
		advanced: 1,
	})
	.template(baseTemplate)
	.components(
		SystemPromptSection.AGENT_ROLE,
		SystemPromptSection.RULES,
		SystemPromptSection.ACT_VS_PLAN,
		SystemPromptSection.CAPABILITIES,
		SystemPromptSection.EDITING_FILES,
		SystemPromptSection.OBJECTIVE,
		SystemPromptSection.SYSTEM_INFO,
		SystemPromptSection.USER_INSTRUCTIONS,
	)
	.placeholders({
		MODEL_FAMILY: ModelFamily.XS,
	})
	.config({})
	.build()

// Apply component overrides after building the base configuration
Object.assign(config.componentOverrides, xsComponentOverrides)

// Validated variant configuration with centralized validation
export const validatedConfig = createValidatedVariantConfig("xs", config, {
	strict: false,
	logSummary: false,
})

// Export type information for better IDE support
export type XsVariantConfig = typeof config
