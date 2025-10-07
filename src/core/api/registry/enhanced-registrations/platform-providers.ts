import { DifyProvider } from "../../providers/platform/dify"
import { RequestyProvider } from "../../providers/platform/requesty"
import { VercelAIGatewayProvider } from "../../providers/platform/vercel-ai-gateway"
import { enhancedProviderRegistry } from "../enhanced-provider-registry"
import { ProviderCategory, ProviderStatus } from "../provider-metadata"

/**
 * Enhanced Platform Provider Registrations
 * These are platform-specific AI service providers
 * Follows NORMIE DEV methodology: clean, focused, maintainable
 */

/**
 * Register Dify Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "dify",
	handlerClass: DifyProvider,
	metadata: {
		providerId: "dify",
		category: ProviderCategory.PLATFORM,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Dify",
			description: "Open-source LLM application development platform with workflow automation",
			website: "https://dify.ai",
			documentationUrl: "https://docs.dify.ai",
			apiReferenceUrl: "https://docs.dify.ai/guides/api",

			features: [
				"Workflow automation",
				"Visual workflow builder",
				"Multiple model support",
				"API and SDK access",
				"Custom applications",
			],

			configurationExamples: {
				basic: {
					description: "Basic Dify configuration",
					example: {
						difyApiKey: "your-dify-api-key",
						difyBaseUrl: "https://api.dify.ai",
					},
				},
				custom: {
					description: "Custom Dify deployment configuration",
					example: {
						difyApiKey: "your-dify-api-key",
						difyBaseUrl: "https://your-dify-instance.com",
						planModeApiProvider: "dify",
					},
				},
			},

			limitations: ["Requires Dify setup", "Limited to supported models", "Complex workflow configuration"],

			bestPractices: [
				"Design workflows carefully",
				"Test with different models",
				"Monitor performance",
				"Use appropriate model for workflow",
			],
		},

		capabilities: {
			streaming: true,
			functionCalling: true,
			vision: false,
			reasoning: false,
			toolUse: true,
			codeGeneration: true,
			rateLimitHandling: true,
			retryLogic: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				difyApiKey: {
					type: "string",
					description: "Dify API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				difyBaseUrl: {
					type: "string",
					description: "Dify server base URL",
					default: "https://api.dify.ai",
					validation: (value: string) => value.startsWith("http") || "Base URL must be a valid HTTP URL",
				},
				difyModelId: {
					type: "string",
					description: "Dify model ID to use",
				},
				difyModelInfo: {
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
			maxThroughput: 50,
			costPerToken: 0.002,
		},

		tags: ["workflow", "automation", "platform", "open-source"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "dify",
			supportedFeatures: ["workflow-automation", "visual-builder"],
			maxContextLength: 65536,
		},
	},
})

/**
 * Register Requesty Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "requesty",
	handlerClass: RequestyProvider,
	metadata: {
		providerId: "requesty",
		category: ProviderCategory.PLATFORM,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Requesty",
			description: "API testing and development platform with AI-powered testing capabilities",
			website: "https://requesty.io",
			documentationUrl: "https://docs.requesty.io",

			features: [
				"API testing automation",
				"AI-powered test generation",
				"Performance monitoring",
				"Documentation generation",
				"Integration testing",
			],

			configurationExamples: {
				basic: {
					description: "Basic Requesty configuration",
					example: {
						requestyApiKey: "your-requesty-api-key",
						requestyBaseUrl: "https://api.requesty.io",
					},
				},
			},

			limitations: ["API testing focused", "Limited general AI capabilities", "Requires specific setup"],

			bestPractices: ["Use for API testing", "Configure proper test scenarios", "Monitor test performance"],
		},

		capabilities: {
			streaming: false,
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
				requestyApiKey: {
					type: "string",
					description: "Requesty API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				requestyBaseUrl: {
					type: "string",
					description: "Requesty server base URL",
					default: "https://api.requesty.io",
					validation: (value: string) => value.startsWith("http") || "Base URL must be a valid HTTP URL",
				},
				requestyModelId: {
					type: "string",
					description: "Requesty model ID to use",
				},
				requestyModelInfo: {
					type: "object",
					description: "Additional model information",
				},
			},
		},

		modeSupport: {
			plan: true,
			act: false,
		},

		version: "1.0.0",
		minimumApiVersion: "1.0.0",

		performance: {
			averageLatency: 800,
			maxThroughput: 100,
			costPerToken: 0.001,
		},

		tags: ["api-testing", "automation", "testing", "development"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "requesty",
			supportedFeatures: ["api-testing", "test-generation"],
			maxContextLength: 32768,
		},
	},
})

/**
 * Register Vercel AI Gateway Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "vercel-ai-gateway",
	handlerClass: VercelAIGatewayProvider,
	metadata: {
		providerId: "vercel-ai-gateway",
		category: ProviderCategory.GATEWAY,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Vercel AI Gateway",
			description: "Vercel's AI gateway for unified access to multiple AI providers",
			website: "https://vercel.com",
			documentationUrl: "https://vercel.com/docs/ai/ai-gateway",
			apiReferenceUrl: "https://vercel.com/docs/ai/ai-gateway/api-reference",

			features: [
				"Unified API access",
				"Multiple provider support",
				"Rate limiting and caching",
				"Analytics and monitoring",
				"Cost optimization",
			],

			configurationExamples: {
				basic: {
					description: "Basic Vercel AI Gateway configuration",
					example: {
						vercelAiGatewayApiKey: "your-vercel-ai-gateway-key",
					},
				},
				advanced: {
					description: "Advanced configuration with custom routing",
					example: {
						vercelAiGatewayApiKey: "your-vercel-ai-gateway-key",
						planModeApiProvider: "vercel-ai-gateway",
					},
				},
			},

			limitations: ["Vercel platform dependency", "Additional abstraction layer", "Potential latency overhead"],

			bestPractices: [
				"Use for multi-provider setups",
				"Configure proper routing",
				"Monitor costs and performance",
				"Implement fallback strategies",
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
			caching: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				vercelAiGatewayApiKey: {
					type: "string",
					description: "Vercel AI Gateway API key for authentication",
					validation: (value: string) => value.length > 10 || "API key must be at least 10 characters",
				},
			},

			optionalOptions: {
				vercelAiGatewayBaseUrl: {
					type: "string",
					description: "Vercel AI Gateway base URL",
					default: "https://ai-gateway.vercel.com",
					validation: (value: string) => value.startsWith("http") || "Base URL must be a valid HTTP URL",
				},
				vercelAiGatewayModelId: {
					type: "string",
					description: "Model ID to use through the gateway",
				},
				vercelAiGatewayProvider: {
					type: "string",
					description: "Specific provider to route through",
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
			maxThroughput: 150,
			costPerToken: 0.002,
		},

		tags: ["gateway", "vercel", "multi-provider", "routing"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "vercel-ai-gateway",
			supportedFeatures: ["provider-routing", "analytics", "caching"],
			maxContextLength: 200000,
		},
	},
})
