/**
 * Shared types and interfaces for state management
 */

/**
 * Event emitted when persistence operations fail
 */
export interface PersistenceErrorEvent {
	error: Error
}

/**
 * Callbacks for state manager events
 */
export interface StateManagerCallbacks {
	/**
	 * Called when persistence operations fail
	 * Allows error recovery strategies in parent components
	 */
	onPersistenceError?: (event: PersistenceErrorEvent) => void | Promise<void>

	/**
	 * Called when external file changes are detected and synchronized
	 * Allows UI updates when state changes externally
	 */
	onSyncExternalChange?: () => void | Promise<void>
}

/**
 * Configuration for debounced persistence
 */
export interface PersistenceConfig {
	/**
	 * Delay in milliseconds before persisting pending changes
	 * @default 500
	 */
	delayMs: number
}
