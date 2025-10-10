/**
 * Context Index - Exports all context providers and hooks
 *
 * This file provides centralized access to all application contexts.
 *
 * Context Structure:
 * - UIStateContext: Navigation and visibility
 * - TaskStateContext: Tasks and messages
 * - ModelsContext: Model configurations
 * - McpContext: MCP servers and marketplace
 * - SettingsContext: Application settings
 *
 * Usage:
 * ```typescript
 * import { useUIState, useTaskState, useModelsState } from '@/context'
 * ```
 */

// Legacy - for backward compatibility
export { ExtensionStateContext, type ExtensionStateContextType, useExtensionState } from "./ExtensionStateContext"
// MCP State
export { McpContextProvider, type McpContextType, useMcpState } from "./McpContext"

// Models State
export { ModelsContextProvider, type ModelsContextType, useModelsState } from "./ModelsContext"
// Settings State
export { SettingsContextProvider, type SettingsContextType, useSettingsState } from "./SettingsContext"
// Task State
export { TaskStateContextProvider, type TaskStateContextType, useTaskState } from "./TaskStateContext"
// UI State
export { UIStateContextProvider, type UIStateContextType, useUIState } from "./UIStateContext"
