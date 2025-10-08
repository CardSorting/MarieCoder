import { SystemPromptSection } from "../templates/section_definitions"
import { createComponent } from "./base_component"

/**
 * Agent Identity - Defines who Normie is
 *
 * Refactored to use unified base component system.
 * Line reduction: 16 → 17 lines (but eliminates duplication across project)
 */

const AGENT_ROLE = [
	"You are Normie,",
	"a highly skilled software engineer",
	"with extensive knowledge in many programming languages, frameworks, design patterns, and best practices.",
].join(" ")

export const getAgentRoleSection = createComponent({
	section: SystemPromptSection.AGENT_ROLE,
	defaultTemplate: AGENT_ROLE,
})
