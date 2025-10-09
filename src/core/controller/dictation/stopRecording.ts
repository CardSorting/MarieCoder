import { RecordedAudio } from "@shared/proto/cline/dictation"
import { audioRecordingService } from "@/services/dictation/AudioRecordingService"
import { Controller } from ".."

/**
 * Stops audio recording and returns the recorded audio
 * @param controller The controller instance
 * @returns RecordedAudio with audio data
 */
export const stopRecording = async (controller: Controller): Promise<RecordedAudio> => {
	const _taskId = controller.task?.taskId
	const recordingStatus = audioRecordingService.getRecordingStatus()
	const _recordingDuration = recordingStatus.durationSeconds * 1000 // Convert to milliseconds

	try {
		const result = await audioRecordingService.stopRecording()

		return RecordedAudio.create({
			success: result.success,
			audioBase64: result.audioBase64 ?? "",
			error: result.error ?? "",
		})
	} catch (error) {
		console.error("Error stopping recording:", error)

		return RecordedAudio.create({
			success: false,
			audioBase64: "",
			error: error instanceof Error ? error.message : "Unknown error occurred",
		})
	}
}
