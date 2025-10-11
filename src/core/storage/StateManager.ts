import type { ApiConfiguration } from "@shared/api"
import type { ExtensionContext } from "vscode"
import { Logger } from "@/services/logging/Logger"
import { STATE_MANAGER_NOT_INITIALIZED } from "./error-messages"
import { GlobalStateManager } from "./managers/global_state_manager"
import { SecretsManager } from "./managers/secrets_manager"
import { TaskStateManager } from "./managers/task_state_manager"
import { WorkspaceStateManager } from "./managers/workspace_state_manager"
import { PersistenceCoordinator } from "./persistence/persistence_coordinator"
import { TaskHistoryWatcher } from "./persistence/task_history_watcher"
import { ApiConfigurationService } from "./services/api_configuration_service"
import type {
	GlobalState,
	GlobalStateAndSettings,
	GlobalStateAndSettingsKey,
	LocalState,
	LocalStateKey,
	SecretKey,
	Secrets,
	Settings,
	SettingsKey,
} from "./state-keys"
import type { StateManagerCallbacks } from "./types/state_manager_types"
import { readGlobalStateFromDisk, readSecretsFromDisk, readWorkspaceStateFromDisk } from "./utils/state-helpers"

// Re-export for backward compatibility
export type { PersistenceErrorEvent } from "./types/state_manager_types"

/**
 * Facade for state management operations
 * Delegates to specialized managers for clarity and maintainability
 *
 * Architecture:
 * - GlobalStateManager: Handles global state and settings
 * - TaskStateManager: Handles task-specific settings
 * - SecretsManager: Handles secure credentials
 * - WorkspaceStateManager: Handles workspace-scoped state
 * - PersistenceCoordinator: Handles debounced persistence
 * - TaskHistoryWatcher: Watches for external file changes
 * - ApiConfigurationService: Convenience layer for API config
 */
export class StateManager {
	private static instance: StateManager | null = null

	private readonly context: ExtensionContext
	private isInitialized = false

	// Specialized managers
	private readonly globalStateManager: GlobalStateManager
	private readonly taskStateManager: TaskStateManager
	private readonly secretsManager: SecretsManager
	private readonly workspaceStateManager: WorkspaceStateManager
	private readonly persistenceCoordinator: PersistenceCoordinator
	private readonly taskHistoryWatcher: TaskHistoryWatcher
	private readonly apiConfigService: ApiConfigurationService

	private constructor(context: ExtensionContext) {
		this.context = context

		// Initialize specialized managers
		this.globalStateManager = new GlobalStateManager(context)
		this.taskStateManager = new TaskStateManager()
		this.secretsManager = new SecretsManager(context)
		this.workspaceStateManager = new WorkspaceStateManager(context)

		this.persistenceCoordinator = new PersistenceCoordinator(
			this.globalStateManager,
			this.taskStateManager,
			this.secretsManager,
			this.workspaceStateManager,
		)

		this.taskHistoryWatcher = new TaskHistoryWatcher(this.globalStateManager)

		this.apiConfigService = new ApiConfigurationService(this.globalStateManager, this.taskStateManager, this.secretsManager)
	}

	/**
	 * Initialize the state manager by loading data from disk
	 */
	public static async initialize(context: ExtensionContext): Promise<StateManager> {
		if (!StateManager.instance) {
			StateManager.instance = new StateManager(context)
		}

		if (StateManager.instance.isInitialized) {
			throw new Error("StateManager has already been initialized.")
		}

		try {
			// Load all extension state from disk
			const globalState = await readGlobalStateFromDisk(StateManager.instance.context)
			const secrets = await readSecretsFromDisk(StateManager.instance.context)
			const workspaceState = await readWorkspaceStateFromDisk(StateManager.instance.context)

			// Initialize all managers with loaded data
			StateManager.instance.globalStateManager.initialize(globalState)
			StateManager.instance.taskStateManager.initialize()
			StateManager.instance.secretsManager.initialize(secrets)
			StateManager.instance.workspaceStateManager.initialize(workspaceState)

			// Start watcher for taskHistory.json so external edits update cache (no persist loop)
			await StateManager.instance.taskHistoryWatcher.start()

			StateManager.instance.isInitialized = true
		} catch (error) {
			Logger.error("[StateManager] Failed to initialize", error instanceof Error ? error : new Error(String(error)))
			throw error
		}

		return StateManager.instance
	}

