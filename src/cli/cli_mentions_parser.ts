/**
 * CLI Mentions Parser
 * Parses and resolves @mentions for files, URLs, and folders
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

export interface MentionMatch {
	type: "file" | "url" | "folder"
	path: string
	startIndex: number
	endIndex: number
	raw: string
}

export interface ResolvedMention {
	type: "file" | "url" | "folder"
	path: string
	content?: string
	error?: string
}

export class CliMentionsParser {
	private workspacePath: string

	constructor(workspacePath: string) {
		this.workspacePath = workspacePath
	}

	/**
	 * Parse mentions from input text
	 */
	parseMentions(input: string): MentionMatch[] {
		const mentions: MentionMatch[] = []

		// Regex patterns for different mention types
		const patterns = [
			{ type: "file" as const, regex: /@file:(\S+)/g },
			{ type: "url" as const, regex: /@url:(https?:\/\/\S+)/g },
			{ type: "folder" as const, regex: /@folder:(\S+)/g },
		]

		for (const { type, regex } of patterns) {
			let match: RegExpExecArray | null
			while ((match = regex.exec(input)) !== null) {
				mentions.push({
					type,
					path: match[1],
					startIndex: match.index,
					endIndex: match.index + match[0].length,
					raw: match[0],
				})
			}
		}

		// Sort by start index
		return mentions.sort((a, b) => a.startIndex - b.startIndex)
	}

	/**
	 * Resolve a single mention
	 */
	async resolveMention(mention: MentionMatch): Promise<ResolvedMention> {
		switch (mention.type) {
			case "file": {
				return await this.resolveFile(mention.path)
			}
			case "url": {
				return await this.resolveUrl(mention.path)
			}
			case "folder": {
				return await this.resolveFolder(mention.path)
			}
			default: {
				return {
					type: mention.type,
					path: mention.path,
					error: "Unknown mention type",
				}
			}
		}
	}

	/**
	 * Resolve all mentions in text
	 */
	async resolveAllMentions(input: string): Promise<{
		text: string
		mentions: ResolvedMention[]
	}> {
		const matches = this.parseMentions(input)
		const mentions: ResolvedMention[] = []

		for (const match of matches) {
			const resolved = await this.resolveMention(match)
			mentions.push(resolved)
		}

		return { text: input, mentions }
	}

	/**
	 * Resolve a file mention
	 */
	private async resolveFile(filePath: string): Promise<ResolvedMention> {
		try {
			// Resolve relative to workspace
			const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(this.workspacePath, filePath)

			// Read file content
			const content = await fs.readFile(absolutePath, "utf-8")

			return {
				type: "file",
				path: filePath,
				content,
			}
		} catch (error) {
			return {
				type: "file",
				path: filePath,
				error: error instanceof Error ? error.message : "Failed to read file",
			}
		}
	}

	/**
	 * Resolve a URL mention
	 */
	private async resolveUrl(url: string): Promise<ResolvedMention> {
		try {
			// Fetch URL content
			const response = await fetch(url)

			if (!response.ok) {
				return {
					type: "url",
					path: url,
					error: `HTTP ${response.status}: ${response.statusText}`,
				}
			}

			const content = await response.text()

			return {
				type: "url",
				path: url,
				content,
			}
		} catch (error) {
			return {
				type: "url",
				path: url,
				error: error instanceof Error ? error.message : "Failed to fetch URL",
			}
		}
	}

	/**
	 * Resolve a folder mention
	 */
	private async resolveFolder(folderPath: string): Promise<ResolvedMention> {
		try {
			// Resolve relative to workspace
			const absolutePath = path.isAbsolute(folderPath) ? folderPath : path.join(this.workspacePath, folderPath)

			// Read directory contents
			const entries = await fs.readdir(absolutePath, { withFileTypes: true })

			// Create a summary of the folder contents
			const files: string[] = []
			const folders: string[] = []

			for (const entry of entries) {
				if (entry.isDirectory()) {
					folders.push(entry.name)
				} else {
					files.push(entry.name)
				}
			}

			const content = [
				`Folder: ${folderPath}`,
				`Files: ${files.length}`,
				`Directories: ${folders.length}`,
				"",
				"Contents:",
				...folders.map((f) => `  📁 ${f}/`),
				...files.map((f) => `  📄 ${f}`),
			].join("\n")

			return {
				type: "folder",
				path: folderPath,
				content,
			}
		} catch (error) {
			return {
				type: "folder",
				path: folderPath,
				error: error instanceof Error ? error.message : "Failed to read folder",
			}
		}
	}

	/**
	 * Format resolved mentions for display
	 */
	formatResolvedMentions(mentions: ResolvedMention[]): string {
		if (mentions.length === 0) {
			return ""
		}

		const lines: string[] = ["\n📎 Referenced Content:", "─".repeat(80)]

		for (const mention of mentions) {
			if (mention.error) {
				lines.push(`\n❌ @${mention.type}:${mention.path}`)
				lines.push(`   Error: ${mention.error}`)
			} else {
				lines.push(`\n✓ @${mention.type}:${mention.path}`)

				if (mention.content) {
					// Truncate long content
					const maxLength = 500
					const contentPreview =
						mention.content.length > maxLength
							? `${mention.content.substring(0, maxLength)}...\n[Content truncated - ${mention.content.length} chars total]`
							: mention.content

					lines.push("   Content:")
					lines.push(
						contentPreview
							.split("\n")
							.map((line) => `   ${line}`)
							.join("\n"),
					)
				}
			}
		}

		lines.push("─".repeat(80) + "\n")
		return lines.join("\n")
	}

	/**
	 * Get file suggestions for autocomplete
	 */
	async getFileSuggestions(partial: string, maxResults: number = 10): Promise<string[]> {
		try {
			const suggestions: string[] = []

			// Search workspace for matching files
			const searchDir = async (dir: string, depth: number = 0): Promise<void> => {
				if (depth > 3) {
					return
				} // Limit recursion depth

				try {
					const entries = await fs.readdir(dir, { withFileTypes: true })

					for (const entry of entries) {
						if (suggestions.length >= maxResults) {
							break
						}

						const fullPath = path.join(dir, entry.name)
						const relativePath = path.relative(this.workspacePath, fullPath)

						if (relativePath.toLowerCase().includes(partial.toLowerCase())) {
							if (entry.isFile()) {
								suggestions.push(`@file:${relativePath}`)
							} else if (entry.isDirectory()) {
								suggestions.push(`@folder:${relativePath}`)
							}
						}

						// Recursively search directories
						if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
							await searchDir(fullPath, depth + 1)
						}
					}
				} catch {
					// Ignore permission errors
				}
			}

			await searchDir(this.workspacePath)
			return suggestions
		} catch {
			return []
		}
	}
}
