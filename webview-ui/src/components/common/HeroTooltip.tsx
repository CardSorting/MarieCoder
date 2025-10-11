import React, { type ReactElement, useMemo } from "react"
import { Tooltip } from "@/components/common/Tooltip"
import { cn } from "@/utils/classnames"

interface HeroTooltipProps {
	content: React.ReactNode
	children: ReactElement
	className?: string
	delay?: number
	closeDelay?: number
	placement?: "top" | "bottom" | "left" | "right"
	showArrow?: boolean
	disabled?: boolean
}

/**
 * HeroTooltip component that wraps the lightweight Tooltip with styled content
 */
const HeroTooltip: React.FC<HeroTooltipProps> = ({
	content,
	children,
	className,
	delay = 0,
	placement = "top",
	disabled = false,
}) => {
	// If content is a simple string, wrap it in the tailwind styled divs
	const formattedContent = useMemo(() => {
		return typeof content === "string" ? (
			<div
				className={cn(
					"bg-code-background text-code-foreground border border-code-foreground/20 rounded shadow-md max-w-[250px] text-sm",
					className,
					"p-2",
				)}>
				<span className="whitespace-pre-wrap break-words overflow-y-auto">{content}</span>
			</div>
		) : (
			// If content is already a React node, assume it's pre-formatted
			content
		)
	}, [content, className])

	if (disabled) {
		return children
	}

	return (
		<Tooltip content={formattedContent} delay={delay} placement={placement}>
			{children}
		</Tooltip>
	)
}

export default HeroTooltip
