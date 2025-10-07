import { type GenerateContentResponseUsageMetadata, GoogleGenAI } from "@google/genai"
import { GeminiModelId, geminiDefaultModelId, geminiModels, ModelInfo } from "@shared/api"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertAnthropicMessageToGemini } from "../../transform/gemini-format"
import { ApiStream } from "../../transform/stream"

/**
 * Gemini-specific provider options
 */
interface GeminiProviderOptions extends BaseProviderOptions {
	isVertex?: boolean
	vertexProjectId?: string
	vertexRegion?: string
	geminiApiKey?: string
	geminiBaseUrl?: string
	thinkingBudgetTokens?: number
	ulid?: string
}

// Define a default TTL for the cache (e.g., 15 minutes in seconds)
const DEFAULT_CACHE_TTL_SECONDS = 900

const rateLimitPatterns = [/got status: 429/i, /429 Too Many Requests/i, /rate limit exceeded/i, /too many requests/i]

/**
 * Refactored Gemini provider using the new base class system
 * Demonstrates clean, maintainable provider implementation with caching
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class GeminiProvider extends BaseProvider {
	private geminiOptions: GeminiProviderOptions
	protected override client: GoogleGenAI | undefined = undefined

	constructor(options: GeminiProviderOptions) {
		super(options)
		this.geminiOptions = options
		this.validateRequiredOptions(["geminiApiKey", "vertexProjectId"])
	}

	/**
	 * Create Gemini client with Vertex AI support
	 */
	protected override createClient(): GoogleGenAI {
		try {
			if (this.geminiOptions.isVertex) {
				// Initialize with Vertex AI configuration
				const project = this.geminiOptions.vertexProjectId ?? "not-provided"
				const location = this.geminiOptions.vertexRegion ?? "not-provided"

				return new GoogleGenAI({
					vertexai: true,
					project,
					location,
				})
			} else {
				// Initialize with standard API key
				if (!this.geminiOptions.geminiApiKey) {
					throw new Error("API key is required for Google Gemini when not using Vertex AI")
				}

				return new GoogleGenAI({ apiKey: this.geminiOptions.geminiApiKey })
			}
		} catch (error) {
			throw ErrorService.parseError(error, "gemini")
		}
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		const modelId = this.geminiOptions.apiModelId || geminiDefaultModelId
		const model = geminiModels[modelId as GeminiModelId] || geminiModels[geminiDefaultModelId]
		// Convert readonly model to mutable ModelInfo
		return {
			maxTokens: model.maxTokens,
			contextWindow: model.contextWindow,
			supportsImages: model.supportsImages,
			supportsPromptCache: model.supportsPromptCache,
			inputPrice: model.inputPrice,
			outputPrice: model.outputPrice,
		}
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return this.geminiOptions.apiModelId || geminiDefaultModelId
	}

	/**
	 * Create message stream with retry logic and caching
	 */
	@withRetry()
	async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
		try {
			const client = this.ensureClient()
			const modelId = this.getDefaultModelId()
			const model = this.getModel()

			// Convert messages to Gemini format
			const geminiMessages = convertAnthropicMessageToGemini(messages) as any
			const systemInstruction = systemPrompt

			// Build request configuration
			const config: any = {
				contents: geminiMessages,
				systemInstruction: systemInstruction,
				generationConfig: {
					temperature: 0.7,
					maxOutputTokens: model.info.maxTokens ?? 8192,
				},
			}

			// Add caching if ulid is provided
			if (this.geminiOptions.ulid) {
				config.cacheConfig = {
					ttl: DEFAULT_CACHE_TTL_SECONDS,
					key: this.geminiOptions.ulid,
				}
			}

			// Create stream
			const stream = await client.generateContentStream(config)

			yield* this.processGeminiStream(stream)
		} catch (error) {
			throw ErrorService.parseError(error, "gemini")
		}
	}

	/**
	 * Process Gemini stream and yield standardized chunks
	 */
	private async *processGeminiStream(stream: any): ApiStream {
		try {
			for await (const chunk of stream) {
				// Handle text content
				if (chunk.text) {
					yield {
						type: "text",
						text: chunk.text,
					}
				}

				// Handle usage information
				if (chunk.usageMetadata) {
					const usage = chunk.usageMetadata as GenerateContentResponseUsageMetadata
					yield {
						type: "usage",
						inputTokens: usage.promptTokenCount || 0,
						outputTokens: usage.candidatesTokenCount || 0,
						cacheWriteTokens: usage.cachedContentTokenCount || 0,
						cacheReadTokens: usage.cachedContentTokenCount || 0,
					}
				}

				// Handle function calls if present
				if (chunk.functionCall) {
					yield {
						type: "text",
						text: `[Function call: ${JSON.stringify(chunk.functionCall)}]`,
					}
				}
			}
		} catch (error) {
			throw ErrorService.parseError(error, "gemini")
		}
	}

	/**
	 * Get API stream usage (for cost tracking)
	 */
	async getApiStreamUsage(): Promise<any> {
		// Gemini doesn't provide separate usage endpoint
		// Usage is included in the stream response
		return undefined
	}
}
