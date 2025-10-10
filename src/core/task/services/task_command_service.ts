import { setTimeout as setTimeoutPromise } from "node:timers/promises"
import type { Anthropic } from "@anthropic-ai/sdk"
import { formatResponse } from "@core/prompts/response_formatters"
import { processFilesIntoText } from "@integrations/misc/extract-text"
import type { TerminalManager } from "@integrations/terminal/TerminalManager"
import { Logger } from "@services/logging/Logger"
import { TerminalHangStage, TerminalUserInterventionAction, telemetryService } from "@services/telemetry"
import { isInTestMode } from "@services/test/TestMode"
import { execa } from "execa"

export type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>

type TaskCommandDependencies = {
	cwd: string
	terminalManager: TerminalManager
	ask: (
		type: any,
		text?: string,
	) => Promise<{
		response: any
		text?: string
		images?: string[]
		files?: string[]
	}>
	say: (type: any, text?: string, images?: string[], files?: string[]) => Promise<number | undefined>
}

/**
 * Handles command execution in terminals and test environments
 *
 * This service manages the execution of shell commands both in the VS Code
 * terminal (production) and directly in Node.js (test mode). It handles:
 * - Terminal process management
 * - Output buffering and streaming
 * - User feedback during long-running commands
 * - Timeout handling
 * - Test mode command execution
 *
 * Responsibilities:
 * - Execute commands in VS Code terminals with output buffering
 * - Handle user interruption and feedback during command execution
 * - Manage command timeouts and cleanup
 * - Execute commands in Node.js for test environments
 * - Track telemetry for terminal hangs and user interventions
 *
 * @example
 * ```typescript
 * const commandService = new TaskCommandService(deps)
 * const [hasUserFeedback, output] = await commandService.executeCommandTool("npm install", 300)
 * ```
 */
export class TaskCommandService {
	constructor(private readonly deps: TaskCommandDependencies) {}

