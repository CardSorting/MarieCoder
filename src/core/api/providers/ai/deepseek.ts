import { Anthropic } from "@anthropic-ai/sdk"
import { DeepSeekModelId, deepSeekDefaultModelId, deepSeekModels, ModelInfo } from "@shared/api"
import { calculateApiCostOpenAI } from "@utils/cost"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * DeepSeek-specific provider options
 */
interface DeepSeekProviderOptions extends BaseProviderOptions {
	deepSeekApiKey?: string
}

/**
 * Refactored DeepSeek provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class DeepSeekProvider extends BaseProvider {
	private deepSeekOptions: DeepSeekProviderOptions

	constructor(options: DeepSeekProviderOptions) {
		super(options)
		this.deepSeekOptions = options
		this.validateRequiredOptions(["deepSeekApiKey"])
	}

	/**
	 * Create DeepSeek client
	 */
	protected override createClient(): OpenAI {
		try {
			return new OpenAI({
				baseURL: "https://api.deepseek.com/v1",
				apiKey: this.deepSeekOptions.deepSeekApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "deepseek")
		}
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		return deepSeekModels[modelId] || deepSeekModels[deepSeekDefaultModelId]
	}

	/**
	 * Get model ID
	 */
	private getModelId(): DeepSeekModelId {
		return (this.deepSeekOptions.apiModelId as DeepSeekModelId) || deepSeekDefaultModelId
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return deepSeekDefaultModelId
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
		// Deepseek reports total input AND cache reads/writes,
		// see context caching: https://api-docs.deepseek.com/guides/kv_cache)
		// where the input tokens is the sum of the cache hits/misses, just like OpenAI.
		// This affects:
		// 1) context management truncation algorithm, and
		// 2) cost calculation

		// Deepseek usage includes extra fields.
		// Safely cast the prompt token details section to the appropriate structure.
		const promptTokens = usage?.prompt_tokens || 0
		const completionTokens = usage?.completion_tokens || 0

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
	@withRetry({ retryAllErrors: true })
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const client = this.ensureClient()
		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]

		try {
			const stream = await client.chat.completions.create({
				model: this.getModel().id,
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
			throw ErrorService.parseError(error, "deepseek")
		}
	}
}
