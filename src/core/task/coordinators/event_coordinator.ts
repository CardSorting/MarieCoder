import { Logger } from "@services/logging/Logger"

/**
 * Coordinates event handling across the task lifecycle
 * Manages subscriptions, dispatching, and cleanup
 *
 * Responsibilities:
 * - Subscribe to task state events
 * - Subscribe to controller events
 * - Subscribe to MCP events
 * - Clean up all subscriptions on disposal
 */
export class EventCoordinator {
	private subscriptions: Array<() => void> = []
	private isInitialized = false

	/**
	 * Initialize all event subscriptions
	 * Should be called once during task initialization
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			Logger.warn("[EventCoordinator] Already initialized, skipping")
			return
		}

		await this.subscribeToTaskStateEvents()
		await this.subscribeToControllerEvents()
		await this.subscribeToMcpEvents()

		this.isInitialized = true
		Logger.debug("[EventCoordinator] Initialized with event subscriptions")
	}

	/**
	 * Subscribe to task state change events
	 * Monitors internal task state changes
	 */
	private async subscribeToTaskStateEvents(): Promise<void> {
		// Task state events can be added here as needed
		// Example: task state change listeners, progress updates, etc.
		Logger.debug("[EventCoordinator] Task state event subscriptions configured")
	}

	/**
	 * Subscribe to controller events
	 * Listens for controller-level state changes
	 */
	private async subscribeToControllerEvents(): Promise<void> {
		// Controller events can be added here as needed
		// Example: workspace changes, configuration updates, etc.
		Logger.debug("[EventCoordinator] Controller event subscriptions configured")
	}

	/**
	 * Subscribe to MCP (Model Context Protocol) events
	 * Handles MCP server notifications and state changes
	 */
	private async subscribeToMcpEvents(): Promise<void> {
		// MCP events are currently handled via callback in Task constructor
		// This method exists for future explicit event subscription patterns
		Logger.debug("[EventCoordinator] MCP event subscriptions configured")
	}

	/**
	 * Add a subscription to track
	 * Ensures cleanup when coordinator is disposed
	 *
	 * @param unsubscribe - Function to call to unsubscribe
	 */
	addSubscription(unsubscribe: () => void): void {
		this.subscriptions.push(unsubscribe)
	}

	/**
	 * Dispose of all event subscriptions
	 * Called when task is completed or aborted
	 */
	async dispose(): Promise<void> {
		Logger.debug(`[EventCoordinator] Disposing ${this.subscriptions.length} subscriptions`)

		for (const unsubscribe of this.subscriptions) {
			try {
				unsubscribe()
			} catch (error) {
				Logger.error(
					"[EventCoordinator] Error during subscription cleanup",
					error instanceof Error ? error : new Error(String(error)),
				)
			}
		}

		this.subscriptions = []
		this.isInitialized = false
		Logger.debug("[EventCoordinator] All subscriptions disposed")
	}

	/**
	 * Check if coordinator is initialized
	 */
	isReady(): boolean {
		return this.isInitialized
	}

	/**
	 * Get count of active subscriptions
	 */
	getSubscriptionCount(): number {
		return this.subscriptions.length
	}
}
