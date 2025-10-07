import { LmStudioProvider } from "../../providers/local/lmstudio"
import { OllamaProvider } from "../../providers/local/ollama"
import { enhancedProviderRegistry } from "../enhanced-provider-registry"
import {
    ProviderCategory, ProviderStatus
} from "../provider-metadata"

/**
 * Enhanced Local Provider Registrations
 * These are self-hosted and locally running AI providers
 * Follows NORMIE DEV methodology: clean, focused, maintainable
 */

/**
 * Register Ollama Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "ollama",
	handlerClass: OllamaProvider,
	metadata: {
		providerId: "ollama",
		category: ProviderCategory.LOCAL,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "Ollama",
			description: "Local AI model runner for private, offline AI inference",
			website: "https://ollama.ai",
			documentationUrl: "https://ollama.ai/docs",
			apiReferenceUrl: "https://github.com/ollama/ollama/blob/main/docs/api.md",

			features: [
				"Local model execution",
				"Privacy-focused",
				"No internet required",
				"Multiple model support",
				"Custom model support",
			],

			configurationExamples: {
				basic: {
					description: "Basic Ollama configuration",
					example: {
						planModeApiProvider: "ollama",
						ollamaBaseUrl: "http://localhost:11434",
					},
				},
				remote: {
					description: "Remote Ollama server configuration",
					example: {
						planModeApiProvider: "ollama",
						ollamaBaseUrl: "http://your-ollama-server:11434",
						ollamaApiKey: "your-api-key",
					},
				},
			},

			limitations: [
				"Requires local Ollama installation",
				"Limited by local hardware",
				"No built-in rate limiting",
				"Manual model management",
			],

			bestPractices: [
				"Ensure Ollama is running",
				"Use appropriate model for your hardware",
				"Monitor system resources",
				"Keep models updated",
			],
		},

		capabilities: {
			streaming: true,
			functionCalling: false,
			vision: false,
			reasoning: false,
			toolUse: false,
			codeGeneration: true,
			caching: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				ollamaModelId: {
					type: "string",
					description: "Ollama model ID to use",
					validation: (value: string) => value.length > 0 || "Model ID is required",
				},
			},

			optionalOptions: {
				ollamaBaseUrl: {
					type: "string",
					description: "Ollama server base URL",
					default: "http://localhost:11434",
					validation: (value: string) => value.startsWith("http") || "Base URL must be a valid HTTP URL",
				},
				ollamaApiKey: {
					type: "string",
					description: "API key for remote Ollama server",
				},
				requestTimeoutMs: {
					type: "number",
					description: "Request timeout in milliseconds",
					default: 30000,
					validation: (value: number) => value > 0 || "Timeout must be positive",
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
			averageLatency: 2000,
			maxThroughput: 10,
			costPerToken: 0,
		},

		tags: ["local", "private", "offline", "open-source"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "ollama",
			supportedFeatures: ["local-execution"],
			maxContextLength: 32768,
			hardwareRequirements: "GPU recommended for best performance",
		},
	},
})

/**
 * Register LMStudio Provider with Enhanced Metadata
 */
enhancedProviderRegistry.registerProvider({
	providerId: "lmstudio",
	handlerClass: LmStudioProvider,
	metadata: {
		providerId: "lmstudio",
		category: ProviderCategory.LOCAL,
		status: ProviderStatus.ACTIVE,

		documentation: {
			name: "LM Studio",
			description: "Local AI model server for running LLMs on your machine",
			website: "https://lmstudio.ai",
			documentationUrl: "https://lmstudio.ai/docs",

			features: [
				"Local model execution",
				"Easy model management",
				"Web interface",
				"Multiple model support",
				"Privacy-focused",
			],

			configurationExamples: {
				basic: {
					description: "Basic LM Studio configuration",
					example: {
						lmStudioBaseUrl: "http://localhost:1234",
						lmStudioModelId: "llama-3.1-8b-instruct",
					},
				},
			},

			limitations: ["Requires local installation", "Limited by local hardware", "No built-in rate limiting"],

			bestPractices: ["Ensure LM Studio is running", "Use appropriate model for hardware", "Monitor system resources"],
		},

		capabilities: {
			streaming: true,
			functionCalling: false,
			vision: false,
			reasoning: false,
			toolUse: false,
			codeGeneration: true,
			caching: true,
			authentication: ["api_key"],
		},

		configurationSchema: {
			requiredOptions: {
				lmStudioBaseUrl: {
					type: "string",
					description: "LM Studio server base URL",
					validation: (value: string) => value.startsWith("http") || "Base URL must be a valid HTTP URL",
				},
			},

			optionalOptions: {
				lmStudioApiKey: {
					type: "string",
					description: "LM Studio API key",
				},
				lmStudioModelId: {
					type: "string",
					description: "LM Studio model ID to use",
				},
				lmStudioModelInfo: {
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
			averageLatency: 1500,
			maxThroughput: 20,
			costPerToken: 0,
		},

		tags: ["local", "private", "desktop", "gui"],

		lastUpdated: new Date(),

		customMetadata: {
			modelFamily: "lmstudio",
			supportedFeatures: ["local-execution", "gui-interface"],
			maxContextLength: 32768,
		},
	},
})