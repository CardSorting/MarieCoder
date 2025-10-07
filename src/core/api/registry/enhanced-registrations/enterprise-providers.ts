import { CerebrasProvider } from "../../providers/core/cerebras"
import { ZAIProvider } from "../../providers/core/zai"
import { AskSageProvider } from "../../providers/enterprise/asksage"
import { BasetenProvider } from "../../providers/enterprise/baseten"
import { DoubaoProvider } from "../../providers/enterprise/doubao"
import { NebiusProvider } from "../../providers/enterprise/nebius"
import { OCAProvider } from "../../providers/enterprise/oca"
import { SambanovaProvider } from "../../providers/enterprise/sambanova"
import { enhancedProviderRegistry } from "../enhanced-provider-registry"
import { ProviderCategory, ProviderStatus } from "../provider-metadata"

/**
 * Enhanced Enterprise Provider Registrations
 * These are enterprise-focused AI service providers
 * Follows NORMIE DEV methodology: clean, focused, maintainable
 */

/**
 * Register Doubao Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "doubao",
	handlerClass: DoubaoProvider,
	metadata: {
		providerId: "doubao",
		category: ProviderCategory.ENTERPRISE,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Doubao",
			description: "ByteDance's enterprise AI model with strong multilingual capabilities",
			website: "https://www.volcengine.com",
			documentationUrl: "https://www.volcengine.com/docs",

			features: [
				"Enterprise-grade security",
				"Strong multilingual support",
				"Custom model deployment",
				"Advanced reasoning",
				"Cost optimization",
			],

			configurationExamples: {
				basic: {
					description: "Basic Doubao configuration",
					example: {
						doubaoApiKey: "your-doubao-api-key",
						planModeApiProvider: "doubao",
					},
				},
			},

			limitations: ["Limited availability", "Enterprise-focused", "Complex setup"],

			bestPractices: ["Use for enterprise applications", "Implement proper security measures", "Monitor usage and costs"],
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
			encryption: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				doubaoApiKey: {
					type: "string",
					description: "Doubao API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				doubaoBaseUrl: {
					type: "string",
					description: "Custom base URL for Doubao API",
				},
				doubaoModelId: {
					type: "string",
					description: "Doubao model ID to use",
					default: "doubao-pro-4k",
				},
				doubaoModelInfo: {
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
			averageLatency: 900,
			maxThroughput: 100,
			costPerToken: 0.0015,
		},

		tags: ["enterprise", "bytedance", "multilingual", "security"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "doubao",
			supportedFeatures: ["enterprise-security", "multilingual"],
			maxContextLength: 65536,
		},
	},
})

/**
 * Register Nebius Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "nebius",
	handlerClass: NebiusProvider,
	metadata: {
		providerId: "nebius",
		category: ProviderCategory.ENTERPRISE,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Nebius",
			description: "Enterprise AI platform with custom model deployment capabilities",
			website: "https://nebius.ai",
			documentationUrl: "https://docs.nebius.ai",

			features: [
				"Custom model deployment",
				"Enterprise security",
				"Scalable infrastructure",
				"Advanced monitoring",
				"Cost optimization",
			],

			configurationExamples: {
				basic: {
					description: "Basic Nebius configuration",
					example: {
						nebiusApiKey: "your-nebius-api-key",
						planModeApiProvider: "nebius",
					},
				},
			},

			limitations: ["Enterprise-focused", "Limited availability", "Complex setup"],

			bestPractices: ["Use for enterprise workloads", "Configure proper monitoring", "Implement security best practices"],
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
			encryption: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				nebiusApiKey: {
					type: "string",
					description: "Nebius API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				nebiusBaseUrl: {
					type: "string",
					description: "Custom base URL for Nebius API",
				},
				nebiusModelId: {
					type: "string",
					description: "Nebius model ID to use",
					default: "nebius-llama-3.1-8b",
				},
				nebiusModelInfo: {
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
			maxThroughput: 150,
			costPerToken: 0.001,
		},

		tags: ["enterprise", "custom-deployment", "scalable", "monitoring"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "nebius",
			supportedFeatures: ["custom-deployment", "enterprise-security"],
			maxContextLength: 131072,
		},
	},
})

/**
 * Register AskSage Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "asksage",
	handlerClass: AskSageProvider,
	metadata: {
		providerId: "asksage",
		category: ProviderCategory.ENTERPRISE,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "AskSage",
			description: "Enterprise AI platform with advanced analytics and monitoring",
			website: "https://asksage.ai",
			documentationUrl: "https://docs.asksage.ai",

			features: [
				"Advanced analytics",
				"Enterprise monitoring",
				"Custom model support",
				"Security compliance",
				"Cost optimization",
			],

			configurationExamples: {
				basic: {
					description: "Basic AskSage configuration",
					example: {
						asksageApiKey: "your-asksage-api-key",
						planModeApiProvider: "asksage",
					},
				},
			},

			limitations: ["Enterprise-focused", "Limited public documentation", "Complex setup"],

			bestPractices: ["Use for enterprise analytics", "Configure proper monitoring", "Implement security measures"],
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
			encryption: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				askSageApiKey: {
					type: "string",
					description: "AskSage API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				askSageBaseUrl: {
					type: "string",
					description: "Custom base URL for AskSage API",
				},
				askSageModelId: {
					type: "string",
					description: "AskSage model ID to use",
					default: "asksage-pro",
				},
				askSageModelInfo: {
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
			maxThroughput: 100,
			costPerToken: 0.0018,
		},

		tags: ["enterprise", "analytics", "monitoring", "compliance"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "asksage",
			supportedFeatures: ["analytics", "enterprise-monitoring"],
			maxContextLength: 65536,
		},
	},
})

/**
 * Register Sambanova Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "sambanova",
	handlerClass: SambanovaProvider,
	metadata: {
		providerId: "sambanova",
		category: ProviderCategory.ENTERPRISE,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "SambaNova",
			description: "Enterprise AI platform with custom hardware acceleration",
			website: "https://sambanova.ai",
			documentationUrl: "https://docs.sambanova.ai",

			features: [
				"Custom hardware acceleration",
				"Enterprise-grade security",
				"High-performance inference",
				"Custom model optimization",
				"Advanced monitoring",
			],

			configurationExamples: {
				basic: {
					description: "Basic SambaNova configuration",
					example: {
						sambanovaApiKey: "your-sambanova-api-key",
						planModeApiProvider: "sambanova",
					},
				},
			},

			limitations: ["Enterprise-focused", "Limited availability", "Complex setup"],

			bestPractices: ["Use for high-performance workloads", "Configure proper monitoring", "Implement security measures"],
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
			encryption: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				sambanovaApiKey: {
					type: "string",
					description: "SambaNova API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				sambanovaBaseUrl: {
					type: "string",
					description: "Custom base URL for SambaNova API",
				},
				sambanovaModelId: {
					type: "string",
					description: "SambaNova model ID to use",
					default: "sambanova-llama-3.1-8b",
				},
				sambanovaModelInfo: {
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
			costPerToken: 0.002,
		},

		tags: ["enterprise", "hardware-acceleration", "high-performance", "custom"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "sambanova",
			supportedFeatures: ["hardware-acceleration", "custom-optimization"],
			maxContextLength: 131072,
		},
	},
})

/**
 * Register Cerebras Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "cerebras",
	handlerClass: CerebrasProvider,
	metadata: {
		providerId: "cerebras",
		category: ProviderCategory.ENTERPRISE,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Cerebras",
			description: "Enterprise AI platform with wafer-scale engine technology",
			website: "https://www.cerebras.net",
			documentationUrl: "https://docs.cerebras.net",

			features: [
				"Wafer-scale engine technology",
				"High-performance inference",
				"Enterprise security",
				"Custom model deployment",
				"Advanced monitoring",
			],

			configurationExamples: {
				basic: {
					description: "Basic Cerebras configuration",
					example: {
						cerebrasApiKey: "your-cerebras-api-key",
						planModeApiProvider: "cerebras",
					},
				},
			},

			limitations: ["Enterprise-focused", "Limited availability", "Complex setup"],

			bestPractices: ["Use for high-performance workloads", "Configure proper monitoring", "Implement security measures"],
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
			encryption: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				cerebrasApiKey: {
					type: "string",
					description: "Cerebras API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				cerebrasBaseUrl: {
					type: "string",
					description: "Custom base URL for Cerebras API",
				},
				cerebrasModelId: {
					type: "string",
					description: "Cerebras model ID to use",
					default: "cerebras-llama-3.1-8b",
				},
				cerebrasModelInfo: {
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
			maxThroughput: 300,
			costPerToken: 0.0015,
		},

		tags: ["enterprise", "wafer-scale", "high-performance", "custom"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "cerebras",
			supportedFeatures: ["wafer-scale", "high-performance"],
			maxContextLength: 131072,
		},
	},
})

/**
 * Register Baseten Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "baseten",
	handlerClass: BasetenProvider,
	metadata: {
		providerId: "baseten",
		category: ProviderCategory.ENTERPRISE,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Baseten",
			description: "Enterprise AI platform with custom model deployment and management",
			website: "https://baseten.co",
			documentationUrl: "https://docs.baseten.co",

			features: [
				"Custom model deployment",
				"Enterprise security",
				"Advanced monitoring",
				"Cost optimization",
				"Scalable infrastructure",
			],

			configurationExamples: {
				basic: {
					description: "Basic Baseten configuration",
					example: {
						basetenApiKey: "your-baseten-api-key",
						planModeApiProvider: "baseten",
					},
				},
			},

			limitations: ["Enterprise-focused", "Limited availability", "Complex setup"],

			bestPractices: ["Use for enterprise workloads", "Configure proper monitoring", "Implement security measures"],
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
			encryption: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				basetenApiKey: {
					type: "string",
					description: "Baseten API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				basetenBaseUrl: {
					type: "string",
					description: "Custom base URL for Baseten API",
				},
				basetenModelId: {
					type: "string",
					description: "Baseten model ID to use",
					default: "baseten-llama-3.1-8b",
				},
				basetenModelInfo: {
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

		tags: ["enterprise", "custom-deployment", "scalable", "monitoring"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "baseten",
			supportedFeatures: ["custom-deployment", "enterprise-security"],
			maxContextLength: 131072,
		},
	},
})

/**
 * Register ZAI Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "zai",
	handlerClass: ZAIProvider,
	metadata: {
		providerId: "zai",
		category: ProviderCategory.ENTERPRISE,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "ZAI",
			description: "Enterprise AI platform with advanced security and compliance",
			website: "https://zai.ai",
			documentationUrl: "https://docs.zai.ai",

			features: [
				"Enterprise security",
				"Compliance features",
				"Advanced monitoring",
				"Custom model support",
				"Cost optimization",
			],

			configurationExamples: {
				basic: {
					description: "Basic ZAI configuration",
					example: {
						zaiApiKey: "your-zai-api-key",
						planModeApiProvider: "zai",
					},
				},
			},

			limitations: ["Enterprise-focused", "Limited availability", "Complex setup"],

			bestPractices: ["Use for enterprise applications", "Configure proper security", "Implement compliance measures"],
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
			encryption: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				zaiApiKey: {
					type: "string",
					description: "ZAI API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				zaiBaseUrl: {
					type: "string",
					description: "Custom base URL for ZAI API",
				},
				zaiModelId: {
					type: "string",
					description: "ZAI model ID to use",
					default: "zai-pro",
				},
				zaiModelInfo: {
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
			costPerToken: 0.0018,
		},

		tags: ["enterprise", "security", "compliance", "monitoring"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "zai",
			supportedFeatures: ["enterprise-security", "compliance"],
			maxContextLength: 65536,
		},
	},
})

/**
 * Register OCA Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "oca",
	handlerClass: OCAProvider,
	metadata: {
		providerId: "oca",
		category: ProviderCategory.ENTERPRISE,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "OCA",
			description: "Enterprise AI platform with advanced analytics and insights",
			website: "https://oca.ai",
			documentationUrl: "https://docs.oca.ai",

			features: [
				"Advanced analytics",
				"Enterprise insights",
				"Custom model support",
				"Security compliance",
				"Cost optimization",
			],

			configurationExamples: {
				basic: {
					description: "Basic OCA configuration",
					example: {
						apiKey: "your-oca-api-key",
						planModeApiProvider: "oca",
					},
				},
			},

			limitations: ["Enterprise-focused", "Limited availability", "Complex setup"],

			bestPractices: ["Use for enterprise analytics", "Configure proper monitoring", "Implement security measures"],
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
			encryption: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				ocaApiKey: {
					type: "string",
					description: "OCA API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				ocaBaseUrl: {
					type: "string",
					description: "Custom base URL for OCA API",
				},
				ocaModelId: {
					type: "string",
					description: "OCA model ID to use",
					default: "oca-pro",
				},
				ocaModelInfo: {
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
			averageLatency: 900,
			maxThroughput: 100,
			costPerToken: 0.0015,
		},

		tags: ["enterprise", "analytics", "insights", "compliance"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "oca",
			supportedFeatures: ["analytics", "enterprise-insights"],
			maxContextLength: 65536,
		},
	},
})
