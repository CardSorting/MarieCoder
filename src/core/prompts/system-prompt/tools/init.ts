// Import all tool variants
import { ClineToolSet } from "../registry/tool_sets"
import { ask_followup_question_variants } from "./ask_user_questions"
import { list_code_definition_names_variants } from "./code_definitions"
import { execute_command_variants } from "./command_execution"
import { replace_in_file_variants } from "./file_editing"
import { list_files_variants } from "./file_listing"
import { read_file_variants } from "./file_reading"
import { search_files_variants } from "./file_searching"
import { write_to_file_variants } from "./file_writing"
import { focus_chain_variants } from "./focus_tracking"
import { load_mcp_documentation_variants } from "./mcp_documentation"
import { access_mcp_resource_variants } from "./mcp_resource_access"
import { use_mcp_tool_variants } from "./mcp_tool_usage"
import { plan_mode_respond_variants } from "./planning_responses"
import { attempt_completion_variants } from "./task_completion"
import { new_task_variants } from "./task_creation"
import { browser_action_variants } from "./web_browser_actions"
import { web_fetch_variants } from "./web_requests"

/**
 * Registers all tool variants with the ClineToolSet provider.
 * This function must be called at prompt registry
 * to allow all tool sets be available at build time.
 */
export function registerClineToolSets(): void {
	// Collect all variants from all tools
	const allToolVariants = [
		...access_mcp_resource_variants,
		...ask_followup_question_variants,
		...attempt_completion_variants,
		...browser_action_variants,
		...execute_command_variants,
		...focus_chain_variants,
		...list_code_definition_names_variants,
		...list_files_variants,
		...load_mcp_documentation_variants,
		...new_task_variants,
		...plan_mode_respond_variants,
		...read_file_variants,
		...replace_in_file_variants,
		...search_files_variants,
		...use_mcp_tool_variants,
		...web_fetch_variants,
		...write_to_file_variants,
	]

	// Register each variant
	allToolVariants.forEach((v) => {
		ClineToolSet.register(v)
	})
}
