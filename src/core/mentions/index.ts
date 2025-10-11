/**
 * Mentions Module - KonMari-Tidied Structure
 *
 * Clean, self-explanatory modules following MARIECODER methodology:
 * - mention_handlers.ts: Type-specific content fetching
 * - mention_parsers.ts: Core parsing logic
 * - mention_utils.ts: Utility functions
 *
 * Tidied from 301-line monolith → 4 focused modules
 */

// Re-export handlers for advanced usage
export {
	handleCommitMention,
	handleFileMention,
	handleGitChangesMention,
	handleProblemsMention,
	handleTerminalMention,
	handleUrlMention,
} from "./mention_handlers"
// Re-export main functions from organized modules
export { parseMentions, parseMentionsInTags } from "./mention_parsers"
// Re-export utilities for advanced usage
export { getFileMentionFromPath, getFilePathFromMention, isCommitHash, isFileMention, openMention } from "./mention_utils"
