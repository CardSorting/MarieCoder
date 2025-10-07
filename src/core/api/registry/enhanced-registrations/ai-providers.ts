import { FireworksProvider } from "../../providers/ai/fireworks"
import { HuggingFaceProvider } from "../../providers/ai/huggingface"
import { LiteLLMProvider } from "../../providers/ai/litellm"
import { MistralProvider } from "../../providers/ai/mistral"
import { TogetherProvider } from "../../providers/ai/together"
import { DeepSeekProvider } from "../../providers/core/deepseek"
import { MoonshotProvider } from "../../providers/core/moonshot"
import { QwenProvider } from "../../providers/core/qwen"
import { XAIProvider } from "../../providers/core/xai"
import { enhancedProviderRegistry } from "../enhanced-provider-registry"
import { ProviderCategory, ProviderStatus } from "../provider-metadata"

/**
 * Enhanced AI Provider Registrations
 * These are specialized AI service providers
 * Follows NORMIE DEV methodology: clean, focused, maintainable
 */

/**
 * Register DeepSeek Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "deepseek",
	handlerClass: DeepSeekProvider,
	metadata: {
		providerId: "deepseek",
		category: ProviderCategory.AI,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "DeepSeek",
			description: "Advanced AI model with strong reasoning and coding capabilities",
			website: "https://www.deepseek.com",
			documentationUrl: "https://platform.deepseek.com/docs",

			features: [
				"Strong reasoning abilities",
				"Excellent code generation",
				"Mathematical problem solving",
				"Cost-effective pricing",
				"Fast inference",
			],

			configurationExamples: {
				basic: {
					description: "Basic DeepSeek configuration",
					example: {
						deepSeekApiKey: "your-deepseek-api-key",
						planModeApiProvider: "deepseek",
					},
				},
			},

			limitations: ["Rate limited", "Limited model variants", "No fine-tuning API"],

			bestPractices: ["Use for reasoning tasks", "Implement proper error handling", "Monitor usage quotas"],
		},

		capabilities: {
			streaming: true,
			functionCalling: false,
			vision: false,
			reasoning: true,
			toolUse: false,
			codeGeneration: true,
			rateLimitHandling: true,
			retryLogic: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				deepSeekApiKey: {
					type: "string",
					description: "DeepSeek API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				deepSeekBaseUrl: {
					type: "string",
					description: "Custom base URL for DeepSeek API",
					default: "https://api.deepseek.com",
				},
				deepSeekModelId: {
					type: "string",
					description: "DeepSeek model ID to use",
					default: "deepseek-chat",
				},
				deepSeekModelInfo: {
					type: "object",
					description: "Additional model information",
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
			maxThroughput: 100,
			costPerToken: 0.001,
		},

		tags: ["reasoning", "coding", "math", "cost-effective"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "deepseek",
			supportedFeatures: ["reasoning", "coding"],
			maxContextLength: 65536,
		},
	},
})

/**
 * Register Fireworks Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "fireworks",
	handlerClass: FireworksProvider,
	metadata: {
		providerId: "fireworks",
		category: ProviderCategory.AI,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Fireworks AI",
			description: "High-performance AI inference platform with custom models",
			website: "https://fireworks.ai",
			documentationUrl: "https://fireworks.ai/docs",

			features: [
				"Custom model hosting",
				"Fast inference speeds",
				"Multiple model support",
				"Enterprise features",
				"Cost optimization",
			],

			configurationExamples: {
				basic: {
					description: "Basic Fireworks configuration",
					example: {
						fireworksApiKey: "your-fireworks-api-key",
						planModeApiProvider: "fireworks",
					},
				},
			},

			limitations: ["Rate limited", "Requires account setup", "Limited free tier"],

			bestPractices: ["Use for production workloads", "Implement proper caching", "Monitor costs"],
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
			caching: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				fireworksApiKey: {
					type: "string",
					description: "Fireworks API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				fireworksBaseUrl: {
					type: "string",
					description: "Custom base URL for Fireworks API",
					default: "https://api.fireworks.ai",
				},
				fireworksModelId: {
					type: "string",
					description: "Fireworks model ID to use",
					default: "accounts/fireworks/models/llama-v3p1-8b-instruct",
				},
				fireworksModelInfo: {
					type: "object",
					description: "Additional model information",
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
			averageLatency: 400,
			maxThroughput: 500,
			costPerToken: 0.0005,
		},

		tags: ["fast", "custom-models", "enterprise", "optimized"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "fireworks",
			supportedFeatures: ["custom-models", "fast-inference"],
			maxContextLength: 131072,
		},
	},
})

/**
 * Register Together Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "together",
	handlerClass: TogetherProvider,
	metadata: {
		providerId: "together",
		category: ProviderCategory.AI,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Together AI",
			description: "Open-source AI models and infrastructure platform",
			website: "https://together.ai",
			documentationUrl: "https://docs.together.ai",

			features: [
				"Open-source model access",
				"Cost-effective pricing",
				"Multiple model support",
				"Fine-tuning capabilities",
				"Custom model hosting",
			],

			configurationExamples: {
				basic: {
					description: "Basic Together configuration",
					example: {
						togetherApiKey: "your-together-api-key",
						planModeApiProvider: "together",
					},
				},
			},

			limitations: ["Rate limited", "Model availability varies", "Limited support for some models"],

			bestPractices: ["Use for open-source models", "Implement proper error handling", "Monitor model availability"],
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
				togetherApiKey: {
					type: "string",
					description: "Together API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				togetherBaseUrl: {
					type: "string",
					description: "Custom base URL for Together API",
					default: "https://api.together.xyz",
				},
				togetherModelId: {
					type: "string",
					description: "Together model ID to use",
					default: "meta-llama/Llama-3.1-8B-Instruct-Turbo",
				},
				togetherModelInfo: {
					type: "object",
					description: "Additional model information",
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
			costPerToken: 0.0003,
		},

		tags: ["open-source", "cost-effective", "multiple-models", "fine-tuning"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "together",
			supportedFeatures: ["open-source-models", "fine-tuning"],
			maxContextLength: 131072,
		},
	},
})

/**
 * Register Mistral Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "mistral",
	handlerClass: MistralProvider,
	metadata: {
		providerId: "mistral",
		category: ProviderCategory.AI,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Mistral AI",
			description: "European AI company with efficient language models",
			website: "https://mistral.ai",
			documentationUrl: "https://docs.mistral.ai",

			features: [
				"Efficient model architecture",
				"Strong multilingual support",
				"Code generation capabilities",
				"Reasoning abilities",
				"Cost-effective pricing",
			],

			configurationExamples: {
				basic: {
					description: "Basic Mistral configuration",
					example: {
						mistralApiKey: "your-mistral-api-key",
						planModeApiProvider: "mistral",
					},
				},
			},

			limitations: ["Rate limited", "Limited model variants", "Newer provider"],

			bestPractices: ["Use for multilingual tasks", "Implement proper error handling", "Monitor usage quotas"],
		},

		capabilities: {
			streaming: true,
			functionCalling: true,
			vision: false,
			reasoning: true,
			toolUse: true,
			codeGeneration: true,
			rateLimitHandling: true,
			retryLogic: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				mistralApiKey: {
					type: "string",
					description: "Mistral API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				mistralBaseUrl: {
					type: "string",
					description: "Custom base URL for Mistral API",
					default: "https://api.mistral.ai",
				},
				mistralModelId: {
					type: "string",
					description: "Mistral model ID to use",
					default: "mistral-large-latest",
				},
				mistralModelInfo: {
					type: "object",
					description: "Additional model information",
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
			averageLatency: 700,
			maxThroughput: 150,
			costPerToken: 0.0015,
		},

		tags: ["efficient", "multilingual", "european", "reasoning"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "mistral",
			supportedFeatures: ["multilingual", "reasoning", "function-calling"],
			maxContextLength: 131072,
		},
	},
})

/**
 * Register HuggingFace Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "huggingface",
	handlerClass: HuggingFaceProvider,
	metadata: {
		providerId: "huggingface",
		category: ProviderCategory.AI,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Hugging Face",
			description: "Open-source AI platform with access to thousands of models",
			website: "https://huggingface.co",
			documentationUrl: "https://huggingface.co/docs",

			features: [
				"Thousands of open-source models",
				"Inference endpoints",
				"Custom model hosting",
				"Community models",
				"Free tier available",
			],

			configurationExamples: {
				basic: {
					description: "Basic HuggingFace configuration",
					example: {
						huggingFaceApiKey: "your-huggingface-api-key",
						planModeApiProvider: "huggingface",
					},
				},
			},

			limitations: ["Rate limited on free tier", "Model performance varies", "Limited support for some models"],

			bestPractices: ["Use for experimentation", "Check model compatibility", "Monitor rate limits"],
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
				huggingFaceApiKey: {
					type: "string",
					description: "HuggingFace API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				huggingFaceBaseUrl: {
					type: "string",
					description: "Custom base URL for HuggingFace API",
					default: "https://api-inference.huggingface.co",
				},
				huggingFaceModelId: {
					type: "string",
					description: "HuggingFace model ID to use",
					default: "microsoft/DialoGPT-medium",
				},
				huggingFaceModelInfo: {
					type: "object",
					description: "Additional model information",
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
			averageLatency: 1000,
			maxThroughput: 50,
			costPerToken: 0.0001,
		},

		tags: ["open-source", "community", "experimentation", "free-tier"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "huggingface",
			supportedFeatures: ["community-models", "inference-endpoints"],
			maxContextLength: 32768,
		},
	},
})

/**
 * Register XAI Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "xai",
	handlerClass: XAIProvider,
	metadata: {
		providerId: "xai",
		category: ProviderCategory.AI,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "xAI",
			description: "Elon Musk's AI company with advanced reasoning models",
			website: "https://x.ai",
			documentationUrl: "https://docs.x.ai",

			features: [
				"Advanced reasoning capabilities",
				"Mathematical problem solving",
				"Code generation",
				"Real-time capabilities",
				"Fast inference",
			],

			configurationExamples: {
				basic: {
					description: "Basic xAI configuration",
					example: {
						xaiApiKey: "your-xai-api-key",
						planModeApiProvider: "xai",
					},
				},
			},

			limitations: ["Limited availability", "Rate limited", "Newer provider"],

			bestPractices: ["Use for reasoning tasks", "Implement proper error handling", "Monitor availability"],
		},

		capabilities: {
			streaming: true,
			functionCalling: false,
			vision: false,
			reasoning: true,
			toolUse: false,
			codeGeneration: true,
			rateLimitHandling: true,
			retryLogic: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				xaiApiKey: {
					type: "string",
					description: "xAI API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				xaiBaseUrl: {
					type: "string",
					description: "Custom base URL for xAI API",
					default: "https://api.x.ai",
				},
				xaiModelId: {
					type: "string",
					description: "xAI model ID to use",
					default: "grok-beta",
				},
				xaiModelInfo: {
					type: "object",
					description: "Additional model information",
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
			averageLatency: 500,
			maxThroughput: 200,
			costPerToken: 0.002,
		},

		tags: ["reasoning", "real-time", "grok", "musk"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "xai",
			supportedFeatures: ["reasoning", "real-time"],
			maxContextLength: 65536,
		},
	},
})

/**
 * Register Moonshot Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "moonshot",
	handlerClass: MoonshotProvider,
	metadata: {
		providerId: "moonshot",
		category: ProviderCategory.AI,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Moonshot AI",
			description: "Chinese AI company with long-context models",
			website: "https://moonshot.cn",
			documentationUrl: "https://platform.moonshot.cn/docs",

			features: [
				"Long context understanding",
				"Chinese language optimization",
				"Cost-effective pricing",
				"Multiple model sizes",
				"API access",
			],

			configurationExamples: {
				basic: {
					description: "Basic Moonshot configuration",
					example: {
						moonshotApiKey: "your-moonshot-api-key",
						planModeApiProvider: "moonshot",
					},
				},
			},

			limitations: ["Rate limited", "Limited English optimization", "Newer provider"],

			bestPractices: ["Use for Chinese language tasks", "Leverage long context capabilities", "Monitor usage quotas"],
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
				moonshotApiKey: {
					type: "string",
					description: "Moonshot API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				moonshotBaseUrl: {
					type: "string",
					description: "Custom base URL for Moonshot API",
					default: "https://api.moonshot.cn",
				},
				moonshotModelId: {
					type: "string",
					description: "Moonshot model ID to use",
					default: "moonshot-v1-8k",
				},
				moonshotModelInfo: {
					type: "object",
					description: "Additional model information",
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
			maxThroughput: 100,
			costPerToken: 0.0008,
		},

		tags: ["long-context", "chinese", "cost-effective", "context"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "moonshot",
			supportedFeatures: ["long-context"],
			maxContextLength: 128000,
		},
	},
})

/**
 * Register LiteLLM Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "litellm",
	handlerClass: LiteLLMProvider,
	metadata: {
		providerId: "litellm",
		category: ProviderCategory.GATEWAY,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "LiteLLM",
			description: "Unified API for multiple LLM providers with advanced features",
			website: "https://docs.litellm.ai",
			documentationUrl: "https://docs.litellm.ai",

			features: [
				"Unified API interface",
				"Multiple provider support",
				"Advanced routing",
				"Cost tracking",
				"Fallback strategies",
			],

			configurationExamples: {
				basic: {
					description: "Basic LiteLLM configuration",
					example: {
						liteLlmApiKey: "your-litellm-api-key",
						planModeApiProvider: "litellm",
					},
				},
			},

			limitations: ["Additional abstraction layer", "Potential latency overhead", "Complex configuration"],

			bestPractices: ["Use for multi-provider setups", "Configure proper fallbacks", "Monitor costs across providers"],
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
			caching: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				litellmApiKey: {
					type: "string",
					description: "LiteLLM API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				litellmBaseUrl: {
					type: "string",
					description: "Custom base URL for LiteLLM API",
				},
				litellmModelId: {
					type: "string",
					description: "LiteLLM model ID to use",
					default: "gpt-4",
				},
				litellmModelInfo: {
					type: "object",
					description: "Additional model information",
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
			costPerToken: 0.002,
		},

		tags: ["unified", "multi-provider", "routing", "fallback"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "litellm",
			supportedFeatures: ["provider-routing", "cost-tracking", "fallbacks"],
			maxContextLength: 200000,
		},
	},
})

/**
 * Register Qwen Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "qwen",
	handlerClass: QwenProvider,
	metadata: {
		providerId: "qwen",
		category: ProviderCategory.AI,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Qwen",
			description: "Alibaba's large language model with strong multilingual capabilities",
			website: "https://qwenlm.github.io",
			documentationUrl: "https://qwenlm.github.io/blog/qwen2.5/",

			features: [
				"Strong multilingual support",
				"Code generation capabilities",
				"Mathematical reasoning",
				"Vision capabilities",
				"Cost-effective pricing",
			],

			configurationExamples: {
				basic: {
					description: "Basic Qwen configuration",
					example: {
						qwenApiKey: "your-qwen-api-key",
						planModeApiProvider: "qwen",
					},
				},
			},

			limitations: ["Rate limited", "Limited availability", "Newer provider"],

			bestPractices: ["Use for multilingual tasks", "Implement proper error handling", "Monitor usage quotas"],
		},

		capabilities: {
			streaming: true,
			functionCalling: false,
			vision: true,
			reasoning: true,
			toolUse: false,
			codeGeneration: true,
			rateLimitHandling: true,
			retryLogic: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				qwenApiKey: {
					type: "string",
					description: "Qwen API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				qwenBaseUrl: {
					type: "string",
					description: "Custom base URL for Qwen API",
					default: "https://dashscope.aliyuncs.com",
				},
				qwenModelId: {
					type: "string",
					description: "Qwen model ID to use",
					default: "qwen-plus",
				},
				qwenModelInfo: {
					type: "object",
					description: "Additional model information",
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
			averageLatency: 700,
			maxThroughput: 150,
			costPerToken: 0.0012,
		},

		tags: ["multilingual", "alibaba", "vision", "reasoning"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "qwen",
			supportedFeatures: ["multilingual", "vision", "reasoning"],
			maxContextLength: 32768,
		},
	},
})
