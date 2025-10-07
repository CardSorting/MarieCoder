/**
 * Mention Utilities - Helper functions for mention handling
 *
 * Provides utility functions for:
 * - Opening mentions (files, URLs, panels)
 * - Path manipulation
 * - Mention type detection
 */

import { openFile } from "@integrations/misc/open-file"
import { openExternal } from "@utils/env"
import * as path from "path"
import { HostProvider } from "@/hosts/host-provider"
import { isDirectory } from "@/utils/fs"
import { getCwd } from "@/utils/path"

/**
 * Open a mention in the appropriate viewer
 */
export async function openMention(mention?: string): Promise<void> {
	if (!mention) {
		return
	}

	const cwd = await getCwd()
	if (!cwd) {
		return
	}

	if (isFileMention(mention)) {
		const relPath = getFilePathFromMention(mention)
		const absPath = path.resolve(cwd, relPath)
		if (await isDirectory(absPath)) {
			await HostProvider.workspace.openInFileExplorerPanel({ path: absPath })
		} else {
			openFile(absPath)
		}
	} else if (mention === "problems") {
		await HostProvider.workspace.openProblemsPanel({})
	} else if (mention === "terminal") {
		await HostProvider.workspace.openTerminalPanel({})
	} else if (mention.startsWith("http")) {
		await openExternal(mention)
	}
}

/**
 * Get file mention from absolute path
 */
export async function getFileMentionFromPath(filePath: string): Promise<string> {
	const cwd = await getCwd()
	if (!cwd) {
		return "@/" + filePath
	}
	const relativePath = path.relative(cwd, filePath)
	return "@/" + relativePath
}

/**
 * Check if mention is a file/folder mention
 */
export function isFileMention(mention: string): boolean {
	return mention.startsWith("/") || mention.startsWith('"/')
}

/**
 * Extract file path from mention
 */
export function getFilePathFromMention(mention: string): string {
	// Remove quotes
	const match = mention.match(/^"(.*)"$/)
	const filePath = match ? match[1] : mention
	// Remove leading slash
	return filePath.slice(1)
}

/**
 * Check if mention is a git commit hash
 */
export function isCommitHash(mention: string): boolean {
	return /^[a-f0-9]{7,40}$/.test(mention)
}
