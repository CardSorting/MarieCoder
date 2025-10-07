/**
 * Mention Handlers - Type-specific content fetching
 *
 * Handles fetching content for different mention types:
 * - URL content (via browser)
 * - File/folder content
 * - Workspace problems
 * - Terminal output
 * - Git changes and commits
 */

import { diagnosticsToProblemsString } from "@integrations/diagnostics"
import { extractTextFromFile } from "@integrations/misc/extract-text"
import { getLatestTerminalOutput } from "@integrations/terminal/get-latest-output"
import { UrlContentFetcher } from "@services/browser/UrlContentFetcher"
import { telemetryService } from "@services/telemetry"
import { getCommitInfo, getWorkingState } from "@utils/git"
import fs from "fs/promises"
import { isBinaryFile } from "isbinaryfile"
import * as path from "path"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"
import { DiagnosticSeverity } from "@/shared/proto/index.cline"
import { FileContextTracker } from "../context/context-tracking"

/**
 * Handle URL mention - fetch content via browser
 */
export async function handleUrlMention(
	mention: string,
	urlContentFetcher: UrlContentFetcher,
	launchBrowserError?: Error,
): Promise<string> {
	if (launchBrowserError) {
		const errorMsg = `Error fetching content: ${launchBrowserError.message}`
		telemetryService.captureMentionFailed("url", "network_error", launchBrowserError?.message || "")
		return `<url_content url="${mention}">\n${errorMsg}\n</url_content>`
	}

	try {
		const markdown = await urlContentFetcher.urlToMarkdown(mention)
		telemetryService.captureMentionUsed("url", markdown.length)
		return `<url_content url="${mention}">\n${markdown}\n</url_content>`
	} catch (error) {
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: `Error fetching content for ${mention}: ${error.message}`,
		})
		const errorMsg = `Error fetching content: ${error.message}`
		telemetryService.captureMentionFailed("url", "network_error", error.message)
		return `<url_content url="${mention}">\n${errorMsg}\n</url_content>`
	}
}

/**
 * Handle file/folder mention - get content
 */
export async function handleFileMention(
	mentionPath: string,
	cwd: string,
	isFolder: boolean,
	fileContextTracker?: FileContextTracker,
): Promise<string> {
	const mentionType = isFolder ? "folder" : "file"

	try {
		const content = await getFileOrFolderContent(mentionPath, cwd)

		if (isFolder) {
			telemetryService.captureMentionUsed(mentionType, content.length)
			return `<folder_content path="${mentionPath}">\n${content}\n</folder_content>`
		} else {
			// Track that this file was mentioned
			if (fileContextTracker) {
				await fileContextTracker.trackFileContext(mentionPath, "file_mentioned")
			}
			telemetryService.captureMentionUsed(mentionType, content.length)
			return `<file_content path="${mentionPath}">\n${content}\n</file_content>`
		}
	} catch (error) {
		// Map file access errors to appropriate error types
		let errorType: "not_found" | "permission_denied" | "unknown" = "unknown"
		if (error.message.includes("ENOENT") || error.message.includes("Failed to access")) {
			errorType = "not_found"
		} else if (error.message.includes("EACCES") || error.message.includes("permission")) {
			errorType = "permission_denied"
		}
		telemetryService.captureMentionFailed(mentionType, errorType, error.message)

		const errorMsg = `Error fetching content: ${error.message}`
		return isFolder
			? `<folder_content path="${mentionPath}">\n${errorMsg}\n</folder_content>`
			: `<file_content path="${mentionPath}">\n${errorMsg}\n</file_content>`
	}
}

/**
 * Get file or folder content
 */
