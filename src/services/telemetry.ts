/**
 * Telemetry Service Stub
 * Standalone extension - telemetry disabled
 */

export enum TerminalHangStage {
	BUFFER_STUCK = "buffer_stuck",
	WAITING_FOR_COMPLETION = "waiting_for_completion",
}

export enum TerminalUserInterventionAction {
	PROCESS_WHILE_RUNNING = "process_while_running",
}

export const telemetryService = {
	captureTaskRestarted: (_ulid: string, _provider: string) => {},
	captureTaskCreated: (_ulid: string, _provider: string) => {},
	captureTerminalHang: (_stage: TerminalHangStage) => {},
	captureTerminalUserIntervention: (_action: TerminalUserInterventionAction) => {},
	captureConversationTurnEvent: (_ulid: string, _provider: string, _model: string, _role: string, _metadata?: any) => {},
	captureTaskInitialization: (_ulid: string, _taskId: string, _durationMs: number, _provider: string) => {},
	captureProviderApiError: (_error: any) => {},
}
