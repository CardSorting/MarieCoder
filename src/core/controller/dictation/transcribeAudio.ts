import { TranscribeAudioRequest, Transcription } from "@shared/proto/cline/dictation"
import { HostProvider } from "@/hosts/host-provider"
import { getVoiceTranscriptionService } from "@/services/dictation/VoiceTranscriptionService"
import { ShowMessageType } from "@/shared/proto/host/window"
import { Controller } from ".."

/**
 * Transcribes audio using Cline transcription service
 * @param controller The controller instance
 * @param request TranscribeAudioRequest containing base64 audio data
 * @returns Transcription with transcribed text or error
 */
export const transcribeAudio = async (controller: Controller, request: TranscribeAudioRequest): Promise<Transcription> => {
	const _taskId = controller.task?.taskId
	const startTime = Date.now()

	try {
		// Transcribe the audio
		const result = await getVoiceTranscriptionService().transcribeAudio(request.audioBase64, request.language ?? "en")
		const _durationMs = Date.now() - startTime

		if (result.error) {
			let _errorType = "api_error"
			if (result.error.includes("Authentication failed")) {
				_errorType = "invalid_jwt_token"
			} else if (result.error.includes("Insufficient credits")) {
				_errorType = "insufficient_credits"
			} else if (result.error.includes("Invalid audio format")) {
				_errorType = "invalid_audio_format"
			} else if (result.error.includes("No internet connection")) {
				_errorType = "no_internet"
			} else if (result.error.includes("Cannot connect")) {
				_errorType = "connection_error"
			} else if (result.error.includes("Connection timed out")) {
				_errorType = "timeout_error"
			} else if (result.error.includes("Network error")) {
				_errorType = "network_error"
			}

			// Use the error message directly from the service as it's already user-friendly
			const errorMessage = result.error

			HostProvider.window.showMessage({
				type: ShowMessageType.ERROR,
				message: errorMessage,
			})
		}

		return Transcription.create({
			text: result.text ?? "",
			error: result.error ?? "",
		})
	} catch (error) {
		console.error("Error transcribing audio:", error)
		const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

		return Transcription.create({
			text: "",
			error: errorMessage,
		})
	}
}
