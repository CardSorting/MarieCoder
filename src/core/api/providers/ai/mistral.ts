import { Anthropic } from "@anthropic-ai/sdk"
import { Mistral } from "@mistralai/mistralai"
import { MistralModelId, ModelInfo, mistralDefaultModelId, mistralModels } from "@shared/api"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToMistralMessages } from "../../transform/mistral-format"
import { ApiStream } from "../../transform/stream"

/**
 * Mistral-specific provider options
 */
interface MistralProviderOptions extends BaseProviderOptions {
	mistralApiKey?: string
}

/**
 * Refactored Mistral provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class MistralProvider extends BaseProvider {
	private mistralOptions: MistralProviderOptions
	private client: Mistral | undefined

	constructor(options: MistralProviderOptions) {
		super(options)
		this.mistralOptions = options
		this.validateRequiredOptions(["mistralApiKey"])
	}

	/**
	 * Create Mistral client
	 */
	protected createClient(): Mistral {
		try {
			return new Mistral({
				apiKey: this.mistralOptions.mistralApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "mistral")
		}
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		return mistralModels[modelId] || mistralModels[mistralDefaultModelId]
	}

	/**
	 * Get model ID
	 */
	private getModelId(): MistralModelId {
		return (this.mistralOptions.apiModelId as MistralModelId) || mistralDefaultModelId
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		return mistralDefaultModelId
	}

	/**
	 * Ensure client is created
	 */
	private ensureClient(): Mistral {
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

		const mistralMessages = convertToMistralMessages(messages, systemPrompt)

		try {
			const stream = await client.chat.stream({
				model: modelId,
				messages: mistralMessages,
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
			throw ErrorService.parseError(error, "mistral")
		}
	}
}
