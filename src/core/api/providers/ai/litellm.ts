import { Anthropic } from "@anthropic-ai/sdk"
import { LiteLLMModelInfo, liteLlmDefaultModelId, liteLlmModelInfoSaneDefaults } from "@shared/api"
import { isAnthropicModelId } from "@utils/model-utils"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * LiteLLM-specific provider options
 */
interface LiteLLMProviderOptions extends BaseProviderOptions {
	liteLlmApiKey?: string
	liteLlmBaseUrl?: string
	liteLlmModelId?: string
	liteLlmModelInfo?: LiteLLMModelInfo
	thinkingBudgetTokens?: number
	liteLlmUsePromptCache?: boolean
	ulid?: string
}

/**
 * Refactored LiteLLM provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class LiteLLMProvider extends BaseProvider {
	private liteLlmOptions: LiteLLMProviderOptions
	private client: OpenAI | undefined

	constructor(options: LiteLLMProviderOptions) {
		super(options)
		this.liteLlmOptions = options
		this.validateRequiredOptions(["liteLlmApiKey"])
	}

	/**
	 * Create LiteLLM client
	 */
	protected createClient(): OpenAI {
		try {
			return new OpenAI({
				baseURL: this.liteLlmOptions.liteLlmBaseUrl || "https://api.litellm.ai/v1",
				apiKey: this.liteLlmOptions.liteLlmApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "litellm")
		}
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): LiteLLMModelInfo {
		return this.liteLlmOptions.liteLlmModelInfo || liteLlmModelInfoSaneDefaults
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		return this.liteLlmOptions.liteLlmModelId || liteLlmDefaultModelId
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

		// Build request options
		const requestOptions: any = {
			model: modelId,
			messages: openAiMessages,
			stream: true,
			temperature: 0.7,
		}

		// Add thinking budget tokens if supported
		if (this.liteLlmOptions.thinkingBudgetTokens && isAnthropicModelId(modelId)) {
			requestOptions.thinking_budget_tokens = this.liteLlmOptions.thinkingBudgetTokens
		}

		// Add prompt cache if enabled
		if (this.liteLlmOptions.liteLlmUsePromptCache) {
			requestOptions.prompt_cache = true
		}

		// Add ULID for tracking
		if (this.liteLlmOptions.ulid) {
			requestOptions.ulid = this.liteLlmOptions.ulid
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
			throw ErrorService.parseError(error, "litellm")
		}
	}
}
