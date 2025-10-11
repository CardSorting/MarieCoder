import type { ExtensionContext } from "vscode"
import { Logger } from "@/services/logging/Logger"
import { STATE_MANAGER_NOT_INITIALIZED } from "../error-messages"
import type { LocalState, LocalStateKey } from "../state-keys"

/**
 * Manages workspace-scoped state with in-memory caching
 * State is scoped to the current workspace
 */
export class WorkspaceStateManager {
	private cache: LocalState = {} as LocalState
	private isInitialized = false

	constructor(private readonly context: ExtensionContext) {}

	/**
	 * Initialize cache with workspace state from disk
	 */
	initialize(workspaceState: LocalState): void {
		if (this.isInitialized) {
			throw new Error("WorkspaceStateManager has already been initialized")
		}
		Object.assign(this.cache, workspaceState)
		this.isInitialized = true
	}

	/**
	 * Set a single workspace state key
	 */
	set<K extends keyof LocalState>(key: K, value: LocalState[K]): void {
		this.ensureInitialized()
		this.cache[key] = value
	}

	/**
	 * Batch set multiple workspace state keys
	 */
	setBatch(updates: Partial<LocalState>): void {
		this.ensureInitialized()
		Object.entries(updates).forEach(([key, value]) => {
			this.cache[key as keyof LocalState] = value
		})
	}

	/**
	 * Get a workspace state key from cache
	 */
	get<K extends keyof LocalState>(key: K): LocalState[K] {
		this.ensureInitialized()
		return this.cache[key]
	}

	/**
	 * Get all cached workspace state keys
	 */
	getAllCachedKeys(): LocalStateKey[] {
		this.ensureInitialized()
		return Object.keys(this.cache) as LocalStateKey[]
	}

	/**
	 * Get all workspace state keys (including uncached ones)
	 * This includes dynamic keys not in the LocalState type
	 */
	getAllKeys(): readonly string[] {
		this.ensureInitialized()
		return this.context.workspaceState.keys()
	}

	/**
	 * Clear an arbitrary workspace state key
	 * Used for cleanup operations (migrations, orphaned key removal)
	 */
	clearArbitraryKey(key: string): void {
		this.ensureInitialized()
		this.context.workspaceState.update(key, undefined)
	}

	/**
	 * Persist a batch of workspace state keys to disk
	 */
	async persistBatch(keys: Set<LocalStateKey>): Promise<void> {
		this.ensureInitialized()

		try {
			await Promise.all(
				Array.from(keys).map((key) => {
					const value = this.cache[key]
					return this.context.workspaceState.update(key, value)
				}),
			)
		} catch (error) {
			Logger.error(
				"[WorkspaceStateManager] Failed to persist batch",
				error instanceof Error ? error : new Error(String(error)),
			)
			throw error
		}
	}

	/**
	 * Clear all cached state (for reinitialization)
	 */
	clear(): void {
		this.cache = {} as LocalState
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
