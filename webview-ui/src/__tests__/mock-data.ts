/**
 * Mock Data Factories
 *
 * Provides factory functions to create mock data for testing
 */

import type { ClineMessage } from "@shared/ExtensionMessage"
import type { HistoryItem } from "@shared/HistoryItem"

/**
 * Create a mock chat message
 */
export const createMockChatMessage = (overrides: Partial<ClineMessage> = {}): ClineMessage => ({
	type: "say",
	say: "text",
	text: "Test message",
	ts: Date.now(),
	...overrides,
})

/**
 * Create a mock task item
 */
export const createMockTask = (overrides: Partial<HistoryItem> = {}): HistoryItem => ({
	id: "test-task-id",
	task: "Test task",
	ts: Date.now(),
	tokensIn: 0,
	tokensOut: 0,
	cacheWrites: 0,
	cacheReads: 0,
	totalCost: 0,
	...overrides,
})

/**
 * Create a mock API response message
 */
export const createMockApiResponse = (overrides = {}) => ({
	type: "api_req_started",
	ts: Date.now(),
	...overrides,
})

/**
 * Create mock conversation history
 */
export const createMockConversationHistory = (length = 3): ClineMessage[] => {
	return Array.from({ length }, (_, i) =>
		createMockChatMessage({
			text: `Message ${i + 1}`,
			ts: Date.now() - (length - i) * 1000,
		}),
	)
}

/**
 * Create a mock task with history
 */
export const createMockTaskWithHistory = (_messageCount = 3): HistoryItem => {
	return createMockTask()
}

/**
 * Create a mock image data
 */
export const createMockImageData = () => ({
	data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
	mimeType: "image/png",
})

/**
 * Create mock MCP server
 */
export const createMockMcpServer = (overrides = {}) => ({
	name: "test-server",
	config: "test-config",
	status: "disconnected" as const,
	disabled: false,
	...overrides,
})

/**
 * Create mock API configuration
 */
export const createMockApiConfiguration = (overrides = {}) => ({
	apiProvider: "anthropic",
	apiKey: "test-key",
	anthropicApiKey: "",
	openRouterApiKey: "",
	openRouterModelId: "",
	openRouterModelInfo: {
		maxTokens: 8000,
		contextWindow: 128000,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
	awsAccessKey: "",
	awsSecretKey: "",
	awsRegion: "",
	awsUseCrossRegionInference: false,
	vertexProjectId: "",
	vertexRegion: "",
	openAiBaseUrl: "",
	openAiApiKey: "",
	openAiModelId: "",
	ollamaModelId: "",
	ollamaBaseUrl: "",
	lmStudioModelId: "",
	lmStudioBaseUrl: "",
	geminiApiKey: "",
	openAiNativeApiKey: "",
	azureApiVersion: "",
	openAiStreamingEnabled: false,
	fireworksApiKey: "",
	fireworksModelId: "",
	nebiusApiKey: "",
	nebiusModelId: "",
	planModeApiProvider: "anthropic",
	actModeApiProvider: "anthropic",
	requestyApiKey: "",
	planModeRequestyModelId: "",
	actModeRequestyModelId: "",
	...overrides,
})

/**
 * Create mock browser settings
 */
export const createMockBrowserSettings = (overrides = {}) => ({
	mode: "api" as const,
	headless: false,
	...overrides,
})
