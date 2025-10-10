import { useCallback, useState } from "react"

/**
 * Hook for optimistic UI updates
 * Updates state immediately, then syncs with server in background
 * Rolls back if server update fails
 *
 * @example
 * ```tsx
 * const { value, setValue, isRollingBack } = useOptimisticUpdate(
 *   initialValue,
 *   async (newValue) => {
 *     await api.updateSetting(newValue)
 *   }
 * )
 * ```
 */
export function useOptimisticUpdate<T>(
	initialValue: T,
	syncFn: (value: T) => Promise<void>,
	options?: {
		onError?: (error: Error, previousValue: T) => void
		onSuccess?: (value: T) => void
	},
): {
	value: T
	setValue: (newValue: T | ((prev: T) => T)) => void
	isRollingBack: boolean
	isSyncing: boolean
} {
	const [value, setValueState] = useState<T>(initialValue)
	const [isRollingBack, setIsRollingBack] = useState(false)
	const [isSyncing, setIsSyncing] = useState(false)

	const setValue = useCallback(
		(newValue: T | ((prev: T) => T)) => {
			// Store previous value for rollback
			const previousValue = value

			// Update UI immediately (optimistic)
			const resolvedValue = typeof newValue === "function" ? (newValue as (prev: T) => T)(previousValue) : newValue
			setValueState(resolvedValue)

			// Sync with server in background
			setIsSyncing(true)
			syncFn(resolvedValue)
				.then(() => {
					setIsSyncing(false)
					options?.onSuccess?.(resolvedValue)
				})
				.catch((error) => {
					// Rollback on failure
					setIsRollingBack(true)
					setValueState(previousValue)
					setIsSyncing(false)

					options?.onError?.(error, previousValue)

					// Clear rollback indicator after animation
					setTimeout(() => setIsRollingBack(false), 300)
				})
		},
		[value, syncFn, options],
	)

	return {
		value,
		setValue,
		isRollingBack,
		isSyncing,
	}
}

/**
 * Simpler hook for boolean toggles (most common use case)
 *
 * @example
 * ```tsx
 * const { value: enabled, toggle } = useOptimisticToggle(
 *   false,
 *   async (newValue) => await api.updateEnabled(newValue)
 * )
 *
 * <VSCodeCheckbox checked={enabled} onChange={toggle} />
 * ```
 */
export function useOptimisticToggle(
	initialValue: boolean,
	syncFn: (value: boolean) => Promise<void>,
	options?: {
		onError?: (error: Error) => void
		onSuccess?: () => void
	},
): {
	value: boolean
	toggle: () => void
	setValue: (value: boolean) => void
	isRollingBack: boolean
	isSyncing: boolean
} {
	const { value, setValue, isRollingBack, isSyncing } = useOptimisticUpdate(initialValue, syncFn, options)

	const toggle = useCallback(() => {
		setValue(!value)
	}, [value, setValue])

	return {
		value,
		toggle,
		setValue,
		isRollingBack,
		isSyncing,
	}
}
