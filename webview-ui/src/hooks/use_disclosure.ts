/**
 * useDisclosure - Hook for managing disclosure state
 *
 * Provides consistent state management for expandable/collapsible components.
 * Includes accessibility features and callbacks.
 *
 * @example
 * ```typescript
 * const { isOpen, onToggle, onOpen, onClose } = useDisclosure({
 *   defaultIsOpen: false,
 *   onToggle: () => console.log('toggled')
 * })
 * ```
 */

import { useCallback, useState } from "react"

// ============================================================================
// Types
// ============================================================================

export interface UseDisclosureProps {
	/** Initial open state */
	defaultIsOpen?: boolean
	/** Callback when disclosure is toggled */
	onToggle?: (isOpen: boolean) => void
	/** Callback when disclosure is opened */
	onOpen?: () => void
	/** Callback when disclosure is closed */
	onClose?: () => void
	/** ID for ARIA attributes */
	id?: string
}

export interface UseDisclosureReturn {
	/** Whether the disclosure is open */
	isOpen: boolean
	/** Toggle the disclosure */
	onToggle: () => void
	/** Open the disclosure */
	onOpen: () => void
	/** Close the disclosure */
	onClose: () => void
	/** Get props for the trigger button */
	getButtonProps: () => {
		"aria-expanded": boolean
		"aria-controls": string | undefined
		onClick: () => void
	}
	/** Get props for the content panel */
	getContentProps: () => {
		id: string | undefined
		"aria-hidden": boolean
		hidden: boolean
	}
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing disclosure state (show/hide content)
 */
export function useDisclosure(props: UseDisclosureProps = {}): UseDisclosureReturn {
	const { defaultIsOpen = false, onToggle: onToggleProp, onOpen: onOpenProp, onClose: onCloseProp, id } = props

	const [isOpen, setIsOpen] = useState(defaultIsOpen)

	const onOpen = useCallback(() => {
		setIsOpen(true)
		onOpenProp?.()
		onToggleProp?.(true)
	}, [onOpenProp, onToggleProp])

	const onClose = useCallback(() => {
		setIsOpen(false)
		onCloseProp?.()
		onToggleProp?.(false)
	}, [onCloseProp, onToggleProp])

	const onToggle = useCallback(() => {
		if (isOpen) {
			onClose()
		} else {
			onOpen()
		}
	}, [isOpen, onOpen, onClose])

	const getButtonProps = useCallback(
		() => ({
			"aria-expanded": isOpen,
			"aria-controls": id,
			onClick: onToggle,
		}),
		[isOpen, id, onToggle],
	)

	const getContentProps = useCallback(
		() => ({
			id,
			"aria-hidden": !isOpen,
			hidden: !isOpen,
		}),
		[id, isOpen],
	)

	return {
		isOpen,
		onToggle,
		onOpen,
		onClose,
		getButtonProps,
		getContentProps,
	}
}

export default useDisclosure
