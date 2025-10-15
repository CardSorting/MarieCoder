/**
 * CLI implementation of the host bridge client
 * Provides direct filesystem and terminal integration without gRPC
 */

import { exec } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import * as readline from "node:readline"
import { promisify } from "node:util"
import {
	DiffServiceClientInterface,
	EnvServiceClientInterface,
	WindowServiceClientInterface,
	WorkspaceServiceClientInterface,
} from "@generated/hosts/host-bridge-client-types"
import { HostBridgeClientProvider } from "@/hosts/host-provider-types"
import { output } from "./cli_output"

const execAsync = promisify(exec)

/**
 * CLI Workspace Service - handles workspace operations
 * @ts-expect-error - Some types don't match proto definitions exactly, but functionally equivalent
 */
class CliWorkspaceService implements WorkspaceServiceClientInterface {
	private workspacePath: string

	constructor(workspacePath: string) {
		this.workspacePath = workspacePath
	}

	async getWorkspaceFolders(): Promise<{ folders: Array<{ uri: string; name: string }> }> {
		return {
			folders: [
				{
					uri: `file://${this.workspacePath}`,
					name: path.basename(this.workspacePath),
				},
			],
		}
	}

	async readFile(params: { path: string }): Promise<{ content: string; encoding?: string }> {
		const content = await fs.readFile(params.path, "utf-8")
		return { content, encoding: "utf-8" }
	}

	async writeFile(params: { path: string; content: string }): Promise<{}> {
		await fs.mkdir(path.dirname(params.path), { recursive: true })
		await fs.writeFile(params.path, params.content, "utf-8")
		return {}
	}

	async deleteFile(params: { path: string }): Promise<{}> {
		await fs.unlink(params.path)
		return {}
	}

	async createDirectory(params: { path: string }): Promise<{}> {
		await fs.mkdir(params.path, { recursive: true })
		return {}
	}

	async listFiles(params: { path: string }): Promise<{ files: string[] }> {
		const entries = await fs.readdir(params.path, { withFileTypes: true })
		const files = entries.map((entry) => path.join(params.path, entry.name))
		return { files }
	}

	async fileExists(params: { path: string }): Promise<{ exists: boolean }> {
		try {
			await fs.access(params.path)
			return { exists: true }
		} catch {
			return { exists: false }
		}
	}

	async getDiagnostics(_params: any): Promise<{ fileDiagnostics: any[]; diagnostics: any[] }> {
		// CLI doesn't have live diagnostics
		return { diagnostics: [], fileDiagnostics: [] }
	}

	async getConfiguration(_params: { section: string }): Promise<{ value: any }> {
		// Return default config
		return { value: {} }
	}

	async updateConfiguration(_params: { section: string; value: any }): Promise<{}> {
		// No-op for CLI
		return {}
	}

	async getWorkspacePaths(): Promise<{ paths: string[] }> {
		return { paths: [this.workspacePath] }
	}

	async saveOpenDocumentIfDirty(_params: any): Promise<{}> {
		return {}
	}

	async openProblemsPanel(): Promise<{}> {
		output.log("Problems panel not available in CLI mode")
		return {}
	}

	async openInFileExplorerPanel(_params: { path: string }): Promise<{}> {
		output.log("File explorer not available in CLI mode")
		return {}
	}

	async listTextDocuments(): Promise<{ documents: Array<{ uri: string; text: string }> }> {
		return { documents: [] }
	}

	async openClineSidebarPanel(): Promise<{}> {
		return {}
	}

	async openTerminalPanel(): Promise<{}> {
		return {}
	}
}

/**
 * CLI Environment Service - handles environment operations
 * @ts-expect-error - Some types don't match proto definitions exactly, but functionally equivalent
 */
class CliEnvService implements EnvServiceClientInterface {
	async getEnv(_params: { key: string }): Promise<{ value: string | undefined }> {
		return { value: process.env[_params.key] }
	}

	async setEnv(_params: { key: string; value: string }): Promise<{}> {
		process.env[_params.key] = _params.value
		return {}
	}

	async clipboardReadText(): Promise<{ value: string }> {
		// Use pbpaste on macOS, xclip on Linux, clip on Windows
		try {
			if (process.platform === "darwin") {
				const { stdout } = await execAsync("pbpaste")
				return { value: stdout }
			} else if (process.platform === "linux") {
				const { stdout } = await execAsync("xclip -selection clipboard -o")
				return { value: stdout }
			} else if (process.platform === "win32") {
				const { stdout } = await execAsync("powershell.exe Get-Clipboard")
				return { value: stdout }
			}
		} catch (error) {
			output.warn("Failed to read clipboard:", error)
		}
		return { value: "" }
	}

