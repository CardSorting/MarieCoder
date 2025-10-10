/**
 * Utility functions for handling markdown conversions and cleanup
 *
 * Migrated from unified/rehype/remark to turndown for HTML→Markdown conversion
 * turndown is much smaller (30KB vs 3MB+) and does exactly what we need
 */

import TurndownService from "turndown"

/**
 * Clean up markdown escape characters
 */
export function cleanupMarkdownEscapes(markdown: string): string {
	return (
		markdown
			// Handle underscores and asterisks (single or multiple)
			.replace(/\\([_*]+)/g, "$1")

			// Handle angle brackets (for generics and XML)
			.replace(/\\([<>])/g, "$1")

			// Handle backticks (for code)
			.replace(/\\(`)/g, "$1")

			// Handle other common markdown special characters
			.replace(/\\([[\]()#.!])/g, "$1")

			// Fix multiple consecutive backslashes
			.replace(/\\{2,}([_*`<>[\]()#.!])/g, "$1")
	)
}

/**
 * Convert HTML to Markdown using turndown
 * Replaces unified/rehype/remark with lighter alternative
 */
export function convertHtmlToMarkdown(html: string): string {
	const turndown = new TurndownService({
		headingStyle: "atx", // Use # for headings
		hr: "---", // Use --- for horizontal rules
		bulletListMarker: "-", // Use - for unordered lists
		codeBlockStyle: "fenced", // Use ``` for code blocks
		fence: "```", // Use ``` as fence
		emDelimiter: "*", // Use * for emphasis
		strongDelimiter: "**", // Use ** for strong
		linkStyle: "inlined", // Use [text](url) for links
	})

	const markdown = turndown.turndown(html)

	// Apply comprehensive cleanup of escape characters
	return cleanupMarkdownEscapes(markdown)
}
