/**
 * CLI Task Monitor - Simplified monitoring and approval handling
 *
 * @description Monitors task messages in real-time and handles user approval requests
 * for CLI operations. Provides both automatic and manual approval modes.
 *
 * @example
 * ```typescript
 * const monitor = new CliTaskMonitor(false, { lineLimit: 500 })
 * monitor.startMonitoring(task)
 * // Monitor will handle messages and approvals
 * monitor.stopMonitoring()
 * ```
 */

import type { Task } from "@/core/task"
import type { ClineMessage } from "@/shared/ExtensionMessage"
import { OUTPUT_LIMITS, TIMEOUTS } from "./cli_constants"
import { getInteractionHandler } from "./cli_interaction_handler"
import { formatCommandExecution, formatMessageBox, TerminalColors } from "./cli_message_formatter"
import { output } from "./cli_output"
import { getStreamHandler } from "./cli_stream_handler"

export interface TerminalOutputConfig {
	lineLimit?: number // Maximum lines to display per output
	shellIntegrationTimeout?: number // Shell integration timeout (milliseconds)
	terminalReuseEnabled?: boolean // Whether to reuse terminals
}

interface ApprovalResult {
	approved: boolean
	feedbackText?: string
	feedbackImages?: string[]
	feedbackFiles?: string[]
}

/**
 * Extended Task interface with CLI-specific properties
 */
interface TaskWithMessages {
	clineMessages?: ClineMessage[]
}

/**
 * Monitors task execution and handles approval requests
 *
 * Provides real-time monitoring of task messages with support for:
 * - Automatic or manual approval of operations
 * - Output truncation for long terminal outputs
 * - Streaming display of partial messages
 * - Type-safe message handling
 */
export class CliTaskMonitor {
	private task: Task | null = null
	private lastProcessedMessageIndex = -1
	private monitorInterval: NodeJS.Timeout | null = null
	private isProcessingApproval = false
	private lineLimit: number
	private streamHandler = getStreamHandler()

	/**
	 * Creates a new CLI task monitor
	 *
	 * @param autoApprove - If true, automatically approves all requests
	 * @param config - Optional configuration for terminal output behavior
	 *
	 * @example
	 * ```typescript
	 * // Manual approval mode with custom line limit
	 * const monitor = new CliTaskMonitor(false, { lineLimit: 1000 })
	 *
	 * // Auto-approve mode
	 * const autoMonitor = new CliTaskMonitor(true)
	 * ```
	 */
	constructor(
		private autoApprove: boolean = false,
		config?: TerminalOutputConfig,
	) {
		this.lineLimit = config?.lineLimit || OUTPUT_LIMITS.DEFAULT_LINE_LIMIT
	}

	/**
	 * Get messages from task in a type-safe way
	 */
	private getMessages(): ClineMessage[] {
		if (!this.task) {
			return []
		}
		return (this.task as TaskWithMessages).clineMessages || []
	}

	/**
	 * Truncate output if too long
	 */
	private truncateOutput(output: string): string {
		if (!output) {
			return ""
		}

		const lines = output.split("\n")
		if (lines.length <= this.lineLimit) {
			return output
		}

		const keepLines = Math.floor(this.lineLimit / 2)
		return [
			...lines.slice(0, keepLines),
			"",
			`... ${lines.length - this.lineLimit} lines truncated ...`,
			"",
			...lines.slice(-keepLines),
		].join("\n")
	}

	/**
	 * Start monitoring a task
	 */
	startMonitoring(task: Task): void {
		this.task = task
		this.lastProcessedMessageIndex = -1
		this.isProcessingApproval = false

		this.monitorInterval = setInterval(() => this.checkForNewMessages(), TIMEOUTS.MESSAGE_CHECK_INTERVAL)
	}

	/**
	 * Stop monitoring
	 */
	stopMonitoring(): void {
		if (this.monitorInterval) {
			clearInterval(this.monitorInterval)
			this.monitorInterval = null
		}
		this.streamHandler.endStream()
		this.task = null
		this.lastProcessedMessageIndex = -1
	}

	/**
	 * Check for new messages
	 */
	private async checkForNewMessages(): Promise<void> {
		if (!this.task || this.isProcessingApproval) {
			return
		}

		const messages = this.getMessages()
		if (!Array.isArray(messages)) {
			return
		}

		for (let i = this.lastProcessedMessageIndex + 1; i < messages.length; i++) {
			const message = messages[i]
			if (!message || typeof message !== "object") {
				continue
			}

			try {
				if (message.type === "ask" && message.ask && !message.partial) {
					await this.handleAskMessage(message)
				} else if (message.type === "say") {
					this.handleSayMessage(message)
				}
				this.lastProcessedMessageIndex = i
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				console.error(
					`${TerminalColors.red}Failed to process task message. ` +
						`Error: ${errorMessage}. ` +
						`This may indicate a communication issue with the task. ` +
						`Try: 1) Restart the task, 2) Check task state, ` +
						`3) Enable --verbose for more details${TerminalColors.reset}`,
				)
			}
		}
	}

	/**
	 * Handle approval requests
	 */
	private async handleAskMessage(message: ClineMessage): Promise<void> {
		if (!this.task || this.isProcessingApproval) {
			return
		}

		this.isProcessingApproval = true
		const timeoutId = setTimeout(() => this.handleTimeout(), TIMEOUTS.APPROVAL_REQUEST)

		try {
			const result = this.autoApprove ? await this.autoApproveRequest(message) : await this.manualApproveRequest(message)

			clearTimeout(timeoutId)
			await this.task.handleWebviewAskResponse(
				result.approved ? "yesButtonClicked" : "noButtonClicked",
				result.feedbackText,
				result.feedbackImages,
				result.feedbackFiles,
			)
		} catch (error) {
			console.error("Error handling approval:", error)
			clearTimeout(timeoutId)
			await this.task.handleWebviewAskResponse("noButtonClicked").catch(() => {})
		} finally {
			this.isProcessingApproval = false
		}
	}

