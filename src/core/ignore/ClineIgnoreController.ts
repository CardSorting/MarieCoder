/**
 * Cline Ignore Controller - KonMari-Tidied Structure
 *
 * Clean, self-explanatory modules following MARIECODER methodology:
 * - ignore_file_loader.ts: Loading and parsing .clineignore files
 * - ignore_validator.ts: Access, command, and path validation
 * - ignore_watcher.ts: File watching functionality
 *
 * Tidied from 259-line monolith → 4 focused modules
 *
 * Controls LLM access to files by enforcing ignore patterns.
 * Designed to be instantiated once in Cline.ts and passed to file manipulation services.
 * Uses the 'ignore' library to support standard .gitignore syntax in .clineignore files.
 */

import type { FSWatcher } from "chokidar"
import ignore, { Ignore } from "ignore"
import { loadClineIgnore } from "./ignore_file_loader"
import { filterPaths, validateAccess, validateCommand } from "./ignore_validator"
import { closeIgnoreFileWatcher, setupIgnoreFileWatcher } from "./ignore_watcher"

export { LOCK_TEXT_SYMBOL } from "./ignore_validator"

export class ClineIgnoreController {
	private cwd: string
	private ignoreInstance: Ignore
	private fileWatcher?: FSWatcher
	clineIgnoreContent: string | undefined

	constructor(cwd: string) {
		this.cwd = cwd
		this.ignoreInstance = ignore()
		this.clineIgnoreContent = undefined
	}

	/**
	 * Initialize the controller by loading custom patterns and setting up file watcher
	 * Must be called after construction and before using the controller
	 */
	async initialize(): Promise<void> {
		// Set up file watcher for .clineignore
		this.fileWatcher = setupIgnoreFileWatcher(this.cwd, () => this.reloadClineIgnore())
		await this.reloadClineIgnore()
	}

	/**
	 * Reload .clineignore file and reset ignore instance
	 */
	private async reloadClineIgnore(): Promise<void> {
		// Reset ignore instance to prevent duplicate patterns
		this.ignoreInstance = ignore()
		this.clineIgnoreContent = await loadClineIgnore(this.cwd, this.ignoreInstance)
	}

	/**
	 * Check if a file should be accessible to the LLM
	 * @param filePath - Path to check (relative to cwd)
	 * @returns true if file is accessible, false if ignored
	 */
	validateAccess(filePath: string): boolean {
		return validateAccess(filePath, this.cwd, this.ignoreInstance, !!this.clineIgnoreContent)
	}

	/**
	 * Check if a terminal command should be allowed to execute based on file access patterns
	 * @param command - Terminal command to validate
	 * @returns path of file that is being accessed if it is being accessed, undefined if command is allowed
	 */
	validateCommand(command: string): string | undefined {
		return validateCommand(command, this.cwd, this.ignoreInstance, !!this.clineIgnoreContent)
	}

	/**
	 * Filter an array of paths, removing those that should be ignored
	 * @param paths - Array of paths to filter (relative to cwd)
	 * @returns Array of allowed paths
	 */
	filterPaths(paths: string[]): string[] {
		return filterPaths(paths, this.cwd, this.ignoreInstance, !!this.clineIgnoreContent)
	}

	/**
	 * Clean up resources when the controller is no longer needed
	 */
	async dispose(): Promise<void> {
		await closeIgnoreFileWatcher(this.fileWatcher)
		this.fileWatcher = undefined
	}
}
