import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import React, { forwardRef, useState } from "react"
import { debug } from "@/utils/debug_logger"

// ======== Interfaces ========

interface CopyButtonProps {
	textToCopy?: string
	onCopy?: () => string | undefined | null
	className?: string
	ariaLabel?: string
}

interface WithCopyButtonProps {
	children: React.ReactNode
	textToCopy?: string
	onCopy?: () => string | undefined | null
	position?: "top-right" | "bottom-right"
	style?: React.CSSProperties
	className?: string
	onMouseUp?: (event: React.MouseEvent<HTMLDivElement>) => void
	ariaLabel?: string
}

// ======== Component Implementations ========

/**
 * Base copy button component with clipboard functionality
 */
export const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy, onCopy, className = "", ariaLabel }) => {
	const [copied, setCopied] = useState(false)

	const handleCopy = () => {
		if (!textToCopy && !onCopy) {
			return
		}

		let textToCopyFinal = textToCopy

		if (onCopy) {
			const result = onCopy()
			if (typeof result === "string") {
				textToCopyFinal = result
			}
		}

		if (textToCopyFinal) {
			navigator.clipboard
				.writeText(textToCopyFinal)
				.then(() => {
					setCopied(true)
					setTimeout(() => setCopied(false), 1500)
				})
				.catch((err) => debug.error("Copy failed", err))
		}
	}

	return (
		<VSCodeButton
			appearance="icon"
			aria-label={copied ? "Copied" : ariaLabel || "Copy"}
			className={`z-[1] scale-90 ${className}`}
			onClick={handleCopy}>
			<span className={`codicon codicon-${copied ? "check" : "copy"}`}></span>
		</VSCodeButton>
	)
}

/**
 * Container component that wraps content with a copy button
 */
export const WithCopyButton = forwardRef<HTMLDivElement, WithCopyButtonProps>(
	(
		{
			children,
			textToCopy,
			onCopy,
			position = "top-right",
			style,
			className,
			onMouseUp,
			ariaLabel, // Destructure ariaLabel
			...props
		},
		ref,
	) => {
		// Determine position classes
		const positionClasses = position === "bottom-right" ? "bottom-0.5 right-0.5" : "top-[5px] right-[5px]"

		return (
			<div className={`relative group ${className || ""}`} onMouseUp={onMouseUp} ref={ref} style={style} {...props}>
				{children}
				{(textToCopy || onCopy) && (
					<div className={`absolute ${positionClasses} z-[1] opacity-0 group-hover:opacity-50`}>
						<CopyButton
							ariaLabel={ariaLabel}
							onCopy={onCopy}
							textToCopy={textToCopy} // Pass through the ariaLabel prop directly
						/>
					</div>
				)}
			</div>
		)
	},
)

// Default export for convenience if needed, though named exports are preferred for clarity
const CopyButtonComponents = {
	CopyButton,
	WithCopyButton,
}
export default CopyButtonComponents
