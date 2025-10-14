/**
 * Markdown Worker - Bundled Version
 * Handles heavy markdown parsing off the main thread
 *
 * Improvements over previous version:
 * - Uses bundled dependencies (no CDN, faster initialization)
 * - Ready for immediate use (warm start)
 * - Better error handling and performance tracking
 */

import DOMPurify from "dompurify"
import Fuse from "fuse.js"
import { marked } from "marked"

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
 * Custom renderer to prevent filename patterns from becoming bold
 */
const customRenderer: Partial<marked.RendererObject> = {
	strong({ text }: { text: string }) {
		// Check if this looks like a filename pattern (__name__)
		const filenamePattern = /^([a-zA-Z0-9_-]+)$/
		if (filenamePattern.test(text)) {
			return `__${text}__`
		}
		return `<strong>${text}</strong>`
	},

	// Override code rendering
	code({ text, lang }: { text: string; lang?: string }) {
		// Handle mermaid diagrams
		if (lang === "mermaid") {
			return `<code class="language-mermaid">${escapeHtml(text)}</code>`
		}

		// Default code block with language class
		const langClass = lang ? ` class="language-${lang}"` : ""
		return `<pre><code${langClass}>${escapeHtml(text)}</code></pre>`
	},

	// Override inline code
	codespan({ text }: { text: string }) {
		// Mark code that might be file paths
		const looksLikeFilePath = /^(?!\/)[\w\-./]+(?<!\/)$/.test(text) && !text.includes("\n")

		if (looksLikeFilePath) {
			return `<code data-potential-filepath="${escapeHtml(text)}">${escapeHtml(text)}</code>`
		}

		return `<code>${escapeHtml(text)}</code>`
	},
}

/**
 * Auto-link extension
 */
const autoLinkExtension: marked.TokenizerExtension & marked.RendererExtension = {
	name: "autolink",
	level: "inline" as const,
	start(src: string) {
		const match = src.match(/https?:\/\//)
		return match ? match.index : undefined
	},
	tokenizer(src: string) {
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
 */
function highlightActMode(html: string): string {
	const actModeRegex = /\bto\s+(Act\s+Mode)\b(?!\s*\(⌘⇧A\))/gi
	return html.replace(actModeRegex, (_match, actModePart) => {
		return `to <strong data-act-mode="true">${actModePart} (⌘⇧A)</strong>`
	})
}

/**
 * Initialize marked with configuration
 * Done once at startup for better performance
 */
marked.setOptions({
	breaks: true,
	gfm: true,
})

marked.use({
	renderer: customRenderer,
	extensions: [autoLinkExtension],
})

/**
 * Worker task interface
 */
interface WorkerTask {
	id: string
	type: string
	data: any
}

/**
 * Worker result interface
 */
interface WorkerResult {
	id: string
	type: string
	result?: any
	error?: string
	executionTime: number
}

/**
 * Worker message handler
 */
self.addEventListener("message", (event: MessageEvent<WorkerTask>) => {
	const { id, type, data } = event.data
	const startTime = performance.now()

	try {
		let result: any

		switch (type) {
			case "parse-markdown": {
				const { markdown, options = {} } = data

				// Parse markdown (marked is already configured)
				let html = options.inline ? marked.parseInline(markdown) : marked.parse(markdown)

				// Apply custom post-processing
				html = highlightActMode(html)

				// Note: File path processing is NOT done in worker
				// It requires gRPC calls which aren't available here
				// Remove potential-filepath markers for now
				if (!options.processFilePaths) {
					html = html.replace(/data-potential-filepath="[^"]+"/g, "")
				}

				// Sanitize HTML to prevent XSS
				html = DOMPurify.sanitize(html, {
					ADD_ATTR: ["data-act-mode", "data-potential-filepath"],
					ADD_TAGS: ["button"],
				})

				result = html
				break
			}

			case "process-messages": {
				// Message processing would go here
				// For now, just return the messages
				const { messages } = data
				result = messages
				break
			}

			case "fuzzy-search": {
				// Fuzzy search using Fuse.js
				const { query, items, keys, options = {} } = data

				// Create Fuse instance with provided options
				const fuse = new Fuse(items, {
					keys: keys || ["task"],
					threshold: options.threshold || 0.6,
					shouldSort: true,
					isCaseSensitive: false,
					ignoreLocation: false,
					includeMatches: true,
					minMatchCharLength: 1,
					...options,
				})

				// Perform search
				const searchResults = fuse.search(query)

				// Return results with highlighting information
				result = searchResults
				break
			}

			case "warmup": {
				// Warmup task - just acknowledge
				result = { ready: true, timestamp: Date.now() }
				break
			}

			default:
				throw new Error(`Unknown task type: ${type}`)
		}

		const executionTime = performance.now() - startTime

		const response: WorkerResult = {
			id,
			type,
			result,
			executionTime,
		}

		self.postMessage(response)
	} catch (error) {
		const executionTime = performance.now() - startTime
		const errorMessage = error instanceof Error ? error.message : String(error)

		const response: WorkerResult = {
			id,
			type,
			error: errorMessage,
			executionTime,
		}

		self.postMessage(response)
	}
})

// Signal worker is ready (warm start indicator)
self.postMessage({
	id: "init",
	type: "worker-ready",
	result: { ready: true, timestamp: Date.now() },
	executionTime: 0,
})
