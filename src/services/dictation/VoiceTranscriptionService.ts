export class VoiceTranscriptionService {
	async transcribeAudio(_audioBase64: string, _language?: string): Promise<{ text?: string; error?: string }> {
		// Transcription service is not currently implemented
		return { error: "Audio transcription service is not available in this version." }
	}
}

// Lazily construct the service to avoid circular import initialization issues
let _voiceTranscriptionServiceInstance: VoiceTranscriptionService | null = null
export function getVoiceTranscriptionService(): VoiceTranscriptionService {
	if (!_voiceTranscriptionServiceInstance) {
		_voiceTranscriptionServiceInstance = new VoiceTranscriptionService()
	}
	return _voiceTranscriptionServiceInstance
}
