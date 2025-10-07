/**
 * Mention Parsers - Core parsing logic for mentions
 *
 * Handles:
 * - Parsing mention syntax from text
 * - Replacing mentions with placeholders
 * - Fetching content for each mention type
 * - Building final parsed text with content
 */

import { UrlContentFetcher } from "@services/browser/UrlContentFetcher"
import { mentionRegexGlobal } from "@shared/context-mentions"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"
import { FileContextTracker } from "../context/context-tracking/FileContextTracker"
import {
	handleCommitMention,
	handleFileMention,
	handleGitChangesMention,
	handleProblemsMention,
	handleTerminalMention,
	handleUrlMention,
} from "./mention_handlers"
import { getFilePathFromMention, isCommitHash, isFileMention } from "./mention_utils"

/**
 * Parse mentions from text and replace with content
 */
export async function parseMentions(
	text: string,
	cwd: string,
	urlContentFetcher: UrlContentFetcher,
	fileContextTracker?: FileContextTracker,
): Promise<string> {
	const mentions: Set<string> = new Set()

	// Replace mentions with placeholders and collect unique mentions
	let parsedText = text.replace(mentionRegexGlobal, (_match, mention) => {
		mentions.add(mention)
		return getMentionPlaceholder(mention)
	})

	// Handle URL browser launch if needed
	const urlMention = Array.from(mentions).find((mention) => mention.startsWith("http"))
	let launchBrowserError: Error | undefined
	if (urlMention) {
		try {
			await urlContentFetcher.launchBrowser()
		} catch (error) {
			launchBrowserError = error
			HostProvider.window.showMessage({
				type: ShowMessageType.ERROR,
				message: `Error fetching content for ${urlMention}: ${error.message}`,
			})
		}
	}

	// Process each unique mention
	const uniqueMentions = Array.from(new Set(mentions))
	for (const mention of uniqueMentions) {
		// Safety guard: skip bare "/" mention to prevent workspace root expansion
		if (mention === "/") {
			continue
		}

		const content = await processMention(mention, cwd, urlContentFetcher, fileContextTracker, launchBrowserError)
		if (content) {
			parsedText += `\n\n${content}`
		}
	}

	// Cleanup browser if used
	if (urlMention) {
		try {
			await urlContentFetcher.closeBrowser()
		} catch (error) {
			console.error(`Error closing browser: ${error.message}`)
		}
	}

	return parsedText
}

/**
 * Get placeholder text for a mention
 */
function getMentionPlaceholder(mention: string): string {
	if (mention.startsWith("http")) {
		return `'${mention}' (see below for site content)`
	} else if (isFileMention(mention)) {
		const mentionPath = getFilePathFromMention(mention)
		return mentionPath.endsWith("/")
			? `'${mentionPath}' (see below for folder content)`
			: `'${mentionPath}' (see below for file content)`
	} else if (mention === "problems") {
		return `Workspace Problems (see below for diagnostics)`
	} else if (mention === "terminal") {
		return `Terminal Output (see below for output)`
	} else if (mention === "git-changes") {
		return `Working directory changes (see below for details)`
	} else if (isCommitHash(mention)) {
		return `Git commit '${mention}' (see below for commit info)`
	}
	return mention
}

/**
 * Process a single mention and return its content
 */
async function processMention(
	mention: string,
	cwd: string,
	urlContentFetcher: UrlContentFetcher,
	fileContextTracker: FileContextTracker | undefined,
	launchBrowserError: Error | undefined,
): Promise<string | undefined> {
	if (mention.startsWith("http")) {
		return await handleUrlMention(mention, urlContentFetcher, launchBrowserError)
	} else if (isFileMention(mention)) {
		const mentionPath = getFilePathFromMention(mention)
		const isFolder = mention.endsWith("/")
		return await handleFileMention(mentionPath, cwd, isFolder, fileContextTracker)
	} else if (mention === "problems") {
		return await handleProblemsMention()
	} else if (mention === "terminal") {
		return await handleTerminalMention()
	} else if (mention === "git-changes") {
		return await handleGitChangesMention(cwd)
	} else if (isCommitHash(mention)) {
		return await handleCommitMention(mention, cwd)
	}
	return undefined
}
