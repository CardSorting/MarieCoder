import { Anthropic } from "@anthropic-ai/sdk"
import { ModelInfo, vercelAiGatewayDefaultModelId, vercelAiGatewayDefaultModelInfo } from "@shared/api"
import OpenAI from "openai"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { ApiStream } from "../../transform/stream"
import { createVercelAIGatewayStream } from "../../transform/vercel-ai-gateway-stream"

/**
 * Vercel AI Gateway-specific provider options
 */
interface VercelAIGatewayProviderOptions extends BaseProviderOptions {
	vercelAiGatewayApiKey?: string
	vercelAiGatewayModelId?: string
	vercelAiGatewayModelInfo?: ModelInfo
}

/**
 * Refactored Vercel AI Gateway provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class VercelAIGatewayProvider extends BaseProvider {
	private vercelAIGatewayOptions: VercelAIGatewayProviderOptions

	constructor(options: VercelAIGatewayProviderOptions) {
		super(options)
		this.vercelAIGatewayOptions = options
		this.validateRequiredOptions(["vercelAiGatewayApiKey"])
	}

	/**
	 * Create Vercel AI Gateway client
	 */
	protected override createClient(): OpenAI {
		try {
			return new OpenAI({
				baseURL: "https://ai-gateway.vercel.sh/v1",
				apiKey: this.vercelAIGatewayOptions.vercelAiGatewayApiKey!,
			})
		} catch (error) {
			throw ErrorService.parseError(error, "vercel-ai-gateway")
		}
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		return this.vercelAIGatewayOptions.vercelAiGatewayModelInfo || vercelAiGatewayDefaultModelInfo
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return this.vercelAIGatewayOptions.vercelAiGatewayModelId || vercelAiGatewayDefaultModelId
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
		const model = this.getModel()

		try {
			// Use the Vercel AI Gateway stream transformer
			const stream = await createVercelAIGatewayStream(client, systemPrompt, messages, model)

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
			throw ErrorService.parseError(error, "vercel-ai-gateway")
		}
	}
}
