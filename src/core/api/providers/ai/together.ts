import { Anthropic } from "@anthropic-ai/sdk"
import { ModelInfo, openAiModelInfoSaneDefaults } from "@shared/api"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * Together-specific provider options
 */
interface TogetherProviderOptions extends BaseProviderOptions {
	togetherApiKey?: string
	togetherModelId?: string
}

/**
 * Refactored Together provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class TogetherProvider extends BaseProvider {
	private togetherOptions: TogetherProviderOptions
	private client: OpenAI | undefined

	constructor(options: TogetherProviderOptions) {
		super(options)
		this.togetherOptions = options
		this.validateRequiredOptions(["togetherApiKey"])
	}

	/**
	 * Create Together client
	 */
	protected createClient(): OpenAI {
		try {
			return new OpenAI({
				baseURL: "https://api.together.xyz/v1",
				apiKey: this.togetherOptions.togetherApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "together")
		}
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): ModelInfo {
		return openAiModelInfoSaneDefaults
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		return this.togetherOptions.togetherModelId || "meta-llama/Llama-2-7b-chat-hf"
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
		const modelId = this.getModel().id

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
			throw ErrorService.parseError(error, "together")
		}
	}
}
