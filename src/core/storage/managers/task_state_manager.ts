import { HostProvider } from "@/hosts/host-provider"
import { Logger } from "@/services/logging/Logger"
import { ShowMessageType } from "@/shared/proto/index.host"
import { readTaskSettingsFromStorage, writeTaskSettingsToStorage } from "../disk"
import { STATE_MANAGER_NOT_INITIALIZED } from "../error-messages"
import type { Settings, SettingsKey } from "../state-keys"

/**
 * Manages task-specific settings with in-memory caching
 * Task settings can override global settings for a specific task
 */
export class TaskStateManager {
	private cache: Partial<Settings> = {}
	private isInitialized = false

	constructor() {}

	/**
	 * Initialize the manager
	 */
	initialize(): void {
		if (this.isInitialized) {
			throw new Error("TaskStateManager has already been initialized")
		}
		this.isInitialized = true
	}

	/**
	 * Set a single task setting
	 */
	set<K extends keyof Settings>(key: K, value: Settings[K]): void {
		this.ensureInitialized()
		this.cache[key] = value
	}

	/**
	 * Batch set multiple task settings
	 */
	setBatch(updates: Partial<Settings>): void {
		this.ensureInitialized()
		Object.assign(this.cache, updates)
	}

	/**
	 * Get a task setting from cache
	 */
	get<K extends keyof Settings>(key: K): Settings[K] | undefined {
		this.ensureInitialized()
		return this.cache[key]
	}

	/**
	 * Get all cached settings keys
	 */
	getAllKeys(): SettingsKey[] {
		this.ensureInitialized()
		return Object.keys(this.cache) as SettingsKey[]
	}

	/**
	 * Load task settings from disk into cache
	 */
	async load(taskId: string): Promise<void> {
		this.ensureInitialized()

		try {
			const taskSettings = await readTaskSettingsFromStorage(taskId)
			Object.assign(this.cache, taskSettings)
		} catch (error) {
			Logger.error(
				"[TaskStateManager] Failed to load task settings",
				error instanceof Error ? error : new Error(String(error)),
			)
			HostProvider.window.showMessage({
				type: ShowMessageType.ERROR,
				message: `Failed to load task settings, defaulting to globally selected settings.`,
			})
		}
	}

	/**
	 * Persist a batch of task settings to disk
	 */
	async persistBatch(taskId: string, keys: Set<SettingsKey>): Promise<void> {
		this.ensureInitialized()

		if (keys.size === 0) {
			return
		}

		try {
			const settingsToWrite: Record<string, any> = {}
			for (const key of keys) {
				const value = this.cache[key]
				if (value !== undefined) {
					settingsToWrite[key] = value
				}
			}
			await writeTaskSettingsToStorage(taskId, settingsToWrite)
		} catch (error) {
			Logger.error("[TaskStateManager] Failed to persist batch", error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * Clear the task settings cache
	 */
	clear(): void {
		this.cache = {}
	}

	/**
	 * Clear and reinitialize
	 */
	reset(): void {
		this.cache = {}
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
