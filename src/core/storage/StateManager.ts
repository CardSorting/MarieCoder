import { ApiConfiguration } from "@shared/api"
import chokidar, { FSWatcher } from "chokidar"
import type { ExtensionContext } from "vscode"
import { HostProvider } from "@/hosts/host-provider"
import { Logger } from "@/services/logging/Logger"
import { ShowMessageType } from "@/shared/proto/index.host"
import {
	getTaskHistoryStateFilePath,
	readTaskHistoryFromState,
	readTaskSettingsFromStorage,
	writeTaskHistoryToState,
	writeTaskSettingsToStorage,
} from "./disk"
import { STATE_MANAGER_NOT_INITIALIZED } from "./error-messages"
import {
	GlobalState,
	GlobalStateAndSettings,
	GlobalStateAndSettingsKey,
	GlobalStateKey,
	LocalState,
	LocalStateKey,
	SecretKey,
	Secrets,
	Settings,
	SettingsKey,
} from "./state-keys"
import { readGlobalStateFromDisk, readSecretsFromDisk, readWorkspaceStateFromDisk } from "./utils/state-helpers"
export interface PersistenceErrorEvent {
	error: Error
}

/**
 * In-memory state manager for fast state access
 * Provides immediate reads/writes with async disk persistence
 */
export class StateManager {
	private static instance: StateManager | null = null

	private globalStateCache: GlobalStateAndSettings = {} as GlobalStateAndSettings
	private taskStateCache: Partial<Settings> = {}
	private secretsCache: Secrets = {} as Secrets
	private workspaceStateCache: LocalState = {} as LocalState
	private context: ExtensionContext
	private isInitialized = false

	// Debounced persistence state
	private pendingGlobalState = new Set<GlobalStateAndSettingsKey>()
	private pendingTaskState = new Map<string, Set<SettingsKey>>()
	private pendingSecrets = new Set<SecretKey>()
	private pendingWorkspaceState = new Set<LocalStateKey>()
	private persistenceTimeout: NodeJS.Timeout | null = null
	private readonly PERSISTENCE_DELAY_MS = 500
	private taskHistoryWatcher: FSWatcher | null = null

	// Callback for persistence errors
	onPersistenceError?: (event: PersistenceErrorEvent) => void

	// Callback to sync external state changes with the UI client
	onSyncExternalChange?: () => void | Promise<void>

	private constructor(context: ExtensionContext) {
		this.context = context
	}

	/**
	 * Initialize the cache by loading data from disk
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

			// Populate the cache with all extension state and secrets fields
			// Use populate method to avoid triggering persistence during initialization
			StateManager.instance.populateCache(globalState, secrets, workspaceState)

			// Start watcher for taskHistory.json so external edits update cache (no persist loop)
			await StateManager.instance.setupTaskHistoryWatcher()

			StateManager.instance.isInitialized = true
		} catch (error) {
			Logger.error("[StateManager] Failed to initialize", error instanceof Error ? error : new Error(String(error)))
			throw error
		}

		return StateManager.instance
	}

	public static get(): StateManager {
		if (!StateManager.instance) {
			throw new Error("StateManager has not been initialized")
		}
		return StateManager.instance
	}

	/**
	 * Register callbacks for state manager events
	 */
	public registerCallbacks(callbacks: {
		onPersistenceError?: (event: PersistenceErrorEvent) => void | Promise<void>
		onSyncExternalChange?: () => void | Promise<void>
	}): void {
		if (callbacks.onPersistenceError) {
			this.onPersistenceError = callbacks.onPersistenceError
		}
		if (callbacks.onSyncExternalChange) {
			this.onSyncExternalChange = callbacks.onSyncExternalChange
		}
	}

	/**
	 * Set method for global state keys - updates cache immediately and schedules debounced persistence
	 */
	setGlobalState<K extends keyof GlobalStateAndSettings>(key: K, value: GlobalStateAndSettings[K]): void {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		// Update cache immediately for instant access
		this.globalStateCache[key] = value

		// Add to pending persistence set and schedule debounced write
		this.pendingGlobalState.add(key)
		this.scheduleDebouncedPersistence()
	}

	/**
	 * Batch set method for global state keys - updates cache immediately and schedules debounced persistence
	 */
	setGlobalStateBatch(updates: Partial<GlobalStateAndSettings>): void {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		// Update cache in one go
		// Using object.assign to because typescript is not able to infer the type of the updates object when using Object.entries
		Object.assign(this.globalStateCache, updates)

		// Then track the keys for persistence
		Object.keys(updates).forEach((key) => {
			this.pendingGlobalState.add(key as GlobalStateKey)
		})

		// Schedule debounced persistence
		this.scheduleDebouncedPersistence()
	}

