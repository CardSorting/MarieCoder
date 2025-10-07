import { Anthropic } from "@anthropic-ai/sdk"
import { Stream as AnthropicStream } from "@anthropic-ai/sdk/streaming"
import { AnthropicModelId, anthropicDefaultModelId, anthropicModels, CLAUDE_SONNET_1M_SUFFIX, ModelInfo } from "@shared/api"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { ApiStream } from "../../transform/stream"

/**
 * Anthropic-specific provider options
 */
interface AnthropicProviderOptions extends BaseProviderOptions {
	apiKey?: string
	anthropicBaseUrl?: string
	thinkingBudgetTokens?: number
}

/**
 * Refactored Anthropic provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class AnthropicProvider extends BaseProvider {
	private anthropicOptions: AnthropicProviderOptions
	private client: Anthropic | undefined

	constructor(options: AnthropicProviderOptions) {
		super(options)
		this.anthropicOptions = options
		this.validateRequiredOptions(["apiKey"])
	}

	/**
	 * Create Anthropic client
	 */
	protected createClient(): Anthropic {
		try {
			return new Anthropic({
				apiKey: this.anthropicOptions.apiKey!,
				baseURL: this.anthropicOptions.anthropicBaseUrl || undefined,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "anthropic")
		}
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): ModelInfo {
		const modelId = this.anthropicOptions.apiModelId || anthropicDefaultModelId
		return anthropicModels[modelId as AnthropicModelId] || anthropicModels[anthropicDefaultModelId]
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		return anthropicDefaultModelId
	}

	/**
	 * Create message stream with retry logic
	 */
	@withRetry()
	async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
		try {
			const client = this.ensureClient()
			const model = this.getModel()
			const modelId = this.getProcessedModelId(model.id)
			const enable1mContextWindow = model.id.endsWith(CLAUDE_SONNET_1M_SUFFIX)
			const reasoningOn = this.shouldEnableReasoning(modelId)

			const stream = await this.createAnthropicStream(
				client,
				modelId,
				systemPrompt,
				messages,
				reasoningOn,
				enable1mContextWindow,
			)

			yield* this.processAnthropicStream(stream)
		} catch (error) {
			throw ErrorService.parseError(error, "anthropic")
		}
	}

	/**
	 * Get processed model ID (remove 1M suffix if present)
	 */
	private getProcessedModelId(modelId: string): string {
		return modelId.endsWith(CLAUDE_SONNET_1M_SUFFIX) ? modelId.slice(0, -CLAUDE_SONNET_1M_SUFFIX.length) : modelId
	}

	/**
	 * Determine if reasoning should be enabled
	 */
	private shouldEnableReasoning(modelId: string): boolean {
		const budget_tokens = this.anthropicOptions.thinkingBudgetTokens || 0
		return !!((modelId.includes("3-7") || modelId.includes("4-") || modelId.includes("4-5")) && budget_tokens !== 0)
	}

	/**
	 * Create Anthropic stream with proper configuration
	 */
	private async createAnthropicStream(
		client: Anthropic,
		modelId: string,
		systemPrompt: string,
		messages: any[],
		reasoningOn: boolean,
		enable1mContextWindow: boolean,
	): Promise<AnthropicStream<Anthropic.RawMessageStreamEvent>> {
		const model = this.getModel()
		const budget_tokens = this.anthropicOptions.thinkingBudgetTokens || 0

		// Handle cache-enabled models
		if (this.supportsCache(modelId)) {
			return this.createCachedStream(client, modelId, systemPrompt, messages, reasoningOn, budget_tokens, model)
		}

		// Handle standard models
		return this.createStandardStream(client, modelId, systemPrompt, messages, reasoningOn, budget_tokens, model)
	}

	/**
	 * Check if model supports cache
	 */
	private supportsCache(modelId: string): boolean {
		const cacheSupportedModels = [
			"claude-sonnet-4-5-20250929",
			"claude-sonnet-4-20250514",
			"claude-3-7-sonnet-20250219",
			"claude-3-5-sonnet-20241022",
			"claude-3-5-haiku-20241022",
			"claude-opus-4-20250514",
			"claude-opus-4-1-20250805",
			"claude-3-opus-20240229",
			"claude-3-haiku-20240307",
		]
		return cacheSupportedModels.includes(modelId)
	}

	/**
	 * Create stream for cache-enabled models
	 */
	private async createCachedStream(
		client: Anthropic,
		modelId: string,
		systemPrompt: string,
		messages: any[],
		reasoningOn: boolean,
		budget_tokens: number,
		model: any,
	): Promise<AnthropicStream<Anthropic.RawMessageStreamEvent>> {
		const userMsgIndices = messages.reduce((acc, msg, index) => (msg.role === "user" ? [...acc, index] : acc), [] as number[])
		const lastUserMsgIndex = userMsgIndices[userMsgIndices.length - 1] ?? -1
		const secondLastMsgUserIndex = userMsgIndices[userMsgIndices.length - 2] ?? -1

		return await client.messages.create({
			model: modelId,
			thinking: reasoningOn ? { type: "enabled", budget_tokens: budget_tokens } : undefined,
			max_tokens: model.info.maxTokens || 8192,
			temperature: reasoningOn ? undefined : 0,
			system: [
				{
					text: systemPrompt,
					type: "text",
					cache_control: { type: "ephemeral" },
				},
			],
			messages: messages.map((message, index) => {
				if (index === lastUserMsgIndex || index === secondLastMsgUserIndex) {
					return {
						...message,
						content:
							typeof message.content === "string"
								? [
										{
											type: "text",
											text: message.content,
											cache_control: { type: "ephemeral" },
										},
									]
								: message.content,
					}
				}
				return message
			}),
			stream: true,
		})
	}

	/**
	 * Create stream for standard models
	 */
	private async createStandardStream(
		client: Anthropic,
		modelId: string,
		systemPrompt: string,
		messages: any[],
		reasoningOn: boolean,
		budget_tokens: number,
		model: any,
	): Promise<AnthropicStream<Anthropic.RawMessageStreamEvent>> {
		return await client.messages.create({
			model: modelId,
			thinking: reasoningOn ? { type: "enabled", budget_tokens: budget_tokens } : undefined,
			max_tokens: model.info.maxTokens || 8192,
			temperature: reasoningOn ? undefined : 0,
			system: systemPrompt,
			messages: messages,
			stream: true,
		})
	}

	/**
	 * Process Anthropic stream and yield standardized chunks
	 */
	private async *processAnthropicStream(stream: AnthropicStream<Anthropic.RawMessageStreamEvent>): ApiStream {
		for await (const chunk of stream) {
			if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
				yield {
					type: "text",
					text: chunk.delta.text,
				}
			} else if (chunk.type === "thinking_delta") {
				yield {
					type: "ant_thinking",
					thinking: chunk.delta,
					signature: chunk.signature,
				}
			} else if (chunk.type === "redacted_thinking_delta") {
				yield {
					type: "ant_redacted_thinking",
					data: chunk.delta,
				}
			} else if (chunk.type === "message_stop") {
				if (chunk.usage) {
					yield {
						type: "usage",
						inputTokens: chunk.usage.input_tokens,
						outputTokens: chunk.usage.output_tokens,
						cacheWriteTokens: chunk.usage.cache_write_tokens,
						cacheReadTokens: chunk.usage.cache_read_tokens,
						thoughtsTokenCount: chunk.usage.thoughts_token_count,
					}
				}
			}
		}
	}
}
