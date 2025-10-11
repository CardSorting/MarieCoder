import { memo } from "react"
import { headerStyle } from "../utils/style_constants"

/**
 * Props for MessageHeader component
 */
interface MessageHeaderProps {
	icon: JSX.Element | null
	title: JSX.Element | null
	isExpanded?: boolean
	onToggle?: () => void
	showChevron?: boolean
	style?: React.CSSProperties
	children?: React.ReactNode
}

/**
 * Message header component
 * Displays icon, title, and optional expand/collapse chevron
 *
 * Features:
 * - Consistent header styling across message types
 * - Optional expand/collapse interaction
 * - Customizable styling
 * - Support for additional content (badges, buttons, etc.)
 */
export const MessageHeader = memo(
	({ icon, title, isExpanded, onToggle, showChevron = true, style, children }: MessageHeaderProps) => {
		const handleClick = onToggle ? () => onToggle() : undefined
		const isClickable = !!onToggle

		return (
			<div
				onClick={handleClick}
				style={{
					...headerStyle,
					cursor: isClickable ? "pointer" : "default",
					userSelect: isClickable ? "none" : "auto",
					WebkitUserSelect: isClickable ? "none" : "auto",
					MozUserSelect: isClickable ? "none" : "auto",
					...style,
				}}>
				<div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
					{icon}
					{title}
					{children}
				</div>
				{showChevron && onToggle && (
					<span className={`codicon codicon-chevron-${isExpanded ? "up" : "down"}`} style={{ marginLeft: "auto" }} />
				)}
			</div>
		)
	},
)

MessageHeader.displayName = "MessageHeader"
