/**
 * MarkdownBlock - Markdown renderer using marked.js
 * Migrated from react-remark to marked.js for better performance and smaller bundle
 */

import { StringRequest } from "@shared/proto/cline/common"
import { PlanActMode, TogglePlanActModeRequest } from "@shared/proto/cline/state"
import { memo, useEffect, useRef, useState } from "react"
import styled from "styled-components"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import MermaidBlock from "@/components/common/MermaidBlock"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { FileServiceClient, StateServiceClient } from "@/services/grpc-client"
import { renderMarkdown } from "@/utils/markdown_renderer"

interface MarkdownBlockProps {
	markdown?: string
	compact?: boolean
}

const StyledMarkdown = styled.div<{ compact?: boolean }>`
	pre {
		background-color: ${CODE_BLOCK_BG_COLOR};
		border-radius: 3px;
		margin: 13px 0;
		padding: 10px 10px;
		max-width: calc(100vw - 20px);
		overflow-x: auto;
		overflow-y: hidden;
		padding-right: 70px;
		position: relative;
	}

	pre > code {
		.hljs-deletion {
			background-color: var(--vscode-diffEditor-removedTextBackground);
			display: inline-block;
			width: 100%;
		}
		.hljs-addition {
			background-color: var(--vscode-diffEditor-insertedTextBackground);
			display: inline-block;
			width: 100%;
		}
	}

	code {
		span.line:empty {
			display: none;
		}
		word-wrap: break-word;
		border-radius: 3px;
		background-color: ${CODE_BLOCK_BG_COLOR};
		font-size: var(--vscode-editor-font-size, var(--vscode-font-size, 12px));
		font-family: var(--vscode-editor-font-family);
	}

	code:not(pre > code) {
		font-family: var(--vscode-editor-font-family, monospace);
		color: var(--vscode-textPreformat-foreground, #f78383);
		background-color: var(--vscode-textCodeBlock-background, #1e1e1e);
		padding: 0px 2px;
		border-radius: 3px;
		border: 1px solid var(--vscode-textSeparator-foreground, #424242);
		white-space: pre-line;
		word-break: break-word;
		overflow-wrap: anywhere;
	}

	font-family:
		var(--vscode-font-family),
		system-ui,
		-apple-system,
		BlinkMacSystemFont,
		"Segoe UI",
		Roboto,
		Oxygen,
		Ubuntu,
		Cantarell,
		"Open Sans",
		"Helvetica Neue",
		sans-serif;
	font-size: var(--vscode-font-size, 13px);

	p,
	li,
	ol,
	ul {
		line-height: 1.25;
	}

	ol,
	ul {
		padding-left: 2.5em;
		margin-left: 0;
	}

	p {
		white-space: pre-wrap;
		${(props) => props.compact && "margin: 0;"}
	}

	a {
		text-decoration: none;
		color: var(--vscode-textLink-foreground);
	}
	a:hover {
		text-decoration: underline;
	}

	[data-act-mode="true"] {
		color: var(--vscode-textLink-foreground);
		cursor: pointer;
	}

	[data-act-mode="true"]:hover {
		opacity: 0.9;
	}

	.copy-button {
		opacity: 0.6;
		transition: opacity 0.2s;
	}

	pre:hover .copy-button {
		opacity: 1;
	}
`

const MarkdownBlock = memo(({ markdown, compact }: MarkdownBlockProps) => {
	const [htmlContent, setHtmlContent] = useState("")
	const [mermaidBlocks, setMermaidBlocks] = useState<Array<{ id: string; code: string }>>([])
	const containerRef = useRef<HTMLDivElement>(null)
	const { mode } = useExtensionState()

	// Render markdown to HTML
	useEffect(() => {
		if (!markdown) {
			setHtmlContent("")
			setMermaidBlocks([])
			return
		}

		renderMarkdown(markdown, {
			inline: false,
			processFilePaths: true,
		})
			.then((html) => {
				// Extract and replace mermaid blocks with placeholders
				const blocks: Array<{ id: string; code: string }> = []
				const mermaidRegex = /<code class="language-mermaid">([^<]+)<\/code>/g
				let processedHtml = html

				// Extract all mermaid blocks
				const matches = Array.from(html.matchAll(mermaidRegex))
				matches.forEach((m, index) => {
					const id = `mermaid-${Date.now()}-${index}`
					const code = m[1]
					blocks.push({ id, code })
					processedHtml = processedHtml.replace(m[0], `<div data-mermaid-placeholder="${id}"></div>`)
				})

				setMermaidBlocks(blocks)
				setHtmlContent(processedHtml)
			})
			.catch((error) => {
				console.error("Failed to render markdown:", error)
				setHtmlContent(
					`<pre style="color: var(--vscode-errorForeground); padding: 8px;">Error rendering markdown: ${error.message}</pre>`,
				)
			})
	}, [markdown])

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

	return (
		<div>
			<StyledMarkdown className="ph-no-capture" compact={compact} ref={containerRef}>
				<div dangerouslySetInnerHTML={{ __html: htmlContent }} />
				{/* Render mermaid blocks */}
				{mermaidBlocks.map((block) => (
					<div data-mermaid-id={block.id} key={block.id}>
						<MermaidBlock code={block.code} />
					</div>
				))}
			</StyledMarkdown>
		</div>
	)
})

MarkdownBlock.displayName = "MarkdownBlock"

export default MarkdownBlock
