/**
 * SQLite Lock Manager - KonMari-Tidied Structure
 *
 * Clean, self-explanatory modules following MARIECODER methodology:
 * - lock_database.ts: Database initialization and schema
 * - lock_operations.ts: Instance registry operations
 * - lock_utils.ts: Utility functions
 *
 * Tidied from 221-line monolith → 4 focused modules
 */

import type Database from "better-sqlite3"
import { initializeDatabaseWithLockSync } from "./lock_database"
import {
	getInstanceByPort,
	registerInstance,
	removeInstanceByAddress,
	touchInstance,
	unregisterInstance,
} from "./lock_operations"
import type { SqliteLockManagerOptions } from "./types"

export class SqliteLockManager {
	private db!: Database.Database
	private instanceAddress: string
	private dbPath: string

	constructor(options: SqliteLockManagerOptions) {
		this.instanceAddress = options.instanceAddress
		this.dbPath = options.dbPath

		// Initialize database with safe multi-process locking
		this.db = initializeDatabaseWithLockSync(this.dbPath)
	}

	/**
	 * Register this instance in the locks table
	 */
	async registerInstance(data: { hostAddress: string }): Promise<void> {
		registerInstance(this.db, this.instanceAddress, data.hostAddress)
	}

	/**
	 * Update the timestamp for this instance (touch)
	 */
	touchInstance(): void {
		touchInstance(this.db, this.instanceAddress)
	}

	/**
	 * Remove this instance from the locks table
	 */
	unregisterInstance(): void {
		unregisterInstance(this.db, this.instanceAddress)
	}

	/**
	 * Query the registry for any instance registered on the given port
	 */
	getInstanceByPort(port: number): { instanceAddress: string; hostAddress: string } | null {
		return getInstanceByPort(this.db, port)
	}

	/**
	 * Remove a specific instance entry from the registry
	 */
	removeInstanceByAddress(instanceAddress: string): void {
		removeInstanceByAddress(this.db, instanceAddress)
	}

	/**
	 * Close the database connection
	 */
	close(): void {
		this.db.close()
	}
}
