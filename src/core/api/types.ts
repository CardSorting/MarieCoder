import { ModelInfo } from "@shared/api"
import { ApiStream, ApiStreamUsageChunk } from "./transform/stream"

export interface CommonApiHandlerOptions {
	onRetryAttempt?: any
}

export interface ApiHandler {
	createMessage(systemPrompt: string, messages: any[]): ApiStream
	getModel(): ApiHandlerModel
	getApiStreamUsage?(): Promise<ApiStreamUsageChunk | undefined>
}

export interface ApiHandlerModel {
	id: string
	info: ModelInfo
}

export interface ApiProviderInfo {
	providerId: string
	model: ApiHandlerModel
	customPrompt?: string // "compact"
	autoCondenseThreshold?: number // 0-1 range
}

export interface SingleCompletionHandler {
	completePrompt(prompt: string): Promise<string>
}
