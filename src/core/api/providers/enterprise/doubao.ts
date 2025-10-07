import { Anthropic } from "@anthropic-ai/sdk"
import { DoubaoModelId, doubaoDefaultModelId, doubaoModels, ModelInfo } from "@shared/api"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * Doubao-specific provider options
 */
interface DoubaoProviderOptions extends BaseProviderOptions {
	doubaoApiKey?: string
}

/**
 * Refactored Doubao provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class DoubaoProvider extends BaseProvider {
	private doubaoOptions: DoubaoProviderOptions
	private client: OpenAI | undefined

	constructor(options: DoubaoProviderOptions) {
		super(options)
		this.doubaoOptions = options
		this.validateRequiredOptions(["doubaoApiKey"])
	}

	/**
	 * Create Doubao client
	 */
	protected createClient(): OpenAI {
		try {
			return new OpenAI({
				baseURL: "https://ark.cn-beijing.volces.com/api/v3/",
				apiKey: this.doubaoOptions.doubaoApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "doubao")
		}
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		return doubaoModels[modelId] || doubaoModels[doubaoDefaultModelId]
	}

	/**
	 * Get model ID
	 */
	private getModelId(): DoubaoModelId {
		return (this.doubaoOptions.apiModelId as DoubaoModelId) || doubaoDefaultModelId
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		return doubaoDefaultModelId
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

			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content
				if (content) {
					yield {
						type: "text-delta",
						textDelta: content,
					}
				}
			}
		} catch (error) {
			throw ErrorService.parseError(error, "doubao")
		}
	}
}
