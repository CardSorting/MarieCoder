/**
 * CLI Terminal Manager
 * Provides terminal functionality for CLI mode using Node.js child_process
 * This is a simplified version of TerminalManager that doesn't rely on VSCode APIs
 */

import { type ChildProcess, spawn } from "node:child_process"
import { EventEmitter } from "node:events"
import * as os from "node:os"

/**
 * CLI-compatible terminal information
 */
interface CliTerminalInfo {
	id: number
	busy: boolean
	lastCommand: string
	shellPath: string
	cwd: string
	lastActive: number
	process?: ChildProcess
}

/**
 * CLI-compatible terminal process
 * Simplified version of TerminalProcess for CLI environment
 */
class CliTerminalProcess extends EventEmitter {
	private fullOutput: string = ""
	private lastRetrievedIndex: number = 0
	isHot: boolean = false
	private hotTimer: NodeJS.Timeout | null = null

	constructor() {
		super()
	}

	async run(terminalInfo: CliTerminalInfo, command: string): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				const shell = terminalInfo.shellPath || process.env.SHELL || "/bin/sh"
				const proc = spawn(shell, ["-c", command], {
					cwd: terminalInfo.cwd,
					env: {
						...process.env,
						CLINE_ACTIVE: "true",
					},
					stdio: ["pipe", "pipe", "pipe"],
				})

				terminalInfo.process = proc

				// Handle stdout
				proc.stdout?.on("data", (data: Buffer) => {
					try {
						const text = data.toString()
						this.fullOutput += text
						this.emit("line", text)
						this.markAsHot()
					} catch (error) {
						// Silently ignore encoding errors
						console.error("Error processing stdout:", error)
					}
				})

				// Handle stderr
				proc.stderr?.on("data", (data: Buffer) => {
					try {
						const text = data.toString()
						this.fullOutput += text
						this.emit("line", text)
						this.markAsHot()
					} catch (error) {
						// Silently ignore encoding errors
						console.error("Error processing stderr:", error)
					}
				})

				// Handle process completion
				proc.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
					this.isHot = false
					if (this.hotTimer) {
						clearTimeout(this.hotTimer)
						this.hotTimer = null
					}

					if (signal) {
						const error = new Error(`Command terminated by signal: ${signal}`)
						this.emit("error", error)
						reject(error)
					} else if (code === 0 || code === null) {
						this.emit("completed")
						resolve()
					} else {
						const error = new Error(`Command exited with code ${code}`)
						this.emit("error", error)
						reject(error)
					}
				})

				// Handle process errors
				proc.on("error", (error: Error) => {
					this.isHot = false
					if (this.hotTimer) {
						clearTimeout(this.hotTimer)
						this.hotTimer = null
					}
					this.emit("error", error)
					reject(error)
				})

				// Handle spawn errors
				if (!proc.pid) {
					throw new Error(`Failed to spawn shell process: ${shell}`)
				}
			} catch (error) {
				reject(error instanceof Error ? error : new Error(String(error)))
			}
		})
	}

	private markAsHot(): void {
		this.isHot = true
		if (this.hotTimer) {
			clearTimeout(this.hotTimer)
		}
		this.hotTimer = setTimeout(() => {
			this.isHot = false
			this.hotTimer = null
		}, 2000)
	}

	getUnretrievedOutput(): string {
		const output = this.fullOutput.slice(this.lastRetrievedIndex)
		this.lastRetrievedIndex = this.fullOutput.length
		return output
	}

	continue(): void {
		this.emit("continue")
	}
}

/**
 * CLI Terminal Manager
 * Manages terminal processes in CLI mode without VSCode dependencies
 */
export class CliTerminalManager {
	private terminals: Map<number, CliTerminalInfo> = new Map()
	private processes: Map<number, CliTerminalProcess> = new Map()
	private nextTerminalId: number = 1
	private terminalReuseEnabled: boolean = true
	private terminalOutputLineLimit: number = 500

	constructor() {
		// No VSCode dependencies needed
	}

	/**
	 * Get or create a terminal for the given working directory
	 */
	async getOrCreateTerminal(cwd: string): Promise<CliTerminalInfo> {
		const shellPath = this.getDefaultShell()

		// Try to find an existing idle terminal with matching cwd
		for (const terminal of this.terminals.values()) {
			if (!terminal.busy && terminal.cwd === cwd && terminal.shellPath === shellPath) {
				terminal.lastActive = Date.now()
				return terminal
			}
		}

		// If reuse is enabled, try to find any idle terminal and change its cwd
		if (this.terminalReuseEnabled) {
			for (const terminal of this.terminals.values()) {
				if (!terminal.busy && terminal.shellPath === shellPath) {
					terminal.cwd = cwd
					terminal.lastActive = Date.now()
					return terminal
				}
			}
		}

		// Create a new terminal
		const terminalInfo: CliTerminalInfo = {
			id: this.nextTerminalId++,
			busy: false,
			lastCommand: "",
			shellPath,
			cwd,
			lastActive: Date.now(),
		}

		this.terminals.set(terminalInfo.id, terminalInfo)
		return terminalInfo
	}

