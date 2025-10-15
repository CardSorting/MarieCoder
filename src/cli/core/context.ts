/**
 * CLI Context - simulates VSCode ExtensionContext for CLI usage
 */

import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import type * as vscode from "vscode"
import { output } from "../ui/output/output"

export class CliContext implements vscode.ExtensionContext {
	subscriptions: Array<{ dispose(): any }> = []
	workspaceState!: vscode.Memento
	globalState!: vscode.Memento & { setKeysForSync(keys: readonly string[]): void }
	secrets!: vscode.SecretStorage
	extensionUri!: vscode.Uri
	extensionPath: string
	environmentVariableCollection!: any
	asAbsolutePath: (relativePath: string) => string
	storageUri!: vscode.Uri | undefined
	storagePath!: string | undefined
	globalStorageUri!: vscode.Uri
	globalStoragePath: string
	logUri!: vscode.Uri
	logPath!: string
	extensionMode!: vscode.ExtensionMode
	extension!: vscode.Extension<any>
	languageModelAccessInformation!: any

	constructor(_workingDir: string) {
		// Setup paths
		// In CLI mode, use current working directory as extension path
		this.extensionPath = process.cwd()
		this.globalStoragePath = path.join(os.homedir(), ".mariecoder", "cli")

		// Ensure storage directory exists
		fs.mkdir(this.globalStoragePath, { recursive: true }).catch((err) => {
			output.warn("Failed to create storage directory:", err)
		})

		this.asAbsolutePath = (relativePath: string) => path.join(this.extensionPath, relativePath)

		// Mock Memento for state storage
		const createMemento = (storagePath: string): vscode.Memento => {
			const stateFile = path.join(storagePath, "state.json")
			let state: Record<string, any> = {}

			// Load existing state
			fs.readFile(stateFile, "utf-8")
				.then((data) => {
					state = JSON.parse(data)
				})
				.catch(() => {
					// File doesn't exist yet
				})

			return {
				keys: () => Object.keys(state),
				get: <T>(key: string, defaultValue?: T): T => {
					return (state[key] as T) ?? (defaultValue as T)
				},
				update: async (key: string, value: any) => {
					state[key] = value
					await fs.mkdir(path.dirname(stateFile), { recursive: true })
					await fs.writeFile(stateFile, JSON.stringify(state, null, 2))
				},
			}
		}

		this.workspaceState = createMemento(path.join(this.globalStoragePath, "workspace"))
		this.globalState = {
			...createMemento(this.globalStoragePath),
			setKeysForSync: (_keys: readonly string[]) => {
				// No-op for CLI
			},
		}

		// Mock SecretStorage
		this.secrets = {
			get: async (key: string): Promise<string | undefined> => {
				const secretsFile = path.join(this.globalStoragePath, "secrets.json")
				try {
					const data = await fs.readFile(secretsFile, "utf-8")
					const secrets = JSON.parse(data)
					return secrets[key]
				} catch {
					return undefined
				}
			},
			store: async (key: string, value: string): Promise<void> => {
				const secretsFile = path.join(this.globalStoragePath, "secrets.json")
				let secrets: Record<string, string> = {}
				try {
					const data = await fs.readFile(secretsFile, "utf-8")
					secrets = JSON.parse(data)
				} catch {
					// File doesn't exist
				}
				secrets[key] = value
				await fs.writeFile(secretsFile, JSON.stringify(secrets, null, 2))
			},
			delete: async (key: string): Promise<void> => {
				const secretsFile = path.join(this.globalStoragePath, "secrets.json")
				try {
					const data = await fs.readFile(secretsFile, "utf-8")
					const secrets = JSON.parse(data)
					delete secrets[key]
					await fs.writeFile(secretsFile, JSON.stringify(secrets, null, 2))
				} catch {
					// File doesn't exist
				}
			},
			onDidChange: () => ({ dispose: () => {} }) as any,
		}
	}

	dispose(): void {
		for (const subscription of this.subscriptions) {
			if (subscription && typeof subscription.dispose === "function") {
				subscription.dispose()
			}
		}
		this.subscriptions = []
	}
}
