/**
 * Utilities for extracting code blocks from text
 */

export interface CodeBlock {
	id: string
	language: string
	code: string
	context?: string
}

/**
 * Extracts fenced code blocks from text
 * Returns array of code blocks and text with markers replaced
 */
export function extractCodeBlocks(
	text: string,
	messageId: string,
): {
	codeBlocks: CodeBlock[]
	textWithMarkers: string
} {
	if (!text) return { codeBlocks: [], textWithMarkers: text }

	const codeBlocks: CodeBlock[] = []
	let textWithMarkers = text
	let blockIndex = 0

	// Match fenced code blocks with language identifier
	const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g

	textWithMarkers = textWithMarkers.replace(codeBlockRegex, (match, language, code) => {
		const blockId = `${messageId}-block-${blockIndex}`
		blockIndex++

		codeBlocks.push({
			id: blockId,
			language: language || "text",
			code: code.trim(),
		})

		// Replace with a marker that indicates a code block was here
		return `[📦 Code Block #${blockIndex}]`
	})

	return { codeBlocks, textWithMarkers }
}

/**
 * Removes code block markers from text
 */
export function removeCodeBlockMarkers(text: string): string {
	return text.replace(/\[📦 Code Block #\d+\]/g, "")
}
