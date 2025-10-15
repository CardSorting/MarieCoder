/**
 * CLI Task Monitor - Simplified
 * Monitors task messages and handles user approvals
 */

import type { Task } from "@/core/task"
import type { ClineMessage } from "@/shared/ExtensionMessage"
import { getInteractionHandler } from "./cli_interaction_handler"
import { formatCommandExecution, formatMessageBox, TerminalColors } from "./cli_message_formatter"
import { getStreamHandler } from "./cli_stream_handler"

export interface TerminalOutputConfig {
	lineLimit?: number // Maximum lines to display per output
}

interface ApprovalResult {
	approved: boolean
	feedbackText?: string
	feedbackImages?: string[]
	feedbackFiles?: string[]
}

export class CliTaskMonitor {
	private task: Task | null = null
	private lastProcessedMessageIndex = -1
	private monitorInterval: NodeJS.Timeout | null = null
	private isProcessingApproval = false
	private lineLimit: number
	private streamHandler = getStreamHandler()

	constructor(
		private autoApprove: boolean = false,
		config?: TerminalOutputConfig,
	) {
		this.lineLimit = config?.lineLimit || 500
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

		this.monitorInterval = setInterval(() => this.checkForNewMessages(), 100)
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

		const messages = (this.task as any).clineMessages || []
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
				console.error("Error processing message:", error)
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
		const timeoutId = setTimeout(() => this.handleTimeout(), 5 * 60 * 1000)

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
		console.log("\n⚠️  Approval timeout - auto-rejecting after 5 minutes")
		if (this.task) {
			this.task.handleWebviewAskResponse("noButtonClicked").catch(() => {})
		}
		this.isProcessingApproval = false
	}

	/**
	 * Auto-approve request
	 */
	private async autoApproveRequest(message: ClineMessage): Promise<ApprovalResult> {
		console.log(`\n✓ Auto-approved: ${message.ask}`)
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
				console.log(`\n⚠️  API request failed: ${text}`)
				return { approved: await handler.askApproval("Retry?", false) }

			default:
				console.log(`\n❓ ${askType}: ${text}`)
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
				console.log(`\n${"─".repeat(80)}\n📝 ${action} File: ${tool.path}\n${"─".repeat(80)}`)

				if (tool.content) {
					const lines = tool.content.split("\n")
					if (lines.length > 50) {
						console.log(lines.slice(0, 50).join("\n"))
						console.log(`\n... (${lines.length - 50} more lines)`)
					} else {
						console.log(tool.content)
					}
				}

				console.log("─".repeat(80))
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
		console.log(`\n${"═".repeat(80)}\n✅ Task Completion\n${"═".repeat(80)}`)
		console.log(text)
		console.log("═".repeat(80))

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
			console.log(`\n${"─".repeat(80)}\n🔌 MCP Server Request\n${"─".repeat(80)}`)
			console.log(`  Server: ${mcp.serverName || "unknown"}`)
			console.log(`  Tool: ${mcp.toolName || "unknown"}`)
			if (mcp.uri) {
				console.log(`  Resource: ${mcp.uri}`)
			}
			console.log("─".repeat(80))
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
					console.log(`\n${TerminalColors.cyan}🤖 AI:${TerminalColors.reset} ${text}`)
				}
				break

			case "command":
				if (text) {
					console.log(formatCommandExecution(text, "pending"))
				}
				break

			case "command_output":
				if (text) {
					const output = this.truncateOutput(text)
					console.log(output)
					const lineCount = text.split("\n").length
					if (lineCount > this.lineLimit) {
						console.log(`\n${TerminalColors.dim}💡 Truncated: ${lineCount} lines${TerminalColors.reset}`)
					}
				}
				break

			case "error":
				if (text) {
					console.log(formatMessageBox("Error", text, { type: "error" }))
				}
				break

			case "user_feedback":
				// Don't echo
				break

			default:
				if (text) {
					console.log(`\n${TerminalColors.gray}[${type}]${TerminalColors.reset} ${text}`)
				}
		}
	}
}
