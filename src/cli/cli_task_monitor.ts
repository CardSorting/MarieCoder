/**
 * CLI Task Monitor
 * Monitors task state and handles approvals in CLI mode
 */

import type { Task } from "@/core/task"
import type { ClineMessage } from "@/shared/ExtensionMessage"
import { getInteractionHandler } from "./cli_interaction_handler"

export interface TerminalOutputConfig {
	lineLimit?: number // Maximum lines to display per output
	shellIntegrationTimeout?: number // Timeout for shell commands (ms)
	terminalReuseEnabled?: boolean // Whether to reuse terminal sessions
}

export class CliTaskMonitor {
	private task: Task | null = null
	private lastProcessedMessageIndex = -1
	private monitorInterval: NodeJS.Timeout | null = null
	private isProcessingApproval = false
	private terminalOutputConfig: TerminalOutputConfig
	private commandOutputBuffer: Map<string, string[]> = new Map()

	constructor(
		private autoApprove: boolean = false,
		terminalConfig?: TerminalOutputConfig,
	) {
		this.terminalOutputConfig = {
			lineLimit: terminalConfig?.lineLimit || 500,
			shellIntegrationTimeout: terminalConfig?.shellIntegrationTimeout || 30000,
			terminalReuseEnabled: terminalConfig?.terminalReuseEnabled || true,
		}
	}

	/**
	 * Truncate output to line limit with summary
	 */
	private truncateOutput(output: string, maxLines?: number): string {
		if (!output) {
			return ""
		}

		const lines = output.split("\n")
		const limit = maxLines || this.terminalOutputConfig.lineLimit || 500

		if (lines.length <= limit) {
			return output
		}

		const keepLines = Math.floor(limit / 2)
		const topLines = lines.slice(0, keepLines)
		const bottomLines = lines.slice(-keepLines)
		const truncatedCount = lines.length - limit

		return [
			...topLines,
			"",
			`... ${truncatedCount} lines truncated (total: ${lines.length} lines) ...`,
			"",
			...bottomLines,
		].join("\n")
	}

	/**
	 * Format terminal output with prefix and line limiting
	 */
	private formatTerminalOutput(output: string, prefix: string = ""): string {
		if (!output) {
			return ""
		}

		const truncated = this.truncateOutput(output)
		if (!prefix) {
			return truncated
		}

		return truncated
			.split("\n")
			.map((line) => `${prefix}${line}`)
			.join("\n")
	}

	/**
	 * Start monitoring a task
	 */
	startMonitoring(task: Task): void {
		this.task = task
		this.lastProcessedMessageIndex = -1
		this.isProcessingApproval = false
		this.commandOutputBuffer.clear()

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

			// Validate messages is an array
			if (!Array.isArray(messages)) {
				return
			}

			// Process any new messages
			for (let i = this.lastProcessedMessageIndex + 1; i < messages.length; i++) {
				const message = messages[i]

				// Skip invalid messages
				if (!message || typeof message !== "object") {
					continue
				}

				try {
					await this.handleMessage(message)
					this.lastProcessedMessageIndex = i
				} catch (error) {
					// Log individual message errors but continue processing
					console.error("Error processing message:", error)
				}
			}
		} catch (error) {
			// Silently ignore errors during monitoring
			if (this.task) {
				// Only log if verbose mode is on (we'd need to pass this in)
			}
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

		// Set a timeout to prevent hanging indefinitely
		const timeoutId = setTimeout(
			() => {
				console.log("\n⚠️  Approval timeout - auto-rejecting after 5 minutes of no response")
				if (this.task) {
					this.task.handleWebviewAskResponse("noButtonClicked").catch(() => {})
				}
				this.isProcessingApproval = false
			},
			5 * 60 * 1000,
		) // 5 minute timeout

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
						// Parse tool information from JSON
						try {
							const toolInfo = JSON.parse(text)

							if (toolInfo.tool === "editedExistingFile" || toolInfo.tool === "newFileCreated") {
								// Show file edit approval with diff
								console.log("\n" + "─".repeat(80))
								console.log(
									`📝 ${toolInfo.tool === "editedExistingFile" ? "Editing File" : "Creating New File"}: ${toolInfo.path}`,
								)
								console.log("─".repeat(80))

								if (toolInfo.content) {
									// Show content/diff (truncate if too long)
									const content = toolInfo.content
									const lines = content.split("\n")
									const maxLines = 50

									if (lines.length > maxLines) {
										console.log(lines.slice(0, maxLines).join("\n"))
										console.log(`\n... (${lines.length - maxLines} more lines)`)
									} else {
										console.log(content)
									}
								}

								console.log("─".repeat(80))
								approved = await interactionHandler.askApproval("Approve this file change?", true)
							} else {
								// Generic tool execution
								approved = await interactionHandler.showToolExecution(toolInfo.tool || "tool", toolInfo)
							}
						} catch (_parseError) {
							// If JSON parsing fails, fall back to generic approval
							approved = await interactionHandler.showToolExecution("tool", { operation: text })
						}
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

			// Clear timeout since we got a response
			clearTimeout(timeoutId)

			// Send response back to task
			const response = approved ? "yesButtonClicked" : "noButtonClicked"
			await this.task.handleWebviewAskResponse(response, feedbackText, feedbackImages, feedbackFiles)
		} catch (error) {
			console.error("Error handling approval:", error)
			// Clear timeout
			clearTimeout(timeoutId)
			// Default to rejection on error
			if (this.task) {
				await this.task.handleWebviewAskResponse("noButtonClicked").catch(() => {
					// Ignore errors in error handler
				})
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
					// Apply line limiting for command output
					const formattedOutput = this.formatTerminalOutput(text)
					console.log(formattedOutput)

					// Track output statistics
					const lineCount = text.split("\n").length
					if (lineCount > (this.terminalOutputConfig.lineLimit || 500)) {
						console.log(
							`\n💡 Output was truncated. Total lines: ${lineCount}, Limit: ${this.terminalOutputConfig.lineLimit}`,
						)
					}
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