	/**
	 * Get the singleton instance
	 */
	public static get(): StateManager {
		if (!StateManager.instance) {
			throw new Error("StateManager has not been initialized")
		}
		return StateManager.instance
	}

	/**
	 * Register callbacks for state manager events
	 */
	public registerCallbacks(callbacks: StateManagerCallbacks): void {
		if (callbacks.onPersistenceError) {
			this.persistenceCoordinator.onPersistenceError = callbacks.onPersistenceError
		}
		if (callbacks.onSyncExternalChange) {
			this.taskHistoryWatcher.onSyncExternalChange = callbacks.onSyncExternalChange
		}
	}

	// ==================== Global State Methods ====================

	/**
	 * Set a single global state key - updates cache immediately and schedules debounced persistence
	 */
	setGlobalState<K extends keyof GlobalStateAndSettings>(key: K, value: GlobalStateAndSettings[K]): void {
		this.ensureInitialized()
		this.globalStateManager.set(key, value)
		this.persistenceCoordinator.scheduleGlobalState(key)
	}

	/**
	 * Batch set multiple global state keys - updates cache immediately and schedules debounced persistence
	 */
	setGlobalStateBatch(updates: Partial<GlobalStateAndSettings>): void {
		this.ensureInitialized()
		this.globalStateManager.setBatch(updates)
		this.persistenceCoordinator.scheduleGlobalStateBatch(Object.keys(updates) as GlobalStateAndSettingsKey[])
	}

	/**
	 * Get a global state key from cache
	 */
	getGlobalStateKey<K extends keyof GlobalState>(key: K): GlobalState[K] {
		this.ensureInitialized()
		return this.globalStateManager.getStateKey(key)
	}

	/**
	 * Get a global settings key (may be overridden by task settings)
	 */
	getGlobalSettingsKey<K extends keyof Settings>(key: K): Settings[K] {
		this.ensureInitialized()
		const taskValue = this.taskStateManager.get(key)
		if (taskValue !== undefined) {
			return taskValue
		}
		return this.globalStateManager.getSettingsKey(key)
	}

	// ==================== Task Settings Methods ====================

	/**
	 * Set a single task setting - updates cache immediately and schedules debounced persistence
	 */
	setTaskSettings<K extends keyof Settings>(taskId: string, key: K, value: Settings[K]): void {
		this.ensureInitialized()
		this.taskStateManager.set(key, value)
		this.persistenceCoordinator.scheduleTaskState(taskId, key)
	}

	/**
	 * Batch set multiple task settings - updates cache immediately and schedules debounced persistence
	 */
	setTaskSettingsBatch(taskId: string, updates: Partial<Settings>): void {
		this.ensureInitialized()
		this.taskStateManager.setBatch(updates)
		this.persistenceCoordinator.scheduleTaskStateBatch(taskId, Object.keys(updates) as SettingsKey[])
	}

	/**
	 * Load task settings from disk into cache
	 */
	async loadTaskSettings(taskId: string): Promise<void> {
		this.ensureInitialized()
		await this.taskStateManager.load(taskId)
	}

	/**
	 * Clear task settings cache - ensures pending changes are persisted first
	 */
	async clearTaskSettings(): Promise<void> {
		this.ensureInitialized()

		// Persist pending task state immediately before clearing
		await this.persistenceCoordinator.persistTaskStateImmediate()

		// Clear the task state cache
		this.taskStateManager.clear()
	}

	// ==================== Secrets Methods ====================

	/**
	 * Set a single secret - updates cache immediately and schedules debounced persistence
	 */
	setSecret<K extends keyof Secrets>(key: K, value: Secrets[K]): void {
		this.ensureInitialized()
		this.secretsManager.set(key, value)
		this.persistenceCoordinator.scheduleSecret(key)
	}

