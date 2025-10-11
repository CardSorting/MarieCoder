/**
 * Lightweight custom hooks to replace react-use dependency (~87KB)
 * These implementations cover only what we need, reducing bundle size significantly
 */
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react"

/**
 * Calls a callback when clicking outside of the specified element
 * Replaces: useClickAway from react-use
 */
export function useClickAway<T extends HTMLElement = HTMLElement>(
	ref: RefObject<T>,
	onClickAway: (event: MouseEvent | TouchEvent) => void,
) {
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent | TouchEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				onClickAway(event)
			}
		}

		document.addEventListener("mousedown", handleClickOutside)
		document.addEventListener("touchstart", handleClickOutside)

		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
			document.removeEventListener("touchstart", handleClickOutside)
		}
	}, [ref, onClickAway])
}

/**
 * Runs a callback once when component mounts
 * Replaces: useMount from react-use
 */
export function useMount(fn: () => void) {
	useEffect(() => {
		fn()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])
}

/**
 * Tracks window size
 * Replaces: useWindowSize from react-use
 */
export function useWindowSize() {
	const [size, setSize] = useState({
		width: window.innerWidth,
		height: window.innerHeight,
	})

	useEffect(() => {
		const handleResize = () => {
			setSize({
				width: window.innerWidth,
				height: window.innerHeight,
			})
		}

		window.addEventListener("resize", handleResize)
		return () => window.removeEventListener("resize", handleResize)
	}, [])

	return size
}

/**
 * Creates a stable callback reference
 * Replaces: useEvent from react-use
 */
export function useEvent<T extends (...args: any[]) => any>(handler: T): T {
	const handlerRef = useRef(handler)

	useLayoutEffect(() => {
		handlerRef.current = handler
	})

	return useRef((...args: Parameters<T>) => handlerRef.current(...args)).current as T
}

/**
 * Attaches an event listener to a target element or window
 * Replaces event listener functionality from react-use
 */
export function useEventListener<K extends keyof WindowEventMap>(
	eventName: K,
	handler: (event: WindowEventMap[K]) => void,
	element?: Window | HTMLElement | null,
	options?: boolean | AddEventListenerOptions,
) {
	const savedHandler = useRef(handler)

	useEffect(() => {
		savedHandler.current = handler
	}, [handler])

	useEffect(() => {
		const targetElement = element ?? window
		if (!targetElement?.addEventListener) {
			return
		}

		const eventListener = (event: Event) => savedHandler.current(event as WindowEventMap[K])
		targetElement.addEventListener(eventName, eventListener, options)

		return () => {
			targetElement.removeEventListener(eventName, eventListener, options)
		}
	}, [eventName, element, options])
}

/**
 * Tracks element size using ResizeObserver
 * Replaces: useSize from react-use
 */
export function useSize<T extends HTMLElement = HTMLElement>(ref: RefObject<T>) {
	const [size, setSize] = useState<{ width: number; height: number }>({
		width: 0,
		height: 0,
	})

	useEffect(() => {
		if (!ref.current) {
			return
		}

		const element = ref.current

		// Set initial size
		const updateSize = () => {
			setSize({
				width: element.offsetWidth,
				height: element.offsetHeight,
			})
		}

		updateSize()

		// Use ResizeObserver for efficient size tracking
		const resizeObserver = new ResizeObserver(() => {
			updateSize()
		})

		resizeObserver.observe(element)

		return () => {
			resizeObserver.disconnect()
		}
	}, [ref])

	return size
}
