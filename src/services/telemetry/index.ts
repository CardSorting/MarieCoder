/**
 * No-op Telemetry Service
 *
 * This is a stub implementation that provides the telemetry interface without
 * actually collecting any data. All methods are no-ops.
 */

export enum TerminalHangStage {
	COMMAND_EXECUTION = "command_execution",
	OUTPUT_RETRIEVAL = "output_retrieval",
	BUFFER_STUCK = "buffer_stuck",
	WAITING_FOR_COMPLETION = "waiting_for_completion",
}

export enum TerminalUserInterventionAction {
	MANUAL_TERMINATION = "manual_termination",
	TIMEOUT = "timeout",
	PROCESS_WHILE_RUNNING = "process_while_running",
}

export enum TerminalOutputFailureReason {
	TIMEOUT = "timeout",
	NO_TERMINAL = "no_terminal",
	CLIPBOARD_ERROR = "clipboard_error",
	NO_SHELL_INTEGRATION = "no_shell_integration",
}

export class TelemetryService {
	captureExtensionActivated(): void {}
	captureButtonClick(..._args: any[]): void {}
	captureToolUse(..._args: any[]): void {}
	captureTerminalHang(_stage: TerminalHangStage, _action?: TerminalUserInterventionAction): void {}
	captureTerminalOutputFailure(_reason: TerminalOutputFailureReason): void {}
	capture(..._args: any[]): void {}

	// Voice/Dictation
	captureVoiceRecordingStopped(..._args: any[]): void {}
	captureVoiceRecordingStarted(..._args: any[]): void {}
	captureVoiceTranscriptionStarted(..._args: any[]): void {}
	captureVoiceTranscriptionError(..._args: any[]): void {}
	captureVoiceTranscriptionCompleted(..._args: any[]): void {}

	// Focus Chain
	captureFocusChainListOpened(..._args: any[]): void {}
	captureFocusChainListWritten(..._args: any[]): void {}
	captureFocusChainProgressFirst(..._args: any[]): void {}
	captureFocusChainProgressUpdate(..._args: any[]): void {}
	captureFocusChainIncompleteOnCompletion(..._args: any[]): void {}
	captureFocusChainToggle(..._args: any[]): void {}

	// Mentions
	captureMentionFailed(..._args: any[]): void {}
	captureMentionUsed(..._args: any[]): void {}
	captureMentionSearchResults(..._args: any[]): void {}

	// Settings & State
	captureClineRuleToggled(..._args: any[]): void {}
	updateTelemetryState(..._args: any[]): void {}
	captureModeSwitch(..._args: any[]): void {}
	captureModelFavoritesUsage(..._args: any[]): void {}
	captureYoloModeToggle(..._args: any[]): void {}
	captureAutoCondenseToggle(..._args: any[]): void {}

	// Tasks
	captureTaskFeedback(..._args: any[]): void {}
	captureTaskRestarted(..._args: any[]): void {}
	captureTaskCreated(..._args: any[]): void {}
	captureTaskCompleted(..._args: any[]): void {}
	captureTaskInitialization(..._args: any[]): void {}
	captureSummarizeTask(..._args: any[]): void {}

	// Tools
	captureToolUsage(..._args: any[]): void {}
	captureSlashCommandUsed(..._args: any[]): void {}

	// Conversation
	captureConversationTurnEvent(..._args: any[]): void {}
	captureOptionSelected(..._args: any[]): void {}
	captureOptionsIgnored(..._args: any[]): void {}

	// Terminal
	captureTerminalUserIntervention(..._args: any[]): void {}
	captureTerminalExecution(..._args: any[]): void {}

	// Workspace
	captureWorkspacePathResolved(..._args: any[]): void {}
	captureWorkspaceSearchPattern(..._args: any[]): void {}
	captureWorkspaceInitialized(..._args: any[]): void {}
	captureWorkspaceInitError(..._args: any[]): void {}

	// Checkpoints
	captureCheckpointUsage(..._args: any[]): void {}
	captureMultiRootCheckpoint(..._args: any[]): void {}

	// Browser
	captureBrowserToolStart(..._args: any[]): void {}
	captureBrowserError(..._args: any[]): void {}
	captureBrowserToolEnd(..._args: any[]): void {}

	// Provider & API
	captureProviderApiError(..._args: any[]): void {}
	captureDiffEditFailure(..._args: any[]): void {}

	// MCP
	captureMcpToolCall(..._args: any[]): void {}

	dispose(): void {}
}

export const telemetryService = new TelemetryService()
