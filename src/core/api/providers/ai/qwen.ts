import { Anthropic } from "@anthropic-ai/sdk"
import {
    InternationalQwenModelId,
    internationalQwenDefaultModelId,
    internationalQwenModels,
    MainlandQwenModelId,
    ModelInfo,
    mainlandQwenDefaultModelId,
    mainlandQwenModels,
    QwenApiRegions,
} from "@shared/api"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * Qwen-specific provider options
 */
interface QwenProviderOptions extends BaseProviderOptions {
	qwenApiKey?: string
	qwenApiLine?: QwenApiRegions
	thinkingBudgetTokens?: number
}

/**
 * Refactored Qwen provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class QwenProvider extends BaseProvider {
	private qwenOptions: QwenProviderOptions
	private client: OpenAI | undefined

	constructor(options: QwenProviderOptions) {
		super(options)
		this.qwenOptions = options
		this.validateRequiredOptions(["qwenApiKey"])
	}

	/**
	 * Create Qwen client
	 */
	protected createClient(): OpenAI {
		try {
			const baseURL = this.qwenOptions.qwenApiLine === QwenApiRegions.CHINA
				? "https://dashscope.aliyuncs.com/compatible-mode/v1"
				: "https://api.tongyi.aliyun.com/compatible-mode/v1"

			return new OpenAI({
				baseURL,
				apiKey: this.qwenOptions.qwenApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "qwen")
		}
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		const isChina = this.qwenOptions.qwenApiLine === QwenApiRegions.CHINA

		if (isChina) {
			return mainlandQwenModels[modelId as MainlandQwenModelId] || mainlandQwenModels[mainlandQwenDefaultModelId]
		} else {
			return internationalQwenModels[modelId as InternationalQwenModelId] || internationalQwenModels[internationalQwenDefaultModelId]
		}
	}

	/**
	 * Get model ID
	 */
	private getModelId(): string {
		return this.qwenOptions.apiModelId || this.getDefaultModelId()
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		const isChina = this.qwenOptions.qwenApiLine === QwenApiRegions.CHINA
		return isChina ? mainlandQwenDefaultModelId : internationalQwenDefaultModelId
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

		// Add thinking budget tokens if provided
		if (this.qwenOptions.thinkingBudgetTokens) {
			requestOptions.thinking_budget_tokens = this.qwenOptions.thinkingBudgetTokens
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
			throw ErrorService.parseError(error, "qwen")
		}
	}
}
