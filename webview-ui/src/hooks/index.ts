/**
 * Global/Reusable Hooks
 *
 * These hooks can be used across different features and domains.
 * For domain-specific hooks, place them in the appropriate domain directory:
 * - components/[domain]/hooks/ for component-specific hooks
 */

export { useDebounceEffect } from "./use_debounce_effect"
export { useMetaKeyDetection, useShortcut } from "./use_keyboard"
export { useAutoApproveActions } from "./useAutoApproveActions"
