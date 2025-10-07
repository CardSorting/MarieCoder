/**
 * Lock Operations - Instance registry operations
 *
 * Handles:
 * - Instance registration and unregistration
 * - Instance timestamp updates (touch)
 * - Instance queries by port
 * - Instance cleanup
 */

import type Database from "better-sqlite3"

/**
 * Register an instance in the locks table
 */
export function registerInstance(db: Database.Database, instanceAddress: string, hostAddress: string): void {
	const now = Date.now()

	const insertLock = db.prepare(`
		INSERT OR REPLACE INTO locks (held_by, lock_type, lock_target, locked_at)
		VALUES (?, 'instance', ?, ?)
	`)

	insertLock.run(instanceAddress, hostAddress, now)
}

/**
 * Update the timestamp for an instance (touch)
 */
export function touchInstance(db: Database.Database, instanceAddress: string): void {
	const now = Date.now()

	const updateLock = db.prepare(`
		UPDATE locks 
		SET locked_at = ? 
		WHERE held_by = ? AND lock_type = 'instance'
	`)

	updateLock.run(now, instanceAddress)
}

/**
 * Remove an instance from the locks table
 */
export function unregisterInstance(db: Database.Database, instanceAddress: string): void {
	const deleteLock = db.prepare(`
		DELETE FROM locks 
		WHERE held_by = ? AND lock_type = 'instance'
	`)

	deleteLock.run(instanceAddress)
}

/**
 * Query the registry for any instance registered on the given port
 */
export function getInstanceByPort(db: Database.Database, port: number): { instanceAddress: string; hostAddress: string } | null {
	const query = db.prepare(`
		SELECT held_by, lock_target 
		FROM locks 
		WHERE lock_type = 'instance' 
		AND (held_by LIKE '%:' || ? OR lock_target LIKE '%:' || ?)
	`)

	const result = query.get(port, port) as { held_by: string; lock_target: string } | undefined

	if (result) {
		return {
			instanceAddress: result.held_by,
			hostAddress: result.lock_target,
		}
	}

	return null
}

/**
 * Remove a specific instance entry from the registry
 */
export function removeInstanceByAddress(db: Database.Database, instanceAddress: string): void {
	const deleteLock = db.prepare(`
		DELETE FROM locks 
		WHERE held_by = ? AND lock_type = 'instance'
	`)

	deleteLock.run(instanceAddress)
}
