/**
 * CLI Interaction Handler
 * Handles user approvals and interactions in CLI mode with enhanced formatting
 */

import * as readline from "node:readline"
import { getLogger } from "../infrastructure/logger"
import { getProgressManager } from "../monitoring/progress_manager"
import { formatKeyValue, formatMessageBox } from "../ui/output/message_formatter"
import { output } from "../ui/output/output"
import { SemanticColors, style, TerminalColors } from "../ui/output/terminal_colors"

const logger = getLogger()
const progressManager = getProgressManager()

export class CliInteractionHandler {
	private rl: readline.Interface

	constructor() {
		// Create readline with muted output to prevent conflicts
		// We'll handle output ourselves for better control
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: process.stdout.isTTY,
		})

		// Disable automatic echoing of input for better control
		// This prevents readline from interfering with styled prompts
	}

	/**
	 * Ask for user approval with yes/no prompt - Enhanced with better formatting
	 */
	async askApproval(message: string, defaultYes = false, timeoutMs = 300000): Promise<boolean> {
		// Ensure output is flushed before prompting
		output.flush()

		// Format prompt with visual styling
		const promptIcon = style("?", SemanticColors.prompt, TerminalColors.bright)
		const suffix = defaultYes ? style("[Y/n]", SemanticColors.metadata) : style("[y/N]", SemanticColors.metadata)

		const formattedPrompt = `\n${promptIcon} ${style(message, TerminalColors.bright)} ${suffix}: `

		return new Promise((resolve) => {
			let timeout: NodeJS.Timeout | null = null
			let answered = false

			const cleanup = () => {
				if (timeout) {
					clearTimeout(timeout)
					timeout = null
				}
			}

			// Set timeout if specified
			if (timeoutMs > 0) {
				timeout = setTimeout(() => {
					if (!answered) {
						answered = true
						cleanup()
						const timeoutMsg = style("⏱  Timeout - using default response", SemanticColors.warning)
						output.log(`\n${timeoutMsg}\n`)
						output.flush()
						resolve(defaultYes)
					}
				}, timeoutMs)
			}

			this.rl.question(formattedPrompt, (answer) => {
				if (!answered) {
					answered = true
					cleanup()
					const normalized = answer.trim().toLowerCase()
					// Clear the line after input for cleaner output
					process.stdout.write("\r\x1b[K")
					if (!normalized) {
						resolve(defaultYes)
					} else {
						resolve(normalized === "y" || normalized === "yes")
					}
				}
			})
		})
	}

	/**
	 * Ask for text input - Enhanced with better formatting
	 */
	async askInput(prompt: string, defaultValue?: string, timeoutMs = 300000): Promise<string> {
		// Ensure output is flushed before prompting
		output.flush()

		// Format prompt with visual styling
		const promptIcon = style("✎", SemanticColors.prompt, TerminalColors.bright)
		const suffix = defaultValue ? style(` (default: ${defaultValue})`, SemanticColors.metadata) : ""

		const formattedPrompt = `\n${promptIcon} ${style(prompt, TerminalColors.bright)}${suffix}: `

		return new Promise((resolve) => {
			let timeout: NodeJS.Timeout | null = null
			let answered = false

			const cleanup = () => {
				if (timeout) {
					clearTimeout(timeout)
					timeout = null
				}
			}

			// Set timeout if specified
			if (timeoutMs > 0) {
				timeout = setTimeout(() => {
					if (!answered) {
						answered = true
						cleanup()
						const timeoutMsg = style("⏱  Timeout - using default value", SemanticColors.warning)
						output.log(`\n${timeoutMsg}\n`)
						output.flush()
						resolve(defaultValue || "")
					}
				}, timeoutMs)
			}

			this.rl.question(formattedPrompt, (answer) => {
				if (!answered) {
					answered = true
					cleanup()
					resolve(answer.trim() || defaultValue || "")
				}
			})
		})
	}

	/**
	 * Ask user to choose from a list - Enhanced with better formatting
	 */
	async askChoice(message: string, choices: string[]): Promise<string | undefined> {
		// Ensure output is flushed before prompting
		output.flush()

		// Display message with visual styling
		output.log(`\n${style(message, TerminalColors.bright)}\n`)

		// Display choices with improved formatting
		choices.forEach((choice, index) => {
			const number = style(`${index + 1}.`, SemanticColors.info, TerminalColors.bright)
			output.log(`  ${number} ${choice}`)
		})

		// Flush choices before prompting
		output.flush()

		const promptIcon = style("›", SemanticColors.prompt, TerminalColors.bright)
		const formattedPrompt = `\n${promptIcon} ${style("Enter number", TerminalColors.bright)}: `

		return new Promise((resolve) => {
			this.rl.question(formattedPrompt, (answer) => {
				const index = Number.parseInt(answer.trim(), 10) - 1
				if (index >= 0 && index < choices.length) {
					const selectedIcon = style("✓", SemanticColors.complete)
					output.log(`${selectedIcon} ${style("Selected:", TerminalColors.dim)} ${choices[index]}\n`)
					output.flush()
				}
				resolve(choices[index])
			})
		})
	}

	/**
	 * Display a message and wait for user to press Enter - Enhanced with better formatting
	 */
	async waitForEnter(message?: string): Promise<void> {
		// Ensure output is flushed before prompting
		output.flush()

		const defaultMsg = "Press Enter to continue..."
		const displayMsg = message || defaultMsg
		const pauseIcon = style("⏸", SemanticColors.info)
		const formattedPrompt = `\n${pauseIcon} ${style(displayMsg, TerminalColors.dim)} `

		return new Promise((resolve) => {
			this.rl.question(formattedPrompt, () => {
				resolve()
			})
		})
	}

	/**
	 * Show a formatted tool execution request - Enhanced with better formatting
	 */
	async showToolExecution(toolName: string, params: any): Promise<boolean> {
		// Format parameters
		const paramLines: string[] = []
		for (const [key, value] of Object.entries(params)) {
			if (typeof value === "string" && value.length > 100) {
				paramLines.push(formatKeyValue(key, `${value.substring(0, 100)}...`))
			} else {
				paramLines.push(formatKeyValue(key, typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)))
			}
		}

		const content = paramLines.length > 0 ? paramLines.join("\n") : "No parameters"

		// Display as message box
		output.log(formatMessageBox(`Tool Execution: ${toolName}`, content, { icon: "🔧", type: "info" }))

		return this.askApproval("Approve this action?", true)
	}

	/**
	 * Show file changes for approval
	 */
	async showFileChange(filePath: string, oldContent: string, newContent: string): Promise<boolean> {
		output.log("\n" + "─".repeat(80))
		output.log(`📝 File Change: ${filePath}`)
		output.log("─".repeat(80))

		// Show diff
		const oldLines = oldContent.split("\n")
		const newLines = newContent.split("\n")

		const maxLines = Math.max(oldLines.length, newLines.length, 20)
		const linesToShow = Math.min(maxLines, 50)

		for (let i = 0; i < linesToShow; i++) {
			const oldLine = oldLines[i] || ""
			const newLine = newLines[i] || ""

			if (oldLine !== newLine) {
				if (oldLine && !newLine) {
					output.log(`-  ${oldLine}`)
				} else if (!oldLine && newLine) {
					output.log(`+  ${newLine}`)
				} else {
					output.log(`-  ${oldLine}`)
					output.log(`+  ${newLine}`)
				}
			} else if (oldLine) {
				output.log(`   ${oldLine}`)
			}
		}

		if (maxLines > linesToShow) {
			output.log(`\n  ... (${maxLines - linesToShow} more lines)`)
		}

		output.log("─".repeat(80))

		return this.askApproval("Approve these changes?", true)
	}

	/**
	 * Show command execution request
	 */
	async showCommandExecution(command: string, cwd?: string): Promise<boolean> {
		output.log("\n" + "─".repeat(80))
		output.log("⚡ Command Execution Request")
		output.log("─".repeat(80))
		output.log(`  Command: ${command}`)
		if (cwd) {
			output.log(`  Working Directory: ${cwd}`)
		}
		output.log("─".repeat(80))

		return this.askApproval("Execute this command?", true)
	}

	/**
	 * Display progress message
	 */
	showProgress(message: string): void {
		const spinner = progressManager.createSpinner(message)
		spinner.start()
	}

	/**
	 * Clear progress line
	 */
	clearProgress(): void {
		process.stdout.write("\r" + " ".repeat(80) + "\r")
	}

	/**
	 * Display success message
	 */
	showSuccess(message: string): void {
		logger.success(message)
	}

	/**
	 * Display error message
	 */
	showError(message: string): void {
		logger.error(message)
	}

	/**
	 * Display info message
	 */
	showInfo(message: string): void {
		logger.info(message)
	}

	/**
	 * Display warning message
	 */
	showWarning(message: string): void {
		logger.warn(message)
	}

	/**
	 * Close the readline interface
	 */
	close(): void {
		this.rl.close()
	}
}

// Singleton instance for easy access
let interactionHandler: CliInteractionHandler | null = null

export function getInteractionHandler(): CliInteractionHandler {
	if (!interactionHandler) {
		interactionHandler = new CliInteractionHandler()
	}
	return interactionHandler
}

export function closeInteractionHandler(): void {
	if (interactionHandler) {
		interactionHandler.close()
		interactionHandler = null
	}
}
