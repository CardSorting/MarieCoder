import type { WorkspaceRoot } from "@core/workspace/WorkspaceRoot"
import type { HistoryItem } from "@shared/HistoryItem"
import type { McpMarketplaceCatalog } from "@shared/mcp"

/**
 * Event types emitted by coordinators
 */
export enum ControllerEventType {
	// Workspace events
	WORKSPACE_INITIALIZED = "workspace:initialized",
	WORKSPACE_CHANGED = "workspace:changed",
	WORKSPACE_CWD_CHANGED = "workspace:cwd_changed",

	// MCP events
	MCP_MARKETPLACE_LOADED = "mcp:marketplace_loaded",
	MCP_MARKETPLACE_REFRESH_STARTED = "mcp:marketplace_refresh_started",
	MCP_MARKETPLACE_REFRESH_COMPLETED = "mcp:marketplace_refresh_completed",
	MCP_MARKETPLACE_ERROR = "mcp:marketplace_error",

	// State events
	STATE_SYNCED = "state:synced",
	STATE_PERSISTENCE_ERROR = "state:persistence_error",
	STATE_RECOVERY_SUCCESS = "state:recovery_success",
	STATE_RECOVERY_FAILED = "state:recovery_failed",

	// Task events
	TASK_CREATED = "task:created",
	TASK_CANCELLED = "task:cancelled",
	TASK_REINITIALIZE = "task:reinitialize",
	TASK_HISTORY_UPDATED = "task:history_updated",
	TASK_NEW_USER_STATUS_CHANGED = "task:new_user_status_changed",
}

/**
 * Event payloads for each event type
 */
export interface ControllerEventPayloads {
	[ControllerEventType.WORKSPACE_INITIALIZED]: {
		rootCount: number
		roots: WorkspaceRoot[]
		primaryIndex: number
	}
	[ControllerEventType.WORKSPACE_CHANGED]: {
		added: number
		removed: number
	}
	[ControllerEventType.WORKSPACE_CWD_CHANGED]: {
		oldCwd?: string
		newCwd: string
	}

	[ControllerEventType.MCP_MARKETPLACE_LOADED]: {
		catalog: McpMarketplaceCatalog
		itemCount: number
	}
	[ControllerEventType.MCP_MARKETPLACE_REFRESH_STARTED]: {
		silent: boolean
	}
	[ControllerEventType.MCP_MARKETPLACE_REFRESH_COMPLETED]: {
		catalog: McpMarketplaceCatalog
		itemCount: number
		silent: boolean
	}
	[ControllerEventType.MCP_MARKETPLACE_ERROR]: {
		error: Error
		silent: boolean
	}

	[ControllerEventType.STATE_SYNCED]: {
		timestamp: number
	}
	[ControllerEventType.STATE_PERSISTENCE_ERROR]: {
		error: Error
	}
	[ControllerEventType.STATE_RECOVERY_SUCCESS]: {
		timestamp: number
	}
	[ControllerEventType.STATE_RECOVERY_FAILED]: {
		error: Error
	}

	[ControllerEventType.TASK_CREATED]: {
		taskId: string
		isReinitialization: boolean
	}
	[ControllerEventType.TASK_CANCELLED]: {
		taskId: string
	}
	[ControllerEventType.TASK_REINITIALIZE]: {
		taskId: string
	}
	[ControllerEventType.TASK_HISTORY_UPDATED]: {
		historyItem: HistoryItem
		historyLength: number
	}
	[ControllerEventType.TASK_NEW_USER_STATUS_CHANGED]: {
		isNewUser: boolean
		taskCount: number
	}
}

/**
 * Event listener callback type
 */
export type EventListener<T extends ControllerEventType> = (payload: ControllerEventPayloads[T]) => void | Promise<void>

/**
 * Event unsubscribe function
 */
export type EventUnsubscribe = () => void
