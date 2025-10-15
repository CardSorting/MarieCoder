/**
 * CLI Task History Manager
 * Handles task history viewing, export, and management in CLI mode
 */

import { Controller } from "@/core/controller"
import type { HistoryItem } from "@/shared/HistoryItem"
import { output } from "./cli_output"

export class CliTaskHistoryManager {
	constructor(
		private readonly controller: Controller,
		readonly _verbose: boolean = false,
	) {}

	/**
	 * Display recent task history
	 */
	async displayHistory(limit: number = 10): Promise<void> {
		output.log("\n📜 Task History")
		output.log("─".repeat(80))

		try {
			const taskHistory = this.controller.stateManager.getGlobalStateKey("taskHistory") || []

			if (taskHistory.length === 0) {
				output.log("  No task history found")
				output.log("  Start a task to build your history")
				output.log("─".repeat(80))
				return
			}

			// Sort by timestamp (most recent first)
			const sortedHistory = [...taskHistory]
				.filter((item) => item.ts && item.task)
				.sort((a, b) => b.ts - a.ts)
				.slice(0, limit)

			output.log(`  Showing ${sortedHistory.length} most recent task${sortedHistory.length !== 1 ? "s" : ""}:\n`)

			for (const item of sortedHistory) {
				const date = new Date(item.ts)
				const dateStr = date.toLocaleString()
				const taskPreview = this.truncateText(item.task, 60)
				const status = this.getTaskStatusEmoji(item)

				output.log(`  ${status} ${item.id}`)
				output.log(`     ${dateStr}`)
				output.log(`     "${taskPreview}"`)
				output.log()
			}

			output.log("─".repeat(80))
			output.log(`\nCommands:`)
			output.log(`  • history export <id>  - Export task as markdown`)
			output.log(`  • history resume <id>  - Resume a previous task`)
			output.log(`  • history delete <id>  - Delete a task from history`)
			output.log("─".repeat(80))
		} catch (error) {
			console.error("  Error retrieving task history:", error instanceof Error ? error.message : String(error))
			output.log("─".repeat(80))
		}
	}

	/**
	 * Display detailed task information
	 */
	async displayTaskDetails(taskId: string): Promise<void> {
		output.log(`\n📄 Task Details: ${taskId}`)
		output.log("─".repeat(80))

		try {
			const taskData = await this.controller.getTaskWithId(taskId)

			output.log(`  Task: ${taskData.historyItem.task}`)
			output.log(`  Created: ${new Date(taskData.historyItem.ts).toLocaleString()}`)
			output.log(`  Status: ${this.getTaskStatus(taskData.historyItem)}`)
			output.log(`  Messages: ${taskData.apiConversationHistory.length}`)
			output.log("─".repeat(80))
		} catch (_error) {
			console.error(`  Task not found: ${taskId}`)
			output.log("─".repeat(80))
		}
	}

	/**
	 * Export task as markdown
	 */
	async exportTask(taskId: string, outputPath?: string): Promise<void> {
		output.log(`\n📤 Exporting Task: ${taskId}`)
		output.log("─".repeat(80))

		try {
			await this.controller.exportTaskWithId(taskId)
			output.log(`  ✓ Task exported successfully`)
			if (outputPath) {
				output.log(`  Location: ${outputPath}`)
			}
			output.log("─".repeat(80))
		} catch (error) {
			console.error(`  ✗ Export failed: ${error instanceof Error ? error.message : String(error)}`)
			output.log("─".repeat(80))
		}
	}

	/**
	 * Resume a previous task
	 */
	async resumeTask(taskId: string): Promise<void> {
		output.log(`\n🔄 Resuming Task: ${taskId}`)
		output.log("─".repeat(80))

		try {
			const taskData = await this.controller.getTaskWithId(taskId)
			output.log(`  Task: "${this.truncateText(taskData.historyItem.task, 60)}"`)
			output.log(`  Messages: ${taskData.apiConversationHistory.length}`)
			output.log()

			await this.controller.reinitExistingTaskFromId(taskId)
			output.log("  ✓ Task resumed successfully")
			output.log("─".repeat(80))
		} catch (error) {
			console.error(`  ✗ Resume failed: ${error instanceof Error ? error.message : String(error)}`)
			output.log("─".repeat(80))
		}
	}

	/**
	 * Delete a task from history
	 */
	async deleteTask(taskId: string): Promise<void> {
		output.log(`\n🗑️  Deleting Task: ${taskId}`)
		output.log("─".repeat(80))

		try {
			await this.controller.deleteTaskFromState(taskId)
			output.log("  ✓ Task deleted successfully")
			output.log("─".repeat(80))
		} catch (error) {
			console.error(`  ✗ Delete failed: ${error instanceof Error ? error.message : String(error)}`)
			output.log("─".repeat(80))
		}
	}

	/**
	 * Search task history
	 */
	async searchHistory(query: string): Promise<void> {
		output.log(`\n🔍 Searching Task History: "${query}"`)
		output.log("─".repeat(80))

		try {
			const taskHistory = this.controller.stateManager.getGlobalStateKey("taskHistory") || []
			const results = taskHistory.filter(
				(item) =>
					item.task?.toLowerCase().includes(query.toLowerCase()) ||
					item.id?.toLowerCase().includes(query.toLowerCase()),
			)

			if (results.length === 0) {
				output.log("  No matching tasks found")
				output.log("─".repeat(80))
				return
			}

			output.log(`  Found ${results.length} matching task${results.length !== 1 ? "s" : ""}:\n`)

			for (const item of results.slice(0, 10)) {
				const date = new Date(item.ts)
				const dateStr = date.toLocaleString()
				const taskPreview = this.truncateText(item.task, 60)
				const status = this.getTaskStatusEmoji(item)

				output.log(`  ${status} ${item.id}`)
				output.log(`     ${dateStr}`)
				output.log(`     "${taskPreview}"`)
				output.log()
			}

			if (results.length > 10) {
				output.log(`  ... and ${results.length - 10} more`)
			}

			output.log("─".repeat(80))
		} catch (error) {
			console.error("  Error searching history:", error instanceof Error ? error.message : String(error))
			output.log("─".repeat(80))
		}
	}

	/**
	 * Get task status emoji
	 */
	private getTaskStatusEmoji(_item: HistoryItem): string {
		// This is a simple heuristic - could be enhanced
		return "•"
	}

	/**
	 * Get task status text
	 */
	private getTaskStatus(_item: HistoryItem): string {
		// This is a simple heuristic - could be enhanced
		return "Completed"
	}

	/**
	 * Truncate text for display
	 */
	private truncateText(text: string, maxLength: number): string {
		if (!text) {
			return ""
		}
		if (text.length <= maxLength) {
			return text
		}
		return text.substring(0, maxLength - 3) + "..."
	}
}
