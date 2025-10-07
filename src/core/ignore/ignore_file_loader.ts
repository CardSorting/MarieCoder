/**
 * Ignore File Loader - Loading and parsing .clineignore files
 *
 * Handles:
 * - Loading .clineignore files
 * - Processing !include directives
 * - Combining multiple ignore files
 */

import { fileExistsAtPath } from "@utils/fs"
import fs from "fs/promises"
import type { Ignore } from "ignore"
import path from "path"

/**
 * Load and apply .clineignore patterns to an ignore instance
 * Returns the content if file exists, undefined otherwise
 */
export async function loadClineIgnore(cwd: string, ignoreInstance: Ignore): Promise<string | undefined> {
	try {
		const ignorePath = path.join(cwd, ".clineignore")
		if (await fileExistsAtPath(ignorePath)) {
			const content = await fs.readFile(ignorePath, "utf8")
			await processIgnoreContent(content, cwd, ignoreInstance)
			ignoreInstance.add(".clineignore")
			return content
		}
		return undefined
	} catch (error) {
		// Should never happen: reading file failed even though it exists
		console.error("Unexpected error loading .clineignore:", error)
		return undefined
	}
}

/**
 * Process ignore content and apply all ignore patterns
 */
async function processIgnoreContent(content: string, cwd: string, ignoreInstance: Ignore): Promise<void> {
	// Optimization: first check if there are any !include directives
	if (!content.includes("!include ")) {
		ignoreInstance.add(content)
		return
	}

	// Process !include directives
	const combinedContent = await processClineIgnoreIncludes(content, cwd)
	ignoreInstance.add(combinedContent)
}

/**
 * Process !include directives and combine all included file contents
 */
async function processClineIgnoreIncludes(content: string, cwd: string): Promise<string> {
	let combinedContent = ""
	const lines = content.split(/\r?\n/)

	for (const line of lines) {
		const trimmedLine = line.trim()

		if (!trimmedLine.startsWith("!include ")) {
			combinedContent += "\n" + line
			continue
		}

		// Process !include directive
		const includedContent = await readIncludedFile(trimmedLine, cwd)
		if (includedContent) {
			combinedContent += "\n" + includedContent
		}
	}

	return combinedContent
}

/**
 * Read content from an included file specified by !include directive
 */
async function readIncludedFile(includeLine: string, cwd: string): Promise<string | null> {
	const includePath = includeLine.substring("!include ".length).trim()
	const resolvedIncludePath = path.join(cwd, includePath)

	if (!(await fileExistsAtPath(resolvedIncludePath))) {
		console.debug(`[ClineIgnore] Included file not found: ${resolvedIncludePath}`)
		return null
	}

	return await fs.readFile(resolvedIncludePath, "utf8")
}
