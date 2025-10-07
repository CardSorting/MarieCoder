import { Anthropic } from "@anthropic-ai/sdk"
import { ModelInfo, SambanovaModelId, sambanovaDefaultModelId, sambanovaModels } from "@shared/api"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * Sambanova-specific provider options
 */
interface SambanovaProviderOptions extends BaseProviderOptions {
	sambanovaApiKey?: string
}

/**
 * Refactored Sambanova provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class SambanovaProvider extends BaseProvider {
	private sambanovaOptions: SambanovaProviderOptions
	private client: OpenAI | undefined

	constructor(options: SambanovaProviderOptions) {
		super(options)
		this.sambanovaOptions = options
		this.validateRequiredOptions(["sambanovaApiKey"])
	}

	/**
	 * Create Sambanova client
	 */
	protected createClient(): OpenAI {
		try {
			return new OpenAI({
				baseURL: "https://api.sambanova.ai/v1",
				apiKey: this.sambanovaOptions.sambanovaApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "sambanova")
		}
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		return sambanovaModels[modelId] || sambanovaModels[sambanovaDefaultModelId]
	}

	/**
	 * Get model ID
	 */
	private getModelId(): SambanovaModelId {
		return (this.sambanovaOptions.apiModelId as SambanovaModelId) || sambanovaDefaultModelId
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		return sambanovaDefaultModelId
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
			throw ErrorService.parseError(error, "sambanova")
		}
	}
}
