import { ModelFamily } from "@/shared/prompts"
import { QuickVariants } from "../../shared/variant_builder"
import { createValidatedVariantConfig } from "../../shared/variant_configurator"
import { SystemPromptSection } from "../../templates"
import { baseTemplate, rules_template } from "./template"

// Type-safe variant configuration using the enhanced builder pattern
export const config = QuickVariants.full(
	ModelFamily.NEXT_GEN,
	"Prompt tailored to newer frontier models with smarter agentic capabilities.",
)
	.version(1)
	.tags("next-gen", "advanced")
	.labels({
		stable: 1,
		production: 1,
		advanced: 1,
	})
	.template(baseTemplate)
	.components(
		SystemPromptSection.AGENT_ROLE,
		SystemPromptSection.TOOL_USE,
		SystemPromptSection.TODO,
		SystemPromptSection.MCP,
		SystemPromptSection.EDITING_FILES,
		SystemPromptSection.ACT_VS_PLAN,
		SystemPromptSection.TASK_PROGRESS,
		SystemPromptSection.CAPABILITIES,
		SystemPromptSection.FEEDBACK,
		SystemPromptSection.RULES,
		SystemPromptSection.SYSTEM_INFO,
		SystemPromptSection.OBJECTIVE,
		SystemPromptSection.USER_INSTRUCTIONS,
	)
	.placeholders({
		MODEL_FAMILY: ModelFamily.NEXT_GEN,
	})
	.config({})
	// Override the RULES component with custom template
	.overrideComponent(SystemPromptSection.RULES, {
		template: rules_template,
	})
	.build()

// Validated variant configuration with centralized validation
export const validatedConfig = createValidatedVariantConfig("next-gen", config, {
	strict: false,
	logSummary: false,
})

// Export type information for better IDE support
export type NextGenVariantConfig = typeof config
