import { AnthropicProvider } from "../../providers/core/anthropic"
import { GeminiProvider } from "../../providers/core/gemini"
import { OpenAiProvider } from "../../providers/core/openai"
import { enhancedProviderRegistry } from "../enhanced-provider-registry"
import {
    ProviderCategory, ProviderStatus
} from "../provider-metadata"

/**
 * Enhanced Core Provider Registrations
 * These are the most commonly used and essential providers
 * Follows NORMIE DEV methodology: clean, focused, maintainable
 */

/**
 * Register Anthropic Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "anthropic",
	handlerClass: AnthropicProvider,
	metadata: {
		providerId: "anthropic",
		category: ProviderCategory.CORE,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Anthropic Claude",
			description: "Advanced AI assistant with strong reasoning capabilities and safety features",
			website: "https://www.anthropic.com",
			documentationUrl: "https://docs.anthropic.com",
			apiReferenceUrl: "https://docs.anthropic.com/claude/reference",
			pricingUrl: "https://www.anthropic.com/pricing",

			features: [
				"Advanced reasoning and analysis",
				"Code generation and debugging",
				"Creative writing and content generation",
				"Safety-first approach",
				"Long context understanding",
			],

			configurationExamples: {
				basic: {
					description: "Basic Claude API configuration",
					example: {
						apiKey: "your-anthropic-api-key",
						planModeApiProvider: "anthropic",
					},
				},
				advanced: {
					description: "Advanced configuration with custom base URL",
					example: {
						apiKey: "your-anthropic-api-key",
						anthropicBaseUrl: "https://api.anthropic.com",
						planModeApiProvider: "anthropic",
						planModeThinkingBudgetTokens: 4000,
					},
				},
			},

			limitations: ["Rate limited based on API tier", "Requires API key", "Some models have usage quotas"],

			bestPractices: [
				"Use appropriate model for your use case",
				"Implement proper error handling",
				"Monitor token usage",
				"Use streaming for long responses",
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
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				apiKey: {
					type: "string",
					description: "Anthropic API key for authentication",
					validation: (value: string) => value.startsWith("sk-") || "API key should start with 'sk-'",
				},
			},

			optionalOptions: {
				anthropicBaseUrl: {
					type: "string",
					description: "Custom base URL for Anthropic API",
					default: "https://api.anthropic.com",
					validation: (value: string) => value.startsWith("http") || "Base URL must be a valid HTTP URL",
				},
				apiModelId: {
					type: "string",
					description: "Claude model ID to use",
					default: "claude-3-5-sonnet-20241022",
					validation: (value: string) => value.startsWith("claude-") || "Model ID should start with 'claude-'",
				},
				thinkingBudgetTokens: {
					type: "number",
					description: "Maximum tokens for thinking/reasoning",
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
			averageLatency: 1200,
			maxThroughput: 100,
			costPerToken: 0.003,
		},

		tags: ["reasoning", "safety", "code", "creative", "long-context"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "claude",
			supportedFeatures: ["reasoning", "vision", "function-calling"],
			maxContextLength: 200000,
		},
	},
})

/**
 * Register OpenAI Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "openai",
	handlerClass: OpenAiProvider,
	metadata: {
		providerId: "openai",
		category: ProviderCategory.CORE,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "OpenAI GPT",
			description: "Leading AI language model with strong performance across various tasks",
			website: "https://openai.com",
			documentationUrl: "https://platform.openai.com/docs",
			apiReferenceUrl: "https://platform.openai.com/docs/api-reference",
			pricingUrl: "https://openai.com/pricing",

			features: [
				"High-quality text generation",
				"Code generation and completion",
				"Function calling capabilities",
				"Vision and image understanding",
				"Fine-tuning support",
			],

			configurationExamples: {
				basic: {
					description: "Basic OpenAI API configuration",
					example: {
						openAiApiKey: "your-openai-api-key",
						planModeApiProvider: "openai",
					},
				},
				azure: {
					description: "Azure OpenAI configuration",
					example: {
						openAiApiKey: "your-azure-api-key",
						openAiBaseUrl: "https://your-resource.openai.azure.com",
						azureApiVersion: "2024-02-15-preview",
						planModeApiProvider: "openai",
					},
				},
			},

			limitations: ["Rate limited based on subscription tier", "Requires API key", "Some models have usage quotas"],

			bestPractices: [
				"Use appropriate model for your task",
				"Implement exponential backoff",
				"Monitor token usage and costs",
				"Use streaming for better UX",
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
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				openAiApiKey: {
					type: "string",
					description: "OpenAI API key for authentication",
					validation: (value: string) => value.startsWith("sk-") || "API key should start with 'sk-'",
				},
			},

			optionalOptions: {
				openAiBaseUrl: {
					type: "string",
					description: "Custom base URL for OpenAI API",
					default: "https://api.openai.com",
					validation: (value: string) => value.startsWith("http") || "Base URL must be a valid HTTP URL",
				},
				azureApiVersion: {
					type: "string",
					description: "Azure OpenAI API version",
					default: "2024-02-15-preview",
				},
				openAiModelId: {
					type: "string",
					description: "OpenAI model ID to use",
					default: "gpt-4o",
					validation: (value: string) => value.startsWith("gpt-") || "Model ID should start with 'gpt-'",
				},
				reasoningEffort: {
					type: "string",
					description: "Reasoning effort level for o1 models",
					default: "medium",
					validation: (value: string) =>
						["low", "medium", "high"].includes(value) || "Reasoning effort must be 'low', 'medium', or 'high'",
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
			averageLatency: 800,
			maxThroughput: 150,
			costPerToken: 0.002,
		},

		tags: ["general", "code", "vision", "function-calling", "azure"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "gpt",
			supportedFeatures: ["vision", "function-calling", "fine-tuning"],
			maxContextLength: 128000,
		},
	},
})

/**
 * Register Gemini Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "gemini",
	handlerClass: GeminiProvider,
	metadata: {
		providerId: "gemini",
		category: ProviderCategory.CORE,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Google Gemini",
			description: "Google's advanced AI model with multimodal capabilities",
			website: "https://ai.google.dev",
			documentationUrl: "https://ai.google.dev/docs",
			apiReferenceUrl: "https://ai.google.dev/api/rest",
			pricingUrl: "https://ai.google.dev/pricing",

			features: [
				"Multimodal understanding (text, images, audio)",
				"Fast inference speeds",
				"Large context window",
				"Function calling",
				"Code generation",
			],

			configurationExamples: {
				basic: {
					description: "Basic Gemini API configuration",
					example: {
						geminiApiKey: "your-gemini-api-key",
						vertexProjectId: "your-project-id",
					},
				},
				vertex: {
					description: "Google Cloud Vertex AI configuration",
					example: {
						geminiApiKey: "your-gemini-api-key",
						vertexProjectId: "your-project-id",
						vertexRegion: "us-central1",
						planModeApiProvider: "gemini",
					},
				},
			},

			limitations: ["Rate limited based on quota", "Requires Google Cloud project", "Some features require Vertex AI"],

			bestPractices: [
				"Use appropriate model variant",
				"Implement proper error handling",
				"Monitor quota usage",
				"Use streaming for better performance",
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
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				geminiApiKey: {
					type: "string",
					description: "Gemini API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
				vertexProjectId: {
					type: "string",
					description: "Google Cloud project ID",
					validation: (value: string) => value.length > 0 || "Project ID is required",
				},
			},

			optionalOptions: {
				vertexRegion: {
					type: "string",
					description: "Google Cloud region",
					default: "us-central1",
				},
				geminiBaseUrl: {
					type: "string",
					description: "Custom base URL for Gemini API",
				},
				apiModelId: {
					type: "string",
					description: "Gemini model ID to use",
					default: "gemini-1.5-pro",
				},
				isVertex: {
					type: "boolean",
					description: "Whether to use Vertex AI",
					default: false,
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
			averageLatency: 600,
			maxThroughput: 200,
			costPerToken: 0.001,
		},

		tags: ["multimodal", "fast", "google", "vertex", "vision"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "gemini",
			supportedFeatures: ["vision", "audio", "function-calling"],
			maxContextLength: 1000000,
		},
	},
})

