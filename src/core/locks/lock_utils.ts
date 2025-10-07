/**
 * Lock Utilities - Helper functions for lock management
 *
 * Provides utility functions for:
 * - Synchronous sleep (non-blocking)
 * - Stale lock cleanup
 * - File lock management
 */

import * as fs from "fs"
import { existsSync, unlinkSync } from "fs"

/**
 * Synchronous sleep using Atomics.wait (non-spinning)
 * Works in Node main thread (since v12.16+) and worker threads
 */
export function sleepSync(ms: number): void {
	const sab = new SharedArrayBuffer(4)
	const ia = new Int32Array(sab)
	Atomics.wait(ia, 0, 0, Math.max(0, Math.floor(ms)))
}

/**
 * Clean up stale lock files
 * Removes lock files that are older than the timeout or unreadable
 */
export function cleanupStaleLockSync(lockFile: string, staleLockTimeout: number): void {
	try {
		if (!existsSync(lockFile)) {
			return // Lock file doesn't exist, nothing to clean up
		}

		try {
			const timestampStr = fs.readFileSync(lockFile, "utf8").trim()
			const timestamp = parseInt(timestampStr, 10)

			if (Number.isNaN(timestamp) || Date.now() - timestamp > staleLockTimeout) {
				// Stale lock, remove it
				unlinkSync(lockFile)
				console.warn(`Removed stale database lock file: ${lockFile}`)
			}
		} catch (_readError) {
			// If we can't read the timestamp, assume it's stale
			unlinkSync(lockFile)
			console.warn(`Removed unreadable database lock file: ${lockFile}`)
		}
	} catch (error: any) {
		if (error.code !== "ENOENT") {
			// Lock file doesn't exist, which is fine
			console.warn(`Error checking lock file ${lockFile}:`, error)
		}
	}
}
