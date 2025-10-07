import {
    BedrockRuntimeClient,
    ConversationRole,
    ConverseStreamCommand
} from "@aws-sdk/client-bedrock-runtime"
import { fromNodeProviderChain } from "@aws-sdk/credential-providers"
import { BedrockModelId, bedrockDefaultModelId, bedrockModels, ModelInfo } from "@shared/api"
import { BaseProvider, BaseProviderOptions } from "../../base/base-provider"
import { withRetry } from "../../retry"
import { ErrorService } from "../../services/error-service"
import { ApiStream } from "../../transform/stream"

/**
 * Bedrock-specific provider options
 */
interface BedrockProviderOptions extends BaseProviderOptions {
	apiModelId?: string
	awsAccessKey?: string
	awsSecretKey?: string
	awsSessionToken?: string
	awsRegion?: string
	awsAuthentication?: string
	awsBedrockApiKey?: string
	awsUseCrossRegionInference?: boolean
	awsBedrockUsePromptCache?: boolean
	awsUseProfile?: boolean
	awsProfile?: string
	awsBedrockEndpoint?: string
	awsBedrockCustomSelected?: boolean
	awsBedrockCustomModelBaseId?: string
	thinkingBudgetTokens?: number
}

// Extend AWS SDK types to include additionalModelResponseFields
interface ExtendedMetadata {
	usage?: {
		inputTokens?: number
		outputTokens?: number
		cacheReadInputTokens?: number
		cacheWriteInputTokens?: number
	}
	additionalModelResponseFields?: {
		thinkingResponse?: {
			reasoning?: Array<{
				type: string
				text?: string
				signature?: string
			}>
		}
	}
}

// Define types for stream response content blocks
interface ContentBlockStart {
	contentBlockIndex?: number
	start?: {
		type?: string
		thinking?: string
	}
	contentBlock?: {
		type?: string
		thinking?: string
	}
	type?: string
	thinking?: string
}

// Define types for stream response deltas
interface ContentBlockDelta {
	contentBlockIndex?: number
	delta?: {
		type?: string
		thinking?: string
		text?: string
		reasoningContent?: {
			text?: string
		}
	}
}

// Define types for supported content types
type SupportedContentType = "text" | "image" | "thinking"

interface ContentItem {
	type: SupportedContentType
	text?: string
	source?: {
		data: string | Buffer | Uint8Array
		media_type?: string
	}
}

// Define cache point type for AWS Bedrock
interface CachePointContentBlock {
	cachePoint: {
		type: "default"
	}
}

/**
 * Refactored Bedrock provider using the new base class system
 * Demonstrates clean, maintainable provider implementation with AWS integration
 * Follows NORMIE DEV methodology: clean, unified, no duplication
 */
export class BedrockProvider extends BaseProvider {
	private bedrockOptions: BedrockProviderOptions
	protected override client: BedrockRuntimeClient | undefined = undefined

	constructor(options: BedrockProviderOptions) {
		super(options)
		this.bedrockOptions = options
		this.validateRequiredOptions(["awsAccessKey", "awsSecretKey", "awsRegion"])
	}

	/**
	 * Create Bedrock client with AWS credentials
	 */
	protected override createClient(): BedrockRuntimeClient {
		try {
			const clientConfig: any = {
				region: this.bedrockOptions.awsRegion,
			}

			// Configure credentials
			if (this.bedrockOptions.awsUseProfile) {
				// Use AWS profile
				clientConfig.credentials = fromNodeProviderChain({
					profile: this.bedrockOptions.awsProfile,
				})
			} else if (this.bedrockOptions.awsAccessKey && this.bedrockOptions.awsSecretKey) {
				// Use access key and secret key
				clientConfig.credentials = {
					accessKeyId: this.bedrockOptions.awsAccessKey,
					secretAccessKey: this.bedrockOptions.awsSecretKey,
					sessionToken: this.bedrockOptions.awsSessionToken,
				}
			}

			// Configure endpoint if provided
			if (this.bedrockOptions.awsBedrockEndpoint) {
				clientConfig.endpoint = this.bedrockOptions.awsBedrockEndpoint
			}

			return new BedrockRuntimeClient(clientConfig)
		} catch (error) {
			throw ErrorService.parseError(error, "bedrock")
		}
	}

	/**
	 * Get model information
	 */
	protected override getModelInfo(): ModelInfo {
		const modelId = this.bedrockOptions.apiModelId || bedrockDefaultModelId
		return bedrockModels[modelId as BedrockModelId] || bedrockModels[bedrockDefaultModelId]
	}

