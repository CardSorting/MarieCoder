/**
 * ExtensionStateContext - Unified Context Compatibility Layer
 *
 * This provides backward compatibility by combining all focused contexts
 * into a single interface that matches the original ExtensionStateContext.
 *
 * Migration Strategy:
 * 1. Use this compatibility layer initially
 * 2. Gradually migrate components to use focused contexts
 * 3. Eventually deprecate this compatibility layer
 *
 * Architecture:
 * ```
 * ExtensionStateContext (Compatibility Layer)
 *   ├─ UIStateContext
 *   ├─ TaskStateContext
 *   ├─ ModelsContext
 *   ├─ McpContext
 *   └─ SettingsContext
 * ```
 */

import type React from "react"
import { createContext, useContext, useMemo } from "react"
import {
	McpContextProvider,
	type McpContextType,
	ModelsContextProvider,
	type ModelsContextType,
	SettingsContextProvider,
	type SettingsContextType,
	TaskStateContextProvider,
	type TaskStateContextType,
	UIStateContextProvider,
	type UIStateContextType,
	useMcpState,
	useModelsState,
	useSettingsState,
	useTaskState,
	useUIState,
} from "./index"

/**
 * Combined context type that merges all focused contexts
 * This maintains backward compatibility with the original interface
 */
export interface ExtensionStateContextType
	extends SettingsContextType,
		UIStateContextType,
		TaskStateContextType,
		ModelsContextType,
		McpContextType {}

/**
 * Internal combined context - only used for the compatibility layer
 */
const ExtensionStateContext = createContext<ExtensionStateContextType | undefined>(undefined)

/**
 * Internal provider that combines all focused contexts
 */
const CombinedContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const uiState = useUIState()
	const taskState = useTaskState()
	const modelsState = useModelsState()
	const mcpState = useMcpState()
	const settingsState = useSettingsState()

	// Merge all contexts into one
	const contextValue = useMemo<ExtensionStateContextType>(
		() => ({
			...settingsState,
			...uiState,
			...taskState,
			...modelsState,
			...mcpState,
		}),
		[settingsState, uiState, taskState, modelsState, mcpState],
	)

	return <ExtensionStateContext.Provider value={contextValue}>{children}</ExtensionStateContext.Provider>
}

/**
 * Main provider that wraps all focused context providers
 *
 * Architecture:
 * - Nests all focused context providers
 * - Combines them into a single interface
 * - Provides backward compatibility
 *
 * @example
 * ```typescript
 * <ExtensionStateContextProvider>
 *   <App />
 * </ExtensionStateContextProvider>
 * ```
 */
export const ExtensionStateContextProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	return (
		<SettingsContextProvider>
			<UIStateContextProvider>
				<TaskStateContextProvider>
					<ModelsContextProvider>
						<McpContextProvider>
							<CombinedContextProvider>{children}</CombinedContextProvider>
						</McpContextProvider>
					</ModelsContextProvider>
				</TaskStateContextProvider>
			</UIStateContextProvider>
		</SettingsContextProvider>
	)
}

/**
 * Hook to access the combined extension state
 *
 * ⚠️ MIGRATION NOTE:
 * For new code, prefer using focused hooks:
 * - `useUIState()` for navigation/visibility
 * - `useTaskState()` for tasks/messages
 * - `useModelsState()` for model configurations
 * - `useMcpState()` for MCP servers
 * - `useSettingsState()` for settings
 *
 * Benefits of focused hooks:
 * - Only re-render when relevant state changes
 * - Better performance
 * - Clearer dependencies
 *
 * @example
 * ```typescript
 * // Legacy (still supported)
 * const { showSettings, navigateToSettings } = useExtensionState()
 *
 * // Preferred (focused)
 * const { showSettings, navigateToSettings } = useUIState()
 * ```
 */
export const useExtensionState = () => {
	const context = useContext(ExtensionStateContext)
	if (context === undefined) {
		throw new Error("useExtensionState must be used within an ExtensionStateContextProvider")
	}
	return context
}

export { ExtensionStateContext }