	/**
	 * Set method for task settings keys - updates cache immediately and schedules debounced persistence
	 */
	setTaskSettings<K extends keyof Settings>(taskId: string, key: K, value: Settings[K]): void {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		// Update cache immediately for instant access
		this.taskStateCache[key] = value

		// Add to pending persistence set and schedule debounced write
		if (!this.pendingTaskState.has(taskId)) {
			this.pendingTaskState.set(taskId, new Set())
		}
		this.pendingTaskState.get(taskId)!.add(key)
		this.scheduleDebouncedPersistence()
	}

	/**
	 * Batch set method for task settings keys - updates cache immediately and schedules debounced persistence
	 */
	setTaskSettingsBatch(taskId: string, updates: Partial<Settings>): void {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		// Update cache in one go
		Object.assign(this.taskStateCache, updates)

		// Then track the keys for persistence
		if (!this.pendingTaskState.has(taskId)) {
			this.pendingTaskState.set(taskId, new Set())
		}
		Object.keys(updates).forEach((key) => {
			this.pendingTaskState.get(taskId)!.add(key as SettingsKey)
		})

		// Schedule debounced persistence
		this.scheduleDebouncedPersistence()
	}

	/**
	 * Load task settings from disk into cache
	 */
	async loadTaskSettings(taskId: string): Promise<void> {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		try {
			const taskSettings = await readTaskSettingsFromStorage(taskId)
			// Populate task cache with loaded settings
			Object.assign(this.taskStateCache, taskSettings)
		} catch (error) {
			// If reading fails, just use empty cache

			Logger.error("[StateManager] Failed to load task settings", error instanceof Error ? error : new Error(String(error)))
			HostProvider.window.showMessage({
				type: ShowMessageType.ERROR,
				message: `Failed to load task settings, defaulting to globally selected settings.`,
			})
		}
	}

	/**
	 * Clear task settings cache - ensures pending changes are persisted first
	 */
	async clearTaskSettings(): Promise<void> {
		// If there are pending task settings, persist them first
		if (this.pendingTaskState.size > 0) {
			try {
				// Persist pending task state immediately
				await this.persistTaskStateBatch(this.pendingTaskState)
				// Clear pending set after successful persistence
				this.pendingTaskState.clear()
			} catch (error) {
				Logger.error(
					"[StateManager] Failed to persist task settings before clearing",
					error instanceof Error ? error : new Error(String(error)),
				)
				// If persistence fails, we just move on with clearing the in-memory state.
				// clearTaskSettings realistically probably won't be called in the small window of time between task settings being set and their persistence anyways
			}
		}

		this.taskStateCache = {}
		this.pendingTaskState.clear()
	}

	/**
	 * Set method for secret keys - updates cache immediately and schedules debounced persistence
	 */
	setSecret<K extends keyof Secrets>(key: K, value: Secrets[K]): void {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		// Update cache immediately for instant access
		this.secretsCache[key] = value

		// Add to pending persistence set and schedule debounced write
		this.pendingSecrets.add(key)
		this.scheduleDebouncedPersistence()
	}

	/**
	 * Batch set method for secret keys - updates cache immediately and schedules debounced persistence
	 */
	setSecretsBatch(updates: Partial<Secrets>): void {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		// Update cache immediately for all keys
		Object.entries(updates).forEach(([key, value]) => {
			this.secretsCache[key as keyof Secrets] = value
			this.pendingSecrets.add(key as SecretKey)
		})

		// Schedule debounced persistence
		this.scheduleDebouncedPersistence()
	}

	/**
	 * Set method for workspace state keys - updates cache immediately and schedules debounced persistence
	 */
	setWorkspaceState<K extends keyof LocalState>(key: K, value: LocalState[K]): void {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		// Update cache immediately for instant access
		this.workspaceStateCache[key] = value

		// Add to pending persistence set and schedule debounced write
		this.pendingWorkspaceState.add(key)
		this.scheduleDebouncedPersistence()
	}

	/**
	 * Batch set method for workspace state keys - updates cache immediately and schedules debounced persistence
	 */
	setWorkspaceStateBatch(updates: Partial<LocalState>): void {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		// Update cache immediately for all keys
		Object.entries(updates).forEach(([key, value]) => {
			this.workspaceStateCache[key as keyof LocalState] = value
			this.pendingWorkspaceState.add(key as LocalStateKey)
		})

		// Schedule debounced persistence
		this.scheduleDebouncedPersistence()
	}

