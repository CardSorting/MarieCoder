/**
 * Markdown rendering utility using marked.js
 * Replaces react-remark ecosystem (3MB) with marked.js (31KB)
 *
 * Migrates all custom plugins:
 * 1. URL auto-linking
 * 2. Act Mode highlighting
 * 3. Filename pattern preservation
 * 4. File path detection (with async support)
 */

import { StringRequest } from "@shared/proto/cline/common"
import DOMPurify from "dompurify"
import { marked } from "marked"
import { FileServiceClient } from "@/services/grpc-client"

// Configure marked for VS Code theme
marked.setOptions({
	breaks: true, // GitHub-style line breaks
	gfm: true, // GitHub Flavored Markdown
})

/**
 * Custom extension: Auto-link plain URLs
 * Replaces: remarkUrlToLink
 */
const autoLinkExtension = {
	name: "autolink",
	level: "inline" as const,
	start(src: string) {
		const match = src.match(/https?:\/\//)
		return match ? match.index : undefined
	},
	tokenizer(src: string, _tokens: any) {
		// Match URLs that aren't already in markdown links
		const rule = /^https?:\/\/[^\s<>)"]+/
		const match = src.match(rule)
		if (match) {
			return {
				type: "autolink",
				raw: match[0],
				text: match[0],
				href: match[0],
			}
		}
		return undefined
	},
	renderer(token: any) {
		return `<a href="${token.href}" target="_blank" rel="noopener noreferrer">${token.text}</a>`
	},
}

/**
 * Post-process HTML to handle Act Mode highlighting
 * Replaces: remarkHighlightActMode
 *
 * Finds "to Act Mode" text and makes it bold with keyboard shortcut
 */
function highlightActMode(html: string): string {
	// Match "to Act Mode" but not if already followed by shortcut
	const actModeRegex = /\bto\s+(Act\s+Mode)\b(?!\s*\(⌘⇧A\))/gi

	return html.replace(actModeRegex, (_match, actModePart) => {
		return `to <strong data-act-mode="true">${actModePart} (⌘⇧A)</strong>`
	})
}

/**
 * Helper to escape HTML
 */
function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	}
	return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Custom renderer options to prevent filename patterns from becoming bold
 * Replaces: remarkPreventBoldFilenames
 *
 * Handles patterns like __init__.py which should stay as-is
 */
const customRenderer = {
	strong({ text }: any): string {
		// Check if this looks like a filename pattern (__name__)
		const filenamePattern = /^([a-zA-Z0-9_-]+)$/

		if (filenamePattern.test(text)) {
			return `__${text}__`
		}

		return `<strong>${text}</strong>`
	},

	// Override code rendering to handle special cases
	code({ text, lang }: any): string {
		// Handle mermaid diagrams
		if (lang === "mermaid") {
			return `<code class="language-mermaid">${escapeHtml(text)}</code>`
		}

		// Default code block with language class
		const langClass = lang ? ` class="language-${lang}"` : ""
		return `<pre><code${langClass}>${escapeHtml(text)}</code></pre>`
	},

	// Override inline code to preserve file paths
	codespan({ text }: any): string {
		// Mark code that might be file paths for later processing
		const looksLikeFilePath = /^(?!\/)[\w\-./]+(?<!\/)$/.test(text) && !text.includes("\n")

		if (looksLikeFilePath) {
			return `<code data-potential-filepath="${escapeHtml(text)}">${escapeHtml(text)}</code>`
		}

		return `<code>${escapeHtml(text)}</code>`
	},
}

/**
 * Post-process HTML to check file paths and add open buttons
 * Replaces: remarkFilePathDetection
 *
 * This is async because it needs to check if files exist
 */
async function processFilePaths(html: string): Promise<string> {
	const filePathRegex = /<code data-potential-filepath="([^"]+)">([^<]+)<\/code>/g
	const matches = Array.from(html.matchAll(filePathRegex))

	if (matches.length === 0) {
		return html
	}

	// Check each potential file path
	const checks = await Promise.all(
		matches.map(async (match) => {
			const filePath = match[1]
			try {
				const exists = await FileServiceClient.ifFileExistsRelativePath(StringRequest.create({ value: filePath }))
				return { match: match[0], filePath, exists: exists.value }
			} catch {
				return { match: match[0], filePath, exists: false }
			}
		}),
	)

	// Replace file paths that exist with enhanced version
	let result = html
	for (const check of checks) {
		if (check.exists) {
			const enhanced = `<code data-is-file-path="true">${check.filePath}</code><button class="codicon codicon-link-external bg-transparent border-0 appearance-none p-0 ml-0.5 leading-none align-middle opacity-70 hover:opacity-100 transition-opacity text-[1em] relative top-[1px] text-[var(--vscode-textPreformat-foreground)] translate-y-[-2px]" onclick="window.postMessage({type:'openFileRelativePath',value:'${check.filePath}'},'*')" title="Open ${check.filePath} in editor" type="button"></button>`
			result = result.replace(check.match, enhanced)
		} else {
			// Remove the data attribute if not a file
			result = result.replace(check.match, `<code>${check.filePath}</code>`)
		}
	}

	return result
}

/**
 * Render markdown to HTML with all custom processing
 *
 * @param markdown - Markdown source text
 * @param options - Rendering options
 * @returns Sanitized HTML string
 */
export async function renderMarkdown(
	markdown: string,
	options?: {
		inline?: boolean
		processFilePaths?: boolean
	},
): Promise<string> {
	if (!markdown) {
		return ""
	}

	// Use custom renderer
	marked.use({
		renderer: customRenderer as any,
		extensions: [autoLinkExtension as any],
	})

	// Render markdown to HTML
	let html: string = options?.inline ? (marked.parseInline(markdown) as string) : (marked.parse(markdown) as string)

	// Apply custom post-processing
	html = highlightActMode(html)

	// Process file paths if requested (async operation)
	if (options?.processFilePaths !== false) {
		html = await processFilePaths(html)
	}

	// Sanitize HTML to prevent XSS
	html = DOMPurify.sanitize(html, {
		ADD_ATTR: ["data-act-mode", "data-is-file-path", "data-potential-filepath"],
		ADD_TAGS: ["button"],
	})

	return html
}

/**
 * Synchronous version for cases where file path processing isn't needed
 */
export function renderMarkdownSync(markdown: string, options?: { inline?: boolean }): string {
	if (!markdown) {
		return ""
	}

	marked.use({
		renderer: customRenderer as any,
		extensions: [autoLinkExtension as any],
	})

	let html: string = options?.inline ? (marked.parseInline(markdown) as string) : (marked.parse(markdown) as string)

	html = highlightActMode(html)

	// Don't process file paths in sync version
	// Remove potential-filepath markers
	html = html.replace(/data-potential-filepath="[^"]+"/g, "")

	html = DOMPurify.sanitize(html, {
		ADD_ATTR: ["data-act-mode"],
	})

	return html
}
