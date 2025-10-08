import { SystemPromptSection } from "../templates/section_definitions"
import { CommonConditions, createComponent } from "./base_component"

/**
 * User Context - Custom instructions and user support
 *
 * Refactored to use unified base component system.
 * Maintains custom instruction building logic as domain-specific helper.
 */

const USER_CUSTOM_INSTRUCTIONS_TEMPLATE_TEXT = `USER'S CUSTOM INSTRUCTIONS

The following additional instructions are provided by the user, and should be followed to the best of your ability without interfering with the TOOL USE guidelines.

{{CUSTOM_INSTRUCTIONS}}`

export const getUserInstructions = createComponent({
	section: SystemPromptSection.USER_INSTRUCTIONS,
	defaultTemplate: USER_CUSTOM_INSTRUCTIONS_TEMPLATE_TEXT,
	shouldInclude: (context) => {
		const instructions = buildUserInstructions(
			context.globalClineRulesFileInstructions,
			context.localClineRulesFileInstructions,
			context.localCursorRulesFileInstructions,
			context.localCursorRulesDirInstructions,
			context.localWindsurfRulesFileInstructions,
			context.clineIgnoreInstructions,
			context.preferredLanguageInstructions,
		)
		return CommonConditions.hasContent(instructions)
	},
	buildVariables: (context) => ({
		CUSTOM_INSTRUCTIONS: buildUserInstructions(
			context.globalClineRulesFileInstructions,
			context.localClineRulesFileInstructions,
			context.localCursorRulesFileInstructions,
			context.localCursorRulesDirInstructions,
			context.localWindsurfRulesFileInstructions,
			context.clineIgnoreInstructions,
			context.preferredLanguageInstructions,
		),
	}),
})

function buildUserInstructions(
	globalClineRulesFileInstructions?: string,
	localClineRulesFileInstructions?: string,
	localCursorRulesFileInstructions?: string,
	localCursorRulesDirInstructions?: string,
	localWindsurfRulesFileInstructions?: string,
	clineIgnoreInstructions?: string,
	preferredLanguageInstructions?: string,
): string | undefined {
	const customInstructions = []
	if (preferredLanguageInstructions) {
		customInstructions.push(preferredLanguageInstructions)
	}
	if (globalClineRulesFileInstructions) {
		customInstructions.push(globalClineRulesFileInstructions)
	}
	if (localClineRulesFileInstructions) {
		customInstructions.push(localClineRulesFileInstructions)
	}
	if (localCursorRulesFileInstructions) {
		customInstructions.push(localCursorRulesFileInstructions)
	}
	if (localCursorRulesDirInstructions) {
		customInstructions.push(localCursorRulesDirInstructions)
	}
	if (localWindsurfRulesFileInstructions) {
		customInstructions.push(localWindsurfRulesFileInstructions)
	}
	if (clineIgnoreInstructions) {
		customInstructions.push(clineIgnoreInstructions)
	}
	if (customInstructions.length === 0) {
		return undefined
	}
	return customInstructions.join("\n\n")
}

const FEEDBACK_TEMPLATE_TEXT = `
If the user asks for help or wants to give feedback inform them of the following:
- To give feedback, users should report the issue using the /reportbug slash command in the chat.

When the user directly asks about Cline (eg 'can Cline do...', 'does Cline have...') or asks in second person (eg 'are you able...', 'can you do...'), first use the web_fetch tool to gather information to answer the question from Cline docs at https://docs.cline.bot.
  - The available sub-pages are \`getting-started\` (Intro for new coders, installing Cline and dev essentials), \`model-selection\` (Model Selection Guide, Custom Model Configs, Bedrock, Vertex, Codestral, LM Studio, Ollama), \`features\` (Auto approve, Checkpoints, Cline rules, Drag & Drop, Plan & Act, Workflows, etc), \`task-management\` (Task and Context Management in Cline), \`prompt-engineering\` (Improving your prompting skills, Prompt Engineering Guide), \`cline-tools\` (Cline Tools Reference Guide, New Task Tool, Remote Browser Support, Slash Commands), \`mcp\` (MCP Overview, Adding/Configuring Servers, Transport Mechanisms, MCP Dev Protocol), \`enterprise\` (Cloud provider integration, Security concerns, Custom instructions), \`more-info\` (Telemetry and other reference content)
  - Example: https://docs.cline.bot/features/auto-approve`

export const getFeedbackSection = createComponent({
	section: SystemPromptSection.FEEDBACK,
	defaultTemplate: FEEDBACK_TEMPLATE_TEXT,
	shouldInclude: CommonConditions.requiresFocusChain,
})
