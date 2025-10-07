import { ApiConfiguration } from "@shared/api"
import { ApiService } from "../index"
import { providerRegistry } from "../registry/provider-registry"
import { ConfigurationService } from "../services/configuration-service"
import { ApiErrorType, ErrorService } from "../services/error-service"
import { ProviderFactoryService } from "../services/provider-factory"

describe("Refactored API Architecture", () => {
	describe("ProviderRegistry", () => {
		it("should register and retrieve providers", () => {
			expect(providerRegistry.hasProvider("anthropic")).toBe(true)
			expect(providerRegistry.ApiService.getSupportedProviders()).toContain("anthropic")
		})

		it("should validate provider configurations", () => {
			const config: ApiConfiguration = {
				apiKey: "test-key",
				planModeApiProvider: "anthropic",
				actModeApiProvider: "anthropic",
			} as ApiConfiguration

			expect(providerRegistry.validateConfiguration("anthropic", config)).toBe(true)
		})
	})

	describe("ConfigurationService", () => {
		it("should extract mode-specific configuration", () => {
			const config: ApiConfiguration = {
				planModeApiProvider: "anthropic",
				planModeApiModelId: "claude-3-5-sonnet-20241022",
				actModeApiProvider: "openai",
				actModeApiModelId: "gpt-4",
				apiKey: "test-key",
			} as ApiConfiguration

			const planConfig = ConfigurationService.extractModeConfiguration(config, "plan")
			expect(planConfig.apiProvider).toBe("anthropic")
			expect(planConfig.apiModelId).toBe("claude-3-5-sonnet-20241022")

			const actConfig = ConfigurationService.extractModeConfiguration(config, "act")
			expect(actConfig.apiProvider).toBe("openai")
			expect(actConfig.apiModelId).toBe("gpt-4")
		})

		it("should validate configurations", () => {
			const validConfig: ApiConfiguration = {
				apiKey: "test-key",
				planModeApiProvider: "anthropic",
				actModeApiProvider: "anthropic",
			} as ApiConfiguration

			const validation = ConfigurationService.validateConfiguration(validConfig, "anthropic", "plan")
			expect(validation.isValid).toBe(true)
			expect(validation.errors).toHaveLength(0)

			const invalidConfig: ApiConfiguration = {
				planModeApiProvider: "anthropic",
				actModeApiProvider: "anthropic",
				// Missing apiKey
			} as ApiConfiguration

			const invalidValidation = ConfigurationService.validateConfiguration(invalidConfig, "anthropic", "plan")
			expect(invalidValidation.isValid).toBe(false)
			expect(invalidValidation.errors.length).toBeGreaterThan(0)
		})
	})

	describe("ErrorService", () => {
		it("should parse HTTP errors correctly", () => {
			const httpError = {
				status: 429,
				message: "Rate limit exceeded",
				headers: { "retry-after": "60" },
			}

			const apiError = ErrorService.parseError(httpError, "anthropic")
			expect(apiError.type).toBe(ApiErrorType.RATE_LIMIT)
			expect(apiError.statusCode).toBe(429)
			expect(apiError.retryAfter).toBe(60)
			expect(apiError.isRetriable()).toBe(true)
		})

		it("should parse authentication errors", () => {
			const authError = {
				status: 401,
				message: "Invalid API key",
			}

			const apiError = ErrorService.parseError(authError, "openai")
			expect(apiError.type).toBe(ApiErrorType.AUTHENTICATION)
			expect(apiError.statusCode).toBe(401)
			expect(apiError.isRetriable()).toBe(false)
		})

		it("should handle network errors", () => {
			const networkError = {
				code: "ECONNREFUSED",
				message: "Connection refused",
			}

			const apiError = ErrorService.parseError(networkError, "ollama")
			expect(apiError.type).toBe(ApiErrorType.NETWORK_ERROR)
			expect(apiError.isRetriable()).toBe(true)
		})
	})

	describe("ProviderFactoryService", () => {
		it("should create handlers for supported providers", () => {
			const config: ApiConfiguration = {
				apiKey: "test-key",
				planModeApiProvider: "anthropic",
				actModeApiProvider: "anthropic",
			} as ApiConfiguration

			const handler = ProviderFactoryService.createHandler(config, "plan")
			expect(handler).toBeDefined()
			expect(handler.getModel).toBeDefined()
			expect(handler.createMessage).toBeDefined()
		})

		it("should validate provider configurations", () => {
			const config: ApiConfiguration = {
				apiKey: "test-key",
				planModeApiProvider: "anthropic",
				actModeApiProvider: "anthropic",
			} as ApiConfiguration

			expect(ProviderFactoryService.validateProviderConfiguration("anthropic", config, "plan")).toBe(true)
			expect(ProviderFactoryService.validateProviderConfiguration("invalid-provider", config, "plan")).toBe(false)
		})

		it("should get provider capabilities", () => {
			const capabilities = ProviderFactoryService.getProviderCapabilities("anthropic")
			expect(capabilities.supportsStreaming).toBe(true)
			expect(capabilities.supportsThinking).toBe(true)
			expect(capabilities.supportsReasoning).toBe(true)
		})
	})

	describe("Main API Interface", () => {
		it("should build API handlers", () => {
			const config: ApiConfiguration = {
				apiKey: "test-key",
				planModeApiProvider: "anthropic",
				actModeApiProvider: "anthropic",
			} as ApiConfiguration

			const handler = ApiService.createHandler(config, "plan")
			expect(handler).toBeDefined()
		})

		it("should get supported providers", () => {
			const providers = ApiService.getSupportedProviders()
			expect(Array.isArray(providers)).toBe(true)
			expect(providers).toContain("anthropic")
		})

		it("should check provider support", () => {
			expect(ApiService.isProviderSupported("anthropic")).toBe(true)
			expect(ApiService.isProviderSupported("invalid-provider")).toBe(false)
		})
	})

	describe("Error Handling", () => {
		it("should handle invalid configurations gracefully", () => {
			const invalidConfig: ApiConfiguration = {
				planModeApiProvider: "invalid-provider",
				actModeApiProvider: "invalid-provider",
			} as ApiConfiguration

			expect(() => {
				ApiService.createHandler(invalidConfig, "plan")
			}).toThrow()
		})

		it("should provide meaningful error messages", () => {
			const config: ApiConfiguration = {
				planModeApiProvider: "anthropic",
				actModeApiProvider: "anthropic",
				// Missing required apiKey
			} as ApiConfiguration

			try {
				ApiService.createHandler(config, "plan")
				fail("Expected error to be thrown")
			} catch (error) {
				expect(error.message).toContain("required")
			}
		})
	})

	describe("Configuration Normalization", () => {
		it("should normalize configurations", () => {
			const config: ApiConfiguration = {
				planModeApiProvider: "anthropic",
				actModeApiProvider: undefined,
				apiKey: "test-key",
			} as ApiConfiguration

			const normalized = ConfigurationService.normalizeConfiguration(config)
			expect(normalized.actModeApiProvider).toBe("anthropic")
		})

		it("should get default configurations", () => {
			const defaults = ConfigurationService.getDefaultConfiguration("anthropic")
			expect(defaults.apiKey).toBe("")
			expect(defaults.anthropicBaseUrl).toBe("https://api.anthropic.com")
		})
	})
})
