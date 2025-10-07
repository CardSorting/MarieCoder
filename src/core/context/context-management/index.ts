/**
 * Context Management System
 *
 * This module provides a clean, modular architecture for managing conversation context
 * to stay within API token limits while preserving conversation quality.
 */

// Specialized modules (for advanced usage or testing)
export { ContextHistoryStorage } from "./context_history_storage"
// Main orchestrator
export { ContextManager } from "./context_manager"
// Shared types
export * from "./context_types"
export { ContextUpdateApplicator } from "./context_update_applicator"
// Utilities
export { getContextWindowInfo } from "./context_window_utils"
export { checkContextWindowExceededError } from "./context-error-handling"
export { FileReadOptimizer } from "./file_read_optimizer"
export { OptimizationMetrics } from "./optimization_metrics"
export { TruncationCalculator } from "./truncation_calculator"
