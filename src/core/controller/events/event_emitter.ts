import { Logger } from "@services/logging/Logger"
import type { ControllerEventPayloads, ControllerEventType, EventListener, EventUnsubscribe } from "./controller_events"

/**
 * Simple EventEmitter for coordinator communication
 * Enables decoupled communication between coordinators and controller
 */
export class ControllerEventEmitter {
	private listeners: Map<ControllerEventType, Set<EventListener<any>>> = new Map()
	private enabled: boolean = true

	/**
	 * Subscribe to an event
	 */
	on<T extends ControllerEventType>(event: T, listener: EventListener<T>): EventUnsubscribe {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set())
		}

		this.listeners.get(event)!.add(listener)

		// Return unsubscribe function
		return () => {
			this.off(event, listener)
		}
	}

	/**
	 * Subscribe to an event (one-time only)
	 */
	once<T extends ControllerEventType>(event: T, listener: EventListener<T>): EventUnsubscribe {
		const wrappedListener = async (payload: ControllerEventPayloads[T]) => {
			this.off(event, wrappedListener as EventListener<T>)
			await listener(payload)
		}

		return this.on(event, wrappedListener as EventListener<T>)
	}

	/**
	 * Unsubscribe from an event
	 */
	off<T extends ControllerEventType>(event: T, listener: EventListener<T>): void {
		const eventListeners = this.listeners.get(event)
		if (eventListeners) {
			eventListeners.delete(listener)
			if (eventListeners.size === 0) {
				this.listeners.delete(event)
			}
		}
	}

	/**
	 * Emit an event to all subscribers
	 */
	async emit<T extends ControllerEventType>(event: T, payload: ControllerEventPayloads[T]): Promise<void> {
		if (!this.enabled) {
			return
		}

		const eventListeners = this.listeners.get(event)
		if (!eventListeners || eventListeners.size === 0) {
			return
		}

		// Call all listeners
		const promises: Promise<void>[] = []
		for (const listener of eventListeners) {
			try {
				const result = listener(payload)
				if (result instanceof Promise) {
					promises.push(result)
				}
			} catch (error) {
				Logger.error(
					`[ControllerEventEmitter] Error in event listener for ${event}`,
					error instanceof Error ? error : new Error(String(error)),
				)
			}
		}

		// Wait for all async listeners
		if (promises.length > 0) {
			await Promise.allSettled(promises)
		}
	}

	/**
	 * Remove all listeners for a specific event or all events
	 */
	removeAllListeners(event?: ControllerEventType): void {
		if (event) {
			this.listeners.delete(event)
		} else {
			this.listeners.clear()
		}
	}

	/**
	 * Get listener count for an event
	 */
	listenerCount(event: ControllerEventType): number {
		return this.listeners.get(event)?.size || 0
	}

	/**
	 * Get all registered event types
	 */
	eventTypes(): ControllerEventType[] {
		return Array.from(this.listeners.keys())
	}

	/**
	 * Enable/disable event emitter
	 */
	setEnabled(enabled: boolean): void {
		this.enabled = enabled
	}

	/**
	 * Check if event emitter is enabled
	 */
	isEnabled(): boolean {
		return this.enabled
	}
}
