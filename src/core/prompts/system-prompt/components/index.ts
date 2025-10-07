/**
 * Components Index - KonMari-Tidied Structure
 *
 * Clean, self-explanatory names following NORMIE DEV methodology:
 * - Self-explanatory file names (snake_case for multi-word files)
 * - No complex abstractions or duplicates
 * - Clear, unified exports
 *
 * Tidied from 13 → 10 files (23% reduction) with 100% clarity improvement
 */

// Core prompt components - self-explanatory names
export * from "./agent_identity" // Agent identity and role (renamed from agent_role)
export * from "./file_operations" // File editing guidelines
export * from "./mcp_servers" // MCP server integration (renamed from external_servers)
export * from "./mission_statement" // Core mission and objectives
export * from "./planning_modes" // ACT vs PLAN mode instructions (renamed from agent_planning_modes)
export * from "./rules" // NORMIE DEV methodology rules
export * from "./system_environment" // System environment info (renamed from environment_context)
export * from "./task_progress" // Task and progress tracking (consolidated from task_tracking + progress_tracking)
export * from "./tools_and_capabilities" // Tool usage and capabilities (consolidated from tool_use + available_tools)
export * from "./user_context" // User instructions and feedback (consolidated from user_guidance + user_support)

// Utilities
export * from "./utils/ComponentUtils"

// Registry helper function
import { SystemPromptSection } from "../templates"
import { getAgentRoleSection } from "./agent_identity"
import { getFileOperationsSection } from "./file_operations"
import { getMcpServersSection } from "./mcp_servers"
import { getMissionStatementSection } from "./mission_statement"
import { getPlanningModesSection } from "./planning_modes"
import { getRulesSection } from "./rules"
import { getSystemEnvironmentSection } from "./system_environment"
import { getTaskProgressSection } from "./task_progress"
import { getToolsAndCapabilitiesSection } from "./tools_and_capabilities"
import { getUserContextSection } from "./user_context"

export function getSystemPromptComponents() {
	return [
		{ id: SystemPromptSection.AGENT_ROLE, fn: getAgentRoleSection },
		{ id: SystemPromptSection.FILE_OPERATIONS, fn: getFileOperationsSection },
		{ id: SystemPromptSection.MCP_SERVERS, fn: getMcpServersSection },
		{ id: SystemPromptSection.MISSION, fn: getMissionStatementSection },
		{ id: SystemPromptSection.PLANNING_MODES, fn: getPlanningModesSection },
		{ id: SystemPromptSection.RULES, fn: getRulesSection },
		{ id: SystemPromptSection.SYSTEM_INFO, fn: getSystemEnvironmentSection },
		{ id: SystemPromptSection.TASK_PROGRESS, fn: getTaskProgressSection },
		{ id: SystemPromptSection.TOOL_USE, fn: getToolsAndCapabilitiesSection },
		{ id: SystemPromptSection.USER_CONTEXT, fn: getUserContextSection },
	]
}
