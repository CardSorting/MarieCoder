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
	captureButtonClick(_button: string, _taskId?: string): void {}
	captureToolUse(_tool: string, _properties?: Record<string, unknown>): void {}
	captureTerminalHang(_stage: TerminalHangStage, _action: TerminalUserInterventionAction): void {}
	captureTerminalOutputFailure(_reason: TerminalOutputFailureReason): void {}
	capture(_event: string, _properties?: Record<string, unknown>): void {}

	// Voice/Dictation
	captureVoiceRecordingStopped(_properties?: Record<string, unknown>): void {}
	captureVoiceRecordingStarted(_properties?: Record<string, unknown>): void {}
	captureVoiceTranscriptionStarted(_properties?: Record<string, unknown>): void {}
	captureVoiceTranscriptionError(_properties?: Record<string, unknown>): void {}
	captureVoiceTranscriptionCompleted(_properties?: Record<string, unknown>): void {}

	// Focus Chain
	captureFocusChainListOpened(_properties?: Record<string, unknown>): void {}
	captureFocusChainListWritten(_properties?: Record<string, unknown>): void {}
	captureFocusChainProgressFirst(_properties?: Record<string, unknown>): void {}
	captureFocusChainProgressUpdate(_properties?: Record<string, unknown>): void {}
	captureFocusChainIncompleteOnCompletion(_properties?: Record<string, unknown>): void {}
	captureFocusChainToggle(_properties?: Record<string, unknown>): void {}

	// Mentions
	captureMentionFailed(_properties?: Record<string, unknown>): void {}
	captureMentionUsed(_properties?: Record<string, unknown>): void {}
	captureMentionSearchResults(_properties?: Record<string, unknown>): void {}

	// Settings & State
	captureClineRuleToggled(_properties?: Record<string, unknown>): void {}
	updateTelemetryState(_properties?: Record<string, unknown>): void {}
	captureModeSwitch(_properties?: Record<string, unknown>): void {}
	captureModelFavoritesUsage(_properties?: Record<string, unknown>): void {}
	captureYoloModeToggle(_properties?: Record<string, unknown>): void {}
	captureAutoCondenseToggle(_properties?: Record<string, unknown>): void {}

	// Tasks
	captureTaskFeedback(_properties?: Record<string, unknown>): void {}
	captureTaskRestarted(_properties?: Record<string, unknown>): void {}
	captureTaskCreated(_properties?: Record<string, unknown>): void {}
	captureTaskCompleted(_properties?: Record<string, unknown>): void {}
	captureTaskInitialization(_properties?: Record<string, unknown>): void {}
	captureSummarizeTask(_properties?: Record<string, unknown>): void {}

	// Tools
	captureToolUsage(_tool: string, _properties?: Record<string, unknown>): void {}
	captureSlashCommandUsed(_properties?: Record<string, unknown>): void {}

	// Conversation
	captureConversationTurnEvent(_properties?: Record<string, unknown>): void {}
	captureOptionSelected(_properties?: Record<string, unknown>): void {}
	captureOptionsIgnored(_properties?: Record<string, unknown>): void {}

	// Terminal
	captureTerminalUserIntervention(_properties?: Record<string, unknown>): void {}
	captureTerminalExecution(_properties?: Record<string, unknown>): void {}

	// Workspace
	captureWorkspacePathResolved(_properties?: Record<string, unknown>): void {}
	captureWorkspaceSearchPattern(_properties?: Record<string, unknown>): void {}
	captureWorkspaceInitialized(_properties?: Record<string, unknown>): void {}
	captureWorkspaceInitError(_properties?: Record<string, unknown>): void {}

	// Checkpoints
	captureCheckpointUsage(_properties?: Record<string, unknown>): void {}
	captureMultiRootCheckpoint(_properties?: Record<string, unknown>): void {}

	// Browser
	captureBrowserToolStart(_properties?: Record<string, unknown>): void {}
	captureBrowserError(_properties?: Record<string, unknown>): void {}
	captureBrowserToolEnd(_properties?: Record<string, unknown>): void {}

	// Provider & API
	captureProviderApiError(_properties?: Record<string, unknown>): void {}
	captureDiffEditFailure(_properties?: Record<string, unknown>): void {}

	dispose(): void {}
}

export const telemetryService = new TelemetryService()
