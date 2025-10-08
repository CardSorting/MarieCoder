import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import {
	createCommandParameter,
	createRequiresApprovalParameter,
	createTaskProgressParameter,
	createTimeoutParameter,
	ToolFactory,
} from "./shared"

// Get base variants from centralized service
const baseVariants = ToolFactory.createVariants(
	{
		id: ClineDefaultTool.BASH,
		name: "execute_command",
		description:
			"Request to execute a CLI command on the system. Use this when you need to perform system operations or run specific commands to accomplish any step in the user's task. You must tailor your command to the user's system and provide a clear explanation of what the command does. For command chaining, use the appropriate chaining syntax for the user's shell. Prefer to execute complex CLI commands over creating executable scripts, as they are more flexible and easier to run. Commands will be executed in the current working directory: {{CWD}}{{MULTI_ROOT_HINT}}",
		parameters: [createCommandParameter(), createRequiresApprovalParameter(), createTimeoutParameter()],
		variants: [ModelFamily.GENERIC],
	},
	[ModelFamily.GENERIC],
)

// GPT-specific bash tool with different parameters
const gpt = {
	variant: ModelFamily.GPT,
	id: ClineDefaultTool.BASH,
	name: "execute_command",
	description:
		"Run an arbitrary terminal command at the root of the users project. E.g. `ls -la` for listing files, or `find` for searching latest version of the codebase files locally.",
	parameters: [
		{
			name: "command",
			required: true,
			instruction: "The command to run in the root of the users project. Must be shell escaped.",
			usage: "Your command here",
		},
		{
			name: "requires_approval",
			required: false,
			instruction: "Whether the command is dangerous. If true, user will be asked to confirm.",
			usage: "true or false",
		},
		createTimeoutParameter(),
		createTaskProgressParameter(),
	],
}

export const execute_command_variants = [...baseVariants, gpt]
