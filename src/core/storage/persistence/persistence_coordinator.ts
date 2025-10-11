import { Logger } from "@/services/logging/Logger"
import type { GlobalStateManager } from "../managers/global_state_manager"
import type { SecretsManager } from "../managers/secrets_manager"
import type { TaskStateManager } from "../managers/task_state_manager"
import type { WorkspaceStateManager } from "../managers/workspace_state_manager"
import type { GlobalStateAndSettingsKey, LocalStateKey, SecretKey, SettingsKey } from "../state-keys"
import type { PersistenceConfig, PersistenceErrorEvent } from "../types/state_manager_types"

/**
 * Coordinates debounced persistence across all state managers
 * Batches changes and writes them after a delay to reduce I/O
 */
export class PersistenceCoordinator {
	private pendingGlobalState = new Set<GlobalStateAndSettingsKey>()
	private pendingTaskState = new Map<string, Set<SettingsKey>>()
	private pendingSecrets = new Set<SecretKey>()
	private pendingWorkspaceState = new Set<LocalStateKey>()
	private persistenceTimeout: NodeJS.Timeout | null = null

	private readonly config: PersistenceConfig

	// Callback for persistence errors
	onPersistenceError?: (event: PersistenceErrorEvent) => void

	constructor(
		private readonly globalStateManager: GlobalStateManager,
		private readonly taskStateManager: TaskStateManager,
		private readonly secretsManager: SecretsManager,
		private readonly workspaceStateManager: WorkspaceStateManager,
		config?: Partial<PersistenceConfig>,
	) {
		this.config = {
			delayMs: config?.delayMs ?? 500,
		}
	}

	/**
	 * Schedule a global state key for persistence
	 */
	scheduleGlobalState(key: GlobalStateAndSettingsKey): void {
		this.pendingGlobalState.add(key)
		this.schedulePersistence()
	}

	/**
	 * Schedule multiple global state keys for persistence
	 */
	scheduleGlobalStateBatch(keys: GlobalStateAndSettingsKey[]): void {
		keys.forEach((key) => this.pendingGlobalState.add(key))
		this.schedulePersistence()
	}

	/**
	 * Schedule a task setting for persistence
	 */
	scheduleTaskState(taskId: string, key: SettingsKey): void {
		if (!this.pendingTaskState.has(taskId)) {
			this.pendingTaskState.set(taskId, new Set())
		}
		this.pendingTaskState.get(taskId)!.add(key)
		this.schedulePersistence()
	}

	/**
	 * Schedule multiple task settings for persistence
	 */
	scheduleTaskStateBatch(taskId: string, keys: SettingsKey[]): void {
		if (!this.pendingTaskState.has(taskId)) {
			this.pendingTaskState.set(taskId, new Set())
		}
		keys.forEach((key) => this.pendingTaskState.get(taskId)!.add(key))
		this.schedulePersistence()
	}

	/**
	 * Schedule a secret for persistence
	 */
	scheduleSecret(key: SecretKey): void {
		this.pendingSecrets.add(key)
		this.schedulePersistence()
	}

	/**
	 * Schedule multiple secrets for persistence
	 */
	scheduleSecretsBatch(keys: SecretKey[]): void {
		keys.forEach((key) => this.pendingSecrets.add(key))
		this.schedulePersistence()
	}

	/**
	 * Schedule a workspace state key for persistence
	 */
	scheduleWorkspaceState(key: LocalStateKey): void {
		this.pendingWorkspaceState.add(key)
		this.schedulePersistence()
	}

	/**
	 * Schedule multiple workspace state keys for persistence
	 */
	scheduleWorkspaceStateBatch(keys: LocalStateKey[]): void {
		keys.forEach((key) => this.pendingWorkspaceState.add(key))
		this.schedulePersistence()
	}

	/**
	 * Persist pending task state immediately
	 * Used when clearing task settings to ensure changes are saved
	 */
	async persistTaskStateImmediate(): Promise<void> {
		if (this.pendingTaskState.size === 0) {
			return
		}

		try {
			await this.persistTaskStateBatch()
			this.pendingTaskState.clear()
		} catch (error) {
			Logger.error(
				"[PersistenceCoordinator] Failed to persist task state immediately",
				error instanceof Error ? error : new Error(String(error)),
			)
			throw error
		}
	}

	/**
	 * Clear all pending persistence operations
	 */
	clearPending(): void {
		if (this.persistenceTimeout) {
			clearTimeout(this.persistenceTimeout)
			this.persistenceTimeout = null
		}
		this.pendingGlobalState.clear()
		this.pendingTaskState.clear()
		this.pendingSecrets.clear()
		this.pendingWorkspaceState.clear()
	}

	/**
	 * Schedule debounced persistence
	 */
	private schedulePersistence(): void {
		// Clear existing timeout if one is pending
		if (this.persistenceTimeout) {
			clearTimeout(this.persistenceTimeout)
		}

		// Schedule a new timeout to persist pending changes
		this.persistenceTimeout = setTimeout(async () => {
			try {
				await Promise.all([
					this.globalStateManager.persistBatch(this.pendingGlobalState),
					this.persistTaskStateBatch(),
					this.secretsManager.persistBatch(this.pendingSecrets),
					this.workspaceStateManager.persistBatch(this.pendingWorkspaceState),
				])

				// Clear pending sets on successful persistence
				this.clearPending()
			} catch (error) {
				Logger.error(
					"[PersistenceCoordinator] Failed to persist pending changes",
					error instanceof Error ? error : new Error(String(error)),
				)
				this.persistenceTimeout = null

				// Call persistence error callback for error recovery
				this.onPersistenceError?.({ error: error as Error })
			}
		}, this.config.delayMs)
	}

	/**
	 * Persist task state batch for all pending tasks
	 */
	private async persistTaskStateBatch(): Promise<void> {
		if (this.pendingTaskState.size === 0) {
			return
		}

		await Promise.all(
			Array.from(this.pendingTaskState.entries()).map(([taskId, keys]) => {
				if (keys.size === 0) {
					return Promise.resolve()
				}
				return this.taskStateManager.persistBatch(taskId, keys)
			}),
		)
	}
}