	/**
	 * Batch set multiple secrets - updates cache immediately and schedules debounced persistence
	 */
	setSecretsBatch(updates: Partial<Secrets>): void {
		this.ensureInitialized()
		this.secretsManager.setBatch(updates)
		this.persistenceCoordinator.scheduleSecretsBatch(Object.keys(updates) as SecretKey[])
	}

	/**
	 * Get a secret from cache
	 */
	getSecretKey<K extends keyof Secrets>(key: K): Secrets[K] {
		this.ensureInitialized()
		return this.secretsManager.get(key)
	}

	// ==================== Workspace State Methods ====================

	/**
	 * Set a single workspace state key - updates cache immediately and schedules debounced persistence
	 */
	setWorkspaceState<K extends keyof LocalState>(key: K, value: LocalState[K]): void {
		this.ensureInitialized()
		this.workspaceStateManager.set(key, value)
		this.persistenceCoordinator.scheduleWorkspaceState(key)
	}

	/**
	 * Batch set multiple workspace state keys - updates cache immediately and schedules debounced persistence
	 */
	setWorkspaceStateBatch(updates: Partial<LocalState>): void {
		this.ensureInitialized()
		this.workspaceStateManager.setBatch(updates)
		this.persistenceCoordinator.scheduleWorkspaceStateBatch(Object.keys(updates) as LocalStateKey[])
	}

	/**
	 * Get a workspace state key from cache
	 */
	getWorkspaceStateKey<K extends keyof LocalState>(key: K): LocalState[K] {
		this.ensureInitialized()
		return this.workspaceStateManager.get(key)
	}

	/**
	 * Clear an arbitrary workspace state key by setting it to undefined
	 * Used for cleanup operations (migrations, orphaned key removal)
	 */
	clearArbitraryWorkspaceStateKey(key: string): void {
		this.ensureInitialized()
		this.workspaceStateManager.clearArbitraryKey(key)
	}

	/**
	 * Get all workspace state keys (including dynamic ones)
	 */
	getAllWorkspaceStateKeys(): readonly string[] {
		this.ensureInitialized()
		return this.workspaceStateManager.getAllKeys()
	}

	// ==================== API Configuration Methods ====================

	/**
	 * Get complete API configuration
	 */
	getApiConfiguration(): ApiConfiguration {
		this.ensureInitialized()
		return this.apiConfigService.getConfiguration()
	}

	/**
	 * Set API configuration - decomposes to appropriate state managers and schedules persistence
	 */
	setApiConfiguration(apiConfiguration: ApiConfiguration): void {
		this.ensureInitialized()

		const { globalStateKeys, secretKeys } = this.apiConfigService.setConfiguration(apiConfiguration)

		// Schedule persistence for all affected keys
		this.persistenceCoordinator.scheduleGlobalStateBatch(globalStateKeys as GlobalStateAndSettingsKey[])
		this.persistenceCoordinator.scheduleSecretsBatch(secretKeys as SecretKey[])
	}

	// ==================== Lifecycle Methods ====================

	/**
	 * Reinitialize the state manager by clearing all state and reloading from disk
	 * Used for error recovery when write operations fail
	 */
	async reInitialize(currentTaskId?: string): Promise<void> {
		// Clear all state
		this.dispose()

		// Reinitialize from disk
		await StateManager.initialize(this.context)

		// If there's an active task, reload its settings
		if (currentTaskId) {
			await this.loadTaskSettings(currentTaskId)
		}
	}

	/**
	 * Dispose of all managers and clear state
	 */
	private dispose(): void {
		// Stop file watcher
		this.taskHistoryWatcher.stop()

		// Clear pending persistence
		this.persistenceCoordinator.clearPending()

		// Clear all manager caches
		this.globalStateManager.clear()
		this.taskStateManager.reset()
		this.secretsManager.clear()
		this.workspaceStateManager.clear()

		this.isInitialized = false
	}

	/**
	 * Ensure the state manager is initialized
	 */
	private ensureInitialized(): void {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}
	}
}