	/**
	 * Run a command in the specified terminal
	 */
	runCommand(terminalInfo: CliTerminalInfo, command: string): CliTerminalProcess {
		const process = new CliTerminalProcess()

		terminalInfo.busy = true
		terminalInfo.lastCommand = command
		terminalInfo.lastActive = Date.now()

		this.processes.set(terminalInfo.id, process)

		// Run the process asynchronously
		process
			.run(terminalInfo, command)
			.catch(() => {
				// Error is already emitted via EventEmitter
			})
			.finally(() => {
				terminalInfo.busy = false
				terminalInfo.lastActive = Date.now()
			})

		return process
	}

	/**
	 * Get list of terminals with their status
	 */
	getTerminals(busy: boolean): { id: number; lastCommand: string }[] {
		return Array.from(this.terminals.values())
			.filter((t) => t.busy === busy)
			.map((t) => ({
				id: t.id,
				lastCommand: t.lastCommand,
			}))
	}

	/**
	 * Get unretrieved output from a terminal
	 */
	getUnretrievedOutput(terminalId: number): string {
		const process = this.processes.get(terminalId)
		if (!process) {
			return ""
		}
		return process.getUnretrievedOutput()
	}

	/**
	 * Check if a process is currently hot (recently produced output)
	 */
	isProcessHot(terminalId: number): boolean {
		const process = this.processes.get(terminalId)
		return process?.isHot ?? false
	}

	/**
	 * Dispose all terminals
	 */
	disposeAll(): void {
		for (const terminal of this.terminals.values()) {
			if (terminal.process) {
				try {
					// Try graceful termination first
					terminal.process.kill("SIGTERM")

					// Force kill after timeout if still running
					setTimeout(() => {
						if (terminal.process && !terminal.process.killed) {
							terminal.process.kill("SIGKILL")
						}
					}, 1000)
				} catch (error) {
					// Process might already be dead
					console.error("Error killing terminal process:", error)
				}
			}
		}
		this.terminals.clear()
		this.processes.clear()
	}

	/**
	 * Set shell integration timeout (no-op in CLI, but maintained for compatibility)
	 */
	setShellIntegrationTimeout(_timeout: number): void {
		// No-op in CLI mode - shell integration not used
	}

	/**
	 * Enable or disable terminal reuse
	 */
	setTerminalReuseEnabled(enabled: boolean): void {
		this.terminalReuseEnabled = enabled
	}

	/**
	 * Set terminal output line limit
	 */
	setTerminalOutputLineLimit(limit: number): void {
		this.terminalOutputLineLimit = limit
	}

	/**
	 * Process output lines and truncate if necessary
	 */
	processOutput(outputLines: string[]): string {
		if (outputLines.length > this.terminalOutputLineLimit) {
			const halfLimit = Math.floor(this.terminalOutputLineLimit / 2)
			const truncatedLines = [
				...outputLines.slice(0, halfLimit),
				`\n... (${outputLines.length - this.terminalOutputLineLimit} lines truncated) ...\n`,
				...outputLines.slice(-halfLimit),
			]
			return truncatedLines.join("\n")
		}
		return outputLines.join("\n")
	}

	/**
	 * Get the default shell for the current platform
	 */
	private getDefaultShell(): string {
		const platform = os.platform()

		if (platform === "win32") {
			return process.env.COMSPEC || "cmd.exe"
		}

		// Unix-like systems (macOS, Linux, etc.)
		return process.env.SHELL || "/bin/bash"
	}

	/**
	 * Set default terminal profile (no-op in CLI, but maintained for compatibility)
	 */
	setDefaultTerminalProfile(_profileId: string): { closedCount: number; busyTerminals: any[] } {
		return { closedCount: 0, busyTerminals: [] }
	}

	/**
	 * Filter terminals based on a predicate
	 */
	filterTerminals(filterFn: (terminal: CliTerminalInfo) => boolean): CliTerminalInfo[] {
		return Array.from(this.terminals.values()).filter(filterFn)
	}

	/**
	 * Close terminals matching a filter
	 */
	closeTerminals(filterFn: (terminal: CliTerminalInfo) => boolean, force: boolean = false): number {
		const terminalsToClose = this.filterTerminals(filterFn)
		let closedCount = 0

		for (const terminal of terminalsToClose) {
			// Skip busy terminals unless force is true
			if (terminal.busy && !force) {
				continue
			}

			if (terminal.process) {
				terminal.process.kill()
			}

			this.terminals.delete(terminal.id)
			this.processes.delete(terminal.id)
			closedCount++
		}

		return closedCount
	}

	/**
	 * Handle terminal profile change (no-op in CLI, but maintained for compatibility)
	 */
	handleTerminalProfileChange(_newShellPath: string | undefined): {
		closedCount: number
		busyTerminals: any[]
	} {
		return { closedCount: 0, busyTerminals: [] }
	}

	/**
	 * Close all terminals
	 */
	closeAllTerminals(): number {
		return this.closeTerminals(() => true, true)
	}
}
