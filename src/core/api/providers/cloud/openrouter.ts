import { ModelInfo, openRouterDefaultModelId, openRouterDefaultModelInfo } from "@shared/api"
import OpenAI from "openai"
import { HttpProvider, HttpProviderOptions } from "../../base/http-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { createOpenRouterStream } from "../../transform/openrouter-stream"
import { ApiStream, ApiStreamUsageChunk } from "../../transform/stream"
import { OpenRouterErrorResponse } from "../shared"

/**
 * OpenRouter-specific provider options
 */
interface OpenRouterProviderOptions extends HttpProviderOptions {
	openRouterApiKey?: string
	openRouterModelId?: string
	openRouterModelInfo?: ModelInfo
	openRouterProviderSorting?: string
	reasoningEffort?: string
	thinkingBudgetTokens?: number
}

/**
 * Refactored OpenRouter provider using the new base class system
 * Demonstrates clean, maintainable provider implementation with OpenRouter integration
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class OpenRouterProvider extends HttpProvider {
	private openRouterOptions: OpenRouterProviderOptions
	private lastGenerationId?: string

	constructor(options: OpenRouterProviderOptions) {
		super(options)
		this.openRouterOptions = options
		this.validateRequiredOptions(["openRouterApiKey"])
	}

	/**
	 * Create OpenRouter client
	 */
	protected override createHttpClient(config: any): OpenAI {
		try {
			return new OpenAI({
				baseURL: "https://openrouter.ai/api/v1",
				apiKey: this.openRouterOptions.openRouterApiKey!,
				defaultHeaders: {
					"HTTP-Referer": "https://cline.bot", // Optional, for including your app on openrouter.ai rankings.
					"X-Title": "Cline", // Optional. Shows in rankings on openrouter.ai.
				},
			})
		} catch (error) {
			throw ErrorService.parseError(error, "openrouter")
		}
	}

	/**
	 * Process streaming response for OpenRouter
	 */
	protected override processStreamResponse(response: any): ApiStream {
		// This is handled by the createOpenRouterStream function
		// Return a simple generator that yields the response
		return (async function* () {
			yield { type: "text", text: "Stream processing handled by createOpenRouterStream" }
		})()
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		return this.openRouterOptions.openRouterModelInfo || openRouterDefaultModelInfo
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return this.openRouterOptions.openRouterModelId || openRouterDefaultModelId
	}

	/**
	 * Create message stream with retry logic
	 */
	@withRetry()
	async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
		try {
			const client = this.ensureClient()
			this.lastGenerationId = undefined

			const stream = await createOpenRouterStream(
				client,
				systemPrompt,
				messages,
				this.getModel(),
				this.openRouterOptions.reasoningEffort,
				this.openRouterOptions.thinkingBudgetTokens,
				this.openRouterOptions.openRouterProviderSorting,
			)

			let didOutputUsage: boolean = false

			for await (const chunk of stream) {
				// OpenRouter returns an error object instead of the OpenAI SDK throwing an error
				// Check for error field directly on chunk
				if ("error" in chunk) {
					const error = chunk.error as OpenRouterErrorResponse["error"]
					console.error(`OpenRouter API Error: ${error?.code} - ${error?.message}`)
					// Include metadata in the error message if available
					const metadataStr = error.metadata ? `\nMetadata: ${JSON.stringify(error.metadata, null, 2)}` : ""
					throw new Error(`OpenRouter API Error ${error.code}: ${error.message}${metadataStr}`)
				}

				// Check for error in choices[0].finish_reason
				// OpenRouter may return errors in a non-standard way within choices
				const choice = chunk.choices?.[0]
				// Use type assertion since OpenRouter uses non-standard "error" finish_reason
				if ((choice?.finish_reason as string) === "error") {
					// Use type assertion since OpenRouter adds non-standard error property
					const choiceWithError = choice as any
					if (choiceWithError.error) {
						const error = choiceWithError.error
						console.error(
							`OpenRouter Mid-Stream Error: ${error?.code || "Unknown"} - ${error?.message || "Unknown error"}`,
						)
						// Format error details
						const errorDetails = typeof error === "object" ? JSON.stringify(error, null, 2) : String(error)
						throw new Error(`OpenRouter Mid-Stream Error: ${errorDetails}`)
					} else {
						// Fallback if error details are not available
						throw new Error(
							`OpenRouter Mid-Stream Error: Stream terminated with error status but no error details provided`,
						)
					}
				}

				// Handle text content
				if (chunk.choices?.[0]?.delta?.content) {
					yield {
						type: "text",
						text: chunk.choices[0].delta.content,
					}
				}

				// Handle reasoning content
				if ((chunk.choices?.[0]?.delta as any)?.reasoning) {
					yield {
						type: "reasoning",
						reasoning: (chunk.choices[0].delta as any).reasoning,
					}
				}

				// Handle usage information (only output once)
				if (chunk.usage && !didOutputUsage) {
					didOutputUsage = true
					yield {
						type: "usage",
						inputTokens: chunk.usage.prompt_tokens || 0,
						outputTokens: chunk.usage.completion_tokens || 0,
						totalCost: (chunk.usage as any).total_cost || 0,
					}
				}

				// Store generation ID for usage tracking
				if (chunk.id) {
					this.lastGenerationId = chunk.id
				}
			}
		} catch (error) {
			throw ErrorService.parseError(error, "openrouter")
		}
	}

	/**
	 * Get API stream usage (for cost tracking)
	 */
	async getApiStreamUsage(): Promise<ApiStreamUsageChunk | undefined> {
		if (!this.lastGenerationId) {
			return undefined
		}

		try {
			const client = this.ensureClient()
			const response = await client.chat.completions.retrieve(this.lastGenerationId)

			if (response.usage) {
				return {
					type: "usage",
					inputTokens: response.usage.prompt_tokens || 0,
					outputTokens: response.usage.completion_tokens || 0,
					totalCost: response.usage.total_cost,
				}
			}

			return undefined
		} catch (error) {
			console.warn("Failed to retrieve OpenRouter usage:", error)
			return undefined
		}
	}
}