async function getFileOrFolderContent(mentionPath: string, cwd: string): Promise<string> {
	const absPath = path.resolve(cwd, mentionPath)

	try {
		const stats = await fs.stat(absPath)

		if (stats.isFile()) {
			const isBinary = await isBinaryFile(absPath).catch(() => false)
			if (isBinary) {
				return "(Binary file, unable to display content)"
			}
			const content = await extractTextFromFile(absPath)
			return content
		} else if (stats.isDirectory()) {
			const entries = await fs.readdir(absPath, { withFileTypes: true })
			let folderContent = ""
			const fileContentPromises: Promise<string | undefined>[] = []
			entries.forEach((entry, index) => {
				const isLast = index === entries.length - 1
				const linePrefix = isLast ? "└── " : "├── "
				if (entry.isFile()) {
					folderContent += `${linePrefix}${entry.name}\n`
					const filePath = path.join(mentionPath, entry.name)
					const absoluteFilePath = path.resolve(absPath, entry.name)
					fileContentPromises.push(
						(async () => {
							try {
								const isBinary = await isBinaryFile(absoluteFilePath).catch(() => false)
								if (isBinary) {
									return undefined
								}
								const content = await extractTextFromFile(absoluteFilePath)
								return `<file_content path="${filePath.toPosix()}">\n${content}\n</file_content>`
							} catch (_error) {
								return undefined
							}
						})(),
					)
				} else if (entry.isDirectory()) {
					folderContent += `${linePrefix}${entry.name}/\n`
				} else {
					folderContent += `${linePrefix}${entry.name}\n`
				}
			})
			const fileContents = (await Promise.all(fileContentPromises)).filter((content) => content)
			return `${folderContent}\n${fileContents.join("\n\n")}`.trim()
		} else {
			return `(Failed to read contents of ${mentionPath})`
		}
	} catch (error) {
		throw new Error(`Failed to access path "${mentionPath}": ${error.message}`)
	}
}

/**
 * Handle workspace problems mention
 */
export async function handleProblemsMention(): Promise<string> {
	try {
		const problems = await getWorkspaceProblems()
		telemetryService.captureMentionUsed("problems", problems.length)
		return `<workspace_diagnostics>\n${problems}\n</workspace_diagnostics>`
	} catch (error) {
		telemetryService.captureMentionFailed("problems", "unknown", error.message)
		return `<workspace_diagnostics>\nError fetching diagnostics: ${error.message}\n</workspace_diagnostics>`
	}
}

async function getWorkspaceProblems(): Promise<string> {
	const response = await HostProvider.workspace.getDiagnostics({})
	if (response.fileDiagnostics.length === 0) {
		return "No errors or warnings detected."
	}
	return diagnosticsToProblemsString(response.fileDiagnostics, [
		DiagnosticSeverity.DIAGNOSTIC_ERROR,
		DiagnosticSeverity.DIAGNOSTIC_WARNING,
	])
}

/**
 * Handle terminal output mention
 */
export async function handleTerminalMention(): Promise<string> {
	try {
		const terminalOutput = await getLatestTerminalOutput()
		telemetryService.captureMentionUsed("terminal", terminalOutput.length)
		return `<terminal_output>\n${terminalOutput}\n</terminal_output>`
	} catch (error) {
		telemetryService.captureMentionFailed("terminal", "unknown", error.message)
		return `<terminal_output>\nError fetching terminal output: ${error.message}\n</terminal_output>`
	}
}

/**
 * Handle git working state changes mention
 */
export async function handleGitChangesMention(cwd: string): Promise<string> {
	try {
		const workingState = await getWorkingState(cwd)
		telemetryService.captureMentionUsed("git-changes", workingState.length)
		return `<git_working_state>\n${workingState}\n</git_working_state>`
	} catch (error) {
		telemetryService.captureMentionFailed("git-changes", "unknown", error.message)
		return `<git_working_state>\nError fetching working state: ${error.message}\n</git_working_state>`
	}
}

/**
 * Handle git commit mention
 */
export async function handleCommitMention(mention: string, cwd: string): Promise<string> {
	try {
		const commitInfo = await getCommitInfo(mention, cwd)
		telemetryService.captureMentionUsed("commit", commitInfo.length)
		return `<git_commit hash="${mention}">\n${commitInfo}\n</git_commit>`
	} catch (error) {
		telemetryService.captureMentionFailed("commit", "unknown", error.message)
		return `<git_commit hash="${mention}">\nError fetching commit info: ${error.message}\n</git_commit>`
	}
}