	/**
	 * Clears an arbitrary workspace state key by setting it to undefined
	 *
	 * This is a low-level method for cleanup operations (migrations, orphaned key removal).
	 * Use only for keys that don't fit the typed LocalState interface.
	 *
	 * @param key - The workspace state key to clear
	 */
	clearArbitraryWorkspaceStateKey(key: string): void {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		// Directly access the underlying VSCode workspace state API
		// This bypasses the typed interface for cleanup operations
		this.context.workspaceState.update(key, undefined)
	}

	/**
	 * Gets all workspace state keys
	 *
	 * This is a low-level method for cleanup operations where you need to iterate
	 * over all keys, including dynamic ones not in the LocalState type.
	 *
	 * @returns Array of all workspace state keys
	 */
	getAllWorkspaceStateKeys(): readonly string[] {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		return this.context.workspaceState.keys()
	}

	/**
	 * Initialize chokidar watcher for the taskHistory.json file
	 * Updates in-memory cache on external changes without writing back to disk.
	 */
	private async setupTaskHistoryWatcher(): Promise<void> {
		try {
			const historyFile = await getTaskHistoryStateFilePath()

			// Close any existing watcher before creating a new one
			if (this.taskHistoryWatcher) {
				await this.taskHistoryWatcher.close()
				this.taskHistoryWatcher = null
			}

			this.taskHistoryWatcher = chokidar.watch(historyFile, {
				persistent: true,
				ignoreInitial: true,
				atomic: true,
				awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
			})

			const syncTaskHistoryFromDisk = async () => {
				try {
					if (!this.isInitialized) {
						return
					}
					const onDisk = await readTaskHistoryFromState()
					const cached = this.globalStateCache["taskHistory"]
					if (JSON.stringify(onDisk) !== JSON.stringify(cached)) {
						this.globalStateCache["taskHistory"] = onDisk
						await this.onSyncExternalChange?.()
					}
				} catch (err) {
					Logger.error(
						"[StateManager] Failed to reload task history on change",
						err instanceof Error ? err : new Error(String(err)),
					)
				}
			}

			this.taskHistoryWatcher
				.on("add", () => syncTaskHistoryFromDisk())
				.on("change", () => syncTaskHistoryFromDisk())
				.on("unlink", async () => {
					this.globalStateCache["taskHistory"] = []
					await this.onSyncExternalChange?.()
				})
				.on("error", (error) =>
					Logger.error(
						"[StateManager] TaskHistory watcher error",
						error instanceof Error ? error : new Error(String(error)),
					),
				)
		} catch (err) {
			Logger.error(
				"[StateManager] Failed to set up taskHistory watcher",
				err instanceof Error ? err : new Error(String(err)),
			)
		}
	}

	/**
	 * Convenience method for getting API configuration
	 * Ensures cache is initialized if not already done
	 */
	getApiConfiguration(): ApiConfiguration {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		// Construct API configuration from cached component keys
		return this.constructApiConfigurationFromCache()
	}

	/**
	 * Convenience method for setting API configuration
	 */
	setApiConfiguration(apiConfiguration: ApiConfiguration): void {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}

		const {
			apiKey,
			openRouterApiKey,
			anthropicBaseUrl,
			openRouterProviderSorting,
			requestTimeoutMs,
			// Plan mode configurations
			planModeApiProvider,
			planModeApiModelId,
			planModeThinkingBudgetTokens,
			planModeReasoningEffort,
			planModeOpenRouterModelId,
			planModeOpenRouterModelInfo,
			// Act mode configurations
			actModeApiProvider,
			actModeApiModelId,
			actModeThinkingBudgetTokens,
			actModeReasoningEffort,
			actModeOpenRouterModelId,
			actModeOpenRouterModelInfo,
		} = apiConfiguration

		// Batch update global state keys
		this.setGlobalStateBatch({
			// Plan mode configuration updates
			planModeApiProvider,
			planModeApiModelId,
			planModeThinkingBudgetTokens,
			planModeReasoningEffort,
			planModeOpenRouterModelId,
			planModeOpenRouterModelInfo,

			// Act mode configuration updates
			actModeApiProvider,
			actModeApiModelId,
			actModeThinkingBudgetTokens,
			actModeReasoningEffort,
			actModeOpenRouterModelId,
			actModeOpenRouterModelInfo,

			// Global state updates
			anthropicBaseUrl,
			openRouterProviderSorting,
			requestTimeoutMs,
		})

