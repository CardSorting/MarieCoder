/**
 * MarkdownBlock - Markdown renderer using marked.js
 * Migrated from react-remark to marked.js for better performance and smaller bundle
 */

import { StringRequest } from "@shared/proto/cline/common"
import { PlanActMode, TogglePlanActModeRequest } from "@shared/proto/cline/state"
import { memo, useEffect, useRef, useState } from "react"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import MermaidBlock from "@/components/common/MermaidBlock"
import { useSettingsState } from "@/context/SettingsContext"
import { FileServiceClient, StateServiceClient } from "@/services/grpc-client"
import { logError, logWarn } from "@/utils/debug_logger"
import { renderMarkdown } from "@/utils/markdown_renderer"
import { useWebWorker, WorkerTasks } from "@/utils/web_worker_manager"
import { getMarkdownWorkerScript } from "@/workers"

interface MarkdownBlockProps {
	markdown?: string
	compact?: boolean
}

const MarkdownBlock = memo(({ markdown, compact }: MarkdownBlockProps) => {
	const [htmlContent, setHtmlContent] = useState("")
	const [mermaidBlocks, setMermaidBlocks] = useState<Array<{ id: string; code: string }>>([])
	const containerRef = useRef<HTMLDivElement>(null)
	const { mode } = useSettingsState()

	// Initialize web worker for heavy markdown parsing with bundled dependencies
	const { executeTask } = useWebWorker({
		workerScript: getMarkdownWorkerScript(),
		debug: false,
	})

	// Render markdown to HTML with smart worker delegation
	useEffect(() => {
		if (!markdown) {
			setHtmlContent("")
			setMermaidBlocks([])
			return
		}

		const processMarkdown = async () => {
			try {
				let html: string

				// Use worker for large markdown (>5KB) to keep UI responsive
				if (markdown.length > 5000) {
					try {
						// Step 1: Parse markdown in worker (CPU-intensive)
						html = await executeTask(
							WorkerTasks.parseMarkdown(
								`markdown-${Date.now()}`,
								markdown,
								{ inline: false, processFilePaths: false },
								"high",
							),
						)

						// Step 2: Process file paths on main thread (requires gRPC)
						// This is lighter weight and needs access to FileServiceClient
						const filePathRegex = /<code data-potential-filepath="([^"]+)">([^<]+)<\/code>/g
						const matches = Array.from(html.matchAll(filePathRegex))

						if (matches.length > 0) {
							const checks = await Promise.all(
								matches.map(async (match) => {
									const filePath = match[1]
									try {
										const exists = await FileServiceClient.ifFileExistsRelativePath(
											StringRequest.create({ value: filePath }),
										)
										return { match: match[0], filePath, exists: exists.value }
									} catch {
										return { match: match[0], filePath, exists: false }
									}
								}),
							)

							// Replace file paths that exist with enhanced version
							for (const check of checks) {
								if (check.exists) {
									const enhanced = `<code data-is-file-path="true">${check.filePath}</code><button class="codicon codicon-link-external bg-transparent border-0 appearance-none p-0 ml-0.5 leading-none align-middle opacity-70 hover:opacity-100 transition-opacity text-[1em] relative top-[1px] text-[var(--vscode-textPreformat-foreground)] translate-y-[-2px]" onclick="window.postMessage({type:'openFileRelativePath',value:'${check.filePath}'},'*')" title="Open ${check.filePath} in editor" type="button"></button>`
									html = html.replace(check.match, enhanced)
								} else {
									html = html.replace(check.match, `<code>${check.filePath}</code>`)
								}
							}
						}
					} catch (workerError) {
						// Fallback to main thread if worker fails
						logWarn("[MarkdownBlock] Worker failed, falling back to main thread:", workerError)
						html = await renderMarkdown(markdown, {
							inline: false,
							processFilePaths: true,
						})
					}
				} else {
					// Small markdown stays on main thread (faster, no worker overhead)
					html = await renderMarkdown(markdown, {
						inline: false,
						processFilePaths: true,
					})
				}

				// Extract and replace mermaid blocks with placeholders
				const blocks: Array<{ id: string; code: string }> = []
				const mermaidRegex = /<code class="language-mermaid">([^<]+)<\/code>/g
				let processedHtml = html

				const matches = Array.from(html.matchAll(mermaidRegex))
				matches.forEach((m, index) => {
					const id = `mermaid-${Date.now()}-${index}`
					const code = m[1]
					blocks.push({ id, code })
					processedHtml = processedHtml.replace(m[0], `<div data-mermaid-placeholder="${id}"></div>`)
				})

				setMermaidBlocks(blocks)
				setHtmlContent(processedHtml)
			} catch (error) {
				logError("Failed to render markdown:", error)
				setHtmlContent(
					`<pre style="color: var(--vscode-errorForeground); padding: 8px;">Error rendering markdown: ${error instanceof Error ? error.message : String(error)}</pre>`,
				)
			}
		}

		processMarkdown()
	}, [markdown, executeTask])

	// Add event listeners for interactive elements
	useEffect(() => {
		if (!containerRef.current || !htmlContent) {
			return
		}

		const container = containerRef.current

		// Handle Act Mode clicks
		const actModeElements = container.querySelectorAll('[data-act-mode="true"]')
		const actModeHandlers: Array<{ element: Element; handler: () => void }> = []

		actModeElements.forEach((element) => {
			const handler = () => {
				if (mode === "plan") {
					StateServiceClient.togglePlanActModeProto(
						TogglePlanActModeRequest.create({
							mode: PlanActMode.ACT,
						}),
					)
				}
			}
			element.addEventListener("click", handler)
			actModeHandlers.push({ element, handler })
		})

		// Handle file path buttons
		const fileButtons = container.querySelectorAll("button[title*='Open']")
		const fileHandlers: Array<{ element: Element; handler: (e: Event) => void }> = []

		fileButtons.forEach((button) => {
			const title = button.getAttribute("title") || ""
			const pathMatch = title.match(/Open (.+) in editor/)
			if (!pathMatch) {
				return
			}

			const filePath = pathMatch[1]
			const handler = (e: Event) => {
				e.preventDefault()
				e.stopPropagation()
				FileServiceClient.openFileRelativePath(StringRequest.create({ value: filePath }))
			}
			button.addEventListener("click", handler)
			fileHandlers.push({ element: button, handler })
		})

		// Cleanup
		return () => {
			actModeHandlers.forEach(({ element, handler }) => {
				element.removeEventListener("click", handler)
			})
			fileHandlers.forEach(({ element, handler }) => {
				element.removeEventListener("click", handler as EventListener)
			})
		}
	}, [htmlContent, mode])

	// Handle collapsible code blocks
	useEffect(() => {
		if (!containerRef.current) {
			return
		}

		const codeBlocks = containerRef.current.querySelectorAll("pre")
		const toggleHandlers: Array<{ button: HTMLElement; handler: () => void }> = []

		for (const pre of codeBlocks) {
			// Skip if already processed
			if (pre.dataset.collapseProcessed === "true") {
				continue
			}

			const preHeight = pre.scrollHeight
			const maxHeight = 350 // pixels (reduced from 400 for better containment)

			// Only add collapse functionality if content exceeds maxHeight
			if (preHeight > maxHeight) {
				pre.dataset.collapseProcessed = "true"
				pre.classList.add("code-block-collapsed")

				// Calculate approximate line count
				const lineHeight = 20 // approximate line height
				const totalLines = Math.ceil(preHeight / lineHeight)
				const visibleLines = Math.ceil(maxHeight / lineHeight)
				const hiddenLines = totalLines - visibleLines

				// Get language from code block if available
				const codeElement = pre.querySelector("code")
				const languageClass = codeElement?.className?.match(/language-(\w+)/)
				const language = languageClass ? languageClass[1].toUpperCase() : null

				// Create toggle button
				const toggleBtn = document.createElement("div")
				toggleBtn.className = "code-block-toggle-btn"
				toggleBtn.setAttribute("role", "button")
				toggleBtn.setAttribute("aria-label", "Expand code block")
				toggleBtn.innerHTML = `
					<span class="codicon codicon-chevron-down"></span>
					<span>Expand code block</span>
					${language ? `<span class="code-block-info">${language}</span>` : ""}
					<span class="code-block-info">+${hiddenLines} lines</span>
				`

				const handler = () => {
					const isCollapsed = pre.classList.contains("code-block-collapsed")
					if (isCollapsed) {
						pre.classList.remove("code-block-collapsed")
						pre.classList.add("code-block-expanded")
						toggleBtn.setAttribute("aria-label", "Collapse code block")
						toggleBtn.innerHTML = `
							<span class="codicon codicon-chevron-up"></span>
							<span>Collapse code block</span>
							${language ? `<span class="code-block-info">${language}</span>` : ""}
							<span class="code-block-info">${totalLines} lines</span>
						`
						// Smooth scroll to keep context
						pre.scrollIntoView({ behavior: "smooth", block: "nearest" })
					} else {
						pre.classList.add("code-block-collapsed")
						pre.classList.remove("code-block-expanded")
						toggleBtn.setAttribute("aria-label", "Expand code block")
						toggleBtn.innerHTML = `
							<span class="codicon codicon-chevron-down"></span>
							<span>Expand code block</span>
							${language ? `<span class="code-block-info">${language}</span>` : ""}
							<span class="code-block-info">+${hiddenLines} lines</span>
						`
					}
				}

				toggleBtn.addEventListener("click", handler)
				toggleHandlers.push({ button: toggleBtn, handler })

				// Insert toggle button after the pre element
				pre.parentNode?.insertBefore(toggleBtn, pre.nextSibling)
			}
		}

		return () => {
			// Cleanup toggle buttons and event listeners
			for (const { button, handler } of toggleHandlers) {
				button.removeEventListener("click", handler)
				button.remove()
			}
		}
	}, [htmlContent])

	return (
		<div>
			<style>{`
				.markdown-block-styled {
					font-family: var(--vscode-font-family), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
					font-size: var(--vscode-font-size, 13px);
				}
				.markdown-block-styled pre {
					background-color: ${CODE_BLOCK_BG_COLOR};
					border: 1px solid var(--vscode-editorGroup-border);
					border-radius: 6px;
					margin: 13px 0;
					padding: 12px 14px;
					max-width: calc(100vw - 20px);
					overflow-x: auto;
					overflow-y: auto;
					padding-right: 70px;
					position: relative;
					box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
					transition: box-shadow 0.2s ease;
				}
				.markdown-block-styled pre:hover {
					box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
				}
				/* Custom scrollbar styling */
				.markdown-block-styled pre::-webkit-scrollbar {
					width: 10px;
					height: 10px;
				}
				.markdown-block-styled pre::-webkit-scrollbar-track {
					background: color-mix(in srgb, ${CODE_BLOCK_BG_COLOR} 70%, transparent);
					border-radius: 6px;
				}
				.markdown-block-styled pre::-webkit-scrollbar-thumb {
					background: var(--vscode-scrollbarSlider-background);
					border-radius: 6px;
					border: 2px solid transparent;
					background-clip: padding-box;
				}
				.markdown-block-styled pre::-webkit-scrollbar-thumb:hover {
					background: var(--vscode-scrollbarSlider-hoverBackground);
					border-radius: 6px;
					border: 2px solid transparent;
					background-clip: padding-box;
				}
				.markdown-block-styled pre::-webkit-scrollbar-thumb:active {
					background: var(--vscode-scrollbarSlider-activeBackground);
				}
				.markdown-block-styled pre::-webkit-scrollbar-corner {
					background: transparent;
				}
				.markdown-block-styled pre.code-block-collapsed {
					max-height: 350px;
					overflow-y: hidden;
					position: relative;
					padding-bottom: 8px;
				}
				.markdown-block-styled pre.code-block-collapsed::after {
					content: '';
					position: absolute;
					bottom: 0;
					left: 0;
					right: 0;
					height: 80px;
					background: linear-gradient(to bottom, 
						transparent 0%, 
						color-mix(in srgb, ${CODE_BLOCK_BG_COLOR} 60%, transparent) 30%,
						${CODE_BLOCK_BG_COLOR} 85%);
					pointer-events: none;
					border-radius: 0 0 6px 6px;
				}
				.markdown-block-styled pre.code-block-expanded {
					max-height: 600px;
					transition: max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
				}
				.code-block-container {
					position: relative;
					margin: 13px 0;
				}
				.code-block-toggle-btn {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 8px;
					padding: 8px 16px;
					margin-top: -8px;
					margin-bottom: 8px;
					cursor: pointer;
					user-select: none;
					background: linear-gradient(135deg, 
						color-mix(in srgb, var(--vscode-button-background, #0e639c) 8%, ${CODE_BLOCK_BG_COLOR}) 0%, 
						${CODE_BLOCK_BG_COLOR} 100%);
					border: 1px solid var(--vscode-editorGroup-border);
					border-top: none;
					border-radius: 0 0 6px 6px;
					font-size: 12px;
					color: var(--vscode-foreground);
					transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
					box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
					font-weight: 500;
				}
				.code-block-toggle-btn:hover {
					background: linear-gradient(135deg, 
						color-mix(in srgb, var(--vscode-button-background, #0e639c) 12%, ${CODE_BLOCK_BG_COLOR}) 0%, 
						color-mix(in srgb, var(--vscode-list-hoverBackground) 80%, ${CODE_BLOCK_BG_COLOR}) 100%);
					transform: translateY(-1px);
					box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
					border-color: var(--vscode-button-background);
				}
				.code-block-toggle-btn:active {
					transform: translateY(0);
					box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
				}
				.code-block-toggle-btn .codicon {
					transition: transform 0.2s;
				}
				.code-block-info {
					font-size: 11px;
					opacity: 0.7;
					font-weight: 400;
					margin-left: 4px;
				}
				.markdown-block-styled pre > code .hljs-deletion {
					background-color: var(--vscode-diffEditor-removedTextBackground);
					display: inline-block;
					width: 100%;
				}
				.markdown-block-styled pre > code .hljs-addition {
					background-color: var(--vscode-diffEditor-insertedTextBackground);
					display: inline-block;
					width: 100%;
				}
				.markdown-block-styled code {
					word-wrap: break-word;
					border-radius: 3px;
					background-color: ${CODE_BLOCK_BG_COLOR};
					font-size: var(--vscode-editor-font-size, var(--vscode-font-size, 12px));
					font-family: var(--vscode-editor-font-family);
				}
				.markdown-block-styled code span.line:empty {
					display: none;
				}
				.markdown-block-styled code:not(pre > code) {
					font-family: var(--vscode-editor-font-family, monospace);
					color: var(--vscode-textPreformat-foreground, #f78383);
					background-color: var(--vscode-textCodeBlock-background, #1e1e1e);
					padding: 2px 6px;
					border-radius: 4px;
					border: 1px solid color-mix(in srgb, var(--vscode-textSeparator-foreground, #424242) 50%, transparent);
					white-space: pre-line;
					word-break: break-word;
					overflow-wrap: anywhere;
					font-size: 0.95em;
					font-weight: 500;
					box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
					transition: all 0.15s ease;
				}
				.markdown-block-styled code:not(pre > code):hover {
					border-color: var(--vscode-textSeparator-foreground, #424242);
					box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
				}
				.markdown-block-styled p,
				.markdown-block-styled li,
				.markdown-block-styled ol,
				.markdown-block-styled ul {
					line-height: 1.25;
				}
				.markdown-block-styled ol,
				.markdown-block-styled ul {
					padding-left: 2.5em;
					margin-left: 0;
				}
				.markdown-block-styled p {
					white-space: pre-wrap;
					${compact ? "margin: 0;" : ""}
				}
				.markdown-block-styled a {
					text-decoration: none;
					color: var(--vscode-textLink-foreground);
				}
				.markdown-block-styled a:hover {
					text-decoration: underline;
				}
				.markdown-block-styled [data-act-mode="true"] {
					color: var(--vscode-textLink-foreground);
					cursor: pointer;
				}
				.markdown-block-styled [data-act-mode="true"]:hover {
					opacity: 0.9;
				}
				.markdown-block-styled .copy-button {
					opacity: 0.6;
					transition: opacity 0.2s;
				}
				.markdown-block-styled pre:hover .copy-button {
					opacity: 1;
				}
		`}</style>
			<div className="markdown-block-styled ph-no-capture" ref={containerRef}>
				<div dangerouslySetInnerHTML={{ __html: htmlContent }} />
				{/* Render mermaid blocks */}
				{mermaidBlocks.map((block) => (
					<div data-mermaid-id={block.id} key={block.id}>
						<MermaidBlock code={block.code} />
					</div>
				))}
			</div>
		</div>
	)
})

MarkdownBlock.displayName = "MarkdownBlock"

export default MarkdownBlock
