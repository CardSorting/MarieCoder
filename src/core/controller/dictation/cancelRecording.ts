import { RecordingResult } from "@shared/proto/cline/dictation"
import { audioRecordingService } from "@/services/dictation/AudioRecordingService"
import { Controller } from ".."

/**
 * Cancels audio recording without saving or transcribing the audio
 * @param controller The controller instance
 * @returns RecordingResult indicating success or failure
 */
export const cancelRecording = async (controller: Controller): Promise<RecordingResult> => {
	const _taskId = controller.task?.taskId
	const recordingStatus = audioRecordingService.getRecordingStatus()
	const _recordingDuration = recordingStatus.durationSeconds * 1000 // Convert to milliseconds
	let errorMessage = ""
	let isSuccess = true
	try {
		const result = await audioRecordingService.cancelRecording()
		isSuccess = !!result?.success
		errorMessage = result?.error ?? ""
	} catch (error) {
		console.error("Error canceling recording:", error)
		isSuccess = false
		errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
	}

	return RecordingResult.create({
		success: isSuccess,
		error: errorMessage ?? "",
	})
}
