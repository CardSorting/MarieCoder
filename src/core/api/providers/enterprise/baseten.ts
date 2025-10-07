import { Anthropic } from "@anthropic-ai/sdk"
import { BasetenModelId, basetenDefaultModelId, basetenModels, ModelInfo } from "@shared/api"
import { calculateApiCostOpenAI } from "@utils/cost"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * Baseten-specific provider options
 */
interface BasetenProviderOptions extends BaseProviderOptions {
	basetenApiKey?: string
	basetenModelId?: string
	basetenModelInfo?: ModelInfo
}

/**
 * Refactored Baseten provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class BasetenProvider extends BaseProvider {
	private basetenOptions: BasetenProviderOptions

	constructor(options: BasetenProviderOptions) {
		super(options)
		this.basetenOptions = options
		this.validateRequiredOptions(["basetenApiKey"])
	}

	/**
	 * Create Baseten client
	 */
	protected override createClient(): OpenAI {
		try {
			return new OpenAI({
				baseURL: "https://api.baseten.co/v1",
				apiKey: this.basetenOptions.basetenApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "baseten")
		}
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		const modelId = this.getModelId()

		// Use provided model info or fallback to defaults
		return this.basetenOptions.basetenModelInfo || basetenModels[modelId] || basetenModels[basetenDefaultModelId]
	}

	/**
	 * Get model ID
	 */
	private getModelId(): BasetenModelId {
		return (
			(this.basetenOptions.basetenModelId as BasetenModelId) ||
			(this.basetenOptions.apiModelId as BasetenModelId) ||
			basetenDefaultModelId
		)
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return basetenDefaultModelId
	}

	/**
	 * Ensure client is created
	 */
	protected override ensureClient(): OpenAI {
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
			inputTokens: promptTokens,
			outputTokens: completionTokens,
			totalCost: cost,
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
						type: "text",
						text: content,
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
			throw ErrorService.parseError(error, "baseten")
		}
	}
}
