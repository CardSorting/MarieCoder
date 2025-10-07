/**
 * Tool Registry
 *
 * Centralized registry for all tool variants with automatic registration
 * and validation.
 */

import { ClineDefaultTool } from "@/shared/tools"
import { ask_followup_question_variants } from "./ask_user_questions"
import { list_code_definition_names_variants } from "./code_definitions"
import { execute_command_variants } from "./command_execution"
import { replace_in_file_variants } from "./file_editing"
import { list_files_variants } from "./file_listing"
// Import all tool variants
import { read_file_variants } from "./file_reading"
import { search_files_variants } from "./file_searching"
import { write_to_file_variants } from "./file_writing"
import { focus_chain_variants } from "./focus_tracking"
import { load_mcp_documentation_variants } from "./mcp_documentation"
import { access_mcp_resource_variants } from "./mcp_resource_access"
import { use_mcp_tool_variants } from "./mcp_tool_usage"
import { plan_mode_respond_variants } from "./planning_responses"
import { toolRegistry } from "./shared/tool_registry"
import { attempt_completion_variants } from "./task_completion"
import { new_task_variants } from "./task_creation"
import { browser_action_variants } from "./web_browser_actions"
import { web_fetch_variants } from "./web_requests"

/**
 * Tool registration map
 */
const TOOL_REGISTRY_MAP = {
	[ClineDefaultTool.FILE_READ]: read_file_variants,
	[ClineDefaultTool.FILE_NEW]: write_to_file_variants,
	[ClineDefaultTool.LIST_FILES]: list_files_variants,
	[ClineDefaultTool.SEARCH]: search_files_variants,
	[ClineDefaultTool.BASH]: execute_command_variants,
	[ClineDefaultTool.FILE_EDIT]: replace_in_file_variants,
	[ClineDefaultTool.BROWSER]: browser_action_variants,
	[ClineDefaultTool.MCP_ACCESS]: access_mcp_resource_variants,
	[ClineDefaultTool.ASK]: ask_followup_question_variants,
	[ClineDefaultTool.ATTEMPT]: attempt_completion_variants,
	[ClineDefaultTool.TODO]: focus_chain_variants, // Use TODO since FOCUS_CHAIN doesn't exist
	[ClineDefaultTool.LIST_CODE_DEF]: list_code_definition_names_variants,
	[ClineDefaultTool.MCP_DOCS]: load_mcp_documentation_variants,
	[ClineDefaultTool.NEW_TASK]: new_task_variants,
	[ClineDefaultTool.PLAN_MODE]: plan_mode_respond_variants,
	[ClineDefaultTool.MCP_USE]: use_mcp_tool_variants,
	[ClineDefaultTool.WEB_FETCH]: web_fetch_variants,
} as const

/**
 * Tool registry service
 */
export class ToolRegistryService {
	private static initialized = false

	/**
	 * Initialize the tool registry with all tool variants
	 */
	static initialize(): void {
		if (ToolRegistryService.initialized) {
			console.warn("Tool registry already initialized")
			return
		}

		// Register all tools
		for (const [toolId, variants] of Object.entries(TOOL_REGISTRY_MAP)) {
			try {
				toolRegistry.register(toolId as ClineDefaultTool, variants, {
					version: "1.0.0",
					description: `Tool variants for ${toolId}`,
				})
			} catch (error) {
				console.error(`Failed to register tool ${toolId}:`, error)
			}
		}

		// Validate all registered tools
		const validation = toolRegistry.validateAll()
		if (!validation.isValid) {
			console.error("Tool registry validation failed:", validation.errors)
		} else if (validation.warnings.length > 0) {
			console.warn("Tool registry validation warnings:", validation.warnings)
		}

		ToolRegistryService.initialized = true
		console.log("Tool registry initialized successfully")
	}

	/**
	 * Get tool variants by tool ID
	 */
	static getToolVariants(toolId: ClineDefaultTool) {
		if (!ToolRegistryService.initialized) {
			ToolRegistryService.initialize()
		}
		return toolRegistry.get(toolId)
	}

	/**
	 * Get all registered tools
	 */
	static getAllTools() {
		if (!ToolRegistryService.initialized) {
			ToolRegistryService.initialize()
		}
		return toolRegistry.getAllTools()
	}

	/**
	 * Get tool variants by model family
	 */
	static getToolsByModelFamily(modelFamily: string) {
		if (!ToolRegistryService.initialized) {
			ToolRegistryService.initialize()
		}
		return toolRegistry.getToolsByModelFamily(modelFamily as any)
	}

	/**
	 * Check if tool is registered
	 */
	static isToolRegistered(toolId: ClineDefaultTool): boolean {
		if (!ToolRegistryService.initialized) {
			ToolRegistryService.initialize()
		}
		return toolRegistry.isRegistered(toolId)
	}

	/**
	 * Get registry statistics
	 */
	static getStatistics() {
		if (!ToolRegistryService.initialized) {
			ToolRegistryService.initialize()
		}
		return toolRegistry.getStatistics()
	}

	/**
	 * Validate all registered tools
	 */
	static validateAll() {
		if (!ToolRegistryService.initialized) {
			ToolRegistryService.initialize()
		}
		return toolRegistry.validateAll()
	}

	/**
	 * Reset the registry (for testing)
	 */
	static reset(): void {
		toolRegistry.clear()
		ToolRegistryService.initialized = false
	}
}

/**
 * Auto-initialize the registry when this module is imported
 */
ToolRegistryService.initialize()

/**
 * Export the registry service and individual tool variants
 */
export { toolRegistry }
export * from "./ask_user_questions"
export * from "./code_definitions"
export * from "./command_execution"
export * from "./file_editing"
export * from "./file_listing"
export * from "./file_reading"
export * from "./file_searching"
export * from "./file_writing"
export * from "./focus_tracking"
export * from "./init"
export * from "./mcp_documentation"
export * from "./mcp_resource_access"
export * from "./mcp_tool_usage"
export * from "./planning_responses"
export * from "./task_completion"
export * from "./task_creation"
export * from "./web_browser_actions"
export * from "./web_requests"
