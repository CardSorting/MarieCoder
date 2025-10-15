/**
 * Comprehensive code block filtering for chat responses
 * Ensures code stays in the editor, not cluttering the chat
 */

/**
 * Removes code blocks from text to keep chat focused on conversation
 *
 * Filters out:
 * - Fenced code blocks (```language...```)
 * - Long inline code (>80 chars)
 * - JSON blocks
 * - XML/HTML blocks
 * - File paths that look like code
 * - Multi-line indented code
 *
 * Preserves:
 * - Short inline code (`variable`, `functionName()`)
 * - File paths and URLs
 * - Normal conversation text
 */
export function removeCodeBlocks(text: string): string {
	if (!text) return ""

	let cleaned = text

	// 1. Remove fenced code blocks (```language ... ```)
	cleaned = cleaned.replace(/```[\s\S]*?```/g, "✏️ [Code - view in editor]")

	// 2. Remove multi-line JSON blocks
	cleaned = cleaned.replace(/\{[\s\S]{200,}?\}/g, "📄 [JSON - view in editor]")

	// 3. Remove XML/HTML blocks (often file content)
	cleaned = cleaned.replace(/<[a-zA-Z][^>]*>[\s\S]{100,}?<\/[a-zA-Z][^>]*>/g, "📝 [Markup - view in editor]")

	// 4. Remove long inline code (likely file content, not variable names)
	cleaned = cleaned.replace(/`([^`\n]{80,})`/g, "💻 [Code snippet - view in editor]")

	// 5. Remove multi-line indented code blocks (common in thinking)
	// Match 3+ lines that start with 2+ spaces or tabs
	cleaned = cleaned.replace(/(?:^|\n)([ \t]{2,}.+\n){3,}/gm, "\n📋 [Code block - view in editor]\n")

	// 6. Remove inline code that contains file paths or long expressions
	cleaned = cleaned.replace(/`[^`]*\/[^`]{30,}`/g, "📂 [File content - view in editor]")

	// 7. Collapse multiple consecutive replacement markers
	cleaned = cleaned.replace(/(✏️|📄|📝|💻|📋|📂) \[.*?\]\s*(\1 \[.*?\]\s*)+/g, "$1 [Multiple code blocks - view in editor]")

	// 8. Clean up excessive whitespace from removals
	cleaned = cleaned.replace(/\n{3,}/g, "\n\n")

	return cleaned.trim()
}

/**
 * Checks if text contains significant code content
 * Used to decide whether to show thinking blocks
 */
export function hasSignificantCodeContent(text: string): boolean {
	if (!text) return false

	// Check for fenced code blocks
	if (/```[\s\S]{50,}?```/.test(text)) return true

	// Check for long inline code
	if (/`[^`\n]{100,}`/.test(text)) return true

	// Check for JSON blocks
	if (/\{[\s\S]{200,}?\}/.test(text)) return true

	// Check for multi-line indented code
	if (/(?:^|\n)([ \t]{2,}.+\n){5,}/.test(text)) return true

	return false
}

/**
 * Aggressive filter for responses - removes ALL code-like content
 * Use this when you want to ensure chat is completely code-free
 */
export function aggressiveCodeFilter(text: string): string {
	if (!text) return ""

	let cleaned = removeCodeBlocks(text)

	// Also remove:
	// - Any line with common programming keywords followed by code-like syntax
	cleaned = cleaned.replace(
		/^.*\b(function|const|let|var|class|interface|type|import|export)\s+\w+[\s\S]{20,}$/gm,
		"💡 [Code explanation - view in editor]",
	)

	// - Lines that look like file diffs
	cleaned = cleaned.replace(/^[+-]\s+.+$/gm, "")

	// - Stack traces
	cleaned = cleaned.replace(/^\s*at\s+.+\(.+:\d+:\d+\)$/gm, "")

	// Clean up
	cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim()

	return cleaned
}

/**
 * Creates a summary when code blocks are removed
 * Provides context about what was filtered out
 */
export function createCodeSummary(originalText: string, filteredText: string): string {
	const originalLength = originalText.length
	const filteredLength = filteredText.length
	const removed = originalLength - filteredLength

	if (removed < 100) {
		return filteredText
	}

	const codeBlockCount = (originalText.match(/```/g) || []).length / 2

	let summary = filteredText

	if (codeBlockCount > 0) {
		summary += `\n\n💡 _${Math.floor(codeBlockCount)} code block${codeBlockCount > 1 ? "s" : ""} filtered (${removed} chars) - view in editor_`
	}

	return summary
}
