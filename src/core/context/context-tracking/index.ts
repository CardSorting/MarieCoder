/**
 * Context Tracking System
 *
 * This module provides file operation and model usage tracking to prevent
 * stale context issues and maintain accurate task history.
 */

export { CheckpointDetector } from "./checkpoint_detector"
// Shared types
export * from "./context_tracker_types"
// Main orchestrators
export { FileContextTracker } from "./file_context_tracker"
export { FileMetadataManager } from "./file_metadata_manager"
export { FileStateDetector } from "./file_state_detector"
// Specialized modules (for advanced usage or testing)
export { FileWatcher } from "./file_watcher"
export { ModelContextTracker } from "./ModelContextTracker"
export { WarningPersistence } from "./warning_persistence"
