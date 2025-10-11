import type CheckpointTracker from "../CheckpointTracker"

/**
 * Internal state for checkpoint operations
 */
export interface CheckpointManagerInternalState {
	conversationHistoryDeletedRange?: [number, number]
	checkpointTracker?: CheckpointTracker
	checkpointManagerErrorMessage?: string
	checkpointTrackerInitPromise?: Promise<CheckpointTracker | undefined>
}

/**
 * State update result from checkpoint restoration
 */
export interface CheckpointRestoreStateUpdate {
	conversationHistoryDeletedRange?: [number, number]
	checkpointManagerErrorMessage?: string
}

/**
 * Manages internal state for checkpoint operations
 * Provides controlled access to mutable state
 */
export class CheckpointStateManager {
	private state: CheckpointManagerInternalState

	constructor(initialState: CheckpointManagerInternalState = {}) {
		this.state = { ...initialState }
	}

	/**
	 * Get read-only copy of current state
	 */
	getCurrentState(): Readonly<CheckpointManagerInternalState> {
		return Object.freeze({ ...this.state })
	}

	/**
	 * Get checkpoint tracker instance
	 */
	getCheckpointTracker(): CheckpointTracker | undefined {
		return this.state.checkpointTracker
	}

	/**
	 * Set checkpoint tracker instance
	 */
	setCheckpointTracker(tracker: CheckpointTracker | undefined): void {
		this.state.checkpointTracker = tracker
	}

	/**
	 * Get error message
	 */
	getErrorMessage(): string | undefined {
		return this.state.checkpointManagerErrorMessage
	}

	/**
	 * Set error message
	 */
	setErrorMessage(message: string | undefined): void {
		this.state.checkpointManagerErrorMessage = message
	}

	/**
	 * Get conversation history deleted range
	 */
	getDeletedRange(): [number, number] | undefined {
		return this.state.conversationHistoryDeletedRange
	}

	/**
	 * Set conversation history deleted range
	 */
	setDeletedRange(range: [number, number] | undefined): void {
		this.state.conversationHistoryDeletedRange = range
	}

	/**
	 * Get checkpoint tracker init promise
	 */
	getInitPromise(): Promise<CheckpointTracker | undefined> | undefined {
		return this.state.checkpointTrackerInitPromise
	}

	/**
	 * Set checkpoint tracker init promise
	 */
	setInitPromise(promise: Promise<CheckpointTracker | undefined> | undefined): void {
		this.state.checkpointTrackerInitPromise = promise
	}

	/**
	 * Clear all state
	 */
	clear(): void {
		this.state = {}
	}
}
