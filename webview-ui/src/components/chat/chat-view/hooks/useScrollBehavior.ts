import { ClineMessage } from "@shared/ExtensionMessage"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { VirtuosoHandle } from "react-virtuoso"
import { debounce } from "@/utils/debounce"
import { ScrollBehavior } from "../types/chatTypes"

/**
 * Custom hook for managing scroll behavior
 * Handles auto-scrolling, manual scrolling, and scroll-to-message functionality
 */
export function useScrollBehavior(
	messages: ClineMessage[],
	visibleMessages: ClineMessage[],
	groupedMessages: (ClineMessage | ClineMessage[])[],
	expandedRows: Record<number, boolean>,
	setExpandedRows: React.Dispatch<React.SetStateAction<Record<number, boolean>>>,
): ScrollBehavior & {
	showScrollToBottom: boolean
	setShowScrollToBottom: React.Dispatch<React.SetStateAction<boolean>>
	isAtBottom: boolean
	setIsAtBottom: React.Dispatch<React.SetStateAction<boolean>>
	pendingScrollToMessage: number | null
	setPendingScrollToMessage: React.Dispatch<React.SetStateAction<number | null>>
} {
	// Refs
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const disableAutoScrollRef = useRef(false)

	// State
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const [isAtBottom, setIsAtBottom] = useState(false)
	const [pendingScrollToMessage, setPendingScrollToMessage] = useState<number | null>(null)

	// Scroll momentum tracking for predictive scrolling
	const lastScrollTimeRef = useRef(0)
	const scrollVelocityRef = useRef(0)
	const lastScrollTopRef = useRef(0)

	const scrollToBottomSmooth = useMemo(
		() =>
			debounce(() => {
				// Double requestAnimationFrame for even smoother scrolling
				// First RAF ensures we're at the start of a frame
				requestAnimationFrame(() => {
					// Second RAF ensures layout is complete before scrolling
					requestAnimationFrame(() => {
						virtuosoRef.current?.scrollTo({
							top: Number.MAX_SAFE_INTEGER,
							behavior: "smooth",
						})
					})
				})
			}, 16), // Increased from 10ms to align with frame timing
		[],
	)

	// Smooth scroll to bottom with debounce
	const scrollToBottomAuto = useCallback(() => {
		virtuosoRef.current?.scrollTo({
			top: Number.MAX_SAFE_INTEGER,
			behavior: "auto", // instant causes crash
		})
	}, [])

	const scrollToMessage = useCallback(
		(messageIndex: number) => {
			setPendingScrollToMessage(messageIndex)

			const targetMessage = messages[messageIndex]
			if (!targetMessage) {
				setPendingScrollToMessage(null)
				return
			}

			const visibleIndex = visibleMessages.findIndex((msg) => msg.ts === targetMessage.ts)
			if (visibleIndex === -1) {
				setPendingScrollToMessage(null)
				return
			}

			let groupIndex = -1

			for (let i = 0; i < groupedMessages.length; i++) {
				const group = groupedMessages[i]
				if (Array.isArray(group)) {
					const messageInGroup = group.some((msg) => msg.ts === targetMessage.ts)
					if (messageInGroup) {
						groupIndex = i
						break
					}
				} else {
					if (group.ts === targetMessage.ts) {
						groupIndex = i
						break
					}
				}
			}

			if (groupIndex !== -1) {
				setPendingScrollToMessage(null)
				disableAutoScrollRef.current = true
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						virtuosoRef.current?.scrollToIndex({
							index: groupIndex,
							align: "start",
							behavior: "smooth",
						})
					})
				})
			}
		},
		[messages, visibleMessages, groupedMessages],
	)

	// scroll when user toggles certain rows
	const toggleRowExpansion = useCallback(
		(ts: number) => {
			const isCollapsing = expandedRows[ts] ?? false
			const lastGroup = groupedMessages.at(-1)
			const isLast = Array.isArray(lastGroup) ? lastGroup[0].ts === ts : lastGroup?.ts === ts
			const secondToLastGroup = groupedMessages.at(-2)
			const isSecondToLast = Array.isArray(secondToLastGroup)
				? secondToLastGroup[0].ts === ts
				: secondToLastGroup?.ts === ts

			const isLastCollapsedApiReq =
				isLast &&
				!Array.isArray(lastGroup) && // Make sure it's not a browser session group
				lastGroup?.say === "api_req_started" &&
				!expandedRows[lastGroup.ts]

			setExpandedRows((prev) => ({
				...prev,
				[ts]: !prev[ts],
			}))

			// disable auto scroll when user expands row
			if (!isCollapsing) {
				disableAutoScrollRef.current = true
			}

			if (isCollapsing && isAtBottom) {
				// Use requestAnimationFrame for smoother, non-blocking scroll
				requestAnimationFrame(() => {
					scrollToBottomAuto()
				})
			} else if (isLast || isSecondToLast) {
				if (isCollapsing) {
					if (isSecondToLast && !isLastCollapsedApiReq) {
						return
					}
					requestAnimationFrame(() => {
						scrollToBottomAuto()
					})
				} else {
					requestAnimationFrame(() => {
						virtuosoRef.current?.scrollToIndex({
							index: groupedMessages.length - (isLast ? 1 : 2),
							align: "start",
						})
					})
				}
			}
		},
		[groupedMessages, expandedRows, scrollToBottomAuto, isAtBottom],
	)

	const handleRowHeightChange = useCallback(
		(isTaller: boolean) => {
			if (!disableAutoScrollRef.current) {
				if (isTaller) {
					scrollToBottomSmooth()
				} else {
					// Use requestAnimationFrame for non-blocking, smooth updates
					requestAnimationFrame(() => {
						scrollToBottomAuto()
					})
				}
			}
		},
		[scrollToBottomSmooth, scrollToBottomAuto],
	)

	useEffect(() => {
		if (!disableAutoScrollRef.current) {
			// Double RAF for smoother, jank-free scrolling on new messages
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					scrollToBottomSmooth()
				})
			})
		}
	}, [groupedMessages.length, scrollToBottomSmooth])

	useEffect(() => {
		if (pendingScrollToMessage !== null) {
			scrollToMessage(pendingScrollToMessage)
		}
	}, [pendingScrollToMessage, groupedMessages, scrollToMessage])

	useEffect(() => {
		if (!messages?.length) {
			setShowScrollToBottom(false)
		}
	}, [messages.length])

	// Enhanced wheel handler with momentum tracking
	const handleWheel = useCallback((event: WheelEvent) => {
		if (!scrollContainerRef.current?.contains(event.target as Node)) {
			return
		}

		// Track scroll velocity for predictive behavior
		const now = performance.now()
		const timeDelta = now - lastScrollTimeRef.current
		const scrollDelta = event.deltaY

		if (timeDelta > 0) {
			scrollVelocityRef.current = Math.abs(scrollDelta / timeDelta)
		}

		lastScrollTimeRef.current = now
		lastScrollTopRef.current += event.deltaY

		// Disable auto-scroll on upward scroll
		if (event.deltaY && event.deltaY < 0) {
			disableAutoScrollRef.current = true
		}

		// Re-enable auto-scroll if user scrolls to bottom with momentum
		if (event.deltaY > 0 && scrollVelocityRef.current > 1) {
			// Check if near bottom (within 100px)
			const container = scrollContainerRef.current
			if (container) {
				const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
				if (distanceFromBottom < 100) {
					disableAutoScrollRef.current = false
				}
			}
		}
	}, [])

	useEffect(() => {
		window.addEventListener("wheel", handleWheel, { passive: true })
		return () => window.removeEventListener("wheel", handleWheel)
	}, [handleWheel])

	return {
		virtuosoRef,
		scrollContainerRef,
		disableAutoScrollRef,
		scrollToBottomSmooth,
		scrollToBottomAuto,
		scrollToMessage,
		toggleRowExpansion,
		handleRowHeightChange,
		showScrollToBottom,
		setShowScrollToBottom,
		isAtBottom,
		setIsAtBottom,
		pendingScrollToMessage,
		setPendingScrollToMessage,
	}
}
