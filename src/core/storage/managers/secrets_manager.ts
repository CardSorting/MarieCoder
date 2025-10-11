import type { ExtensionContext } from "vscode"
import { Logger } from "@/services/logging/Logger"
import { STATE_MANAGER_NOT_INITIALIZED } from "../error-messages"
import type { SecretKey, Secrets } from "../state-keys"

/**
 * Manages secure credential storage with in-memory caching
 * Uses VS Code's secrets API for secure storage
 */
export class SecretsManager {
	private cache: Secrets = {} as Secrets
	private isInitialized = false

	constructor(private readonly context: ExtensionContext) {}

	/**
	 * Initialize cache with secrets from disk
	 */
	initialize(secrets: Secrets): void {
		if (this.isInitialized) {
			throw new Error("SecretsManager has already been initialized")
		}
		Object.assign(this.cache, secrets)
		this.isInitialized = true
	}

	/**
	 * Set a single secret
	 */
	set<K extends keyof Secrets>(key: K, value: Secrets[K]): void {
		this.ensureInitialized()
		this.cache[key] = value
	}

	/**
	 * Batch set multiple secrets
	 */
	setBatch(updates: Partial<Secrets>): void {
		this.ensureInitialized()
		Object.entries(updates).forEach(([key, value]) => {
			this.cache[key as keyof Secrets] = value
		})
	}

	/**
	 * Get a secret from cache
	 */
	get<K extends keyof Secrets>(key: K): Secrets[K] {
		this.ensureInitialized()
		return this.cache[key]
	}

	/**
	 * Get all cached secret keys
	 */
	getAllKeys(): SecretKey[] {
		this.ensureInitialized()
		return Object.keys(this.cache) as SecretKey[]
	}

	/**
	 * Persist a batch of secrets to secure storage
	 */
	async persistBatch(keys: Set<SecretKey>): Promise<void> {
		this.ensureInitialized()

		try {
			await Promise.all(
				Array.from(keys).map((key) => {
					const value = this.cache[key]
					if (value) {
						return this.context.secrets.store(key, value)
					} else {
						return this.context.secrets.delete(key)
					}
				}),
			)
		} catch (error) {
			Logger.error("[SecretsManager] Failed to persist batch", error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * Clear all cached secrets (for reinitialization)
	 */
	clear(): void {
		this.cache = {} as Secrets
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
