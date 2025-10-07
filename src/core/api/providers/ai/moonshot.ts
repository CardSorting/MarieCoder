import { Anthropic } from "@anthropic-ai/sdk"
import { ModelInfo, MoonshotModelId, moonshotDefaultModelId, moonshotModels } from "@shared/api"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * Moonshot-specific provider options
 */
interface MoonshotProviderOptions extends BaseProviderOptions {
	moonshotApiKey?: string
	moonshotApiLine?: string
}

/**
 * Refactored Moonshot provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class MoonshotProvider extends BaseProvider {
	private moonshotOptions: MoonshotProviderOptions
	private client: OpenAI | undefined

	constructor(options: MoonshotProviderOptions) {
		super(options)
		this.moonshotOptions = options
		this.validateRequiredOptions(["moonshotApiKey"])
	}

	/**
	 * Create Moonshot client
	 */
	protected createClient(): OpenAI {
		try {
			const baseURL =
				this.moonshotOptions.moonshotApiLine === "china" ? "https://api.moonshot.cn/v1" : "https://api.moonshot.ai/v1"

			return new OpenAI({
				baseURL,
				apiKey: this.moonshotOptions.moonshotApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "moonshot")
		}
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		return moonshotModels[modelId] || moonshotModels[moonshotDefaultModelId]
	}

	/**
	 * Get model ID
	 */
	private getModelId(): MoonshotModelId {
		return (this.moonshotOptions.apiModelId as MoonshotModelId) || moonshotDefaultModelId
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		return moonshotDefaultModelId
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
			throw ErrorService.parseError(error, "moonshot")
		}
	}
}