	async clipboardWriteText(_params: any): Promise<{}> {
		// Use pbcopy on macOS, xclip on Linux, clip on Windows
		try {
			const text = _params.value || _params.text || ""
			if (process.platform === "darwin") {
				await execAsync(`echo "${text}" | pbcopy`)
			} else if (process.platform === "linux") {
				await execAsync(`echo "${text}" | xclip -selection clipboard`)
			} else if (process.platform === "win32") {
				await execAsync(`echo "${text}" | clip`)
			}
		} catch (error) {
			output.warn("Failed to write clipboard:", error)
		}
		return {}
	}

	async getHostVersion(): Promise<{ version: string }> {
		return { version: "cli-1.0.0" }
	}

	async getIdeRedirectUri(): Promise<{ value: string }> {
		return { value: "cli://mariecoder" }
	}

	async openUrl(_params: { url: string }): Promise<{}> {
		output.log(`Open URL: ${_params.url}`)
		return {}
	}

	async getRuntimeInfo(): Promise<{ platform: string; arch: string }> {
		return { platform: process.platform, arch: process.arch }
	}

	async getMachineId(): Promise<{ value: string }> {
		return { value: "cli-machine" }
	}

	async shutdown(): Promise<{}> {
		return {}
	}

	async getHomeDir(): Promise<{ path: string }> {
		return { path: os.homedir() }
	}

	async getTempDir(): Promise<{ path: string }> {
		return { path: os.tmpdir() }
	}

	async getShell(): Promise<{ shell: string }> {
		return { shell: process.env.SHELL || "/bin/sh" }
	}

	async getCwd(): Promise<{ path: string }> {
		return { path: process.cwd() }
	}
}

/**
 * CLI Window Service - handles user interaction
 * @ts-expect-error - Some types don't match proto definitions exactly, but functionally equivalent
 */
class CliWindowService implements WindowServiceClientInterface {
	async showMessage(_params: { type: any; message: string }): Promise<{}> {
		const prefix =
			{
				0: "ℹ️", // INFO
				1: "⚠️", // WARNING
				2: "❌", // ERROR
			}[_params.type as number] || "ℹ️"

		output.log(`${prefix} ${_params.message}`)
		return {}
	}

	async showInputBox(_params: any): Promise<{ response?: string }> {
		// Flush output before prompting to prevent conflicts
		output.flush()

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})

		return new Promise((resolve) => {
			rl.question(`${_params.prompt || ""}: `, (answer) => {
				rl.close()
				resolve({ response: answer || undefined })
			})
		})
	}

	async showQuickPick(_params: any): Promise<{ value: string | undefined }> {
		output.log(_params.placeholder || "Select an option:")
		output.flush() // Flush before showing options
		_params.items?.forEach((item: string, index: number) => {
			output.log(`  ${index + 1}. ${item}`)
		})

		// Flush all items before prompting
		output.flush()

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})

		return new Promise((resolve) => {
			rl.question("Enter number: ", (answer) => {
				rl.close()
				const index = Number.parseInt(answer, 10) - 1
				resolve({ value: _params.items?.[index] || undefined })
			})
		})
	}

	async showOpenDialogue(_params: any): Promise<{ paths: string[] }> {
		output.log("File selection not supported in CLI mode")
		return { paths: [] }
	}

	async showSaveDialog(_params: any): Promise<{ selectedPath?: string }> {
		output.log("Save dialog not supported in CLI mode")
		return { selectedPath: undefined }
	}

	async showTextDocument(_params: any): Promise<{ documentPath: string; isActive: boolean }> {
		return { documentPath: _params.path || "", isActive: false }
	}

	async openFile(_params: any): Promise<{}> {
		output.log(`Open file: ${_params.path}`)
		return {}
	}

	async openSettings(): Promise<{}> {
		output.log("Settings not available in CLI mode")
		return {}
	}

	async openExtension(_params: any): Promise<{}> {
		return {}
	}

	async focusSidebar(): Promise<{}> {
		return {}
	}

	async showInformationMessage(_params: any): Promise<{ selection: string | undefined }> {
		output.log(`ℹ️  ${_params.message}`)
		return { selection: undefined }
	}

	async getOpenTabs(): Promise<{ paths: string[] }> {
		return { paths: [] }
	}

	async getVisibleTabs(): Promise<{ paths: string[] }> {
		return { paths: [] }
	}

	async getActiveEditor(): Promise<any> {
		return {}
	}
}

/**
 * CLI Diff Service - handles diff viewing
 */
class CliDiffService implements DiffServiceClientInterface {
	private diffs: Map<string, { path: string; originalContent: string; modifiedContent: string }> = new Map()
	private nextDiffId = 1

