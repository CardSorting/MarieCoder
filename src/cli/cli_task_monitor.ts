/**
 * CLI Task Monitor
 * Monitors task state and handles approvals in CLI mode
 */

import type { Task } from "@/core/task"
import type { ClineMessage } from "@/shared/ExtensionMessage"
import { getInteractionHandler } from "./cli_interaction_handler"

export class CliTaskMonitor {
	private task: Task | null = null
	private lastProcessedMessageIndex = -1
	private monitorInterval: NodeJS.Timeout | null = null
	private isProcessingApproval = false

	constructor(private autoApprove: boolean = false) {}

	/**
	 * Start monitoring a task
	 */
	startMonitoring(task: Task): void {
		this.task = task
		this.lastProcessedMessageIndex = -1
		this.isProcessingApproval = false

		// Start monitoring loop
		this.monitorInterval = setInterval(() => {
			this.checkForNewMessages()
		}, 100)
	}

	/**
	 * Stop monitoring
	 */
	stopMonitoring(): void {
		if (this.monitorInterval) {
			clearInterval(this.monitorInterval)
			this.monitorInterval = null
		}
		this.task = null
		this.lastProcessedMessageIndex = -1
	}

	/**
	 * Check for new messages that need handling
	 */
	private async checkForNewMessages(): Promise<void> {
		if (!this.task || this.isProcessingApproval) {
			return
		}

		try {
			// Get current messages
			const messages = (this.task as any).clineMessages || []

			// Process any new messages
			for (let i = this.lastProcessedMessageIndex + 1; i < messages.length; i++) {
				const message = messages[i]
				await this.handleMessage(message)
				this.lastProcessedMessageIndex = i
			}
		} catch (_error) {
			// Silently ignore errors during monitoring
		}
	}

	/**
	 * Handle a single message
	 */
	private async handleMessage(message: ClineMessage): Promise<void> {
		// Handle "ask" messages (approval requests)
		if (message.type === "ask" && message.ask && !message.partial) {
			await this.handleAskMessage(message)
		}
		// Handle "say" messages (AI output)
		else if (message.type === "say") {
			this.handleSayMessage(message)
		}
	}

	/**
	 * Handle ask messages (approval requests)
	 */
	private async handleAskMessage(message: ClineMessage): Promise<void> {
		if (!this.task || this.isProcessingApproval) {
			return
		}

		this.isProcessingApproval = true

		try {
			const interactionHandler = getInteractionHandler()
			const askType = message.ask
			const text = message.text || ""

			let approved = false
			let feedbackText: string | undefined
			let feedbackImages: string[] | undefined
			let feedbackFiles: string[] | undefined

			if (this.autoApprove) {
				// Auto-approve mode
				console.log(`\n✓ Auto-approved: ${askType}`)
				approved = true
			} else {
				// Manual approval mode
				switch (askType) {
					case "command": {
						approved = await interactionHandler.showCommandExecution(text)
						break
					}

					case "tool": {
						approved = await interactionHandler.showToolExecution("tool", { operation: text })
						break
					}

					case "completion_result": {
						console.log("\n" + "═".repeat(80))
						console.log("✅ Task Completion")
						console.log("═".repeat(80))
						console.log(text)
						console.log("═".repeat(80))

						const wantsFeedback = await interactionHandler.askApproval("Do you want to provide feedback?", false)
						if (wantsFeedback) {
							feedbackText = await interactionHandler.askInput("Enter your feedback (or press Enter to skip)")
							approved = !feedbackText // If feedback provided, don't approve (continue task)
						} else {
							approved = true
						}
						break
					}

					case "use_mcp_server": {
						try {
							const mcpData = JSON.parse(text)
							console.log("\n" + "─".repeat(80))
							console.log(`🔌 MCP Server Request`)
							console.log("─".repeat(80))
							console.log(`  Server: ${mcpData.serverName || "unknown"}`)
							console.log(`  Tool: ${mcpData.toolName || "unknown"}`)
							if (mcpData.uri) {
								console.log(`  Resource: ${mcpData.uri}`)
							}
							console.log("─".repeat(80))
							approved = await interactionHandler.askApproval("Approve this MCP operation?", true)
						} catch (_e) {
							approved = await interactionHandler.showToolExecution("use_mcp_server", { request: text })
						}
						break
					}

					case "followup": {
						console.log("\n💬 AI Question:", text)
						feedbackText = await interactionHandler.askInput("Your response")
						approved = false // Treat as feedback
						break
					}

					case "api_req_failed": {
						console.log("\n⚠️  API request failed:", text)
						approved = await interactionHandler.askApproval("Do you want to retry?", false)
						break
					}

					default: {
						console.log(`\n❓ Approval needed (${askType}):`, text)
						approved = await interactionHandler.askApproval("Approve?", true)
					}
				}
			}

			// Send response back to task
			const response = approved ? "yesButtonClicked" : "noButtonClicked"
			await this.task.handleWebviewAskResponse(response, feedbackText, feedbackImages, feedbackFiles)
		} catch (error) {
			console.error("Error handling approval:", error)
			// Default to rejection on error
			if (this.task) {
				await this.task.handleWebviewAskResponse("noButtonClicked")
			}
		} finally {
			this.isProcessingApproval = false
		}
	}

	/**
	 * Handle say messages (AI output)
	 */
	private handleSayMessage(message: ClineMessage): void {
		const sayType = message.say
		const text = message.text || ""

		// Skip partial messages
		if (message.partial) {
			return
		}

		switch (sayType) {
			case "text": {
				if (text) {
					console.log("\n🤖 AI:", text)
				}
				break
			}

			case "command": {
				console.log("\n⚡ Executing command:", text)
				break
			}

			case "command_output": {
				if (text) {
					console.log(text)
				}
				break
			}

			case "completion_result": {
				// Handled in ask
				break
			}

			case "api_req_started": {
				console.log("\n🌐 Thinking...")
				break
			}

			case "error": {
				console.error("\n❌ Error:", text)
				break
			}

			case "user_feedback": {
				// Don't echo user feedback
				break
			}

			case "api_req_finished": {
				// Silent
				break
			}

			default: {
				if (text) {
					console.log(`\n[${sayType}]`, text)
				}
			}
		}
	}
}
