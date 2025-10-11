import type { ExtensionContext } from "vscode"
import { Logger } from "@/services/logging/Logger"
import { writeTaskHistoryToState } from "../disk"
import { STATE_MANAGER_NOT_INITIALIZED } from "../error-messages"
import type { GlobalState, GlobalStateAndSettings, GlobalStateAndSettingsKey } from "../state-keys"

/**
 * Manages global state operations with in-memory caching
 * Handles both global state and global settings
 */
export class GlobalStateManager {
	private cache: GlobalStateAndSettings = {} as GlobalStateAndSettings
	private isInitialized = false

	constructor(private readonly context: ExtensionContext) {}

	/**
	 * Initialize cache with data from disk
	 */
	initialize(globalState: GlobalState): void {
		if (this.isInitialized) {
			throw new Error("GlobalStateManager has already been initialized")
		}
		Object.assign(this.cache, globalState)
		this.isInitialized = true
	}

	/**
	 * Set a single global state key
	 */
	set<K extends keyof GlobalStateAndSettings>(key: K, value: GlobalStateAndSettings[K]): void {
		this.ensureInitialized()
		this.cache[key] = value
	}

	/**
	 * Batch set multiple global state keys
	 */
	setBatch(updates: Partial<GlobalStateAndSettings>): void {
		this.ensureInitialized()
		Object.assign(this.cache, updates)
	}

	/**
	 * Get a global state key
	 */
	getStateKey<K extends keyof GlobalState>(key: K): GlobalState[K] {
		this.ensureInitialized()
		return this.cache[key]
	}

	/**
	 * Get a global settings key (may be overridden by task settings)
	 */
	getSettingsKey<K extends keyof GlobalStateAndSettings>(key: K): GlobalStateAndSettings[K] {
		this.ensureInitialized()
		return this.cache[key]
	}

	/**
	 * Get all cached state keys
	 */
	getAllKeys(): GlobalStateAndSettingsKey[] {
		this.ensureInitialized()
		return Object.keys(this.cache) as GlobalStateAndSettingsKey[]
	}

	/**
	 * Get cached value for a specific key
	 */
	getCachedValue<K extends keyof GlobalStateAndSettings>(key: K): GlobalStateAndSettings[K] {
		this.ensureInitialized()
		return this.cache[key]
	}

	/**
	 * Persist a batch of global state keys to disk
	 */
	async persistBatch(keys: Set<GlobalStateAndSettingsKey>): Promise<void> {
		this.ensureInitialized()

		try {
			await Promise.all(
				Array.from(keys).map((key) => {
					if (key === "taskHistory") {
						// Task history persists to file, not VS Code globalState
						return writeTaskHistoryToState(this.cache[key])
					}
					return this.context.globalState.update(key, this.cache[key])
				}),
			)
		} catch (error) {
			Logger.error(
				"[GlobalStateManager] Failed to persist batch",
				error instanceof Error ? error : new Error(String(error)),
			)
			throw error
		}
	}

	/**
	 * Clear all cached state (for reinitialization)
	 */
	clear(): void {
		this.cache = {} as GlobalStateAndSettings
		this.isInitialized = false
	}

	/**
	 * Check if manager is initialized
	 */
	private ensureInitialized(): void {
		if (!this.isInitialized) {
			throw new Error(STATE_MANAGER_NOT_INITIALIZED)
		}
	}
}
