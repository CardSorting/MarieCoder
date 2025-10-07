import { Anthropic } from "@anthropic-ai/sdk"
import { ModelInfo } from "@shared/api"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { ErrorService } from "../../services/error-service"
import { ApiStream } from "../../transform/stream"

/**
 * Dify-specific provider options
 */
interface DifyProviderOptions extends BaseProviderOptions {
	difyApiKey?: string
	difyBaseUrl?: string
}

/**
 * Dify API Response Types
 */
export interface DifyFileResponse {
	id: string
	name: string
	size: number
	extension: string
	mime_type: string
	created_by: string
	created_at: number
}

export interface DifyMessage {
	id: string
	conversation_id: string
	inputs: Record<string, any>
	query: string
	message_files: Array<{
		id: string
		type: string
		url: string
		transfer_method: string
		belongs_to: string
	}>
	answer: string
	metadata: Record<string, any>
	created_at: number
}

export interface DifyResponse {
	event: string
	task_id: string
	id: string
	message_id: string
	conversation_id: string
	mode: string
	answer: string
	metadata: Record<string, any>
	created_at: number
}

/**
 * Refactored Dify provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class DifyProvider extends BaseProvider {
	private difyOptions: DifyProviderOptions

	constructor(options: DifyProviderOptions) {
		super(options)
		this.difyOptions = options
		this.validateRequiredOptions(["difyApiKey"])
	}

	/**
	 * Create Dify client (not needed for this provider)
	 */
	protected override createClient(): any {
		// Dify doesn't use a traditional client
		return null
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		return {
			maxTokens: 4000,
			supportsPromptCache: false,
			inputPrice: 0.1, // $0.1 per million tokens (example)
			outputPrice: 0.2, // $0.2 per million tokens (example)
		}
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return "dify-chat"
	}

	/**
	 * Convert messages to Dify format
	 */
	private convertToDifyMessages(messages: Anthropic.Messages.MessageParam[]): string {
		// Dify expects a single query string
		const lastMessage = messages[messages.length - 1]
		if (lastMessage && typeof lastMessage.content === "string") {
			return lastMessage.content
		}
		return ""
	}

	/**
	 * Create message stream
	 */
	async *createMessage(_systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const apiKey = this.difyOptions.difyApiKey!
		const baseUrl = this.difyOptions.difyBaseUrl || "https://api.dify.ai/v1"
		const query = this.convertToDifyMessages(messages)

		try {
			const response = await fetch(`${baseUrl}/chat-messages`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					inputs: {},
					query,
					response_mode: "streaming",
					conversation_id: "",
					user: "cline-user",
				}),
			})

			if (!response.ok) {
				throw new Error(`Dify API error: ${response.status} ${response.statusText}`)
			}

			const reader = response.body?.getReader()
			if (!reader) {
				throw new Error("No response body reader available")
			}

			const decoder = new TextDecoder()
			let buffer = ""

			while (true) {
				const { done, value } = await reader.read()
				if (done) {
					break
				}

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split("\n")
				buffer = lines.pop() || ""

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6)
						if (data === "[DONE]") {
							continue
						}

						try {
							const parsed: DifyResponse = JSON.parse(data)
							if (parsed.answer) {
								yield {
									type: "text",
									text: parsed.answer,
								}
							}
						} catch (_e) {
							// Ignore parsing errors for incomplete data
						}
					}
				}
			}
		} catch (error) {
			throw ErrorService.parseError(error, "dify")
		}
	}
}