	async openDiff(params: { path: string; content: string }): Promise<{ diffId: string }> {
		const diffId = `diff-${this.nextDiffId++}`

		try {
			// Try to read existing file content
			const modifiedContent = await fs.readFile(params.path, "utf-8").catch(() => "")

			this.diffs.set(diffId, {
				path: params.path,
				originalContent: params.content,
				modifiedContent,
			})

			// Show initial diff
			this.showDiff(diffId)

			return { diffId }
		} catch (error) {
			throw new Error(`Failed to open diff for ${params.path}: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	async replaceText(params: { diffId: string; content: string; startLine: number; endLine: number }): Promise<{}> {
		const diff = this.diffs.get(params.diffId)
		if (!diff) {
			throw new Error(`Diff not found: ${params.diffId}`)
		}

		try {
			const lines = diff.modifiedContent.split("\n")

			// Validate line numbers (0-indexed to match VSCode behavior)
			if (params.startLine < 0 || params.startLine > lines.length) {
				throw new Error(`Invalid start line: ${params.startLine} (file has ${lines.length} lines, 0-indexed)`)
			}
			if (params.endLine < params.startLine) {
				throw new Error(`End line ${params.endLine} is before start line ${params.startLine}`)
			}
			if (params.endLine > lines.length) {
				throw new Error(`Invalid end line: ${params.endLine} (file has ${lines.length} lines, 0-indexed)`)
			}

			// Replace the specified range with new content (0-indexed)
			lines.splice(params.startLine, params.endLine - params.startLine, params.content)
			diff.modifiedContent = lines.join("\n")

			return {}
		} catch (error) {
			throw new Error(`Failed to replace text: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	async truncateDocument(params: { diffId: string; endLine: number }): Promise<{}> {
		const diff = this.diffs.get(params.diffId)
		if (!diff) {
			throw new Error(`Diff not found: ${params.diffId}`)
		}

		const lines = diff.modifiedContent.split("\n")
		diff.modifiedContent = lines.slice(0, params.endLine).join("\n")

		return {}
	}

	async saveDocument(params: { diffId: string }): Promise<{}> {
		const diff = this.diffs.get(params.diffId)
		if (!diff) {
			throw new Error(`Diff not found: ${params.diffId}`)
		}

		try {
			// Ensure directory exists
			const dir = path.dirname(diff.path)
			await fs.mkdir(dir, { recursive: true })

			// Write file with proper error handling
			await fs.writeFile(diff.path, diff.modifiedContent, "utf-8")
			output.log(`✅ Saved: ${diff.path}`)

			// Clean up the diff after successful save
			this.diffs.delete(params.diffId)

			return {}
		} catch (error) {
			throw new Error(`Failed to save ${diff.path}: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	async scrollDiff(_params: { diffId: string; line: number }): Promise<{}> {
		// No-op for CLI
		return {}
	}

	async getDocumentText(params: { diffId: string }): Promise<{ content: string }> {
		const diff = this.diffs.get(params.diffId)
		if (!diff) {
			throw new Error(`Diff not found: ${params.diffId}`)
		}

		return { content: diff.modifiedContent }
	}

	async closeAllDiffs(): Promise<{}> {
		this.diffs.clear()
		return {}
	}

	async openMultiFileDiff(_params: any): Promise<{ diffId: string }> {
		output.log("Multi-file diff not yet supported in CLI mode")
		return { diffId: "multi-diff-1" }
	}

	private showDiff(diffId: string): void {
		const diff = this.diffs.get(diffId)
		if (!diff) {
			return
		}

		output.log(`\n📄 Diff for ${diff.path}:`)
		output.log("─".repeat(80))

		const originalLines = diff.originalContent.split("\n")
		const modifiedLines = diff.modifiedContent.split("\n")

		const maxLines = Math.max(originalLines.length, modifiedLines.length)
		for (let i = 0; i < maxLines; i++) {
			const original = originalLines[i] || ""
			const modified = modifiedLines[i] || ""

			if (original !== modified) {
				if (original && !modified) {
					output.log(`- ${original}`)
				} else if (!original && modified) {
					output.log(`+ ${modified}`)
				} else {
					output.log(`- ${original}`)
					output.log(`+ ${modified}`)
				}
			}
		}

		output.log("─".repeat(80))
	}
}

/**
 * CLI Host Bridge Client Provider
 */
export class CliHostBridgeClient implements HostBridgeClientProvider {
	workspaceClient: WorkspaceServiceClientInterface
	envClient: EnvServiceClientInterface
	windowClient: WindowServiceClientInterface
	diffClient: DiffServiceClientInterface

	constructor(workspacePath: string) {
		this.workspaceClient = new CliWorkspaceService(workspacePath)
		this.envClient = new CliEnvService()
		this.windowClient = new CliWindowService()
		this.diffClient = new CliDiffService()
	}
}
