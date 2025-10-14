import { Logger } from "@services/logging/Logger"
import { ClineDefaultTool } from "@shared/tools"
import { ToolExecutor } from "../ToolExecutor"

/**
 * Coordinates tool execution and result handling
 * Orchestrates between ToolExecutor and Task with lifecycle hooks
 *
 * Responsibilities:
 * - Pre-execution validation and state updates
 * - Tool execution coordination
 * - Post-execution result processing
 * - Error handling and recovery
 */
export class ToolCoordinator {
	constructor(private toolExecutor: ToolExecutor) {}

	/**
	 * Execute a tool with full lifecycle management
	 * Handles pre/post execution hooks and error handling
	 *
	 * @param block - ToolUse block containing tool name and input
	 */
	async executeTool(block: any): Promise<void> {
		try {
			// Pre-execution hooks
			await this.beforeToolExecution(block.name, block.input)

			// Execute the tool
			await this.toolExecutor.executeTool(block)

			// Post-execution hooks
			await this.afterToolExecution(block.name)
		} catch (error) {
			Logger.error(
				`[ToolCoordinator] Error executing tool: ${block.name}`,
				error instanceof Error ? error : new Error(String(error)),
			)
			throw error
		}
	}

	/**
	 * Pre-execution hook
	 * Called before tool execution for validation and state updates
	 */
	private async beforeToolExecution(toolName: string, _toolInput: any): Promise<void> {
		Logger.debug(`[ToolCoordinator] Preparing to execute tool: ${toolName}`)

		// Additional pre-execution logic can be added here:
		// - Validation
		// - State updates
		// - Resource allocation
		// - Metrics collection
	}

	/**
	 * Post-execution hook
	 * Called after successful tool execution for result processing
	 */
	private async afterToolExecution(toolName: string): Promise<void> {
		Logger.debug(`[ToolCoordinator] Tool execution completed: ${toolName}`)

		// Additional post-execution logic can be added here:
		// - Result processing
		// - State updates
		// - Cleanup
		// - Metrics recording
	}

	/**
	 * Get the underlying tool executor
	 * Allows direct access when needed
	 */
	getToolExecutor(): ToolExecutor {
		return this.toolExecutor
	}

	/**
	 * Check if a specific tool is available
	 *
	 * @param toolName - Name of the tool to check
	 * @returns true if tool is available
	 */
	isToolAvailable(_toolName: ClineDefaultTool): boolean {
		// Tools are always available through the executor
		// This method exists for future filtering/capability checking
		return true
	}
}
