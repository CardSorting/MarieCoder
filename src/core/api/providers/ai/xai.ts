import { Anthropic } from "@anthropic-ai/sdk"
import { ModelInfo, XAIModelId, xaiDefaultModelId, xaiModels } from "@shared/api"
import { shouldSkipReasoningForModel } from "@utils/model-utils"
import OpenAI from "openai"
import { ChatCompletionReasoningEffort } from "openai/resources/chat/completions"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * XAI-specific provider options
 */
interface XAIProviderOptions extends BaseProviderOptions {
	xaiApiKey?: string
	reasoningEffort?: string
}

/**
 * Refactored XAI provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class XAIProvider extends BaseProvider {
	private xaiOptions: XAIProviderOptions
	private client: OpenAI | undefined

	constructor(options: XAIProviderOptions) {
		super(options)
		this.xaiOptions = options
		this.validateRequiredOptions(["xaiApiKey"])
	}

	/**
	 * Create XAI client
	 */
	protected createClient(): OpenAI {
		try {
			return new OpenAI({
				baseURL: "https://api.x.ai/v1",
				apiKey: this.xaiOptions.xaiApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "xai")
		}
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		return xaiModels[modelId] || xaiModels[xaiDefaultModelId]
	}

	/**
	 * Get model ID
	 */
	private getModelId(): XAIModelId {
		return (this.xaiOptions.apiModelId as XAIModelId) || xaiDefaultModelId
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		return xaiDefaultModelId
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

		// Build request options
		const requestOptions: any = {
			model: modelId,
			messages: openAiMessages,
			stream: true,
			temperature: 0.7,
		}

		// Add reasoning effort if supported and not skipped
		if (this.xaiOptions.reasoningEffort && !shouldSkipReasoningForModel(modelId)) {
			requestOptions.reasoning_effort = this.xaiOptions.reasoningEffort as ChatCompletionReasoningEffort
		}

		try {
			const stream = await client.chat.completions.create(requestOptions)

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
			throw ErrorService.parseError(error, "xai")
		}
	}
}
