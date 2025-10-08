import { SystemPromptSection } from "../templates/section_definitions"
import type { SystemPromptContext } from "../types"
import { createComponent } from "./base_component"

/**
 * Planning Modes - Clear ACT vs PLAN mode instructions
 * Template function support for context-aware content.
 */

const getActVsPlanModeTemplateText = (context: SystemPromptContext) => `ACT MODE VS. PLAN MODE

**Mode Indicator**: Each user message includes current mode in environment_details.

## Two Modes

### ACT MODE (Implementation)
- **Tools**: All tools EXCEPT \`plan_mode_respond\`
- **Goal**: Use tools to accomplish user's task
- **Completion**: Use \`attempt_completion\` to present task result

### PLAN MODE (Planning & Discussion)
- **Tools**: Access to \`plan_mode_respond\` tool
- **Goal**: Gather info and create detailed plan for user review/approval
- **Response**: Use \`plan_mode_respond\` directly (NOT <thinking> tags). Don't announce using it - just use it
- **Output**: Share thoughts and provide helpful answers directly

## PLAN MODE Workflow

**Purpose**: Back-and-forth planning session to determine best approach.

**Steps**:
1. **Gather Context**: Use \`read_file\` or \`search_files\` for more context${context.yoloModeToggled !== true ? ". Use \`ask_followup_question\` for clarifying questions" : ""}
2. **Architect Plan**: Create detailed plan for accomplishing task
3. **Present Plan**: Use \`plan_mode_respond\` to share plan with user
4. **Iterate**: Discuss with user - this is a brainstorming session. Ask if pleased or if changes needed
5. **Complete Planning**: Once good plan reached, ask user to switch to ACT MODE for implementation

**Default**: You're usually in ACT MODE unless user switches to PLAN MODE.`

export const getActVsPlanModeSection = createComponent({
	section: SystemPromptSection.ACT_VS_PLAN,
	defaultTemplate: getActVsPlanModeTemplateText,
})
