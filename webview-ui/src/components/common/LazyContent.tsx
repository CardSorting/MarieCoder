/**
 * Optimized lazy-loading wrapper component
 * Uses content-visibility and intersection observers for better perceived performance
 */

import React, { useRef } from "react"
import { useIntersectionObserver } from "@/utils/performance_optimizations"

interface LazyContentProps {
	children: React.ReactNode
	/**
	 * Placeholder to show while content is not visible
	 */
	placeholder?: React.ReactNode
	/**
	 * Minimum height to reserve for content (prevents layout shift)
	 */
	minHeight?: string | number
	/**
	 * Class name for the wrapper
	 */
	className?: string
	/**
	 * Whether to keep content loaded after first render
	 * @default true
	 */
	keepLoaded?: boolean
	/**
	 * Root margin for intersection observer (load earlier/later)
	 * @default "50px"
	 */
	rootMargin?: string
	/**
	 * Callback when content becomes visible
	 */
	onVisible?: () => void
}

/**
 * Lazy-loading wrapper that optimizes rendering performance
 * Content is only rendered when visible in viewport
 */
export const LazyContent: React.FC<LazyContentProps> = ({
	children,
	placeholder,
	minHeight = "100px",
	className = "",
	keepLoaded = true,
	rootMargin = "50px",
	onVisible,
}) => {
	const elementRef = useRef<HTMLDivElement>(null)
	const isVisible = useIntersectionObserver(elementRef, { rootMargin })

	React.useEffect(() => {
		if (isVisible && onVisible) {
			onVisible()
		}
	}, [isVisible, onVisible])

	const shouldRender = keepLoaded ? isVisible : isVisible

	return (
		<div
			className={`optimize-rendering ${className}`}
			ref={elementRef}
			style={{
				minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight,
				contentVisibility: "auto",
				containIntrinsicSize: `auto ${typeof minHeight === "number" ? minHeight : 500}px`,
			}}>
			{shouldRender ? children : placeholder || <div style={{ height: minHeight }} />}
		</div>
	)
}

/**
 * Optimized list item wrapper for virtual scrolling enhancement
 */
interface LazyListItemProps {
	children: React.ReactNode
	index: number
	className?: string
}

export const LazyListItem: React.FC<LazyListItemProps> = ({ children, index, className = "" }) => {
	const elementRef = useRef<HTMLDivElement>(null)
	const isVisible = useIntersectionObserver(elementRef, { rootMargin: "100px" })

	return (
		<div
			className={`optimize-rendering stagger-item ${className}`}
			ref={elementRef}
			style={{
				contentVisibility: "auto",
				// Stagger animation delay based on index (max 5 items)
				animationDelay: `${Math.min(index * 50, 250)}ms`,
			}}>
			{isVisible ? children : <div className="skeleton-shimmer h-20 rounded" />}
		</div>
	)
}

/**
 * Progressive image loader with blur-up effect
 */
interface ProgressiveImageProps {
	src: string
	alt: string
	placeholderSrc?: string
	className?: string
	onLoad?: () => void
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ src, alt, placeholderSrc, className = "", onLoad }) => {
	const [isLoaded, setIsLoaded] = React.useState(false)
	const [currentSrc, setCurrentSrc] = React.useState(placeholderSrc || src)

	React.useEffect(() => {
		const img = new Image()
		img.src = src
		img.onload = () => {
			setCurrentSrc(src)
			setIsLoaded(true)
			onLoad?.()
		}
	}, [src, onLoad])

	return (
		<img
			alt={alt}
			className={`${className} ${isLoaded ? "content-reveal" : "skeleton-shimmer"}`}
			src={currentSrc}
			style={{
				filter: isLoaded ? "none" : "blur(5px)",
				transition: "filter 0.3s ease-out",
			}}
		/>
	)
}
