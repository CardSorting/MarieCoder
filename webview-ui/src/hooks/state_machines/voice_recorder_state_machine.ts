/**
 * Voice Recorder State Machine
 *
 * Manages the complex state transitions for voice recording and transcription.
 *
 * States:
 * - idle: Ready to start recording
 * - starting: Initializing audio recording
 * - recording: Actively recording audio
 * - stopping: Stopping recording
 * - processing: Transcribing audio
 * - complete: Transcription complete
 * - error: Error occurred
 *
 * Flow:
 * idle -> starting -> recording -> stopping -> processing -> complete -> idle
 *          \-> error -> idle
 */

import type { StateMachineConfig } from "../use_state_machine"

// ============================================================================
// Types
// ============================================================================

export interface VoiceRecorderContext {
	/** Recording duration in seconds */
	duration: number
	/** Maximum recording duration in seconds */
	maxDuration: number
	/** Audio blob data */
	audioBlob?: Blob
	/** Transcribed text */
	transcription?: string
	/** Error message if any */
	errorMessage?: string
	/** Whether user is authenticated for transcription service */
	isAuthenticated: boolean
	/** Selected language for transcription */
	language: string
	/** Processing progress (0-100) */
	processingProgress: number
	/** Timestamp when recording started */
	startTime?: number
	/** Whether recording was cancelled by user */
	wasCancelled: boolean
}

export type VoiceRecorderEvent =
	| { type: "START_RECORDING" }
	| { type: "RECORDING_STARTED"; payload: { startTime: number } }
	| { type: "RECORDING_FAILED"; payload: { error: string } }
	| { type: "TICK"; payload: { duration: number } }
	| { type: "STOP_RECORDING" }
	| { type: "CANCEL_RECORDING" }
	| { type: "RECORDING_STOPPED"; payload: { audioBlob: Blob } }
	| { type: "START_PROCESSING" }
	| { type: "PROCESSING_PROGRESS"; payload: { progress: number } }
	| { type: "TRANSCRIPTION_COMPLETE"; payload: { transcription: string } }
	| { type: "TRANSCRIPTION_FAILED"; payload: { error: string } }
	| { type: "RESET" }
	| { type: "CLEAR_ERROR" }

// ============================================================================
// Guards
// ============================================================================

/**
 * Check if user is authenticated for transcription
 */
const isAuthenticated = (context: VoiceRecorderContext): boolean => {
	return context.isAuthenticated
}

/**
 * Check if recording duration exceeds maximum
 */
const hasExceededMaxDuration = (context: VoiceRecorderContext): boolean => {
	return context.duration >= context.maxDuration
}

/**
 * Check if audio blob is available
 */
const hasAudioBlob = (context: VoiceRecorderContext): boolean => {
	return context.audioBlob !== undefined && context.audioBlob.size > 0
}

/**
 * Check if recording has minimum duration (1 second)
 */
