import { Settings } from "@core/storage/state-keys"
import { HistoryItem } from "@shared/HistoryItem"

/**
 * Parameters for creating a new task
 */
export interface TaskCreationParams {
	task?: string
	images?: string[]
	files?: string[]
	historyItem?: HistoryItem
	taskSettings?: Partial<Settings>
}

/**
 * Options for controller initialization
 */
export interface ControllerInitOptions {
	cleanupLegacyData?: boolean
	initializeWorkspace?: boolean
	setupEventListeners?: boolean
}

/**
 * State update event types
 */
export type StateUpdateEventType = "persistence_error" | "external_change" | "task_update"

/**
 * State update event payload
 */
export interface StateUpdateEvent {
	type: StateUpdateEventType
	data?: unknown
	error?: unknown
}

/**
 * Event unsubscribe function
 */
export type EventUnsubscribe = () => void
