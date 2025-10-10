/**
 * Lightweight tooltip component
 * Replaces @floating-ui/react (1.5MB) with custom positioning
 *
 * Features:
 * - Auto-positioning with collision detection
 * - Accessible (ARIA attributes)
 * - Hover and focus support
 * - Portal rendering
 */

import { cloneElement, type ReactElement, type ReactNode, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { calculatePosition, type Placement } from "@/utils/floating_position"

interface TooltipProps {
	content: ReactNode
	children: ReactElement
	placement?: Placement
	delay?: number
	className?: string
}

export function Tooltip({ content, children, placement = "top", delay = 200, className }: TooltipProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [position, setPosition] = useState({ x: 0, y: 0, placement })
	const referenceRef = useRef<HTMLElement>(null)
	const floatingRef = useRef<HTMLDivElement>(null)
	const timeoutRef = useRef<NodeJS.Timeout>()

	const handleMouseEnter = () => {
		timeoutRef.current = setTimeout(() => {
			setIsOpen(true)
		}, delay)
	}

	const handleMouseLeave = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
		}
		setIsOpen(false)
	}

	const handleFocus = () => {
		setIsOpen(true)
	}

	const handleBlur = () => {
		setIsOpen(false)
	}

	// Update position when tooltip opens
	useEffect(() => {
		if (isOpen && referenceRef.current && floatingRef.current) {
			const pos = calculatePosition(referenceRef.current, floatingRef.current, {
				placement,
				offset: 8,
				flip: true,
				shift: true,
				padding: 8,
			})
			setPosition(pos)
		}
	}, [isOpen, placement])

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	if (!content) {
		return children
	}

	// Clone child and attach event handlers + ref
	const child = cloneElement(children, {
		ref: referenceRef,
		onMouseEnter: handleMouseEnter,
		onMouseLeave: handleMouseLeave,
		onFocus: handleFocus,
		onBlur: handleBlur,
		"aria-describedby": isOpen ? "tooltip" : undefined,
	} as any)

	return (
		<>
			{child}
			{isOpen &&
				createPortal(
					<div
						className={className}
						id="tooltip"
						ref={floatingRef}
						role="tooltip"
						style={{
							position: "fixed",
							left: `${position.x}px`,
							top: `${position.y}px`,
							zIndex: 9999,
							pointerEvents: "none",
						}}>
						<div
							style={{
								backgroundColor: "var(--vscode-editorHoverWidget-background)",
								border: "1px solid var(--vscode-editorHoverWidget-border)",
								color: "var(--vscode-editorHoverWidget-foreground)",
								padding: "6px 10px",
								borderRadius: "4px",
								fontSize: "var(--vscode-font-size)",
								maxWidth: "400px",
								boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
								wordBreak: "break-word",
							}}>
							{content}
						</div>
					</div>,
					document.body,
				)}
		</>
	)
}
