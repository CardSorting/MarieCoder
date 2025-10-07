import type { Anthropic } from "@anthropic-ai/sdk"
import { type ModelInfo, openAiModelInfoSaneDefaults } from "@shared/api"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import type { ApiStream } from "../../transform/stream"

/**
 * LMStudio-specific provider options
 */
interface LmStudioProviderOptions extends BaseProviderOptions {
	lmStudioBaseUrl?: string
	lmStudioModelId?: string
	lmStudioMaxTokens?: string
}

/**
 * Refactored LMStudio provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class LmStudioProvider extends BaseProvider {
	private lmStudioOptions: LmStudioProviderOptions

	constructor(options: LmStudioProviderOptions) {
		super(options)
		this.lmStudioOptions = options
		this.validateRequiredOptions(["lmStudioModelId"])
	}

	/**
	 * Create LMStudio client
	 */
	protected override createClient(): OpenAI {
		try {
			return new OpenAI({
				// Docs on the new v0 api endpoint: https://lmstudio.ai/docs/app/api/endpoints/rest
				baseURL: new URL("api/v0", this.lmStudioOptions.lmStudioBaseUrl || "http://localhost:1234").toString(),
				apiKey: "noop",
			})
		} catch (error) {
			throw ErrorService.parseError(error, "lmstudio")
		}
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		return {
			...openAiModelInfoSaneDefaults,
			maxTokens: this.lmStudioOptions.lmStudioMaxTokens ? parseInt(this.lmStudioOptions.lmStudioMaxTokens) : undefined,
		}
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return this.lmStudioOptions.lmStudioModelId || "lmstudio-community/Llama-3.1-8B-Instruct-GGUF"
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
	@withRetry({ retryAllErrors: true })
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const client = this.ensureClient()
		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]

		try {
			const stream = await client.chat.completions.create({
				model: this.getModel().id,
				messages: openAiMessages,
				stream: true,
				temperature: 0.7,
				max_tokens: this.lmStudioOptions.lmStudioMaxTokens ? parseInt(this.lmStudioOptions.lmStudioMaxTokens) : undefined,
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
			throw ErrorService.parseError(error, "lmstudio")
		}
	}
}
