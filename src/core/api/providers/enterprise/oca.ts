import { Anthropic } from "@anthropic-ai/sdk"
import { OcaAuthService } from "@services/auth/oca/OcaAuthService"
import { DEFAULT_OCA_BASE_URL, OCI_HEADER_OPC_REQUEST_ID } from "@services/auth/oca/utils/constants"
import { Logger } from "@services/logging/Logger"
import { LiteLLMModelInfo, liteLlmDefaultModelId, liteLlmModelInfoSaneDefaults } from "@shared/api"
import OpenAI, { APIError, OpenAIError } from "openai"
import type { FinalRequestOptions, Headers as OpenAIHeaders } from "openai/core"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { ApiStream } from "../../transform/stream"

/**
 * OCA-specific provider options
 */
interface OCAProviderOptions extends BaseProviderOptions {
	ocaBaseUrl?: string
	ocaModelId?: string
	ocaModelInfo?: LiteLLMModelInfo
	thinkingBudgetTokens?: number
	ocaUsePromptCache?: boolean
	taskId?: string
}

/**
 * Refactored OCA provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class OCAProvider extends BaseProvider {
	private ocaOptions: OCAProviderOptions
	private authService: OcaAuthService | undefined

	constructor(options: OCAProviderOptions) {
		super(options)
		this.ocaOptions = options
		this.validateRequiredOptions(["ocaModelId"])
	}

	/**
	 * Create OCA client
	 */
	protected override createClient(): OpenAI {
		try {
			const baseURL = this.ocaOptions.ocaBaseUrl || DEFAULT_OCA_BASE_URL

			return new OpenAI({
				baseURL,
				apiKey: "noop", // OCA uses custom authentication
				defaultHeaders: this.createDefaultHeaders(),
			})
		} catch (error) {
			throw ErrorService.parseError(error, "oca")
		}
	}

	/**
	 * Create default headers for OCA requests
	 */
	private createDefaultHeaders(): OpenAIHeaders {
		const headers: OpenAIHeaders = {}

		// Add OCI request ID if task ID is provided
		if (this.ocaOptions.taskId) {
			headers[OCI_HEADER_OPC_REQUEST_ID] = this.ocaOptions.taskId
		}

		return headers
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): LiteLLMModelInfo {
		return this.ocaOptions.ocaModelInfo || liteLlmModelInfoSaneDefaults
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return this.ocaOptions.ocaModelId || liteLlmDefaultModelId
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
	 * Ensure auth service is created
	 */
	private ensureAuthService(): OcaAuthService {
		if (!this.authService) {
			this.authService = new OcaAuthService()
		}
		return this.authService
	}

	/**
	 * Create message stream
	 */
	@withRetry()
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const client = this.ensureClient()
		const authService = this.ensureAuthService()
		const modelId = this.getModel().id

		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]

		// Build request options
		const requestOptions: any = {
			model: modelId,
			messages: openAiMessages,
			stream: true,
			temperature: 0.7,
		}

		// Add thinking budget tokens if provided
		if (this.ocaOptions.thinkingBudgetTokens) {
			requestOptions.thinking_budget_tokens = this.ocaOptions.thinkingBudgetTokens
		}

		// Add prompt cache if enabled
		if (this.ocaOptions.ocaUsePromptCache) {
			requestOptions.prompt_cache = true
		}

		try {
			// Get authentication headers
			const authHeaders = await authService.getAuthHeaders()

			// Create request with custom headers
			const finalRequestOptions: FinalRequestOptions = {
				...requestOptions,
				headers: {
					...this.createDefaultHeaders(),
					...authHeaders,
				},
			}

			const stream = await client.chat.completions.create(finalRequestOptions)

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
			// Handle OCA-specific errors
			if (error instanceof APIError) {
				Logger.error("OCA API Error:", error)
				throw ErrorService.parseError(error, "oca")
			} else if (error instanceof OpenAIError) {
				Logger.error("OCA OpenAI Error:", error)
				throw ErrorService.parseError(error, "oca")
			} else {
				throw ErrorService.parseError(error, "oca")
			}
		}
	}
}
