import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { memo, useEffect, useRef, useState } from "react"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import { renderMarkdownSync } from "@/utils/markdown_renderer"

export const ModelDescriptionMarkdown = memo(
	({
		markdown,
		key,
		isExpanded,
		setIsExpanded,
		isPopup,
	}: {
		markdown?: string
		key: string
		isExpanded: boolean
		setIsExpanded: (isExpanded: boolean) => void
		isPopup?: boolean
	}) => {
		const [htmlContent, setHtmlContent] = useState("")
		const [showSeeMore, setShowSeeMore] = useState(false)
		const textContainerRef = useRef<HTMLDivElement>(null)
		const textRef = useRef<HTMLDivElement>(null)

		useEffect(() => {
			const html = renderMarkdownSync(markdown || "", { inline: false })
			setHtmlContent(html)
		}, [markdown])

		useEffect(() => {
			if (textRef.current && textContainerRef.current) {
				const { scrollHeight } = textRef.current
				const { clientHeight } = textContainerRef.current
				const isOverflowing = scrollHeight > clientHeight
				setShowSeeMore(isOverflowing)
			}
		}, [htmlContent, setIsExpanded])

		return (
			<div key={key} style={{ display: "inline-block", marginBottom: 0 }}>
				<style>{`
					.model-description-markdown {
						font-family: var(--vscode-font-family), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
						font-size: 12px;
						color: var(--vscode-descriptionForeground);
					}
					.model-description-markdown p,
					.model-description-markdown li,
					.model-description-markdown ol,
					.model-description-markdown ul {
						line-height: 1.25;
						margin: 0;
					}
					.model-description-markdown ol,
					.model-description-markdown ul {
						padding-left: 1.5em;
						margin-left: 0;
					}
					.model-description-markdown p {
						white-space: pre-wrap;
					}
					.model-description-markdown a {
						text-decoration: none;
					}
					.model-description-markdown a:hover {
						text-decoration: underline;
					}
				`}</style>
				<div
					className="model-description-markdown"
					ref={textContainerRef}
					style={{
						overflowY: isExpanded ? "auto" : "hidden",
						position: "relative",
						wordBreak: "break-word",
						overflowWrap: "anywhere",
					}}>
					<div
						dangerouslySetInnerHTML={{ __html: htmlContent }}
						ref={textRef}
						style={{
							display: "-webkit-box",
							WebkitLineClamp: isExpanded ? "unset" : 3,
							WebkitBoxOrient: "vertical",
							overflow: "hidden",
						}}
					/>
					{!isExpanded && showSeeMore && (
						<div
							style={{
								position: "absolute",
								right: 0,
								bottom: 0,
								display: "flex",
								alignItems: "center",
							}}>
							<div
								style={{
									width: 30,
									height: "1.2em",
									background: "linear-gradient(to right, transparent, var(--vscode-sideBar-background))",
								}}
							/>
							<VSCodeLink
								onClick={() => setIsExpanded(true)}
								style={{
									fontSize: "inherit",
									paddingRight: 0,
									paddingLeft: 3,
									backgroundColor: isPopup ? CODE_BLOCK_BG_COLOR : "var(--vscode-sideBar-background)",
								}}>
								See more
							</VSCodeLink>
						</div>
					)}
				</div>
			</div>
		)
	},
)

export default ModelDescriptionMarkdown
