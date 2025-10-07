import { GroqModelId, groqDefaultModelId, groqModels, ModelInfo } from "@shared/api"
import { calculateApiCostOpenAI } from "@utils/cost"
import OpenAI from "openai"
import { HttpProvider, HttpProviderOptions } from "../../base/http-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * Groq-specific provider options
 */
interface GroqProviderOptions extends HttpProviderOptions {
	groqApiKey?: string
	groqModelId?: string
	groqModelInfo?: ModelInfo
	apiModelId?: string // For backward compatibility
}

// Enhanced usage interface to support Groq's cached token fields
interface GroqUsage extends OpenAI.CompletionUsage {
	prompt_tokens_details?: {
		cached_tokens?: number
	}
}

// Model family definitions for enhanced behavior
interface GroqModelFamily {
	name: string
	supportedFeatures: {
		streaming: boolean
		temperature: boolean
		vision: boolean
		tools: boolean
	}
	maxTokensOverride?: number
	specialParams?: Record<string, any>
}

const MODEL_FAMILIES: Record<string, GroqModelFamily> = {
	// Moonshort 4 Family - Latest generation with vision support
	"kimi-k2": {
		name: "kimi-k2",
		supportedFeatures: { streaming: true, temperature: true, vision: true, tools: true },
		maxTokensOverride: 8192,
	},
	// Llama 4 Family - Latest generation with vision support
	llama4: {
		name: "Llama 4",
		supportedFeatures: { streaming: true, temperature: true, vision: true, tools: true },
		maxTokensOverride: 8192,
	},
	// Llama 3.3 Family - Balanced performance
	"llama3.3": {
		name: "Llama 3.3",
		supportedFeatures: { streaming: true, temperature: true, vision: false, tools: true },
		maxTokensOverride: 32768,
	},
	// Llama 3.1 Family - Fast inference
	"llama3.1": {
		name: "Llama 3.1",
		supportedFeatures: { streaming: true, temperature: true, vision: false, tools: true },
		maxTokensOverride: 131072,
	},
	// DeepSeek Family - Reasoning-optimized
	deepseek: {
		name: "DeepSeek",
		supportedFeatures: { streaming: true, temperature: true, vision: false, tools: true },
		maxTokensOverride: 8192,
		specialParams: {
			top_p: 0.95,
			reasoning_format: "parsed",
		},
	},
	// Qwen Family - Enhanced for Q&A
	qwen: {
		name: "Qwen",
		supportedFeatures: { streaming: true, temperature: true, vision: false, tools: true },
		maxTokensOverride: 32768,
	},
	// Compound Models - Hybrid architectures
	compound: {
		name: "Compound",
		supportedFeatures: { streaming: true, temperature: true, vision: false, tools: true },
		maxTokensOverride: 8192,
	},
}

