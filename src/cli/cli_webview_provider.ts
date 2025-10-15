/**
 * CLI Webview Provider
 * Handles output and interactions in CLI mode
 *
 * Enhanced with webview-ui improvements:
 * - Better visual formatting
 * - Enhanced message display
 */

import type * as vscode from "vscode"
import { WebviewProvider } from "@/core/webview"
import type { ClineMessage } from "@/shared/ExtensionMessage"
import { getInteractionHandler } from "./cli_interaction_handler"
import { formatCommandExecution, formatMessageBox, TerminalColors } from "./cli_message_formatter"
import { output } from "./cli_output"

export class CliWebviewProvider extends WebviewProvider {
	private visible = true
	private messageInterceptor: ((message: ClineMessage) => Promise<void>) | null = null

	constructor(context: vscode.ExtensionContext) {
		super(context)
		this.setupMessageInterception()
	}

	override getWebviewUrl(_path: string): string {
		// Not used in CLI mode
		return ""
	}

	override getCspSource(): string {
		// Not used in CLI mode
		return ""
	}

	override isVisible(): boolean {
		return this.visible
	}

	/**
	 * Setup message interception for CLI mode
	 */
	private setupMessageInterception(): void {
		this.messageInterceptor = async (message: ClineMessage) => {
			// Only handle "ask" type messages (approval requests)
			if (message.type === "ask" && message.ask) {
				await this.handleAskMessage(message)
			} else if (message.type === "say") {
				// Show AI messages in console
				this.handleSayMessage(message)
			}
		}
	}

	/**
	 * Handle ask messages (approval requests) in CLI
	 */
	private async handleAskMessage(message: ClineMessage): Promise<void> {
		const interactionHandler = getInteractionHandler()
		const askType = message.ask
		const text = message.text || ""

		let approved = false
		let feedbackText: string | undefined
		let feedbackImages: string[] | undefined
		let feedbackFiles: string[] | undefined

		try {
			switch (askType) {
				case "command": {
					// Command execution approval
					approved = await interactionHandler.showCommandExecution(text)
					break
				}

				case "tool": {
					// Generic tool approval
					approved = await interactionHandler.showToolExecution("tool", { operation: text })
					break
				}

				case "completion_result": {
					// Task completion
					output.log("\n" + "═".repeat(80))
					output.log("✅ Task Completion")
					output.log("═".repeat(80))
					output.log(text)
					output.log("═".repeat(80))

					const continueWork = await interactionHandler.askApproval(
						"Do you want to provide feedback or continue?",
						false,
					)
					if (continueWork) {
						feedbackText = await interactionHandler.askInput("Enter your feedback (or press Enter to skip)")
						if (feedbackText) {
							approved = false // Treat feedback as rejection to continue the task
						} else {
							approved = true
						}
					} else {
						approved = true
					}
					break
				}

				case "use_mcp_server": {
					// MCP server usage approval
					try {
						const mcpData = JSON.parse(text)
						output.log("\n" + "─".repeat(80))
						output.log(`🔌 MCP Server Request`)
						output.log("─".repeat(80))
						output.log(`  Server: ${mcpData.serverName || "unknown"}`)
						output.log(`  Tool: ${mcpData.toolName || "unknown"}`)
						if (mcpData.uri) {
							output.log(`  Resource: ${mcpData.uri}`)
						}
						output.log("─".repeat(80))
						approved = await interactionHandler.askApproval("Approve this MCP operation?", true)
					} catch (_e) {
						// If not JSON, show as regular tool
						approved = await interactionHandler.showToolExecution("use_mcp_server", { request: text })
					}
					break
				}

				case "followup": {
					// Followup question
					output.log("\n💬 AI Question:", text)
					feedbackText = await interactionHandler.askInput("Your response")
					approved = false // Always treat as feedback
					break
				}

				case "api_req_failed": {
					// API request failed
					output.log("\n⚠️  API request failed:", text)
					approved = await interactionHandler.askApproval("Do you want to retry?", false)
					break
				}

				default: {
					// Generic approval
					output.log(`\n❓ Approval needed (${askType}):`, text)
					approved = await interactionHandler.askApproval("Approve?", true)
				}
			}

			// Send response back to task
			const response = approved ? "yesButtonClicked" : "noButtonClicked"
			await this.controller.task?.handleWebviewAskResponse(response, feedbackText, feedbackImages, feedbackFiles)
		} catch (error) {
			console.error("Error handling approval request:", error)
			// Default to rejection on error
			await this.controller.task?.handleWebviewAskResponse("noButtonClicked")
		}
	}

	/**
	 * Handle say messages (AI output) in CLI
	 * Enhanced with better formatting
	 */
	private handleSayMessage(message: ClineMessage): void {
		const sayType = message.say
		const text = message.text || ""

		switch (sayType) {
			case "text": {
				if (text) {
					output.log(`\n${TerminalColors.cyan}🤖 AI:${TerminalColors.reset} ${text}`)
				}
				break
			}

			case "command": {
				if (text) {
					output.log(formatCommandExecution(text, "pending"))
				}
				break
			}

			case "command_output": {
				if (text) {
					output.log(`\n${TerminalColors.gray}Output:${TerminalColors.reset}`)
					output.log(text)
				}
				break
			}

			case "completion_result": {
				if (text) {
					output.log(formatMessageBox("Task Completion", text, { type: "success" }))
				}
				break
			}

			case "api_req_started": {
				output.log(`\n${TerminalColors.magenta}🧠 AI is thinking...${TerminalColors.reset}`)
				break
			}

			case "api_req_finished": {
				// Don't show these, too noisy
				break
			}

			case "error": {
				if (text) {
					output.log(formatMessageBox("Error", text, { type: "error" }))
				}
				break
			}

			case "user_feedback": {
				if (text) {
					output.log(`\n${TerminalColors.blue}💬 User feedback:${TerminalColors.reset} ${text}`)
				}
				break
			}

			default: {
				// Show other message types in verbose mode
				if (text) {
					output.log(`\n${TerminalColors.gray}[${sayType}]${TerminalColors.reset} ${text}`)
				}
			}
		}
	}

	/**
	 * Override postMessageToWebview to intercept messages
	 */
	async postMessageToWebview(message: any): Promise<void> {
		// In CLI mode, we don't have a webview, so we handle messages directly
		if (this.messageInterceptor && message.type === "clineMessage") {
			// This is a Cline message - extract the actual message
			const clineMessage = message.clineMessage || message
			await this.messageInterceptor(clineMessage)
		}

		// Don't call super.postMessageToWebview since there's no webview in CLI
	}

	/**
	 * Output message to console
	 */
	logMessage(type: "info" | "warn" | "error", message: string): void {
		const prefix = {
			info: "💬",
			warn: "⚠️",
			error: "❌",
		}[type]

		output.log(`${prefix} ${message}`)
	}
}
