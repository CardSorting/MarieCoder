/**
 * Type definitions for context tracking system
 *
 * This file contains all type definitions used across the context tracking modules.
 * The context tracking system monitors file operations and model usage to maintain
 * accurate context state and prevent stale data.
 */

/**
 * Represents a tracked file's metadata entry
 *
 * Tracks when files are read or edited by Cline or users to detect stale context
 * and prevent diff editing issues.
 */
export interface FileMetadataEntry {
	/** Relative path to the file from workspace root */
	path: string

	/** Current state of the file context */
	record_state: "active" | "stale"

	/** Source of the file tracking record */
	record_source: "read_tool" | "user_edited" | "cline_edited" | "file_mentioned"

	/** Timestamp when Cline last read this file (null if never read) */
	cline_read_date: number | null

	/** Timestamp when Cline last edited this file (null if never edited) */
	cline_edit_date: number | null

	/** Timestamp when user last edited this file (null if never edited) */
	user_edit_date?: number | null
}

/**
 * Represents a model usage record
 *
 * Tracks which models were used during a task for telemetry and history.
 */
export interface ModelMetadataEntry {
	/** Timestamp when this model was used */
	ts: number

	/** Model identifier (e.g., "claude-3-5-sonnet-20241022") */
	model_id: string

	/** API provider identifier (e.g., "anthropic") */
	model_provider_id: string

	/** Mode the model was used in (e.g., "architect", "code") */
	mode: string
}

/**
 * Complete task metadata structure
 *
 * Stores both file context and model usage information for a task.
 */
export interface TaskMetadata {
	/** All files that have been tracked in this task */
	files_in_context: FileMetadataEntry[]

	/** History of model usage in this task */
	model_usage: ModelMetadataEntry[]
}

/**
 * File operation types that trigger tracking
 */
export type FileOperation = "read_tool" | "user_edited" | "cline_edited" | "file_mentioned"

/**
 * File state types
 */
export type FileRecordState = "active" | "stale"
