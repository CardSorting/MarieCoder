import { SystemPromptSection } from "../templates/section_definitions"
import type { PromptVariant, SystemPromptContext } from "../types"
import { resolveComponent } from "./base_component"

/**
 * System Rules Component - Operational requirements only
 *
 * This component provides OPERATIONAL rules for how the agent interacts
 * with the environment. Coding standards and methodology live in .clinerules/
 *
 * Separation of concerns:
 * - System Prompt (here): How to USE tools, navigate CWD, communicate
 * - .clinerules/: How to WRITE code, naming standards, architecture
 */

/**
 * Operational Rules - System-level requirements for agent operation
 *
 * These rules define HOW the agent operates within the environment.
 * They are NOT about coding standards - those belong in .clinerules/
 *
 * This focuses on:
 * - Environment behavior (CWD, paths, system info)
 * - File operation patterns
 * - Communication style
 * - Tool usage protocols
 * - Browser automation workflows
 */
const OPERATIONAL_RULES = `## 🛠️ System Operations (Required)

### Environment - MUST Follow:
- **Current directory**: {{CWD}}
- **CANNOT \`cd\`** - Always operate from {{CWD}}, pass correct 'path' parameter to tools
- **NO ~ or $HOME** - Do not use these to refer to home directory
- **Check SYSTEM INFORMATION** before execute_command to ensure compatibility

### File Operations - MUST Follow:
- **New projects**: Organize in dedicated project directory (unless user specifies otherwise)
- **Automatic directory creation**: write_to_file creates necessary directories
- **Consider context**: Always check how/where code is used before modifying
- **Direct modifications**: Use replace_in_file or write_to_file with desired changes

### Communication - MUST Follow:
- **Don't over-ask**: Use tools to discover information instead of asking
- **{{YOLO_MODE_RULES}}** Example: User mentions Desktop file → use list_files to find it vs. asking for path
- **Assume success**: If no terminal output, assume command succeeded and proceed{{YOLO_MODE_TERMINAL_RULES}}
- **Goal**: Accomplish task efficiently, NOT engage in back-and-forth

{{BROWSER_RULES}}

### Response Style - MUST Follow:
- **Be direct**: Skip filler like "Great", "Certainly", "Okay", "Sure"
- **Provide clear results**: Complete tasks without prompting further conversation
- **Use vision capabilities**: Thoroughly examine images for meaningful information
- **Efficiency over dialogue**: Accomplish tasks, don't chat

### Tool Usage - MUST Follow:
- **CRITICAL**: Wait for user response after each tool use to confirm success{{BROWSER_WAIT_RULES}}
- **MCP operations**: Use one at a time, wait for confirmation before proceeding`

/**
 * Project Rules Reference - Points to .clinerules/ system
 *
 * This provides a lightweight reference to where coding standards live.
 * Instead of embedding 150+ lines of rules in every system prompt,
 * we point to the .clinerules/ directory which Cline loads separately.
 *
 * Benefits:
 * - Token efficiency (~500 token savings per message)
 * - Single source of truth (no duplication)
 * - Per-project customization
 * - Easy updates without code changes
 */
const PROJECT_RULES_REFERENCE = `## 📋 Project Standards

This project uses **Cline Rules** for coding standards and methodology.

- **Location**: \`.clinerules/\` directory in project root
- **Active Rules**: All \`.md\` files in \`.clinerules/\` are automatically applied
- **Management**: Use the Rules popover UI in chat to toggle specific rules

The project rules cover:
- 📝 Naming conventions (snake_case files, clear variable names)
- 🔧 Type safety and quality requirements
- 🏗️ Architecture patterns and principles
- ⚡ Performance standards and benchmarks
- 🎯 Implementation workflows and checklists
- 🙏 KonMari-inspired development philosophy

**Note**: Always honor the project rules in \`.clinerules/\` when writing or modifying code.`

/**
 * Context-specific operational rules
 */
const CONTEXT_SPECIFIC_RULES = {
	browser: `- The user may ask generic non-development tasks, such as "what's the latest news" or "look up the weather in San Diego", in which case you might use the browser_action tool to complete the task if it makes sense to do so, rather than trying to create a website or using curl to answer the question. However, if an available MCP server tool or resource can be used instead, you should prefer to use it over browser_action.`,

	browserWait: ` Then if you want to test your work, you might use browser_action to launch the site, wait for the user's response confirming the site was launched along with a screenshot, then perhaps e.g., click a button to test functionality if needed, wait for the user's response confirming the button was clicked along with a screenshot of the new state, before finally closing the browser.`,

	yoloMode: `You are only allowed to ask the user questions using the ask_followup_question tool. Use this tool only when you need additional details to complete a task, and be sure to use a clear and concise question that will help you move forward with the task. However if you can use the available tools to avoid having to ask the user questions, you should do so`,

	yoloModeTerminal: ` If you absolutely need to see the actual terminal output, use the ask_followup_question tool to request the user to copy and paste it back to you.`,
}

/**
 * Rules Section - Focused on operations, references project rules
 */
export async function getRulesSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	// Determine context-specific rules
	const browserRules = context.supportsBrowserUse ? CONTEXT_SPECIFIC_RULES.browser : ""
	const browserWaitRules = context.supportsBrowserUse ? CONTEXT_SPECIFIC_RULES.browserWait : ""
	const yoloModeRules =
		context.yoloModeToggled !== true
			? CONTEXT_SPECIFIC_RULES.yoloMode
			: "Use your available tools and apply your best judgment to accomplish the task without asking the user any followup questions, making reasonable assumptions from the provided context"
	const yoloModeTerminalRules = context.yoloModeToggled !== true ? CONTEXT_SPECIFIC_RULES.yoloModeTerminal : ""

	const result = await resolveComponent(
		{
			section: SystemPromptSection.RULES,
			defaultTemplate: RULES_TEMPLATE,
			buildVariables: () => ({
				CWD: context.cwd || process.cwd(),
				BROWSER_RULES: browserRules,
				BROWSER_WAIT_RULES: browserWaitRules,
				YOLO_MODE_RULES: yoloModeRules,
				YOLO_MODE_TERMINAL_RULES: yoloModeTerminalRules,
				OPERATIONAL_RULES: OPERATIONAL_RULES,
				PROJECT_RULES_REFERENCE: PROJECT_RULES_REFERENCE,
			}),
		},
		variant,
		context,
	)
	return result ?? ""
}

/**
 * Rules template - Streamlined with clear separation
 */
const RULES_TEMPLATE = `RULES

{{OPERATIONAL_RULES}}

{{PROJECT_RULES_REFERENCE}}`
