/**
 * No-op Telemetry Service
 *
 * This is a stub implementation that provides the telemetry interface without
 * actually collecting any data. All methods are no-ops.
 */

export enum TerminalHangStage {
	COMMAND_EXECUTION = "command_execution",
	OUTPUT_RETRIEVAL = "output_retrieval",
}

export enum TerminalUserInterventionAction {
	MANUAL_TERMINATION = "manual_termination",
	TIMEOUT = "timeout",
}

export enum TerminalOutputFailureReason {
	TIMEOUT = "timeout",
	NO_TERMINAL = "no_terminal",
	CLIPBOARD_ERROR = "clipboard_error",
}

class TelemetryService {
	captureExtensionActivated(): void {}
	captureButtonClick(_button: string, _taskId?: string): void {}
	captureToolUse(_tool: string, _properties?: Record<string, unknown>): void {}
	captureTerminalHang(_stage: TerminalHangStage, _action: TerminalUserInterventionAction): void {}
	captureTerminalOutputFailure(_reason: TerminalOutputFailureReason): void {}
	capture(_event: string, _properties?: Record<string, unknown>): void {}
	dispose(): void {}
}

export const telemetryService = new TelemetryService()
