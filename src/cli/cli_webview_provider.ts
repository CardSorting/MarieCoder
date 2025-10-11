/**
 * CLI Webview Provider
 * Handles output and interactions in CLI mode
 */

import type * as vscode from "vscode"
import { WebviewProvider } from "@/core/webview"
import type { ClineMessage } from "@/shared/ExtensionMessage"
import { getInteractionHandler } from "./cli_interaction_handler"

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
					console.log("\n" + "═".repeat(80))
					console.log("✅ Task Completion")
					console.log("═".repeat(80))
					console.log(text)
					console.log("═".repeat(80))

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
						// If not JSON, show as regular tool
						approved = await interactionHandler.showToolExecution("use_mcp_server", { request: text })
					}
					break
				}

				case "followup": {
					// Followup question
					console.log("\n💬 AI Question:", text)
					feedbackText = await interactionHandler.askInput("Your response")
					approved = false // Always treat as feedback
					break
				}

				case "api_req_failed": {
					// API request failed
					console.log("\n⚠️  API request failed:", text)
					approved = await interactionHandler.askApproval("Do you want to retry?", false)
					break
				}

				default: {
					// Generic approval
					console.log(`\n❓ Approval needed (${askType}):`, text)
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
	 */
	private handleSayMessage(message: ClineMessage): void {
		const sayType = message.say
		const text = message.text || ""

		switch (sayType) {
			case "text": {
				console.log("\n🤖 AI:", text)
				break
			}

			case "command": {
				console.log("\n⚡ Executing command:", text)
				break
			}

			case "command_output": {
				if (text) {
					console.log("Output:", text)
				}
				break
			}

			case "completion_result": {
				console.log("\n✅ Result:", text)
				break
			}

			case "api_req_started": {
				console.log("\n🌐 API request started...")
				break
			}

			case "api_req_finished": {
				// Don't show these, too noisy
				break
			}

			case "error": {
				console.error("\n❌ Error:", text)
				break
			}

			case "user_feedback": {
				console.log("\n💬 User feedback:", text)
				break
			}

			default: {
				// Show other message types in verbose mode
				if (text) {
					console.log(`\n[${sayType}]`, text)
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

		console.log(`${prefix} ${message}`)
	}
}
