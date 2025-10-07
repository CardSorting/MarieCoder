import { Anthropic } from "@anthropic-ai/sdk"
import { AskSageModelId, askSageDefaultModelId, askSageDefaultURL, askSageModels, ModelInfo } from "@shared/api"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { ApiStream } from "../../transform/stream"

/**
 * AskSage-specific provider options
 */
interface AskSageProviderOptions extends BaseProviderOptions {
	asksageApiKey?: string
	asksageApiUrl?: string
}

/**
 * AskSage request type
 */
type AskSageRequest = {
	system_prompt: string
	message: {
		user: "gpt" | "me"
		message: string
	}[]
	model: string
	dataset: "none"
}

/**
 * AskSage response type
 */
type AskSageResponse = {
	uuid: string
	status: number
	response: string
	message: string
}

/**
 * Refactored AskSage provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class AskSageProvider extends BaseProvider {
	private askSageOptions: AskSageProviderOptions

	constructor(options: AskSageProviderOptions) {
		super(options)
		this.askSageOptions = options
		this.validateRequiredOptions(["asksageApiKey"])
	}

	/**
	 * Create AskSage client (not needed for this provider)
	 */
	protected createClient(): any {
		// AskSage doesn't use a traditional client
		return null
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): ModelInfo {
		const modelId = this.getModelId()
		return askSageModels[modelId] || askSageModels[askSageDefaultModelId]
	}

	/**
	 * Get model ID
	 */
	private getModelId(): AskSageModelId {
		return (this.askSageOptions.apiModelId as AskSageModelId) || askSageDefaultModelId
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		return askSageDefaultModelId
	}

	/**
	 * Convert messages to AskSage format
	 */
	private convertToAskSageMessages(messages: Anthropic.Messages.MessageParam[]): { user: "gpt" | "me"; message: string }[] {
		return messages.map((msg) => ({
			user: msg.role === "user" ? "me" : "gpt",
			message: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
		}))
	}

	/**
	 * Create message stream
	 */
	@withRetry()
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const modelId = this.getModelId()
		const apiUrl = this.askSageOptions.asksageApiUrl || askSageDefaultURL

		const askSageMessages = this.convertToAskSageMessages(messages)

		const request: AskSageRequest = {
			system_prompt: systemPrompt,
			message: askSageMessages,
			model: modelId,
			dataset: "none",
		}

		try {
			const response = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${this.askSageOptions.asksageApiKey}`,
				},
				body: JSON.stringify(request),
			})

			if (!response.ok) {
				throw new Error(`AskSage API error: ${response.status} ${response.statusText}`)
			}

			const data: AskSageResponse = await response.json()

			if (data.status !== 200) {
				throw new Error(`AskSage API error: ${data.message}`)
			}

			// Yield the response as a single text delta
			yield {
				type: "text-delta",
				textDelta: data.response,
			}
		} catch (error) {
			throw ErrorService.parseError(error, "asksage")
		}
	}
}
