import { memo } from "react"
import MarkdownBlock from "@/components/common/MarkdownBlock"

/**
 * Markdown wrapper component with proper spacing
 */
export const Markdown = memo(({ markdown }: { markdown?: string }) => {
	return (
		<div
			style={{
				wordBreak: "break-word",
				overflowWrap: "anywhere",
				marginBottom: -15,
				marginTop: -15,
				overflow: "hidden", // contain child margins so that parent diff matches height of children
			}}>
			<MarkdownBlock markdown={markdown} />
		</div>
	)
})