	/**
	 * Executes a command directly in Node.js using execa
	 *
	 * This is used in test mode to capture the full output without using the VS Code terminal.
	 * Commands are automatically terminated after 30 seconds using Promise.race.
	 *
	 * @param command - The shell command to execute
	 * @returns Tuple of [hasUserFeedback, outputMessage]
	 * @private
	 */
	private async executeCommandInNode(command: string): Promise<[boolean, ToolResponse]> {
		try {
			// Create a child process
			const childProcess = execa(command, {
				shell: true,
				cwd: this.deps.cwd,
				reject: false,
				all: true, // Merge stdout and stderr
			})

			// Set up variables to collect output
			let output = ""

			// Collect output in real-time
			if (childProcess.all) {
				childProcess.all.on("data", (data) => {
					output += data.toString()
				})
			}

			// Create a timeout promise that rejects after 30 seconds
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					if (childProcess.pid) {
						childProcess.kill("SIGKILL") // Use SIGKILL for more forceful termination
					}
					reject(new Error("Command timeout after 30s"))
				}, 30000)
			})

			// Race between command completion and timeout
			const result = await Promise.race([childProcess, timeoutPromise]).catch((_error) => {
				// If we get here due to timeout, return a partial result with timeout flag
				return {
					stdout: "",
					stderr: "",
					exitCode: 124, // Standard timeout exit code
					timedOut: true,
				}
			})

			// Check if timeout occurred
			const wasTerminated = result.timedOut === true

			// Use collected output or result output
			if (!output) {
				output = result.stdout || result.stderr || ""
			}

			// Add termination message if the command was terminated
			if (wasTerminated) {
				output += "\nCommand was taking a while to run so it was auto terminated after 30s"
			}

			// Format the result similar to terminal output
			return [
				false,
				`Command executed${wasTerminated ? " (terminated after 30s)" : ""} with exit code ${
					result.exitCode
				}.${output.length > 0 ? `\nOutput:\n${output}` : ""}`,
			]
		} catch (error) {
			// Handle any errors that might occur
			const errorMessage = error instanceof Error ? error.message : String(error)
			return [false, `Error executing command: ${errorMessage}`]
		}
	}

	/**
	 * Execute a command in the terminal or Node.js (test mode)
	 *
	 * Main entry point for command execution. This method:
	 * - Routes to Node.js execution in test mode
	 * - Creates or reuses a terminal in production mode
	 * - Buffers and streams output to the user
	 * - Handles user feedback during long-running commands
	 * - Manages timeouts and cleanup
	 *
	 * The method uses a sophisticated buffering strategy:
	 * - Buffers output in chunks (20 lines or 2KB)
	 * - Debounces output display (100ms)
	 * - Allows user to provide feedback while command runs
	 * - Tracks telemetry for hangs and interventions
	 *
	 * @param command - The shell command to execute
	 * @param timeoutSeconds - Optional timeout in seconds (command continues in background if exceeded)
	 * @returns Tuple of [hasUserFeedback, outputMessage or toolResult]
	 */
	async executeCommandTool(command: string, timeoutSeconds: number | undefined): Promise<[boolean, ToolResponse]> {
		// Check if we're in test mode
		if (isInTestMode()) {
			// In test mode, execute the command directly in Node
			return this.executeCommandInNode(command)
		}

		const terminalInfo = await this.deps.terminalManager.getOrCreateTerminal(this.deps.cwd)
		terminalInfo.terminal.show() // weird visual bug when creating new terminals (even manually) where there's an empty space at the top.
		const process = this.deps.terminalManager.runCommand(terminalInfo, command)

		let userFeedback: { text?: string; images?: string[]; files?: string[] } | undefined
		let didContinue = false

		// Chunked terminal output buffering
		const CHUNK_LINE_COUNT = 20
		const CHUNK_BYTE_SIZE = 2048 // 2KB
		const CHUNK_DEBOUNCE_MS = 100

		let outputBuffer: string[] = []
		let outputBufferSize: number = 0
		let chunkTimer: NodeJS.Timeout | null = null

		// Track if buffer gets stuck (correlated with PROCESS_WHILE_RUNNING to indicate genuine technical issues)
		let bufferStuckTimer: NodeJS.Timeout | null = null
		const BUFFER_STUCK_TIMEOUT_MS = 6000 // 6 seconds

		const flushBuffer = async (force = false) => {
			if (outputBuffer.length === 0) {
				if (force) {
					// If force is true, flush anyway
				} else {
					return
				}
			}
			const chunk = outputBuffer.join("\n")
			outputBuffer = []
			outputBufferSize = 0

			// Start timer to detect if buffer gets stuck
			bufferStuckTimer = setTimeout(() => {
				telemetryService.captureTerminalHang(TerminalHangStage.BUFFER_STUCK)
				bufferStuckTimer = null
			}, BUFFER_STUCK_TIMEOUT_MS)

			try {
				const { response, text, images, files } = await this.deps.ask("command_output", chunk)
				if (response === "yesButtonClicked") {
					// Track when user clicks "Process while Running"
					telemetryService.captureTerminalUserIntervention(TerminalUserInterventionAction.PROCESS_WHILE_RUNNING)
					// proceed while running - but still capture user feedback if provided
					if (text || (images && images.length > 0) || (files && files.length > 0)) {
						userFeedback = { text, images, files }
					}
				} else {
					userFeedback = { text, images, files }
				}
				didContinue = true
				process.continue()

				// If more output accumulated, flush again
				if (outputBuffer.length > 0) {
					await flushBuffer()
				}
			} catch {
				Logger.error("Error while asking for command output")
			} finally {
				// If the command finishes execution before the 'command_output' ask promise resolves (in other words before the user responded to the ask, which is expected when the command finishes execution first), this block is reached. This is expected and safe to ignore, as no further handling is required.

				// Clear the stuck timer
				if (bufferStuckTimer) {
					clearTimeout(bufferStuckTimer)
					bufferStuckTimer = null
				}
			}
		}

		const scheduleFlush = () => {
			if (chunkTimer) {
				clearTimeout(chunkTimer)
			}
			chunkTimer = setTimeout(async () => await flushBuffer(), CHUNK_DEBOUNCE_MS)
		}

		const outputLines: string[] = []
		process.on("line", async (line) => {
			outputLines.push(line)

			if (!didContinue) {
				outputBuffer.push(line)
				outputBufferSize += Buffer.byteLength(line, "utf8")
				// Flush if buffer is large enough
				if (outputBuffer.length >= CHUNK_LINE_COUNT || outputBufferSize >= CHUNK_BYTE_SIZE) {
					await flushBuffer()
				} else {
					scheduleFlush()
				}
			} else {
				this.deps.say("command_output", line)
			}
		})

		let completed = false
		let completionTimer: NodeJS.Timeout | null = null
		const COMPLETION_TIMEOUT_MS = 6000 // 6 seconds

		// Start timer to detect if waiting for completion takes too long
		completionTimer = setTimeout(() => {
			if (!completed) {
				telemetryService.captureTerminalHang(TerminalHangStage.WAITING_FOR_COMPLETION)
				completionTimer = null
			}
		}, COMPLETION_TIMEOUT_MS)

		process.once("completed", async () => {
			completed = true
			// Clear the completion timer
			if (completionTimer) {
				clearTimeout(completionTimer)
				completionTimer = null
			}
			// Flush any remaining buffered output
			if (!didContinue && outputBuffer.length > 0) {
				if (chunkTimer) {
					clearTimeout(chunkTimer)
					chunkTimer = null
				}
				await flushBuffer(true)
			}
		})

		process.once("no_shell_integration", async () => {
			await this.deps.say("shell_integration_warning")
		})

		//await process

		if (timeoutSeconds) {
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					reject(new Error("COMMAND_TIMEOUT"))
				}, timeoutSeconds * 1000)
			})

			try {
				await Promise.race([process, timeoutPromise])
			} catch (error) {
				// This will continue running the command in the background
				didContinue = true
				process.continue()

				// Clear all our timers
				if (chunkTimer) {
					clearTimeout(chunkTimer)
					chunkTimer = null
				}
				if (completionTimer) {
					clearTimeout(completionTimer)
					completionTimer = null
				}

				// Process any output we captured before timeout
				await setTimeoutPromise(50)
				const result = this.deps.terminalManager.processOutput(outputLines)

				if (error.message === "COMMAND_TIMEOUT") {
					return [
						false,
						`Command execution timed out after ${timeoutSeconds} seconds. The command may still be running in the terminal.${result.length > 0 ? `\nOutput so far:\n${result}` : ""}`,
					]
				}

				// Re-throw other errors
				throw error
			}
		} else {
			await process
		}

		// Clear timer if process completes normally
		if (completionTimer) {
			clearTimeout(completionTimer)
			completionTimer = null
		}

		// Wait for a short delay to ensure all messages are sent to the webview
		// This delay allows time for non-awaited promises to be created and
		// for their associated messages to be sent to the webview, maintaining
		// the correct order of messages (although the webview is smart about
		// grouping command_output messages despite any gaps anyways)
		await setTimeoutPromise(50)

		const result = this.deps.terminalManager.processOutput(outputLines)

		if (userFeedback) {
			await this.deps.say("user_feedback", userFeedback.text, userFeedback.images, userFeedback.files)

			let fileContentString = ""
			if (userFeedback.files && userFeedback.files.length > 0) {
				fileContentString = await processFilesIntoText(userFeedback.files)
			}

			return [
				true,
				formatResponse.toolResult(
					`Command is still running in the user's terminal.${
						result.length > 0 ? `\nHere's the output so far:\n${result}` : ""
					}\n\nThe user provided the following feedback:\n<feedback>\n${userFeedback.text}\n</feedback>`,
					userFeedback.images,
					fileContentString,
				),
			]
		}

		if (completed) {
			return [false, `Command executed.${result.length > 0 ? `\nOutput:\n${result}` : ""}`]
		} else {
			return [
				false,
				`Command is still running in the user's terminal.${
					result.length > 0 ? `\nHere's the output so far:\n${result}` : ""
				}\n\nYou will be updated on the terminal status and new output in the future.`,
			]
		}
	}
}
