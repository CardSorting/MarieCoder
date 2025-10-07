import { Anthropic } from "@anthropic-ai/sdk"
import Cerebras from "@cerebras/cerebras_cloud_sdk"
import { CerebrasModelId, cerebrasDefaultModelId, cerebrasModels, ModelInfo } from "@shared/api"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { ApiStream } from "../../transform/stream"

/**
 * Cerebras-specific provider options
 */
interface CerebrasProviderOptions extends BaseProviderOptions {
	cerebrasApiKey?: string
}

/**
 * Refactored Cerebras provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class CerebrasProvider extends BaseProvider {
	private cerebrasOptions: CerebrasProviderOptions

	constructor(options: CerebrasProviderOptions) {
		super(options)
		this.cerebrasOptions = options
		this.validateRequiredOptions(["cerebrasApiKey"])
	}

	/**
	 * Create Cerebras client
	 */
	protected override createClient(): Cerebras {
		try {
			// Clean and validate the API key
			const cleanApiKey = this.cerebrasOptions.cerebrasApiKey?.trim()

			if (!cleanApiKey) {
				throw new Error("Cerebras API key is required")
			}

			return new Cerebras({
				apiKey: cleanApiKey,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "cerebras")
		}
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		return cerebrasModels[modelId] || cerebrasModels[cerebrasDefaultModelId]
	}

	/**
	 * Get model ID
	 */
	private getModelId(): CerebrasModelId {
		return (this.cerebrasOptions.apiModelId as CerebrasModelId) || cerebrasDefaultModelId
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return cerebrasDefaultModelId
	}

	/**
	 * Ensure client is created
	 */
	protected override ensureClient(): Cerebras {
		if (!this.client) {
			this.client = this.createClient()
		}
		return this.client
	}

	/**
	 * Convert messages to Cerebras format
	 */
	private convertToCerebrasMessages(messages: Anthropic.Messages.MessageParam[]): any[] {
		return messages.map((msg) => ({
			role: msg.role,
			content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
		}))
	}

	/**
	 * Create message stream
	 */
	@withRetry()
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const client = this.ensureClient()
		const modelId = this.getModelId()

		const cerebrasMessages = this.convertToCerebrasMessages(messages)

		try {
			const stream = await client.chat.completions.create({
				model: modelId,
				messages: [{ role: "system", content: systemPrompt }, ...cerebrasMessages],
				stream: true,
				temperature: 0.7,
			})

			for await (const chunk of stream) {
				const content = (chunk as any).choices?.[0]?.delta?.content
				if (content) {
					yield {
						type: "text",
						text: content,
					}
				}
			}
		} catch (error) {
			throw ErrorService.parseError(error, "cerebras")
		}
	}
}
