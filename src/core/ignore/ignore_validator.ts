/**
 * Ignore Validator - Access, command, and path validation
 *
 * Handles:
 * - File access validation
 * - Terminal command validation
 * - Path filtering
 */

import type { Ignore } from "ignore"
import path from "path"

export const LOCK_TEXT_SYMBOL = "\u{1F512}"

/**
 * Check if a file should be accessible to the LLM
 * @param filePath - Path to check (relative to cwd)
 * @param cwd - Current working directory
 * @param ignoreInstance - Ignore instance with loaded patterns
 * @param hasIgnoreFile - Whether .clineignore file exists
 * @returns true if file is accessible, false if ignored
 */
export function validateAccess(filePath: string, cwd: string, ignoreInstance: Ignore, hasIgnoreFile: boolean): boolean {
	// Always allow access if .clineignore does not exist
	if (!hasIgnoreFile) {
		return true
	}

	try {
		// Normalize path to be relative to cwd and use forward slashes
		const absolutePath = path.resolve(cwd, filePath)
		const relativePath = path.relative(cwd, absolutePath).toPosix()

		// Ignore expects paths to be path.relative()'d
		return !ignoreInstance.ignores(relativePath)
	} catch (_error) {
		// Ignore is designed to work with relative file paths, so will throw error for paths outside cwd
		// We are allowing access to all files outside cwd
		return true
	}
}

/**
 * Check if a terminal command should be allowed to execute based on file access patterns
 * @param command - Terminal command to validate
 * @param cwd - Current working directory
 * @param ignoreInstance - Ignore instance with loaded patterns
 * @param hasIgnoreFile - Whether .clineignore file exists
 * @returns path of file that is being accessed if it is being accessed, undefined if command is allowed
 */
export function validateCommand(
	command: string,
	cwd: string,
	ignoreInstance: Ignore,
	hasIgnoreFile: boolean,
): string | undefined {
	// Always allow if no .clineignore exists
	if (!hasIgnoreFile) {
		return undefined
	}

	// Split command into parts and get the base command
	const parts = command.trim().split(/\s+/)
	const baseCommand = parts[0].toLowerCase()

	// Commands that read file contents
	const fileReadingCommands = [
		// Unix commands
		"cat",
		"less",
		"more",
		"head",
		"tail",
		"grep",
		"awk",
		"sed",
		// PowerShell commands and aliases
		"get-content",
		"gc",
		"type",
		"select-string",
		"sls",
	]

	if (fileReadingCommands.includes(baseCommand)) {
		// Check each argument that could be a file path
		for (let i = 1; i < parts.length; i++) {
			const arg = parts[i]
			// Skip command flags/options (both Unix and PowerShell style)
			if (arg.startsWith("-") || arg.startsWith("/")) {
				continue
			}
			// Ignore PowerShell parameter names
			if (arg.includes(":")) {
				continue
			}
			// Validate file access
			if (!validateAccess(arg, cwd, ignoreInstance, hasIgnoreFile)) {
				return arg
			}
		}
	}

	return undefined
}

/**
 * Filter an array of paths, removing those that should be ignored
 * @param paths - Array of paths to filter (relative to cwd)
 * @param cwd - Current working directory
 * @param ignoreInstance - Ignore instance with loaded patterns
 * @param hasIgnoreFile - Whether .clineignore file exists
 * @returns Array of allowed paths
 */
export function filterPaths(paths: string[], cwd: string, ignoreInstance: Ignore, hasIgnoreFile: boolean): string[] {
	try {
		return paths
			.map((p) => ({
				path: p,
				allowed: validateAccess(p, cwd, ignoreInstance, hasIgnoreFile),
			}))
			.filter((x) => x.allowed)
			.map((x) => x.path)
	} catch (error) {
		console.error("Error filtering paths:", error)
		return [] // Fail closed for security
	}
}