/**
 * Refactored Groq provider using the new base class system
 * Demonstrates clean, maintainable provider implementation with model family detection
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class GroqProvider extends HttpProvider {
	private groqOptions: GroqProviderOptions

	constructor(options: GroqProviderOptions) {
		super(options)
		this.groqOptions = options
		this.validateRequiredOptions(["groqApiKey"])
	}

	/**
	 * Create Groq client
	 */
	protected override createHttpClient(config: any): OpenAI {
		try {
			return new OpenAI({
				baseURL: "https://api.groq.com/openai/v1",
				apiKey: this.groqOptions.groqApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "groq")
		}
	}

	/**
	 * Process streaming response for Groq
	 */
	protected override processStreamResponse(response: any): ApiStream {
		// This is handled by the OpenAI streaming
		// Return a simple generator that yields the response
		return (async function* () {
			yield { type: "text", text: "Stream processing handled by OpenAI streaming" }
		})()
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		return this.groqOptions.groqModelInfo || groqModels[this.getDefaultModelId() as GroqModelId] || groqModels[groqDefaultModelId]
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return this.groqOptions.groqModelId || this.groqOptions.apiModelId || groqDefaultModelId
	}

	/**
	 * Create message stream with retry logic
	 */
	@withRetry()
	async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
		try {
			const client = this.ensureClient()
			const modelId = this.getDefaultModelId()
			const model = this.getModel()
			const modelFamily = this.detectModelFamily(modelId)

			// Convert messages to OpenAI format
			const openAiMessages = [
				{ role: "system", content: systemPrompt },
				...convertToOpenAiMessages(messages),
			]

			// Build request configuration
			const requestConfig: any = {
				model: modelId,
				messages: openAiMessages,
				stream: true,
				temperature: 0.7,
			}

			// Apply model family specific configurations
			if (modelFamily.maxTokensOverride) {
				requestConfig.max_tokens = modelFamily.maxTokensOverride
			} else if (model.info.maxTokens) {
				requestConfig.max_tokens = model.info.maxTokens
			}

			// Apply special parameters for specific model families
			if (modelFamily.specialParams) {
				Object.assign(requestConfig, modelFamily.specialParams)
			}

			// Create stream
			const stream = await client.chat.completions.create(requestConfig)

			yield* this.processGroqStream(stream, model.info)
		} catch (error) {
			throw ErrorService.parseError(error, "groq")
		}
	}

	/**
	 * Detects the model family based on the model ID
	 */
	private detectModelFamily(modelId: string): GroqModelFamily {
		if (modelId.includes("kimi-k2")) {
			return MODEL_FAMILIES["kimi-k2"]
		}
		// Llama 4 variants
		if (modelId.includes("llama-4") || modelId.includes("llama/llama-4")) {
			return MODEL_FAMILIES.llama4
		}
		// Llama 3.3 variants
		if (modelId.includes("llama-3.3")) {
			return MODEL_FAMILIES["llama3.3"]
		}
		// Llama 3.1 variants
		if (modelId.includes("llama-3.1")) {
			return MODEL_FAMILIES["llama3.1"]
		}
		// DeepSeek variants
		if (modelId.includes("deepseek")) {
			return MODEL_FAMILIES.deepseek
		}
		// Qwen variants
		if (modelId.includes("qwen")) {
			return MODEL_FAMILIES.qwen
		}
		// Compound models
		if (modelId.includes("compound")) {
			return MODEL_FAMILIES.compound
		}

		// Default to Llama 3.1 for unknown models
		return MODEL_FAMILIES["llama3.1"]
	}

	/**
	 * Process Groq stream and yield standardized chunks
	 */
	private async *processGroqStream(stream: any, modelInfo: ModelInfo): ApiStream {
		try {
			for await (const chunk of stream) {
				// Handle text content
				if (chunk.choices?.[0]?.delta?.content) {
					yield {
						type: "text",
						text: chunk.choices[0].delta.content,
					}
				}

				// Handle usage information
				if (chunk.usage) {
					yield* this.yieldUsage(modelInfo, chunk.usage as GroqUsage)
				}
			}
		} catch (error) {
			throw ErrorService.parseError(error, "groq")
		}
	}

	/**
	 * Yield usage information with cost calculation
	 */
	private async *yieldUsage(info: ModelInfo, usage: GroqUsage | undefined): ApiStream {
		const inputTokens = usage?.prompt_tokens || 0
		const outputTokens = usage?.completion_tokens || 0

		const cacheReadTokens = usage?.prompt_tokens_details?.cached_tokens || 0

		// Groq does not track cache writes
		const cacheWriteTokens = 0

		// Calculate cost using OpenAI-compatible cost calculation
		const totalCost = calculateApiCostOpenAI(info, inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens)

		// Calculate non-cached input tokens for proper reporting
		const nonCachedInputTokens = Math.max(0, inputTokens - cacheReadTokens - cacheWriteTokens)

		yield {
			type: "usage",
			inputTokens: nonCachedInputTokens,
			outputTokens,
			cacheWriteTokens,
			cacheReadTokens,
			totalCost,
		}
	}
}
