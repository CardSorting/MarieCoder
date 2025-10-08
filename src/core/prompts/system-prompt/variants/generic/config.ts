import { ModelFamily } from "@/shared/prompts"
import { QuickVariants } from "../../shared/variant_builder"
import { createValidatedVariantConfig } from "../../shared/variant_configurator"
import { SystemPromptSection } from "../../templates"
import { baseTemplate } from "./template"

export const config = QuickVariants.standard(ModelFamily.GENERIC, "The fallback prompt for generic use cases and models.")
	.version(1)
	.tags("fallback")
	.labels({
		stable: 1,
		fallback: 1,
	})
	.template(baseTemplate)
	.components(
		SystemPromptSection.AGENT_ROLE,
		SystemPromptSection.TOOL_USE,
		SystemPromptSection.TASK_PROGRESS,
		SystemPromptSection.MCP,
		SystemPromptSection.EDITING_FILES,
		SystemPromptSection.ACT_VS_PLAN,
		SystemPromptSection.TODO,
		SystemPromptSection.CAPABILITIES,
		SystemPromptSection.RULES,
		SystemPromptSection.SYSTEM_INFO,
		SystemPromptSection.OBJECTIVE,
		SystemPromptSection.USER_INSTRUCTIONS,
	)
	.placeholders({
		MODEL_FAMILY: "generic",
	})
	.config({})
	.build()

// Validated variant configuration with centralized validation
export const validatedConfig = createValidatedVariantConfig("generic", config, {
	strict: false,
	logSummary: true,
})

// Export type information for better IDE support
export type GenericVariantConfig = typeof config
