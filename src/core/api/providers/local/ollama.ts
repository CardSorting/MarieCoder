import { ModelInfo, openAiModelInfoSaneDefaults } from "@shared/api"
import { Ollama } from "ollama"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOllamaMessages } from "../../transform/ollama-format"
import { ApiStream } from "../../transform/stream"

/**
 * Ollama-specific provider options
 */
interface OllamaProviderOptions extends BaseProviderOptions {
	ollamaBaseUrl?: string
	ollamaApiKey?: string
	ollamaModelId?: string
	ollamaApiOptionsCtxNum?: string
	requestTimeoutMs?: number
}

const DEFAULT_CONTEXT_WINDOW = 32768

/**
 * Refactored Ollama provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class OllamaProvider extends BaseProvider {
	private ollamaOptions: OllamaProviderOptions

	constructor(options: OllamaProviderOptions) {
		super(options)
		this.ollamaOptions = options
		this.validateRequiredOptions(["ollamaModelId"])
	}

	/**
	 * Create Ollama client
	 */
	protected override createClient(): Ollama {
		try {
			const clientOptions: any = {
				host: this.ollamaOptions.ollamaBaseUrl,
			}

			// Add API key if provided (for Ollama cloud or authenticated instances)
			if (this.ollamaOptions.ollamaApiKey) {
				clientOptions.headers = {
					Authorization: `Bearer ${this.ollamaOptions.ollamaApiKey}`,
				}
			}

			return new Ollama(clientOptions)
		} catch (error) {
			throw ErrorService.parseError(error, "ollama")
		}
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		return {
			...openAiModelInfoSaneDefaults,
			maxTokens: parseInt(this.ollamaOptions.ollamaApiOptionsCtxNum || DEFAULT_CONTEXT_WINDOW.toString()),
		}
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return this.ollamaOptions.ollamaModelId || "llama2"
	}

	/**
	 * Create message stream with retry logic
	 */
	@withRetry({ retryAllErrors: true })
	async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
		try {
			const client = this.ensureClient()
			const ollamaMessages = [{ role: "system", content: systemPrompt }, ...convertToOllamaMessages(messages)]

			const stream = await this.createStreamWithTimeout(client, ollamaMessages)

			yield* this.processOllamaStream(stream)
		} catch (error) {
			throw ErrorService.parseError(error, "ollama")
		}
	}

	/**
	 * Create stream with timeout handling
	 */
	private async createStreamWithTimeout(client: Ollama, messages: any[]): Promise<any> {
		const timeoutMs = this.ollamaOptions.requestTimeoutMs || 30000
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error(`Ollama request timed out after ${timeoutMs / 1000} seconds`)), timeoutMs)
		})

		const apiPromise = client.chat({
			model: this.getModel().id,
			messages: messages,
			stream: true,
			options: {
				num_ctx: Number(this.ollamaOptions.ollamaApiOptionsCtxNum),
			},
		})

		return await Promise.race([apiPromise, timeoutPromise])
	}

	/**
	 * Process Ollama stream and yield standardized chunks
	 */
	private async *processOllamaStream(stream: any): ApiStream {
		try {
			for await (const chunk of stream) {
				if (typeof chunk.message.content === "string") {
					yield {
						type: "text",
						text: chunk.message.content,
					}
				}

				if (chunk.done && chunk.eval_count) {
					yield {
						type: "usage",
						inputTokens: chunk.prompt_eval_count || 0,
						outputTokens: chunk.eval_count || 0,
					}
				}
			}
		} catch (error) {
			throw ErrorService.parseError(error, "ollama")
		}
	}
}
