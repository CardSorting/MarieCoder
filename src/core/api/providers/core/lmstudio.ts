import type { Anthropic } from "@anthropic-ai/sdk"
import { openAiModelInfoSaneDefaults } from "@shared/api"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import type { ApiStream } from "../../transform/stream"
import { convertToOpenAiMessages } from "../../utils/message-transformers"

/**
 * LMStudio-specific provider options
 */
interface LmStudioProviderOptions extends BaseProviderOptions {
	lmStudioBaseUrl?: string
	lmStudioModelId?: string
	lmStudioMaxTokens?: string
	planModeLmStudioModelId?: string
	actModeLmStudioModelId?: string
}

/**
 * LMStudio provider for local model inference
 * Follows MarieCoder standards: clean, self-documenting, type-safe
 */
export class LmStudioProvider extends BaseProvider {
	private lmStudioOptions: LmStudioProviderOptions

	constructor(options: LmStudioProviderOptions) {
		super(options)
		this.lmStudioOptions = options
	}

	/**
	 * Create OpenAI client configured for LMStudio
	 */
	protected override createClient(): OpenAI {
		try {
			const baseUrl = this.lmStudioOptions.lmStudioBaseUrl || "http://localhost:1234"
			// Docs on the new v0 api endpoint: https://lmstudio.ai/docs/app/api/endpoints/rest
			const apiUrl = new URL("api/v0", baseUrl).toString()

			return new OpenAI({
				baseURL: apiUrl,
				apiKey: "noop", // LMStudio doesn't require API key
			})
		} catch (error) {
			throw ErrorService.parseError(error, "lmstudio")
		}
	}

	/**
	 * Get provider ID
	 */
	protected override getProviderId(): string {
		return "lmstudio"
	}

	/**
	 * Get model information with context window from configuration
	 */
	protected override getModelInfo() {
		const info = { ...openAiModelInfoSaneDefaults }
		const maxTokens = Number(this.lmStudioOptions.lmStudioMaxTokens)
		if (!Number.isNaN(maxTokens) && maxTokens > 0) {
			info.contextWindow = maxTokens
		}
		return info
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return this.lmStudioOptions.lmStudioModelId || ""
	}

	/**
	 * Create message stream with retry logic
	 */
	@withRetry({ retryAllErrors: true })
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		try {
			const client = this.ensureClient() as OpenAI
			const model = this.getModel()

			const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
				{ role: "system", content: systemPrompt },
				...convertToOpenAiMessages(messages),
			]

			const stream = await client.chat.completions.create({
				model: model.id,
				messages: openAiMessages,
				stream: true,
				stream_options: { include_usage: true },
				max_completion_tokens: this.lmStudioOptions.lmStudioMaxTokens
					? Number(this.lmStudioOptions.lmStudioMaxTokens)
					: undefined,
			})

			yield* this.processOpenAiStream(stream)
		} catch {
			// LM Studio doesn't return detailed error codes/body
			throw new Error(
				"Please check the LM Studio developer logs to debug what went wrong. You may need to load the model with a larger context length to work with Cline's prompts. Alternatively, try enabling Compact Prompt in your settings when working with a limited context window.",
			)
		}
	}

	/**
	 * Process OpenAI stream and yield standardized chunks
	 */
	private async *processOpenAiStream(stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>): ApiStream {
		for await (const chunk of stream) {
			const choice = chunk.choices[0]
			const delta = choice?.delta

			// Handle text content
			if (delta?.content) {
				yield {
					type: "text",
					text: delta.content,
				}
			}

			// Handle reasoning content (if supported by model)
			if (delta && "reasoning_content" in delta && delta.reasoning_content) {
				yield {
					type: "reasoning",
					reasoning: (delta.reasoning_content as string | undefined) || "",
				}
			}

			// Handle usage information
			if (chunk.usage) {
				yield {
					type: "usage",
					inputTokens: chunk.usage.prompt_tokens || 0,
					outputTokens: chunk.usage.completion_tokens || 0,
					cacheReadTokens: chunk.usage.prompt_tokens_details?.cached_tokens || 0,
				}
			}
		}
	}
}