	/**
	 * Get default model ID
	 */
	protected override getDefaultModelId(): string {
		return this.bedrockOptions.apiModelId || bedrockDefaultModelId
	}

	/**
	 * Create message stream with retry logic
	 */
	@withRetry()
	async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
		try {
			const client = this.ensureClient()
			const modelId = this.getDefaultModelId()
			const model = this.getModel()

			// Check if this is a Claude model that supports thinking
			const isClaudeModel = modelId.includes("claude")
			const supportsThinking = isClaudeModel && (modelId.includes("3-7") || modelId.includes("4-") || modelId.includes("4-5"))
			const enableThinking = supportsThinking && (this.bedrockOptions.thinkingBudgetTokens || 0) > 0

			// Convert messages to Bedrock format
			const bedrockMessages = this.convertToBedrockMessages(systemPrompt, messages, enableThinking)

			// Create stream command
			const command = new ConverseStreamCommand({
				modelId: modelId,
				messages: bedrockMessages,
				system: systemPrompt ? [{ text: systemPrompt }] : undefined,
				inferenceConfig: {
					temperature: 0.7,
					maxTokens: model.info.maxTokens ?? 8192,
				},
				additionalModelRequestFields: enableThinking
					? {
							thinking: {
								type: "enabled",
								budgetTokens: this.bedrockOptions.thinkingBudgetTokens || 0,
							},
						}
					: undefined,
			})

			// Execute command and get stream
			const response = await client.send(command)

			yield* this.processBedrockStream(response)
		} catch (error) {
			throw ErrorService.parseError(error, "bedrock")
		}
	}

	/**
	 * Convert messages to Bedrock format
	 */
	private convertToBedrockMessages(systemPrompt: string, messages: any[], enableThinking: boolean): any[] {
		const bedrockMessages: any[] = []

		for (const message of messages) {
			const bedrockMessage: any = {
				role: message.role === "user" ? ConversationRole.USER : ConversationRole.ASSISTANT,
				content: [],
			}

			// Handle different content types
			if (typeof message.content === "string") {
				bedrockMessage.content.push({ text: message.content })
			} else if (Array.isArray(message.content)) {
				for (const contentItem of message.content) {
					if (contentItem.type === "text") {
						bedrockMessage.content.push({ text: contentItem.text })
					} else if (contentItem.type === "image") {
						bedrockMessage.content.push({
							image: {
								format: contentItem.source?.media_type || "jpeg",
								source: {
									bytes: contentItem.source?.data,
								},
							},
						})
					}
				}
			}

			bedrockMessages.push(bedrockMessage)
		}

		return bedrockMessages
	}

	/**
	 * Process Bedrock stream and yield standardized chunks
	 */
	private async *processBedrockStream(response: any): ApiStream {
		try {
			for await (const chunk of response) {
				// Handle content block start
				if (chunk.contentBlockStart) {
					const start = chunk.contentBlockStart as ContentBlockStart
					if (start.start?.type === "thinking") {
						yield {
							type: "ant_thinking",
							thinking: start.start.thinking || "",
							signature: "",
						}
					}
				}

				// Handle content block delta
				if (chunk.contentBlockDelta) {
					const delta = chunk.contentBlockDelta as ContentBlockDelta
					if (delta.delta?.type === "text") {
						yield {
							type: "text",
							text: delta.delta.text || "",
						}
					} else if (delta.delta?.type === "thinking") {
						yield {
							type: "ant_thinking",
							thinking: delta.delta.thinking || "",
							signature: "",
						}
					}
				}

				// Handle metadata (usage information)
				if (chunk.metadata) {
					const metadata = chunk.metadata as ExtendedMetadata
					if (metadata.usage) {
						yield {
							type: "usage",
							inputTokens: metadata.usage.inputTokens || 0,
							outputTokens: metadata.usage.outputTokens || 0,
							cacheReadTokens: metadata.usage.cacheReadInputTokens || 0,
							cacheWriteTokens: metadata.usage.cacheWriteInputTokens || 0,
						}
					}
				}
			}
		} catch (error) {
			throw ErrorService.parseError(error, "bedrock")
		}
	}

	/**
	 * Get API stream usage (for cost tracking)
	 */
	async getApiStreamUsage(): Promise<any> {
		// Bedrock doesn't provide separate usage endpoint
		// Usage is included in the stream response
		return undefined
	}
}
