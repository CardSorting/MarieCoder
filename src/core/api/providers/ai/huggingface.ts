import { Anthropic } from "@anthropic-ai/sdk"
import { HuggingFaceModelId, huggingFaceDefaultModelId, huggingFaceModels, ModelInfo } from "@shared/api"
import { calculateApiCostOpenAI } from "@utils/cost"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * HuggingFace-specific provider options
 */
interface HuggingFaceProviderOptions extends BaseProviderOptions {
	huggingFaceApiKey?: string
	huggingFaceModelId?: string
	huggingFaceModelInfo?: ModelInfo
}

/**
 * Refactored HuggingFace provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class HuggingFaceProvider extends BaseProvider {
	private huggingFaceOptions: HuggingFaceProviderOptions
	private client: OpenAI | undefined
	private cachedModel: { id: HuggingFaceModelId; info: ModelInfo } | undefined

	constructor(options: HuggingFaceProviderOptions) {
		super(options)
		this.huggingFaceOptions = options
		this.validateRequiredOptions(["huggingFaceApiKey"])
	}

	/**
	 * Create HuggingFace client
	 */
	protected createClient(): OpenAI {
		try {
			return new OpenAI({
				baseURL: "https://api-inference.huggingface.co/models",
				apiKey: this.huggingFaceOptions.huggingFaceApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "huggingface")
		}
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		
		// Use cached model info if available
		if (this.cachedModel && this.cachedModel.id === modelId) {
			return this.cachedModel.info
		}

		// Use provided model info or fallback to defaults
		const info = this.huggingFaceOptions.huggingFaceModelInfo || 
			huggingFaceModels[modelId] || 
			huggingFaceModels[huggingFaceDefaultModelId]

		// Cache the model info
		this.cachedModel = { id: modelId, info }

		return info
	}

	/**
	 * Get model ID
	 */
	private getModelId(): HuggingFaceModelId {
		return (this.huggingFaceOptions.huggingFaceModelId as HuggingFaceModelId) || huggingFaceDefaultModelId
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		return huggingFaceDefaultModelId
	}

	/**
	 * Ensure client is created
	 */
	private ensureClient(): OpenAI {
		if (!this.client) {
			this.client = this.createClient()
		}
		return this.client
	}

	/**
	 * Yield usage information
	 */
	private async *yieldUsage(info: ModelInfo, usage: OpenAI.Completions.CompletionUsage | undefined): ApiStream {
		const promptTokens = usage?.prompt_tokens || 0
		const completionTokens = usage?.completion_tokens || 0
		const totalTokens = usage?.total_tokens || 0

		const cost = calculateApiCostOpenAI(info, promptTokens, completionTokens)

		yield {
			type: "usage",
			usage: {
				inputTokens: promptTokens,
				outputTokens: completionTokens,
				totalTokens,
				totalCostUSD: cost,
			},
		}
	}

	/**
	 * Create message stream
	 */
	@withRetry()
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const client = this.ensureClient()
		const modelId = this.getModelId()

		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]

		try {
			const stream = await client.chat.completions.create({
				model: modelId,
				messages: openAiMessages,
				stream: true,
				temperature: 0.7,
			})

			let usage: OpenAI.Completions.CompletionUsage | undefined

			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content
				if (content) {
					yield {
						type: "text-delta",
						textDelta: content,
					}
				}

				// Collect usage information
				if (chunk.usage) {
					usage = chunk.usage
				}
			}

			// Yield usage information at the end
			yield* this.yieldUsage(this.getModelInfo(), usage)
		} catch (error) {
			throw ErrorService.parseError(error, "huggingface")
		}
	}
}
