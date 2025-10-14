/**
 * CLI Task History Manager
 * Handles task history viewing, export, and management in CLI mode
 */

import { Controller } from "@/core/controller"
import type { HistoryItem } from "@/shared/HistoryItem"

export class CliTaskHistoryManager {
	constructor(
		private readonly controller: Controller,
		readonly _verbose: boolean = false,
	) {}

	/**
	 * Display recent task history
	 */
	async displayHistory(limit: number = 10): Promise<void> {
		console.log("\n📜 Task History")
		console.log("─".repeat(80))

		try {
			const taskHistory = this.controller.stateManager.getGlobalStateKey("taskHistory") || []

			if (taskHistory.length === 0) {
				console.log("  No task history found")
				console.log("  Start a task to build your history")
				console.log("─".repeat(80))
				return
			}

			// Sort by timestamp (most recent first)
			const sortedHistory = [...taskHistory]
				.filter((item) => item.ts && item.task)
				.sort((a, b) => b.ts - a.ts)
				.slice(0, limit)

			console.log(`  Showing ${sortedHistory.length} most recent task${sortedHistory.length !== 1 ? "s" : ""}:\n`)

			for (const item of sortedHistory) {
				const date = new Date(item.ts)
				const dateStr = date.toLocaleString()
				const taskPreview = this.truncateText(item.task, 60)
				const status = this.getTaskStatusEmoji(item)

				console.log(`  ${status} ${item.id}`)
				console.log(`     ${dateStr}`)
				console.log(`     "${taskPreview}"`)
				console.log()
			}

			console.log("─".repeat(80))
			console.log(`\nCommands:`)
			console.log(`  • history export <id>  - Export task as markdown`)
			console.log(`  • history resume <id>  - Resume a previous task`)
			console.log(`  • history delete <id>  - Delete a task from history`)
			console.log("─".repeat(80))
		} catch (error) {
			console.error("  Error retrieving task history:", error instanceof Error ? error.message : String(error))
			console.log("─".repeat(80))
		}
	}

	/**
	 * Display detailed task information
	 */
	async displayTaskDetails(taskId: string): Promise<void> {
		console.log(`\n📄 Task Details: ${taskId}`)
		console.log("─".repeat(80))

		try {
			const taskData = await this.controller.getTaskWithId(taskId)

			console.log(`  Task: ${taskData.historyItem.task}`)
			console.log(`  Created: ${new Date(taskData.historyItem.ts).toLocaleString()}`)
			console.log(`  Status: ${this.getTaskStatus(taskData.historyItem)}`)
			console.log(`  Messages: ${taskData.apiConversationHistory.length}`)
			console.log("─".repeat(80))
		} catch (_error) {
			console.error(`  Task not found: ${taskId}`)
			console.log("─".repeat(80))
		}
	}

	/**
	 * Export task as markdown
	 */
	async exportTask(taskId: string, outputPath?: string): Promise<void> {
		console.log(`\n📤 Exporting Task: ${taskId}`)
		console.log("─".repeat(80))

		try {
			await this.controller.exportTaskWithId(taskId)
			console.log(`  ✓ Task exported successfully`)
			if (outputPath) {
				console.log(`  Location: ${outputPath}`)
			}
			console.log("─".repeat(80))
		} catch (error) {
			console.error(`  ✗ Export failed: ${error instanceof Error ? error.message : String(error)}`)
			console.log("─".repeat(80))
		}
	}

	/**
	 * Resume a previous task
	 */
	async resumeTask(taskId: string): Promise<void> {
		console.log(`\n🔄 Resuming Task: ${taskId}`)
		console.log("─".repeat(80))

		try {
			const taskData = await this.controller.getTaskWithId(taskId)
			console.log(`  Task: "${this.truncateText(taskData.historyItem.task, 60)}"`)
			console.log(`  Messages: ${taskData.apiConversationHistory.length}`)
			console.log()

			await this.controller.reinitExistingTaskFromId(taskId)
			console.log("  ✓ Task resumed successfully")
			console.log("─".repeat(80))
		} catch (error) {
			console.error(`  ✗ Resume failed: ${error instanceof Error ? error.message : String(error)}`)
			console.log("─".repeat(80))
		}
	}

	/**
	 * Delete a task from history
	 */
	async deleteTask(taskId: string): Promise<void> {
		console.log(`\n🗑️  Deleting Task: ${taskId}`)
		console.log("─".repeat(80))

		try {
			await this.controller.deleteTaskFromState(taskId)
			console.log("  ✓ Task deleted successfully")
			console.log("─".repeat(80))
		} catch (error) {
			console.error(`  ✗ Delete failed: ${error instanceof Error ? error.message : String(error)}`)
			console.log("─".repeat(80))
		}
	}

	/**
	 * Search task history
	 */
	async searchHistory(query: string): Promise<void> {
		console.log(`\n🔍 Searching Task History: "${query}"`)
		console.log("─".repeat(80))

		try {
			const taskHistory = this.controller.stateManager.getGlobalStateKey("taskHistory") || []
			const results = taskHistory.filter(
				(item) =>
					item.task?.toLowerCase().includes(query.toLowerCase()) ||
					item.id?.toLowerCase().includes(query.toLowerCase()),
			)

			if (results.length === 0) {
				console.log("  No matching tasks found")
				console.log("─".repeat(80))
				return
			}

			console.log(`  Found ${results.length} matching task${results.length !== 1 ? "s" : ""}:\n`)

			for (const item of results.slice(0, 10)) {
				const date = new Date(item.ts)
				const dateStr = date.toLocaleString()
				const taskPreview = this.truncateText(item.task, 60)
				const status = this.getTaskStatusEmoji(item)

				console.log(`  ${status} ${item.id}`)
				console.log(`     ${dateStr}`)
				console.log(`     "${taskPreview}"`)
				console.log()
			}

			if (results.length > 10) {
				console.log(`  ... and ${results.length - 10} more`)
			}

			console.log("─".repeat(80))
		} catch (error) {
			console.error("  Error searching history:", error instanceof Error ? error.message : String(error))
			console.log("─".repeat(80))
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
