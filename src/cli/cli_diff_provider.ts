/**
 * CLI Diff View Provider
 * Shows diffs in terminal output with syntax highlighting and better formatting
 */

import { HostProvider } from "@/hosts/host-provider"
import { DiffViewProvider } from "@/integrations/editor/DiffViewProvider"

// ANSI color codes for terminal output
const COLORS = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
	gray: "\x1b[90m",
	bgRed: "\x1b[41m",
	bgGreen: "\x1b[42m",
}

export interface DiffStats {
	additions: number
	deletions: number
	totalLines: number
}

export class CliDiffViewProvider extends DiffViewProvider {
	private activeDiffEditorId: string | undefined
	private enableColors: boolean = true

	override async openDiffEditor(): Promise<void> {
		if (!this.absolutePath) {
			return
		}

		const response = await HostProvider.diff.openDiff({
			path: this.absolutePath,
			content: this.originalContent ?? "",
		})

		this.activeDiffEditorId = response.diffId
	}

	override async replaceText(
		content: string,
		rangeToReplace: { startLine: number; endLine: number },
		_currentLine: number | undefined,
	): Promise<void> {
		if (!this.activeDiffEditorId) {
			return
		}

		await HostProvider.diff.replaceText({
			diffId: this.activeDiffEditorId,
			content: content,
			startLine: rangeToReplace.startLine,
			endLine: rangeToReplace.endLine,
		})
	}

	protected override async truncateDocument(lineNumber: number): Promise<void> {
		if (!this.activeDiffEditorId) {
			return
		}

		await HostProvider.diff.truncateDocument({
			diffId: this.activeDiffEditorId,
			endLine: lineNumber,
		})
	}

	protected async saveDocument(): Promise<Boolean> {
		if (!this.activeDiffEditorId) {
			return false
		}

		try {
			await HostProvider.diff.saveDocument({ diffId: this.activeDiffEditorId })
			return true
		} catch (err: any) {
			console.error("Failed to save document:", err)
			return false
		}
	}

	protected override async scrollEditorToLine(_line: number): Promise<void> {
		// No-op for CLI
	}

	override async scrollAnimation(_startLine: number, _endLine: number): Promise<void> {
		// No-op for CLI
	}

	protected override async getDocumentText(): Promise<string | undefined> {
		if (!this.activeDiffEditorId) {
			return undefined
		}

		try {
			const response = await HostProvider.diff.getDocumentText({ diffId: this.activeDiffEditorId })
			return response.content
		} catch (err) {
			console.error("Error getting document text:", err)
			return undefined
		}
	}

	protected override async closeAllDiffViews(): Promise<void> {
		await HostProvider.diff.closeAllDiffs({})
		this.activeDiffEditorId = undefined
	}

	protected override async resetDiffView(): Promise<void> {
		this.activeDiffEditorId = undefined
	}

	/**
	 * Format a diff line with colors based on the line type
	 */
	private formatDiffLine(line: string): string {
		if (!this.enableColors) {
			return line
		}

		if (line.startsWith("+++") || line.startsWith("---")) {
			return `${COLORS.bright}${COLORS.yellow}${line}${COLORS.reset}`
		}
		if (line.startsWith("@@")) {
			return `${COLORS.cyan}${line}${COLORS.reset}`
		}
		if (line.startsWith("+")) {
			return `${COLORS.green}${line}${COLORS.reset}`
		}
		if (line.startsWith("-")) {
			return `${COLORS.red}${line}${COLORS.reset}`
		}
		if (line.startsWith("diff --git")) {
			return `${COLORS.bright}${line}${COLORS.reset}`
		}
		return `${COLORS.gray}${line}${COLORS.reset}`
	}

	/**
	 * Display a formatted diff in the terminal
	 */
	async displayDiff(originalContent: string, newContent: string, filePath: string): Promise<void> {
		const diff = this.generateUnifiedDiff(originalContent, newContent, filePath)
		const stats = this.calculateDiffStats(diff)

		console.log("\n" + "═".repeat(80))
		console.log(`${COLORS.bright}Diff: ${filePath}${COLORS.reset}`)
		console.log("─".repeat(80))

		// Display diff statistics
		console.log(
			`${COLORS.green}+${stats.additions}${COLORS.reset} ${COLORS.red}-${stats.deletions}${COLORS.reset} (${stats.totalLines} lines)`,
		)
		console.log("─".repeat(80))

		// Display formatted diff
		const lines = diff.split("\n")
		for (const line of lines) {
			console.log(this.formatDiffLine(line))
		}

		console.log("═".repeat(80) + "\n")
	}

	/**
	 * Generate a unified diff format
	 */
	private generateUnifiedDiff(originalContent: string, newContent: string, filePath: string): string {
		const originalLines = originalContent.split("\n")
		const newLines = newContent.split("\n")

		const diff: string[] = []
		diff.push(`diff --git a/${filePath} b/${filePath}`)
		diff.push(`--- a/${filePath}`)
		diff.push(`+++ b/${filePath}`)

		// Simple line-by-line diff (can be enhanced with more sophisticated diff algorithm)
		const maxLines = Math.max(originalLines.length, newLines.length)
		let hunkStart = 0
		let inHunk = false
		const hunkLines: string[] = []

		for (let i = 0; i < maxLines; i++) {
			const originalLine = originalLines[i]
			const newLine = newLines[i]

			if (originalLine !== newLine) {
				if (!inHunk) {
					hunkStart = Math.max(0, i - 3)
					inHunk = true
					hunkLines.length = 0

					// Add context lines before change
					for (let j = hunkStart; j < i; j++) {
						if (originalLines[j] !== undefined) {
							hunkLines.push(` ${originalLines[j]}`)
						}
					}
				}

				// Add changed lines
				if (originalLine !== undefined && newLine !== undefined) {
					if (originalLine !== newLine) {
						hunkLines.push(`-${originalLine}`)
						hunkLines.push(`+${newLine}`)
					}
				} else if (originalLine !== undefined) {
					hunkLines.push(`-${originalLine}`)
				} else if (newLine !== undefined) {
					hunkLines.push(`+${newLine}`)
				}
			} else if (inHunk) {
				// Add context line after change
				if (originalLine !== undefined) {
					hunkLines.push(` ${originalLine}`)
				}
				// Close hunk after 3 context lines
				if (hunkLines.filter((l) => l.startsWith(" ")).length >= 3) {
					diff.push(`@@ -${hunkStart + 1},${i - hunkStart} +${hunkStart + 1},${i - hunkStart} @@`)
					diff.push(...hunkLines)
					inHunk = false
					hunkLines.length = 0
				}
			}
		}

		// Close any remaining hunk
		if (inHunk && hunkLines.length > 0) {
			diff.push(`@@ -${hunkStart + 1},${maxLines - hunkStart} +${hunkStart + 1},${maxLines - hunkStart} @@`)
			diff.push(...hunkLines)
		}

		return diff.join("\n")
	}

	/**
	 * Calculate diff statistics
	 */
	private calculateDiffStats(diff: string): DiffStats {
		const lines = diff.split("\n")
		let additions = 0
		let deletions = 0

		for (const line of lines) {
			if (line.startsWith("+") && !line.startsWith("+++")) {
				additions++
			} else if (line.startsWith("-") && !line.startsWith("---")) {
				deletions++
			}
		}

		return {
			additions,
			deletions,
			totalLines: lines.length,
		}
	}

	/**
	 * Disable colors for environments that don't support ANSI
	 */
	setColorEnabled(enabled: boolean): void {
		this.enableColors = enabled
	}
}