	/**
	 * Handle approval timeout
	 */
	private handleTimeout(): void {
		output.log("\n⚠️  Approval timeout - auto-rejecting after 5 minutes")
		if (this.task) {
			this.task.handleWebviewAskResponse("noButtonClicked").catch(() => {})
		}
		this.isProcessingApproval = false
	}

	/**
	 * Auto-approve request
	 */
	private async autoApproveRequest(message: ClineMessage): Promise<ApprovalResult> {
		output.log(`\n✓ Auto-approved: ${message.ask}`)
		return { approved: true }
	}

	/**
	 * Handle manual approval
	 */
	private async manualApproveRequest(message: ClineMessage): Promise<ApprovalResult> {
		const handler = getInteractionHandler()
		const askType = message.ask
		const text = message.text || ""

		switch (askType) {
			case "command":
				return { approved: await handler.showCommandExecution(text) }

			case "tool":
				return await this.handleToolApproval(text, handler)

			case "completion_result":
				return await this.handleCompletionApproval(text, handler)

			case "use_mcp_server":
				return await this.handleMcpApproval(text, handler)

			case "followup":
				const feedbackText = await handler.askInput(`\n💬 ${text}\nYour response:`)
				return { approved: false, feedbackText }

			case "api_req_failed":
				output.log(`\n⚠️  API request failed: ${text}`)
				return { approved: await handler.askApproval("Retry?", false) }

			default:
				output.log(`\n❓ ${askType}: ${text}`)
				return { approved: await handler.askApproval("Approve?", true) }
		}
	}

	/**
	 * Handle tool approval
	 */
	private async handleToolApproval(text: string, handler: any): Promise<ApprovalResult> {
		try {
			const tool = JSON.parse(text)
			if (tool.tool === "editedExistingFile" || tool.tool === "newFileCreated") {
				const action = tool.tool === "editedExistingFile" ? "Editing" : "Creating"
				output.log(`\n${"─".repeat(80)}\n📝 ${action} File: ${tool.path}\n${"─".repeat(80)}`)

				if (tool.content) {
					const lines = tool.content.split("\n")
					if (lines.length > 50) {
						output.log(lines.slice(0, 50).join("\n"))
						output.log(`\n... (${lines.length - 50} more lines)`)
					} else {
						output.log(tool.content)
					}
				}

				output.log("─".repeat(80))
				return { approved: await handler.askApproval("Approve?", true) }
			}
			return { approved: await handler.showToolExecution(tool.tool || "tool", tool) }
		} catch {
			return { approved: await handler.showToolExecution("tool", { operation: text }) }
		}
	}

	/**
	 * Handle completion approval
	 */
	private async handleCompletionApproval(text: string, handler: any): Promise<ApprovalResult> {
		output.log(`\n${"═".repeat(80)}\n✅ Task Completion\n${"═".repeat(80)}`)
		output.log(text)
		output.log("═".repeat(80))

		if (await handler.askApproval("Provide feedback?", false)) {
			const feedbackText = await handler.askInput("Feedback (or Enter to skip):")
			return { approved: !feedbackText, feedbackText }
		}
		return { approved: true }
	}

	/**
	 * Handle MCP server approval
	 */
	private async handleMcpApproval(text: string, handler: any): Promise<ApprovalResult> {
		try {
			const mcp = JSON.parse(text)
			output.log(`\n${"─".repeat(80)}\n🔌 MCP Server Request\n${"─".repeat(80)}`)
			output.log(`  Server: ${mcp.serverName || "unknown"}`)
			output.log(`  Tool: ${mcp.toolName || "unknown"}`)
			if (mcp.uri) {
				output.log(`  Resource: ${mcp.uri}`)
			}
			output.log("─".repeat(80))
			return { approved: await handler.askApproval("Approve?", true) }
		} catch {
			return { approved: await handler.showToolExecution("use_mcp_server", { request: text }) }
		}
	}

	/**
	 * Handle say messages (AI output)
	 */
	private handleSayMessage(message: ClineMessage): void {
		const { say: type, text = "", partial = false } = message

		// Let stream handler manage streaming
		if (partial || type === "api_req_started" || type === "api_req_finished") {
			this.streamHandler.handleMessage(message)
			return
		}

		// Handle non-streaming messages
		switch (type) {
			case "text":
				if (text) {
					output.log(`\n${TerminalColors.cyan}🤖 AI:${TerminalColors.reset} ${text}`)
				}
				break

			case "command":
				if (text) {
					output.log(formatCommandExecution(text, "pending"))
				}
				break

			case "command_output":
				if (text) {
					const output = this.truncateOutput(text)
					output.log(output)
					const lineCount = text.split("\n").length
					if (lineCount > this.lineLimit) {
						output.log(`\n${TerminalColors.dim}💡 Truncated: ${lineCount} lines${TerminalColors.reset}`)
					}
				}
				break

			case "error":
				if (text) {
					output.log(formatMessageBox("Error", text, { type: "error" }))
				}
				break

			case "user_feedback":
				// Don't echo
				break

			default:
				if (text) {
					output.log(`\n${TerminalColors.gray}[${type}]${TerminalColors.reset} ${text}`)
				}
		}
	}
}