const hasMinimumDuration = (context: VoiceRecorderContext): boolean => {
	return context.duration >= 1
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Reset context for new recording
 */
const resetRecording = (): Partial<VoiceRecorderContext> => {
	return {
		duration: 0,
		audioBlob: undefined,
		transcription: undefined,
		errorMessage: undefined,
		processingProgress: 0,
		startTime: undefined,
		wasCancelled: false,
	}
}

/**
 * Record recording start time
 */
const recordStartTime = (_context: VoiceRecorderContext, event: VoiceRecorderEvent): Partial<VoiceRecorderContext> => {
	if (event.type !== "RECORDING_STARTED") {
		return {}
	}

	return {
		startTime: event.payload.startTime,
		errorMessage: undefined,
	}
}

/**
 * Update recording duration
 */
const updateDuration = (_context: VoiceRecorderContext, event: VoiceRecorderEvent): Partial<VoiceRecorderContext> => {
	if (event.type !== "TICK") {
		return {}
	}

	return {
		duration: event.payload.duration,
	}
}

/**
 * Store audio blob
 */
const storeAudioBlob = (_context: VoiceRecorderContext, event: VoiceRecorderEvent): Partial<VoiceRecorderContext> => {
	if (event.type !== "RECORDING_STOPPED") {
		return {}
	}

	return {
		audioBlob: event.payload.audioBlob,
	}
}

/**
 * Update processing progress
 */
const updateProgress = (_context: VoiceRecorderContext, event: VoiceRecorderEvent): Partial<VoiceRecorderContext> => {
	if (event.type !== "PROCESSING_PROGRESS") {
		return {}
	}

	return {
		processingProgress: event.payload.progress,
	}
}

/**
 * Store transcription result
 */
const storeTranscription = (_context: VoiceRecorderContext, event: VoiceRecorderEvent): Partial<VoiceRecorderContext> => {
	if (event.type !== "TRANSCRIPTION_COMPLETE") {
		return {}
	}

	return {
		transcription: event.payload.transcription,
		processingProgress: 100,
	}
}

/**
 * Store error message
 */
const storeError = (_context: VoiceRecorderContext, event: VoiceRecorderEvent): Partial<VoiceRecorderContext> => {
	if (event.type !== "RECORDING_FAILED" && event.type !== "TRANSCRIPTION_FAILED") {
		return {}
	}

	return {
		errorMessage: event.payload.error,
	}
}

/**
 * Mark as cancelled
 */
const markAsCancelled = (): Partial<VoiceRecorderContext> => {
	return {
		wasCancelled: true,
	}
}

/**
 * Clear error message
 */
const clearError = (): Partial<VoiceRecorderContext> => {
	return {
		errorMessage: undefined,
	}
}

// ============================================================================
// State Machine Configuration
// ============================================================================

export const createVoiceRecorderStateMachine = (
	initialContext?: Partial<VoiceRecorderContext>,
): StateMachineConfig<VoiceRecorderContext, VoiceRecorderEvent> => ({
	id: "voiceRecorder",
	initial: "idle",
	context: {
		duration: 0,
		maxDuration: 300, // 5 minutes
		isAuthenticated: false,
		language: "en",
		processingProgress: 0,
		wasCancelled: false,
		...initialContext,
	},
	states: {
		idle: {
			on: {
				START_RECORDING: {
					target: "starting",
					guard: isAuthenticated,
					actions: [resetRecording],
				},
			},
			onEnter: () => {
				// Ready to start recording
				return undefined
			},
		},

		starting: {
			on: {
				RECORDING_STARTED: {
					target: "recording",
					actions: [recordStartTime],
				},
				RECORDING_FAILED: {
					target: "error",
					actions: [storeError],
				},
				CANCEL_RECORDING: {
					target: "idle",
					actions: [markAsCancelled],
				},
			},
			onEnter: () => {
				// Initialize audio recording
				// This is handled by the component via DictationServiceClient
				return undefined
			},
		},

		recording: {
			on: {
				TICK: {
					target: "recording", // Stay in recording
					actions: [updateDuration],
				},
				STOP_RECORDING: {
					target: "stopping",
					guard: hasMinimumDuration,
				},
				CANCEL_RECORDING: {
					target: "idle",
					actions: [markAsCancelled, resetRecording],
				},
				// Auto-stop when max duration reached
				RECORDING_STOPPED: {
					target: "stopping",
					guard: hasExceededMaxDuration,
				},
			},
			onEnter: () => {
				// Actively recording
				// Component manages timer and duration updates
				return undefined
			},
		},

		stopping: {
			on: {
				RECORDING_STOPPED: {
					target: "processing",
					guard: hasAudioBlob,
					actions: [storeAudioBlob],
				},
				RECORDING_FAILED: {
					target: "error",
					actions: [storeError],
				},
			},
			onEnter: () => {
				// Stop recording and prepare audio blob
				return undefined
			},
		},

		processing: {
			on: {
				PROCESSING_PROGRESS: {
					target: "processing", // Stay in processing
					actions: [updateProgress],
				},
				TRANSCRIPTION_COMPLETE: {
					target: "complete",
					actions: [storeTranscription],
				},
				TRANSCRIPTION_FAILED: {
					target: "error",
					actions: [storeError],
				},
				CANCEL_RECORDING: {
					target: "idle",
					actions: [markAsCancelled, resetRecording],
				},
			},
			onEnter: () => {
				// Transcribe audio
				// Component handles transcription via DictationServiceClient
				return undefined
			},
		},

		complete: {
			on: {
				RESET: {
					target: "idle",
					actions: [resetRecording],
				},
				START_RECORDING: {
					target: "starting",
					actions: [resetRecording],
				},
			},
			onEnter: () => {
				// Transcription complete
				// Component delivers transcription to parent
				return undefined
			},
		},

		error: {
			on: {
				CLEAR_ERROR: {
					target: "idle",
					actions: [clearError, resetRecording],
				},
				START_RECORDING: {
					target: "starting",
					actions: [resetRecording],
				},
				RESET: {
					target: "idle",
					actions: [resetRecording],
				},
			},
			onEnter: () => {
				// Handle error state
				// Show error message to user
				return undefined
			},
		},
	},
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user-friendly status message
 */
export function getRecorderStatus(state: string, context: VoiceRecorderContext): string {
	switch (state) {
		case "idle":
			return context.isAuthenticated ? "Click to record" : "Sign in to use voice recording"
		case "starting":
			return "Starting recording..."
		case "recording":
			return `Recording: ${formatDuration(context.duration)}/${formatDuration(context.maxDuration)}`
		case "stopping":
			return "Stopping recording..."
		case "processing":
			return `Transcribing... ${context.processingProgress}%`
		case "complete":
			return "Transcription complete"
		case "error":
			return context.errorMessage || "An error occurred"
		default:
			return ""
	}
}

/**
 * Format duration in seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
	const minutes = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${minutes}:${secs.toString().padStart(2, "0")}`
}

/**
 * Get progress percentage
 */
export function getProgressPercentage(context: VoiceRecorderContext): number {
	if (context.processingProgress > 0) {
		return context.processingProgress
	}
	// During recording, show progress based on duration
	return Math.min((context.duration / context.maxDuration) * 100, 100)
}

/**
 * Check if recording is active
 */
export function isRecording(state: string): boolean {
	return ["starting", "recording", "stopping"].includes(state)
}

/**
 * Check if processing is active
 */
export function isProcessing(state: string): boolean {
	return state === "processing"
}

/**
 * Check if can start new recording
 */
export function canStartRecording(state: string, context: VoiceRecorderContext): boolean {
	return state === "idle" && context.isAuthenticated
}

/**
 * Check if can cancel
 */
export function canCancel(state: string): boolean {
	return ["starting", "recording", "processing"].includes(state)
}

/**
 * Get remaining time in seconds
 */
export function getRemainingTime(context: VoiceRecorderContext): number {
	return Math.max(0, context.maxDuration - context.duration)
}

/**
 * Check if nearing maximum duration (< 30 seconds remaining)
 */
export function isNearingMax(context: VoiceRecorderContext): boolean {
	return getRemainingTime(context) < 30 && getRemainingTime(context) > 0
}
