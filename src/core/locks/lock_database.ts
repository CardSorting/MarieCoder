/**
 * Lock Database - Database initialization and schema management
 *
 * Handles:
 * - Safe database initialization with file locks
 * - Schema creation and migrations
 * - Multi-process coordination
 */

import Database from "better-sqlite3"
import * as fs from "fs"
import { existsSync, mkdirSync, unlinkSync } from "fs"
import * as path from "path"
import { cleanupStaleLockSync, sleepSync } from "./lock_utils"

const STALE_LOCK_TIMEOUT = 1 * 60 * 1000 // 1 minute in milliseconds

/**
 * Initialize database with file-based locking for multi-process safety
 */
export function initializeDatabaseWithLockSync(dbPath: string): Database.Database {
	// Ensure the directory exists before creating the database
	const dbDir = path.dirname(dbPath)
	try {
		mkdirSync(dbDir, { recursive: true })
	} catch (error) {
		throw new Error(`Failed to create SQLite database directory: ${error}`)
	}

	try {
		return initializeDatabaseWithLockSyncInternal(dbPath)
	} catch (error) {
		throw new Error(`Failed to initialize SQLite database: ${error}`)
	}
}

/**
 * Internal recursive function for database initialization with retries
 */
function initializeDatabaseWithLockSyncInternal(dbPath: string): Database.Database {
	const lockFile = `${dbPath}.lock`

	// Clean up stale lock files first
	cleanupStaleLockSync(lockFile, STALE_LOCK_TIMEOUT)

	try {
		// Try to acquire exclusive file lock for database creation
		let fd: number | null = null

		try {
			fd = fs.openSync(lockFile, "wx") // Exclusive creation - fails if file exists

			// Write timestamp to lock file for stale lock detection
			fs.writeFileSync(fd, Date.now().toString())

			// Check if database already exists
			const dbExists = existsSync(dbPath)

			let db: Database.Database

			if (!dbExists) {
				// Database doesn't exist, create it
				db = new Database(dbPath)
				initializeDatabaseSchema(db)
			} else {
				// Database exists, just open it
				db = new Database(dbPath)
			}

			return db
		} finally {
			// Always clean up the lock file
			if (fd !== null) {
				fs.closeSync(fd)
			}
			try {
				unlinkSync(lockFile)
			} catch {} // Ignore errors if file was already deleted
		}
	} catch (error: any) {
		if (error.code === "EEXIST") {
			// Another process is initializing the database, wait and retry
			const delay = 100 + Math.random() * 100 // Add jitter
			sleepSync(delay)
			return initializeDatabaseWithLockSyncInternal(dbPath)
		}
		throw error
	}
}

/**
 * Initialize database schema
 */
export function initializeDatabaseSchema(db: Database.Database): void {
	// Create the locks table with the unified schema (matches cli/pkg/common/schema.go)
	db.exec(`
		CREATE TABLE IF NOT EXISTS locks (
			id INTEGER PRIMARY KEY,
			held_by TEXT NOT NULL,
			lock_type TEXT NOT NULL CHECK (lock_type IN ('file', 'instance', 'folder')),
			lock_target TEXT NOT NULL,
			locked_at INTEGER NOT NULL,
			UNIQUE(lock_type, lock_target)
		);
	`)

	// Create indexes for performance (matches cli/pkg/common/schema.go)
	db.exec(`
		CREATE INDEX IF NOT EXISTS idx_locks_held_by ON locks(held_by);
		CREATE INDEX IF NOT EXISTS idx_locks_type ON locks(lock_type);
		CREATE INDEX IF NOT EXISTS idx_locks_target ON locks(lock_target);
	`)
}
