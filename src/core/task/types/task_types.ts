import { Anthropic } from "@anthropic-ai/sdk"
import { Controller } from "@core/controller"
import { StateManager } from "@core/storage/StateManager"
import { WorkspaceRootManager } from "@core/workspace/WorkspaceRootManager"
import { McpHub } from "@services/mcp/McpHub"
import { HistoryItem } from "@shared/HistoryItem"

/**
 * Tool response type - can be string or array of content blocks
 */
export type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>

/**
 * User content type for API messages
 */
export type UserContent = Array<Anthropic.ContentBlockParam>

/**
 * Complete parameters for Task initialization
 * Encompasses all dependencies, callbacks, configuration, and initial state
 */
export interface TaskParams {
	controller: Controller
	mcpHub: McpHub
	updateTaskHistory: (historyItem: HistoryItem) => Promise<HistoryItem[]>
	postStateToWebview: () => Promise<void>
	reinitExistingTaskFromId: (taskId: string) => Promise<void>
	cancelTask: () => Promise<void>
	shellIntegrationTimeout: number
	terminalReuseEnabled: boolean
	terminalOutputLineLimit: number
	defaultTerminalProfile: string
	cwd: string
	stateManager: StateManager
	workspaceManager?: WorkspaceRootManager
	task?: string
	images?: string[]
	files?: string[]
	historyItem?: HistoryItem
	taskId: string
}

/**
 * Core dependencies required by Task
 * Separated for clarity and potential dependency injection
 */
export interface TaskDependencies {
	controller: Controller
	mcpHub: McpHub
	stateManager: StateManager
	workspaceManager?: WorkspaceRootManager
}

/**
 * Callback functions provided to Task
 * Enables Task to communicate with parent Controller
 */
export interface TaskCallbacks {
	updateTaskHistory: (historyItem: HistoryItem) => Promise<HistoryItem[]>
	postStateToWebview: () => Promise<void>
	reinitExistingTaskFromId: (taskId: string) => Promise<void>
	cancelTask: () => Promise<void>
}

/**
 * Configuration for Task environment
 * Terminal, shell, and workspace settings
 */
export interface TaskConfiguration {
	shellIntegrationTimeout: number
	terminalReuseEnabled: boolean
	terminalOutputLineLimit: number
	defaultTerminalProfile: string
	cwd: string
}

/**
 * Initial task content for new tasks
 * Either task text/images/files or historyItem for resume
 */
export interface TaskInitialContent {
	task?: string
	images?: string[]
	files?: string[]
	historyItem?: HistoryItem
	taskId: string
}
