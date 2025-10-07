import { Anthropic } from "@anthropic-ai/sdk"
import { type ModelInfo, type NebiusModelId, nebiusDefaultModelId, nebiusModels } from "@shared/api"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * Nebius-specific provider options
 */
interface NebiusProviderOptions extends BaseProviderOptions {
	nebiusApiKey?: string
}

/**
 * Refactored Nebius provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class NebiusProvider extends BaseProvider {
	private nebiusOptions: NebiusProviderOptions

	constructor(options: NebiusProviderOptions) {
		super(options)
		this.nebiusOptions = options
		this.validateRequiredOptions(["nebiusApiKey"])
	}

	/**
	 * Create Nebius client
	 */
	protected override createClient(): OpenAI {
		try {
			return new OpenAI({
				baseURL: "https://api.studio.nebius.ai/v1",
				apiKey: this.nebiusOptions.nebiusApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "nebius")
		}
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		return nebiusModels[modelId] || nebiusModels[nebiusDefaultModelId]
	}

	/**
	 * Get model ID
	 */
	private getModelId(): NebiusModelId {
		return (this.nebiusOptions.apiModelId as NebiusModelId) || nebiusDefaultModelId
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return nebiusDefaultModelId
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
			throw ErrorService.parseError(error, "nebius")
		}
	}
}
