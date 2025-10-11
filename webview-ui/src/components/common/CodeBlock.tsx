import { memo, useEffect, useState } from "react"
import { renderMarkdownSync } from "@/utils/markdown_renderer"
import "./codeblock-parser.css"

export const CODE_BLOCK_BG_COLOR = "var(--vscode-editor-background, --vscode-sideBar-background, rgb(30 30 30))"

/*
overflowX: auto + inner div with padding results in an issue where the top/left/bottom padding renders but the right padding inside does not count as overflow as the width of the element is not exceeded. Once the inner div is outside the boundaries of the parent it counts as overflow.
https://stackoverflow.com/questions/60778406/why-is-padding-right-clipped-with-overflowscroll/77292459#77292459
this fixes the issue of right padding clipped off 
“ideal” size in a given axis when given infinite available space--allows the syntax highlighter to grow to largest possible width including its padding
minWidth: "max-content",
*/

interface CodeBlockProps {
	source?: string
	forceWrap?: boolean
}

const CodeBlock = memo(({ source, forceWrap = false }: CodeBlockProps) => {
	const [htmlContent, setHtmlContent] = useState("")

	useEffect(() => {
		// Wrap source in code fence with language detection
		const processedSource = source || ""
		// If source doesn't start with ```, wrap it
		const markdown = processedSource.startsWith("```") ? processedSource : `\`\`\`javascript\n${processedSource}\n\`\`\``

		const html = renderMarkdownSync(markdown, { inline: false })
		setHtmlContent(html)
	}, [source])

	return (
		<div
			style={{
				overflowY: forceWrap ? "visible" : "auto",
				maxHeight: forceWrap ? "none" : "100%",
				backgroundColor: CODE_BLOCK_BG_COLOR,
			}}>
			<style>{`
				.codeblock-markdown {
					background-color: ${CODE_BLOCK_BG_COLOR};
					font-family: var(--vscode-font-family), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
					font-size: var(--vscode-editor-font-size, var(--vscode-font-size, 12px));
					color: var(--vscode-editor-foreground, #fff);
				}
				.codeblock-markdown.force-wrap pre,
				.codeblock-markdown.force-wrap code {
					white-space: pre-wrap;
					word-break: break-all;
					overflow-wrap: anywhere;
				}
				.codeblock-markdown pre {
					background-color: ${CODE_BLOCK_BG_COLOR};
					border-radius: 5px;
					margin: 0;
					min-width: ${forceWrap ? "auto" : "max-content"};
					padding: 10px 10px;
				}
				.codeblock-markdown pre > code .hljs-deletion {
					background-color: var(--vscode-diffEditor-removedTextBackground);
					display: inline-block;
					width: 100%;
				}
				.codeblock-markdown pre > code .hljs-addition {
					background-color: var(--vscode-diffEditor-insertedTextBackground);
					display: inline-block;
					width: 100%;
				}
				.codeblock-markdown code {
					word-wrap: break-word;
					border-radius: 5px;
					background-color: ${CODE_BLOCK_BG_COLOR};
					font-size: var(--vscode-editor-font-size, var(--vscode-font-size, 12px));
					font-family: var(--vscode-editor-font-family);
				}
				.codeblock-markdown code span.line:empty {
					display: none;
				}
				.codeblock-markdown code:not(pre > code) {
					font-family: var(--vscode-editor-font-family);
					color: #f78383;
				}
				.codeblock-markdown p,
				.codeblock-markdown li,
				.codeblock-markdown ol,
				.codeblock-markdown ul {
					line-height: 1.5;
				}
		`}</style>
			<div
				className={`codeblock-markdown ph-no-capture ${forceWrap ? "force-wrap" : ""}`}
				dangerouslySetInnerHTML={{ __html: htmlContent }}
			/>
		</div>
	)
})

export default CodeBlock
