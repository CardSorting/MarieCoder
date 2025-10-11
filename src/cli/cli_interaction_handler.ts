/**
 * CLI Interaction Handler
 * Handles user approvals and interactions in CLI mode
 */

import * as readline from "node:readline"

export class CliInteractionHandler {
	private rl: readline.Interface

	constructor() {
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})
	}

	/**
	 * Ask for user approval with yes/no prompt
	 */
	async askApproval(message: string, defaultYes = false): Promise<boolean> {
		const suffix = defaultYes ? "[Y/n]" : "[y/N]"
		return new Promise((resolve) => {
			this.rl.question(`${message} ${suffix}: `, (answer) => {
				const normalized = answer.trim().toLowerCase()
				if (!normalized) {
					resolve(defaultYes)
				} else {
					resolve(normalized === "y" || normalized === "yes")
				}
			})
		})
	}

	/**
	 * Ask for text input
	 */
	async askInput(prompt: string, defaultValue?: string): Promise<string> {
		const suffix = defaultValue ? ` (default: ${defaultValue})` : ""
		return new Promise((resolve) => {
			this.rl.question(`${prompt}${suffix}: `, (answer) => {
				resolve(answer.trim() || defaultValue || "")
			})
		})
	}

	/**
	 * Ask user to choose from a list
	 */
	async askChoice(message: string, choices: string[]): Promise<string | undefined> {
		console.log(message)
		choices.forEach((choice, index) => {
			console.log(`  ${index + 1}. ${choice}`)
		})

		return new Promise((resolve) => {
			this.rl.question("Enter number: ", (answer) => {
				const index = Number.parseInt(answer.trim(), 10) - 1
				resolve(choices[index])
			})
		})
	}

	/**
	 * Display a message and wait for user to press Enter
	 */
	async waitForEnter(message?: string): Promise<void> {
		return new Promise((resolve) => {
			this.rl.question(message || "Press Enter to continue...", () => {
				resolve()
			})
		})
	}

	/**
	 * Show a formatted tool execution request
	 */
	async showToolExecution(toolName: string, params: any): Promise<boolean> {
		console.log("\n" + "─".repeat(80))
		console.log(`🔧 Tool Execution Request: ${toolName}`)
		console.log("─".repeat(80))

		// Format parameters nicely
		for (const [key, value] of Object.entries(params)) {
			if (typeof value === "string" && value.length > 100) {
				console.log(`  ${key}: ${value.substring(0, 100)}...`)
			} else {
				console.log(`  ${key}:`, value)
			}
		}

		console.log("─".repeat(80))

		return this.askApproval("Approve this action?", true)
	}

	/**
	 * Show file changes for approval
	 */
	async showFileChange(filePath: string, oldContent: string, newContent: string): Promise<boolean> {
		console.log("\n" + "─".repeat(80))
		console.log(`📝 File Change: ${filePath}`)
		console.log("─".repeat(80))

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
					console.log(`-  ${oldLine}`)
				} else if (!oldLine && newLine) {
					console.log(`+  ${newLine}`)
				} else {
					console.log(`-  ${oldLine}`)
					console.log(`+  ${newLine}`)
				}
			} else if (oldLine) {
				console.log(`   ${oldLine}`)
			}
		}

		if (maxLines > linesToShow) {
			console.log(`\n  ... (${maxLines - linesToShow} more lines)`)
		}

		console.log("─".repeat(80))

		return this.askApproval("Approve these changes?", true)
	}

	/**
	 * Show command execution request
	 */
	async showCommandExecution(command: string, cwd?: string): Promise<boolean> {
		console.log("\n" + "─".repeat(80))
		console.log("⚡ Command Execution Request")
		console.log("─".repeat(80))
		console.log(`  Command: ${command}`)
		if (cwd) {
			console.log(`  Working Directory: ${cwd}`)
		}
		console.log("─".repeat(80))

		return this.askApproval("Execute this command?", true)
	}

	/**
	 * Display progress message
	 */
	showProgress(message: string): void {
		process.stdout.write(`\r⏳ ${message}`)
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
		console.log(`✅ ${message}`)
	}

	/**
	 * Display error message
	 */
	showError(message: string): void {
		console.log(`❌ ${message}`)
	}

	/**
	 * Display info message
	 */
	showInfo(message: string): void {
		console.log(`ℹ️  ${message}`)
	}

	/**
	 * Display warning message
	 */
	showWarning(message: string): void {
		console.log(`⚠️  ${message}`)
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
