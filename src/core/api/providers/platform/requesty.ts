import { Anthropic } from "@anthropic-ai/sdk"
import { ModelInfo, requestyDefaultModelId, requestyDefaultModelInfo } from "@shared/api"
import { calculateApiCostOpenAI } from "@utils/cost"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * Requesty-specific provider options
 */
interface RequestyProviderOptions extends BaseProviderOptions {
	requestyBaseUrl?: string
	requestyApiKey?: string
	reasoningEffort?: string
	thinkingBudgetTokens?: number
	requestyModelId?: string
	requestyModelInfo?: ModelInfo
}

/**
 * Requesty usage includes an extra field for Anthropic use cases.
 * Safely cast the prompt token details section to the appropriate structure.
 */
interface RequestyUsage extends OpenAI.CompletionUsage {
	prompt_tokens_details?: {
		caching_tokens?: number
		cached_tokens?: number
	}
	total_cost?: number
}

/**
 * Refactored Requesty provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class RequestyProvider extends BaseProvider {
	private requestyOptions: RequestyProviderOptions

	constructor(options: RequestyProviderOptions) {
		super(options)
		this.requestyOptions = options
		this.validateRequiredOptions(["requestyApiKey"])
	}

	/**
	 * Create Requesty client
	 */
	protected override createClient(): OpenAI {
		try {
			const baseURL = this.requestyOptions.requestyBaseUrl || "https://api.requesty.ai/v1"

			return new OpenAI({
				baseURL,
				apiKey: this.requestyOptions.requestyApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "requesty")
		}
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		return this.requestyOptions.requestyModelInfo || requestyDefaultModelInfo
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return this.requestyOptions.requestyModelId || requestyDefaultModelId
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
	private async *yieldUsage(info: ModelInfo, usage: RequestyUsage | undefined): ApiStream {
		const promptTokens = usage?.prompt_tokens || 0
		const completionTokens = usage?.completion_tokens || 0

		// Use total_cost if available, otherwise calculate
		const cost = usage?.total_cost || calculateApiCostOpenAI(info, promptTokens, completionTokens)

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

		// Add reasoning effort if provided
		if (this.requestyOptions.reasoningEffort) {
			requestOptions.reasoning_effort = this.requestyOptions.reasoningEffort
		}

		// Add thinking budget tokens if provided
		if (this.requestyOptions.thinkingBudgetTokens) {
			requestOptions.thinking_budget_tokens = this.requestyOptions.thinkingBudgetTokens
		}

		try {
			const response = await client.chat.completions.create(requestOptions)

			let usage: RequestyUsage | undefined

			// Handle the response
			const content = response.choices?.[0]?.message?.content
			if (content) {
				yield {
					type: "text",
					text: content,
				}
			}

			// Collect usage information
			if (response.usage) {
				usage = response.usage as RequestyUsage
			}

			// Yield usage information at the end
			yield* this.yieldUsage(this.getModelInfo(), usage)
		} catch (error) {
			throw ErrorService.parseError(error, "requesty")
		}
	}
}
