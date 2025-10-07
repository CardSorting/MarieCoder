import { BedrockProvider } from "../../providers/cloud/bedrock"
import { GroqProvider } from "../../providers/cloud/groq"
import { OpenRouterProvider } from "../../providers/cloud/openrouter"
import { enhancedProviderRegistry } from "../enhanced-provider-registry"
import {
    ProviderCategory, ProviderStatus
} from "../provider-metadata"

/**
 * Enhanced Cloud Provider Registrations
 * These are cloud-based AI service providers
 * Follows NORMIE DEV methodology: clean, focused, maintainable
 */

/**
 * Register AWS Bedrock Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "bedrock",
	handlerClass: BedrockProvider,
	metadata: {
		providerId: "bedrock",
		category: ProviderCategory.CLOUD,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "AWS Bedrock",
			description: "Amazon's managed AI service with access to multiple foundation models",
			website: "https://aws.amazon.com/bedrock",
			documentationUrl: "https://docs.aws.amazon.com/bedrock",
			apiReferenceUrl: "https://docs.aws.amazon.com/bedrock/latest/APIReference",
			pricingUrl: "https://aws.amazon.com/bedrock/pricing",

			features: [
				"Multiple foundation models",
				"Serverless inference",
				"Fine-tuning capabilities",
				"Enterprise security",
				"Integration with AWS services",
			],

			configurationExamples: {
				basic: {
					description: "Basic AWS Bedrock configuration",
					example: {
						awsAccessKey: "your-access-key",
						awsSecretKey: "your-secret-key",
						awsRegion: "us-east-1",
					},
				},
				advanced: {
					description: "Advanced configuration with custom endpoint",
					example: {
						awsAccessKey: "your-access-key",
						awsSecretKey: "your-secret-key",
						awsRegion: "us-east-1",
						awsBedrockEndpoint: "bedrock.us-east-1.amazonaws.com",
						actModeAwsBedrockCustomSelected: true,
						actModeAwsBedrockCustomModelBaseId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
					},
				},
			},

			limitations: [
				"Requires AWS account",
				"Region-specific availability",
				"Complex authentication setup",
				"Some models require approval",
			],

			bestPractices: [
				"Use appropriate AWS region",
				"Implement proper IAM permissions",
				"Monitor costs and usage",
				"Use AWS profiles for development",
			],
		},

		capabilities: {
			streaming: true,
			functionCalling: true,
			vision: true,
			reasoning: true,
			toolUse: true,
			codeGeneration: true,
			rateLimitHandling: true,
			retryLogic: true,
			encryption: true,
			authentication: ["aws_credentials", "iam_role"],
		},

		configurationSchema: {
			requiredOptions: {
				awsAccessKey: {
					type: "string",
					description: "AWS access key ID",
					validation: (value: string) => value.length >= 16 || "AWS access key must be at least 16 characters",
				},
				awsSecretKey: {
					type: "string",
					description: "AWS secret access key",
					validation: (value: string) => value.length >= 20 || "AWS secret key must be at least 20 characters",
				},
				awsRegion: {
					type: "string",
					description: "AWS region",
					validation: (value: string) => /^[a-z0-9-]+$/.test(value) || "AWS region must be valid format",
				},
			},

			optionalOptions: {
				awsSessionToken: {
					type: "string",
					description: "AWS session token for temporary credentials",
				},
				awsAuthentication: {
					type: "object",
					description: "Advanced AWS authentication configuration",
				},
				awsBedrockApiKey: {
					type: "string",
					description: "Bedrock-specific API key",
				},
				awsUseCrossRegionInference: {
					type: "boolean",
					description: "Enable cross-region inference",
					default: false,
				},
				awsBedrockUsePromptCache: {
					type: "boolean",
					description: "Use prompt caching for performance",
					default: false,
				},
				awsUseProfile: {
					type: "boolean",
					description: "Use AWS profile for authentication",
					default: false,
				},
				awsProfile: {
					type: "string",
					description: "AWS profile name",
				},
				awsBedrockEndpoint: {
					type: "string",
					description: "Custom Bedrock endpoint",
				},
				awsBedrockCustomSelected: {
					type: "boolean",
					description: "Use custom model selection",
					default: false,
				},
				awsBedrockCustomModelBaseId: {
					type: "string",
					description: "Custom model base ID",
				},
				thinkingBudgetTokens: {
					type: "number",
					description: "Thinking budget tokens for reasoning models",
					default: 4000,
				},
			},
		},

		modeSupport: {
			plan: true,
			act: true,
		},

		version: "1.0.0",
		minimumApiVersion: "1.0.0",

		performance: {
			averageLatency: 1500,
			maxThroughput: 50,
			costPerToken: 0.0025,
		},

		tags: ["aws", "enterprise", "multiple-models", "serverless"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "bedrock",
			supportedFeatures: ["fine-tuning", "custom-models"],
			maxContextLength: 200000,
			supportedRegions: ["us-east-1", "us-west-2", "eu-west-1"],
		},
	},
})

/**
 * Register Groq Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "groq",
	handlerClass: GroqProvider,
	metadata: {
		providerId: "groq",
		category: ProviderCategory.CLOUD,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Groq",
			description: "Ultra-fast AI inference with LPU (Language Processing Unit) technology",
			website: "https://groq.com",
			documentationUrl: "https://console.groq.com/docs",
			apiReferenceUrl: "https://console.groq.com/docs/quickstart",
			pricingUrl: "https://console.groq.com/pricing",

			features: [
				"Extremely fast inference",
				"Low latency responses",
				"Multiple model support",
				"Simple API",
				"Cost-effective pricing",
			],

			configurationExamples: {
				basic: {
					description: "Basic Groq configuration",
					example: {
						groqApiKey: "your-groq-api-key",
						planModeApiProvider: "groq",
					},
				},
			},

			limitations: ["Rate limited", "Limited model selection", "No fine-tuning", "Basic feature set"],

			bestPractices: [
				"Use for speed-critical applications",
				"Implement proper rate limiting",
				"Monitor usage quotas",
				"Choose appropriate model size",
			],
		},

		capabilities: {
			streaming: true,
			functionCalling: false,
			vision: false,
			reasoning: false,
			toolUse: false,
			codeGeneration: true,
			rateLimitHandling: true,
			retryLogic: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				groqApiKey: {
					type: "string",
					description: "Groq API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				groqModelId: {
					type: "string",
					description: "Groq model ID to use",
					default: "llama3-8b-8192",
				},
				groqModelInfo: {
					type: "object",
					description: "Additional model information",
				},
				apiModelId: {
					type: "string",
					description: "Alternative model ID reference",
				},
			},
		},

		modeSupport: {
			plan: true,
			act: true,
		},

		version: "1.0.0",
		minimumApiVersion: "1.0.0",

		performance: {
			averageLatency: 200,
			maxThroughput: 1000,
			costPerToken: 0.0001,
		},

		tags: ["fast", "low-latency", "inference", "lpu"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "groq",
			supportedFeatures: ["fast-inference"],
			maxContextLength: 8192,
			technology: "LPU (Language Processing Unit)",
		},
	},
})

/**
 * Register OpenRouter Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "openrouter",
	handlerClass: OpenRouterProvider,
	metadata: {
		providerId: "openrouter",
		category: ProviderCategory.CLOUD,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "OpenRouter",
			description: "Unified API for accessing multiple AI models from various providers",
			website: "https://openrouter.ai",
			documentationUrl: "https://openrouter.ai/docs",
			apiReferenceUrl: "https://openrouter.ai/docs/api-reference",
			pricingUrl: "https://openrouter.ai/pricing",

			features: [
				"Access to 100+ models",
				"Unified API interface",
				"Model comparison",
				"Cost optimization",
				"Provider failover",
			],

			configurationExamples: {
				basic: {
					description: "Basic OpenRouter configuration",
					example: {
						openRouterApiKey: "your-openrouter-api-key",
						planModeApiProvider: "openrouter",
					},
				},
				advanced: {
					description: "Advanced configuration with provider sorting",
					example: {
						openRouterApiKey: "your-openrouter-api-key",
						planModeApiProvider: "openrouter",
						openRouterProviderSorting: "cost",
						planModeReasoningEffort: "medium",
						planModeThinkingBudgetTokens: 4000,
					},
				},
			},

			limitations: [
				"Third-party service dependency",
				"Potential rate limiting",
				"Model availability varies",
				"Additional latency layer",
			],

			bestPractices: [
				"Use for model comparison",
				"Implement fallback strategies",
				"Monitor costs across providers",
				"Choose appropriate model tiers",
			],
		},

		capabilities: {
			streaming: true,
			functionCalling: true,
			vision: true,
			reasoning: true,
			toolUse: true,
			codeGeneration: true,
			rateLimitHandling: true,
			retryLogic: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				openRouterApiKey: {
					type: "string",
					description: "OpenRouter API key for authentication",
					validation: (value: string) => value.startsWith("sk-or-") || "API key should start with 'sk-or-'",
				},
			},

			optionalOptions: {
				openRouterModelId: {
					type: "string",
					description: "OpenRouter model ID to use",
					default: "anthropic/claude-3.5-sonnet",
				},
				openRouterModelInfo: {
					type: "object",
					description: "Additional model information",
				},
				openRouterProviderSorting: {
					type: "string",
					description: "Provider sorting preference",
					default: "speed",
					validation: (value: string) =>
						["speed", "cost", "quality"].includes(value) || "Sorting must be 'speed', 'cost', or 'quality'",
				},
				reasoningEffort: {
					type: "string",
					description: "Reasoning effort for reasoning models",
					default: "medium",
					validation: (value: string) =>
						["low", "medium", "high"].includes(value) || "Reasoning effort must be 'low', 'medium', or 'high'",
				},
				thinkingBudgetTokens: {
					type: "number",
					description: "Thinking budget tokens",
					default: 4000,
					validation: (value: number) =>
						(value > 0 && value <= 10000) || "Thinking budget should be between 1 and 10000",
				},
			},
		},

		modeSupport: {
			plan: true,
			act: true,
		},

		version: "1.0.0",
		minimumApiVersion: "1.0.0",

		performance: {
			averageLatency: 1800,
			maxThroughput: 100,
			costPerToken: 0.002,
		},

		tags: ["unified", "multiple-providers", "cost-optimization", "failover"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "openrouter",
			supportedFeatures: ["provider-failover", "cost-optimization"],
			maxContextLength: 200000,
			supportedProviders: 100,
		},
	},
})
