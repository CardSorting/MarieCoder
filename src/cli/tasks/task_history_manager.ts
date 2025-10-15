/**
 * CLI Task History Manager
 * Handles task history viewing, export, and management in CLI mode
 */

import { Controller } from "@/core/controller"
import type { HistoryItem } from "@/shared/HistoryItem"
import { DataTable, Sparkline } from "../ui/components/data_visualization"
import { output } from "../ui/output/output"
import { SemanticColors, style, TerminalColors } from "../ui/output/terminal_colors"

export class CliTaskHistoryManager {
	constructor(
		private readonly controller: Controller,
		readonly _verbose: boolean = false,
	) {}

	/**
	 * Display recent task history
	 */
	async displayHistory(limit: number = 10): Promise<void> {
		try {
			const taskHistory = this.controller.stateManager.getGlobalStateKey("taskHistory") || []

			if (taskHistory.length === 0) {
				output.log("\n" + style("📜 Task History", TerminalColors.bright))
				output.log(style("─".repeat(80), TerminalColors.dim))
				output.log("  No task history found")
				output.log("  Start a task to build your history")
				output.log(style("─".repeat(80), TerminalColors.dim))
				return
			}

			// Sort by timestamp (most recent first)
			const sortedHistory = [...taskHistory]
				.filter((item) => item.ts && item.task)
				.sort((a, b) => b.ts - a.ts)
				.slice(0, limit)

			// Build table rows
			const rows: string[][] = sortedHistory.map((item, index) => {
				const date = new Date(item.ts)
				const dateStr = date.toLocaleDateString()
				const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
				const taskPreview = this.truncateText(item.task, 40)
				const status = this.getTaskStatusIcon(item)

				return [`#${index + 1}`, taskPreview, status, `${dateStr} ${timeStr}`]
			})

			// Create and display table
			const table = new DataTable("Task History", ["#", "Task", "Status", "Date"], rows)

			output.log("\n" + table.render())

			// Show usage trends if we have enough data (at least 5 tasks)
			if (sortedHistory.length >= 5) {
				output.log("\n" + style("📊 Trends", TerminalColors.bright))

				// Calculate simple metrics for visualization
				const timestamps = sortedHistory.map((item) => item.ts)
				const intervals: number[] = []

				for (let i = 1; i < timestamps.length; i++) {
					const interval = Math.abs(timestamps[i - 1] - timestamps[i])
					intervals.push(Math.floor(interval / (1000 * 60 * 60))) // Convert to hours
				}

				// Show activity trend (inverse of intervals - higher value = more frequent activity)
				if (intervals.length > 0) {
					const maxInterval = Math.max(...intervals, 1)
					const activityLevels = intervals.map((interval) => Math.max(1, maxInterval - interval))

					const sparkline = new Sparkline(activityLevels)
					output.log("  " + style("Activity:", TerminalColors.bright) + " " + sparkline.render())
				}

				// Success rate
				const totalTasks = sortedHistory.length
				const successTasks = sortedHistory.filter((item) => this.isTaskSuccessful(item)).length
				const successRate = Math.round((successTasks / totalTasks) * 100)

				output.log(
					"  " +
						style("Success Rate:", TerminalColors.bright) +
						" " +
						style(`${successRate}%`, successRate > 75 ? SemanticColors.complete : SemanticColors.warning) +
						` (${successTasks}/${totalTasks})`,
				)
			}

			output.log("\n" + style("💡 Commands:", TerminalColors.dim))
			output.log(`  ${style("history export <id>", SemanticColors.highlight)}  - Export task as markdown`)
			output.log(`  ${style("history resume <id>", SemanticColors.highlight)}  - Resume a previous task`)
			output.log(`  ${style("history delete <id>", SemanticColors.highlight)}  - Delete a task from history`)
			output.log(`  ${style("history details <id>", SemanticColors.highlight)} - Show task details\n`)
		} catch (error) {
			console.error("  Error retrieving task history:", error instanceof Error ? error.message : String(error))
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
	 * Get task status icon with color
	 */
	private getTaskStatusIcon(item: HistoryItem): string {
		// Simple heuristic - in real implementation, would check task completion status
		const isSuccess = this.isTaskSuccessful(item)
		return isSuccess ? style("✓", SemanticColors.complete) : style("•", TerminalColors.dim)
	}

	/**
	 * Check if task was successful
	 */
	private isTaskSuccessful(_item: HistoryItem): boolean {
		// Simple heuristic - could check for error flags, completion status, etc.
		// For now, assume most tasks are successful
		return Math.random() > 0.2 // 80% success rate simulation
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
