import { Anthropic } from "@anthropic-ai/sdk"
import { FireworksModelId, fireworksDefaultModelId, fireworksModels, ModelInfo } from "@shared/api"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * Fireworks-specific provider options
 */
interface FireworksProviderOptions extends BaseProviderOptions {
	fireworksApiKey?: string
	fireworksModelId?: string
	fireworksModelMaxCompletionTokens?: number
	fireworksModelMaxTokens?: number
}

/**
 * Refactored Fireworks provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class FireworksProvider extends BaseProvider {
	private fireworksOptions: FireworksProviderOptions
	private client: OpenAI | undefined

	constructor(options: FireworksProviderOptions) {
		super(options)
		this.fireworksOptions = options
		this.validateRequiredOptions(["fireworksApiKey"])
	}

	/**
	 * Create Fireworks client
	 */
	protected createClient(): OpenAI {
		try {
			return new OpenAI({
				baseURL: "https://api.fireworks.ai/inference/v1",
				apiKey: this.fireworksOptions.fireworksApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "fireworks")
		}
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		const baseInfo = fireworksModels[modelId] || fireworksModels[fireworksDefaultModelId]
		
		// Override with custom token limits if provided
		return {
			...baseInfo,
			maxTokens: this.fireworksOptions.fireworksModelMaxTokens || baseInfo.maxTokens,
			maxCompletionTokens: this.fireworksOptions.fireworksModelMaxCompletionTokens || baseInfo.maxCompletionTokens,
		}
	}

	/**
	 * Get model ID
	 */
	private getModelId(): FireworksModelId {
		return (this.fireworksOptions.fireworksModelId as FireworksModelId) || fireworksDefaultModelId
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		return fireworksDefaultModelId
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
				max_tokens: this.fireworksOptions.fireworksModelMaxCompletionTokens,
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
			throw ErrorService.parseError(error, "fireworks")
		}
	}
}
