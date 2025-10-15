/**
 * Per-tool display preferences
 *
 * Allows users to customize how each tool's output is displayed in the chat.
 * Supports both global defaults and per-tool overrides.
 */

export type ToolDisplayMode = "compact" | "full" | "auto"

export interface ToolDisplayPreferences {
	// Global default
	defaultMode: ToolDisplayMode

	// Per-tool overrides
	toolModes: {
		editedExistingFile?: ToolDisplayMode
		newFileCreated?: ToolDisplayMode
		readFile?: ToolDisplayMode
		listFilesTopLevel?: ToolDisplayMode
		listFilesRecursive?: ToolDisplayMode
		listCodeDefinitionNames?: ToolDisplayMode
		searchFiles?: ToolDisplayMode
		summarizeTask?: ToolDisplayMode
		webFetch?: ToolDisplayMode
	}

	// Size thresholds for "auto" mode
	autoModeThresholds: {
		compactAboveLines: number // Use compact if content > X lines (default: 50)
		compactAboveBytes: number // Use compact if content > X bytes (default: 5000)
	}
}

export const DEFAULT_TOOL_DISPLAY_PREFERENCES: ToolDisplayPreferences = {
	defaultMode: "auto",
	toolModes: {
		// File editing: compact (code goes to editor)
		editedExistingFile: "compact",
		newFileCreated: "compact",

		// File reading: auto (depends on size)
		readFile: "auto",

		// Listings: full (need to see in chat)
		listFilesTopLevel: "full",
		listFilesRecursive: "full",
		listCodeDefinitionNames: "full",

		// Search: full (need to see results)
		searchFiles: "full",

		// Other: auto
		summarizeTask: "auto",
		webFetch: "auto",
	},
	autoModeThresholds: {
		compactAboveLines: 50,
		compactAboveBytes: 5000,
	},
}

/**
 * Determine display mode for a tool based on preferences and content size
 */
export function getToolDisplayMode(
	toolName: string,
	contentSize: { lines?: number; bytes?: number },
	preferences: ToolDisplayPreferences,
): "compact" | "full" {
	// Get tool-specific mode or default
	const mode = preferences.toolModes[toolName as keyof typeof preferences.toolModes] || preferences.defaultMode

	// Handle explicit modes
	if (mode === "compact") return "compact"
	if (mode === "full") return "full"

	// Handle "auto" mode - decide based on content size
	const { lines = 0, bytes = 0 } = contentSize
	const { compactAboveLines, compactAboveBytes } = preferences.autoModeThresholds

	if (lines > compactAboveLines || bytes > compactAboveBytes) {
		return "compact"
	}

	return "full"
}