		// Batch update secrets
		this.setSecretsBatch({
			apiKey,
			openRouterApiKey,
		})
	}

	/**
	 * Get method for global settings keys - reads from in-memory cache
	 */
	getGlobalSettingsKey<K extends keyof Settings>(key: K): Settings[K] {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}
		if (this.taskStateCache[key] !== undefined) {
			return this.taskStateCache[key] as Settings[K]
		}
		return this.globalStateCache[key]
	}

	/**
	 * Get method for global state keys - reads from in-memory cache
	 */
	getGlobalStateKey<K extends keyof GlobalState>(key: K): GlobalState[K] {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}
		return this.globalStateCache[key]
	}

	/**
	 * Get method for secret keys - reads from in-memory cache
	 */
	getSecretKey<K extends keyof Secrets>(key: K): Secrets[K] {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}
		return this.secretsCache[key]
	}

	/**
	 * Get method for workspace state keys - reads from in-memory cache
	 */
	getWorkspaceStateKey<K extends keyof LocalState>(key: K): LocalState[K] {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}
		return this.workspaceStateCache[key]
	}

	/**
	 * Reinitialize the state manager by clearing all state and reloading from disk
	 * Used for error recovery when write operations fail
	 */
	async reInitialize(currentTaskId?: string): Promise<void> {
		// Clear all cached data and pending state
		this.dispose()

		// Reinitialize from disk
		await StateManager.initialize(this.context)

		// If there's an active task, reload its settings
		if (currentTaskId) {
			await this.loadTaskSettings(currentTaskId)
		}
	}

	/**
	 * Dispose of the state manager
	 */
	private dispose(): void {
		if (this.persistenceTimeout) {
			clearTimeout(this.persistenceTimeout)
			this.persistenceTimeout = null
		}
		// Close file watcher if active
		if (this.taskHistoryWatcher) {
			this.taskHistoryWatcher.close()
			this.taskHistoryWatcher = null
		}

		this.pendingGlobalState.clear()
		this.pendingSecrets.clear()
		this.pendingWorkspaceState.clear()
		this.pendingTaskState.clear()

		this.globalStateCache = {} as GlobalStateAndSettings
		this.secretsCache = {} as Secrets
		this.workspaceStateCache = {} as LocalState
		this.taskStateCache = {}

		this.isInitialized = false
	}

	/**
	 * Schedule debounced persistence - simple timeout-based persistence
	 */
	private scheduleDebouncedPersistence(): void {
		// Clear existing timeout if one is pending
		if (this.persistenceTimeout) {
			clearTimeout(this.persistenceTimeout)
		}

		// Schedule a new timeout to persist pending changes
		this.persistenceTimeout = setTimeout(async () => {
			try {
				await Promise.all([
					this.persistGlobalStateBatch(this.pendingGlobalState),
					this.persistSecretsBatch(this.pendingSecrets),
					this.persistWorkspaceStateBatch(this.pendingWorkspaceState),
					this.persistTaskStateBatch(this.pendingTaskState),
				])

				// Clear pending sets on successful persistence
				this.pendingGlobalState.clear()
				this.pendingSecrets.clear()
				this.pendingWorkspaceState.clear()
				this.pendingTaskState.clear()
				this.persistenceTimeout = null
			} catch (error) {
				Logger.error(
					"[StateManager] Failed to persist pending changes",
					error instanceof Error ? error : new Error(String(error)),
				)
				this.persistenceTimeout = null

				// Call persistence error callback for error recovery
				this.onPersistenceError?.({ error: error })
			}
		}, this.PERSISTENCE_DELAY_MS)
	}

	/**
	 * Private method to batch persist global state keys with Promise.all
	 */
	private async persistGlobalStateBatch(keys: Set<GlobalStateAndSettingsKey>): Promise<void> {
		try {
			await Promise.all(
				Array.from(keys).map((key) => {
					if (key === "taskHistory") {
						// Route task history persistence to file, not VS Code globalState
						return writeTaskHistoryToState(this.globalStateCache[key])
					}
					return this.context.globalState.update(key, this.globalStateCache[key])
				}),
			)
		} catch (error) {
			Logger.error(
				"[StateManager] Failed to persist global state batch",
				error instanceof Error ? error : new Error(String(error)),
			)
			throw error
		}
	}

	/**
	 * Private method to batch persist task state keys with a single write operation
	 */
	private async persistTaskStateBatch(pendingTaskStates: Map<string, Set<SettingsKey>>): Promise<void> {
		if (pendingTaskStates.size === 0) {
			return
		}
		try {
			// Persist each task's settings
			await Promise.all(
				Array.from(pendingTaskStates.entries()).map(([taskId, keys]) => {
					if (keys.size === 0) {
						return Promise.resolve()
					}
					const settingsToWrite: Record<string, any> = {}
					for (const key of keys) {
						const value = this.taskStateCache[key]
						if (value !== undefined) {
							settingsToWrite[key] = value
						}
					}
					return writeTaskSettingsToStorage(taskId, settingsToWrite)
				}),
			)
		} catch (error) {
			Logger.error(
				"[StateManager] Failed to persist task settings batch",
				error instanceof Error ? error : new Error(String(error)),
			)
			throw error
		}
	}

	/**
	 * Private method to batch persist secrets with Promise.all
	 */
	private async persistSecretsBatch(keys: Set<SecretKey>): Promise<void> {
		try {
			await Promise.all(
				Array.from(keys).map((key) => {
					const value = this.secretsCache[key]
					if (value) {
						return this.context.secrets.store(key, value)
					} else {
						return this.context.secrets.delete(key)
					}
				}),
			)
		} catch (error) {
			Logger.error("Failed to persist secrets batch", error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * Private method to batch persist workspace state keys with Promise.all
	 */
	private async persistWorkspaceStateBatch(keys: Set<LocalStateKey>): Promise<void> {
		try {
			await Promise.all(
				Array.from(keys).map((key) => {
					const value = this.workspaceStateCache[key]
					return this.context.workspaceState.update(key, value)
				}),
			)
		} catch (error) {
			Logger.error("Failed to persist workspace state batch", error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * Private method to populate cache with all extension state without triggering persistence
	 * Used during initialization
	 */
	private populateCache(globalState: GlobalState, secrets: Secrets, workspaceState: LocalState): void {
		Object.assign(this.globalStateCache, globalState)
		Object.assign(this.secretsCache, secrets)
		Object.assign(this.workspaceStateCache, workspaceState)
	}

	/**
	 * Construct API configuration from cached component keys
	 */
	private constructApiConfigurationFromCache(): ApiConfiguration {
		return {
			// Secrets
			apiKey: this.secretsCache["apiKey"],
			openRouterApiKey: this.secretsCache["openRouterApiKey"],

			// Global state
			anthropicBaseUrl: this.taskStateCache["anthropicBaseUrl"] || this.globalStateCache["anthropicBaseUrl"],
			openRouterProviderSorting:
				this.taskStateCache["openRouterProviderSorting"] || this.globalStateCache["openRouterProviderSorting"],
			requestTimeoutMs: this.taskStateCache["requestTimeoutMs"] || this.globalStateCache["requestTimeoutMs"],

			// Plan mode configurations
			planModeApiProvider: this.taskStateCache["planModeApiProvider"] || this.globalStateCache["planModeApiProvider"],
			planModeApiModelId: this.taskStateCache["planModeApiModelId"] || this.globalStateCache["planModeApiModelId"],
			planModeThinkingBudgetTokens:
				this.taskStateCache["planModeThinkingBudgetTokens"] || this.globalStateCache["planModeThinkingBudgetTokens"],
			planModeReasoningEffort:
				this.taskStateCache["planModeReasoningEffort"] || this.globalStateCache["planModeReasoningEffort"],
			planModeOpenRouterModelId:
				this.taskStateCache["planModeOpenRouterModelId"] || this.globalStateCache["planModeOpenRouterModelId"],
			planModeOpenRouterModelInfo:
				this.taskStateCache["planModeOpenRouterModelInfo"] || this.globalStateCache["planModeOpenRouterModelInfo"],

			// Act mode configurations
			actModeApiProvider: this.taskStateCache["actModeApiProvider"] || this.globalStateCache["actModeApiProvider"],
			actModeApiModelId: this.taskStateCache["actModeApiModelId"] || this.globalStateCache["actModeApiModelId"],
			actModeThinkingBudgetTokens:
				this.taskStateCache["actModeThinkingBudgetTokens"] || this.globalStateCache["actModeThinkingBudgetTokens"],
			actModeReasoningEffort:
				this.taskStateCache["actModeReasoningEffort"] || this.globalStateCache["actModeReasoningEffort"],
			actModeOpenRouterModelId:
				this.taskStateCache["actModeOpenRouterModelId"] || this.globalStateCache["actModeOpenRouterModelId"],
			actModeOpenRouterModelInfo:
				this.taskStateCache["actModeOpenRouterModelInfo"] || this.globalStateCache["actModeOpenRouterModelInfo"],
		}
	}
}
