import { Anthropic } from "@anthropic-ai/sdk"
import {
	internationalZAiDefaultModelId,
	internationalZAiModelId,
	internationalZAiModels,
	ModelInfo,
	mainlandZAiDefaultModelId,
	mainlandZAiModelId,
	mainlandZAiModels,
} from "@shared/api"
import OpenAI from "openai"

// Extension version - update manually or use alternative method
const extensionVersion = "1.0.0"

import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * ZAI-specific provider options
 */
interface ZAIProviderOptions extends BaseProviderOptions {
	zaiApiLine?: string
	zaiApiKey?: string
}

/**
 * Refactored ZAI provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class ZAIProvider extends BaseProvider {
	private zaiOptions: ZAIProviderOptions

	constructor(options: ZAIProviderOptions) {
		super(options)
		this.zaiOptions = options
		this.validateRequiredOptions(["zaiApiKey"])
	}

	/**
	 * Create ZAI client
	 */
	protected override createClient(): OpenAI {
		try {
			const baseURL = this.zaiOptions.zaiApiLine === "china" ? "https://api.zhipuai.cn/v1" : "https://api.zhipuai.com/v1"

			return new OpenAI({
				baseURL,
				apiKey: this.zaiOptions.zaiApiKey!,
				defaultHeaders: {
					"User-Agent": `cline-extension/${extensionVersion}`,
				},
			})
		} catch (error) {
			throw ErrorService.parseError(error, "zai")
		}
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		const isChina = this.zaiOptions.zaiApiLine === "china"

		if (isChina) {
			return mainlandZAiModels[modelId as mainlandZAiModelId] || mainlandZAiModels[mainlandZAiDefaultModelId]
		} else {
			return (
				internationalZAiModels[modelId as internationalZAiModelId] ||
				internationalZAiModels[internationalZAiDefaultModelId]
			)
		}
	}

	/**
	 * Get model ID
	 */
	private getModelId(): string {
		return this.zaiOptions.apiModelId || this.getDefaultModelId()
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		const isChina = this.zaiOptions.zaiApiLine === "china"
		return isChina ? mainlandZAiDefaultModelId : internationalZAiDefaultModelId
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
						type: "text",
						text: content,
					}
				}
			}
		} catch (error) {
			throw ErrorService.parseError(error, "zai")
		}
	}

	/**
	 * Get provider ID
	 */
	protected override getProviderId(): string {
		return "zai"
	}

	/**
	 * Get provider name
	 */
	protected override getProviderName(): string {
		return "ZAI"
	}

	/**
	 * Get provider description
	 */
	protected override getProviderDescription(): string {
		return "ZAI AI Service"
	}
}
