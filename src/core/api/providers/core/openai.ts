import { ModelInfo, OpenAiCompatibleModelInfo, openAiModelInfoSaneDefaults } from "@shared/api"
import OpenAI, { AzureOpenAI } from "openai"
import type { ChatCompletionReasoningEffort } from "openai/resources/chat/completions"
import { HttpProvider, HttpProviderOptions } from "../../base/http-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { convertToOpenAiMessages } from "../../transform/openai-format"
import { convertToR1Format } from "../../transform/r1-format"
import { ApiStream } from "../../transform/stream"

/**
 * OpenAI-specific provider options
 */
interface OpenAiProviderOptions extends HttpProviderOptions {
	openAiApiKey?: string
	openAiBaseUrl?: string
	azureApiVersion?: string
	openAiHeaders?: Record<string, string>
	openAiModelId?: string
	openAiModelInfo?: OpenAiCompatibleModelInfo
	reasoningEffort?: string
}

/**
 * Refactored OpenAI provider using the new base class system
 * Demonstrates clean, maintainable provider implementation
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class OpenAiProvider extends HttpProvider {
	private openAiOptions: OpenAiProviderOptions
	private client: OpenAI | undefined

	constructor(options: OpenAiProviderOptions) {
		super(options)
		this.openAiOptions = options
		this.validateRequiredOptions(["openAiApiKey"])
	}

	/**
	 * Create OpenAI client with Azure support
	 */
	protected createHttpClient(config: any): OpenAI {
		try {
			// Check if this is an Azure endpoint
			if (this.isAzureEndpoint()) {
				return new AzureOpenAI({
					baseURL: this.openAiOptions.openAiBaseUrl,
					apiKey: this.openAiOptions.openAiApiKey!,
					apiVersion: this.openAiOptions.azureApiVersion || "2024-02-15-preview",
					defaultHeaders: this.openAiOptions.openAiHeaders,
				})
			} else {
				return new OpenAI({
					baseURL: this.openAiOptions.openAiBaseUrl,
					apiKey: this.openAiOptions.openAiApiKey!,
					defaultHeaders: this.openAiOptions.openAiHeaders,
				})
			}
		} catch (error) {
			throw ErrorService.parseError(error, "openai")
		}
	}

	/**
	 * Check if this is an Azure endpoint
	 */
	private isAzureEndpoint(): boolean {
		return !!(
			this.openAiOptions.azureApiVersion ||
			((this.openAiOptions.openAiBaseUrl?.toLowerCase().includes("azure.com") ||
				this.openAiOptions.openAiBaseUrl?.toLowerCase().includes("azure.us")) &&
				!this.openAiOptions.openAiModelId?.toLowerCase().includes("deepseek"))
		)
	}

	/**
	 * Get model information
	 */
	protected getModelInfo(): ModelInfo {
		return this.openAiOptions.openAiModelInfo || openAiModelInfoSaneDefaults
	}

	/**
	 * Get default model ID
	 */
	protected getDefaultModelId(): string {
		return this.openAiOptions.openAiModelId || "gpt-4"
	}

	/**
	 * Create message stream with retry logic
	 */
	@withRetry()
	async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
		try {
			const client = this.ensureClient()
			const modelId = this.getDefaultModelId()
			const isDeepseekReasoner = modelId.includes("deepseek-reasoner")
			const isR1FormatRequired = this.openAiOptions.openAiModelInfo?.isR1FormatRequired ?? false
			const isReasoningModelFamily = modelId.includes("o1") || modelId.includes("o3") || modelId.includes("o4")

			const openAiMessages = this.buildOpenAiMessages(
				systemPrompt,
				messages,
				isDeepseekReasoner,
				isR1FormatRequired,
				isReasoningModelFamily,
			)
			const requestConfig = this.buildRequestConfig(modelId, openAiMessages, isReasoningModelFamily)

			const stream = await client.chat.completions.create(requestConfig)

			yield* this.processOpenAiStream(stream)
		} catch (error) {
			throw ErrorService.parseError(error, "openai")
		}
	}

	/**
	 * Build OpenAI messages based on model requirements
	 */
	private buildOpenAiMessages(
		systemPrompt: string,
		messages: any[],
		isDeepseekReasoner: boolean,
		isR1FormatRequired: boolean,
		isReasoningModelFamily: boolean,
	): any[] {
		if (isDeepseekReasoner || isR1FormatRequired) {
			return convertToR1Format([{ role: "user", content: systemPrompt }, ...messages])
		}

		if (isReasoningModelFamily) {
			return [{ role: "developer", content: systemPrompt }, ...convertToOpenAiMessages(messages)]
		}

		return [{ role: "system", content: systemPrompt }, ...convertToOpenAiMessages(messages)]
	}

	/**
	 * Build request configuration
	 */
	private buildRequestConfig(modelId: string, messages: any[], isReasoningModelFamily: boolean): any {
		const config: any = {
			model: modelId,
			messages: messages,
			stream: true,
		}

		// Set temperature based on model type
		if (isReasoningModelFamily) {
			config.temperature = undefined // Reasoning models don't support temperature
			config.reasoning_effort = (this.openAiOptions.reasoningEffort as ChatCompletionReasoningEffort) || "medium"
		} else {
			config.temperature = this.openAiOptions.openAiModelInfo?.temperature ?? openAiModelInfoSaneDefaults.temperature
		}

		// Set max tokens if specified
		if (this.openAiOptions.openAiModelInfo?.maxTokens && this.openAiOptions.openAiModelInfo.maxTokens > 0) {
			config.max_tokens = Number(this.openAiOptions.openAiModelInfo.maxTokens)
		}

		return config
	}

	/**
	 * Process OpenAI stream and yield standardized chunks
	 */
	private async *processOpenAiStream(stream: any): ApiStream {
		for await (const chunk of stream) {
			if (chunk.choices?.[0]?.delta?.content) {
				yield {
					type: "text",
					text: chunk.choices[0].delta.content,
				}
			}

			if (chunk.choices?.[0]?.delta?.reasoning) {
				yield {
					type: "reasoning",
					reasoning: chunk.choices[0].delta.reasoning,
				}
			}

			if (chunk.choices?.[0]?.delta?.reasoning_details) {
				yield {
					type: "reasoning_details",
					reasoning_details: chunk.choices[0].delta.reasoning_details,
				}
			}

			if (chunk.usage) {
				yield {
					type: "usage",
					inputTokens: chunk.usage.prompt_tokens || 0,
					outputTokens: chunk.usage.completion_tokens || 0,
					totalCost: chunk.usage.total_cost,
				}
			}
		}
	}
}
