/**
 * Global/Reusable Hooks
 *
 * These hooks can be used across different features and domains.
 * For domain-specific hooks, place them in the appropriate domain directory:
 * - components/[domain]/hooks/ for component-specific hooks
 */

// Context selector hooks for optimized state access
export {
	createContextSelector,
	deepEqual,
	shallowEqual,
	useBatchSelector,
	useMemoizedSelector,
	usePerformanceTracking,
} from "./use_context_selector"
export { useDebounceEffect } from "./use_debounce_effect"
// Optimistic UI update hooks
export { useOptimisticToggle, useOptimisticUpdate } from "./use_optimistic_update"
export { useAutoApproveActions } from "./useAutoApproveActions"
