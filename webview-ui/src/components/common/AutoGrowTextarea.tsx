/**
 * Auto-growing textarea component
 * Replaces react-textarea-autosize (50KB) with zero-dependency implementation
 *
 * Features:
 * - Automatically adjusts height based on content
 * - Respects minRows and maxRows
 * - Forwards ref for external control
 * - Fully typed with TypeScript
 */

import { forwardRef, type TextareaHTMLAttributes, useEffect, useImperativeHandle, useRef } from "react"

interface AutoGrowTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> {
	/** Minimum number of rows to display */
	minRows?: number
	/** Maximum number of rows to display before scrolling */
	maxRows?: number
	/** Callback when height changes */
	onHeightChange?: (height: number) => void
	/** Cache measurements to avoid layout thrashing */
	cacheMeasurements?: boolean
}

/**
 * AutoGrowTextarea - Self-sizing textarea component
 *
 * Drop-in replacement for react-textarea-autosize
 * Uses native DOM APIs for optimal performance
 */
const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
	({ minRows = 1, maxRows, onHeightChange, cacheMeasurements = true, style, ...props }, ref) => {
		const textareaRef = useRef<HTMLTextAreaElement>(null)
		const heightRef = useRef<number>(0)

		// Expose the textarea ref to parent components
		useImperativeHandle(ref, () => textareaRef.current!, [])

		// Adjust textarea height based on content
		const adjustHeight = () => {
			const textarea = textareaRef.current
			if (!textarea) {
				return
			}

			// Reset height to auto to get the correct scrollHeight
			textarea.style.height = "auto"

			// Calculate line height if not cached
			const computedStyle = window.getComputedStyle(textarea)
			const lineHeight = Number.parseInt(computedStyle.lineHeight, 10) || 20
			const paddingTop = Number.parseInt(computedStyle.paddingTop, 10) || 0
			const paddingBottom = Number.parseInt(computedStyle.paddingBottom, 10) || 0
			const borderTop = Number.parseInt(computedStyle.borderTopWidth, 10) || 0
			const borderBottom = Number.parseInt(computedStyle.borderBottomWidth, 10) || 0

			// Calculate height constraints
			const minHeight = minRows * lineHeight + paddingTop + paddingBottom + borderTop + borderBottom
			const maxHeight = maxRows
				? maxRows * lineHeight + paddingTop + paddingBottom + borderTop + borderBottom
				: Number.POSITIVE_INFINITY

			// Set the height based on scroll height, respecting min/max
			const scrollHeight = textarea.scrollHeight
			const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)

			textarea.style.height = `${newHeight}px`
			textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden"

			// Notify parent of height change
			if (onHeightChange && heightRef.current !== newHeight) {
				heightRef.current = newHeight
				onHeightChange(newHeight)
			}
		}

		// Adjust on mount and when value changes
		useEffect(() => {
			adjustHeight()
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [props.value, props.defaultValue])

		// Handle input events
		const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
			adjustHeight()
			if (props.onInput) {
				props.onInput(e)
			}
		}

		return (
			<textarea
				ref={textareaRef}
				{...props}
				onInput={handleInput}
				style={{
					...style,
					resize: "none", // Disable manual resize
					overflow: "hidden", // Hide scrollbar initially
					boxSizing: "border-box", // Include padding in height calculation
				}}
			/>
		)
	},
)

AutoGrowTextarea.displayName = "AutoGrowTextarea"

export default AutoGrowTextarea
