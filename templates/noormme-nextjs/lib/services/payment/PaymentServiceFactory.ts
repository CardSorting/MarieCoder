/**
 * Payment Service Factory
 * Centralized payment service management and configuration
 * Following NOORMME factory pattern with environment-specific configurations
 */

import { getPaymentConfig } from "../../config/payment.config"
import { PaymentNotificationService } from "../PaymentNotificationService"
import { PaymentValidationService } from "../PaymentValidationService"
import { PaymentProviderFactory } from "./PaymentProviderFactory"
import type { UnifiedPaymentConfig } from "./UnifiedPaymentService"
import { UnifiedPaymentService } from "./UnifiedPaymentService"

export interface PaymentServiceFactoryConfig {
	unified: UnifiedPaymentConfig
	validation: {
		enabled: boolean
		strictMode: boolean
		currencyValidation: boolean
		amountValidation: boolean
	}
	notifications: {
		enabled: boolean
		email: boolean
		webhook: boolean
		slack: boolean
	}
	monitoring: {
		enabled: boolean
		metricsCollection: boolean
		healthChecks: boolean
		alerting: boolean
	}
}

export class PaymentServiceFactory {
	private static instance: PaymentServiceFactory
	private unifiedService: UnifiedPaymentService | null = null
	private providerFactory: PaymentProviderFactory | null = null
	private validationService: PaymentValidationService | null = null
	private notificationService: PaymentNotificationService | null = null
	private config: PaymentServiceFactoryConfig
	private initialized: boolean = false

	private constructor() {
		this.config = this.createDefaultConfig()
	}

	static getInstance(): PaymentServiceFactory {
		if (!PaymentServiceFactory.instance) {
			PaymentServiceFactory.instance = new PaymentServiceFactory()
		}
		return PaymentServiceFactory.instance
	}

	/**
	 * Initialize the payment service factory
	 */
	async initialize(environment?: "development" | "production" | "test"): Promise<void> {
		if (this.initialized) {
			return
		}

		const env = environment || (process.env.NODE_ENV as "development" | "production" | "test") || "development"
		this.config = this.createEnvironmentConfig(env)

		// Initialize provider factory
		this.providerFactory = PaymentProviderFactory.getInstance()
		await this.providerFactory.initialize()

		// Initialize validation service
		this.validationService = new PaymentValidationService()

		// Initialize notification service
		this.notificationService = new PaymentNotificationService()

		// Initialize unified payment service
		this.unifiedService = UnifiedPaymentService.getInstance(this.config.unified)
		await this.unifiedService.initialize()

		this.initialized = true
		console.log(`Payment Service Factory initialized for ${env} environment`)
	}

	/**
	 * Get the unified payment service
	 */
	getUnifiedService(): UnifiedPaymentService {
		if (!this.initialized || !this.unifiedService) {
			throw new Error("PaymentServiceFactory not initialized. Call initialize() first.")
		}
		return this.unifiedService
	}

	/**
	 * Get the provider factory
	 */
	getProviderFactory(): PaymentProviderFactory {
		if (!this.initialized || !this.providerFactory) {
			throw new Error("PaymentServiceFactory not initialized. Call initialize() first.")
		}
		return this.providerFactory
	}

	/**
	 * Get the validation service
	 */
	getValidationService(): PaymentValidationService {
		if (!this.initialized || !this.validationService) {
			throw new Error("PaymentServiceFactory not initialized. Call initialize() first.")
		}
		return this.validationService
	}

	/**
	 * Get the notification service
	 */
	getNotificationService(): PaymentNotificationService {
		if (!this.initialized || !this.notificationService) {
			throw new Error("PaymentServiceFactory not initialized. Call initialize() first.")
		}
		return this.notificationService
	}

	/**
	 * Get all services
	 */
	getServices(): {
		unified: UnifiedPaymentService
		providerFactory: PaymentProviderFactory
		validation: PaymentValidationService
		notification: PaymentNotificationService
	} {
		if (!this.initialized) {
			throw new Error("PaymentServiceFactory not initialized. Call initialize() first.")
		}

		return {
			unified: this.unifiedService!,
			providerFactory: this.providerFactory!,
			validation: this.validationService!,
			notification: this.notificationService!,
		}
	}

	/**
	 * Get factory configuration
	 */
	getConfig(): PaymentServiceFactoryConfig {
		return { ...this.config }
	}

	/**
	 * Update factory configuration
	 */
	async updateConfig(newConfig: Partial<PaymentServiceFactoryConfig>): Promise<void> {
		this.config = { ...this.config, ...newConfig }

		// Reinitialize services if needed
		if (this.initialized) {
			await this.reinitialize()
		}
	}

	/**
	 * Get factory status
	 */
	getStatus(): {
		initialized: boolean
		services: string[]
		providers: string[]
		config: PaymentServiceFactoryConfig
	} {
		return {
			initialized: this.initialized,
			services: this.initialized ? ["unified", "providerFactory", "validation", "notification"] : [],
			providers: this.providerFactory?.getProviderNames() || [],
			config: this.config,
		}
	}

	/**
	 * Health check for all services
	 */
	async healthCheck(): Promise<{
		overall: "healthy" | "degraded" | "down"
		services: Record<string, "healthy" | "degraded" | "down">
		providers: Record<string, "healthy" | "degraded" | "down">
	}> {
		if (!this.initialized) {
			return {
				overall: "down",
				services: {},
				providers: {},
			}
		}

		const services: Record<string, "healthy" | "degraded" | "down"> = {}
		const providers: Record<string, "healthy" | "degraded" | "down"> = {}

		// Check unified service
		try {
			const metrics = this.unifiedService!.getMetrics()
			services.unified = metrics.performance.errorRate > 10 ? "degraded" : "healthy"
		} catch (error) {
			services.unified = "down"
		}

		// Check provider factory
		try {
			const status = this.providerFactory!.getStatus()
			services.providerFactory = status.initialized ? "healthy" : "down"
		} catch (error) {
			services.providerFactory = "down"
		}

		// Check providers
		try {
			const providerHealth = await this.providerFactory!.getAllProvidersHealth()
			Object.assign(providers, providerHealth)
		} catch (error) {
			// Mark all providers as down if health check fails
			this.providerFactory!.getProviderNames().forEach((name) => {
				providers[name] = "down"
			})
		}

		// Determine overall health
		const allStatuses = [...Object.values(services), ...Object.values(providers)]
		const hasDown = allStatuses.includes("down")
		const hasDegraded = allStatuses.includes("degraded")

		const overall = hasDown ? "down" : hasDegraded ? "degraded" : "healthy"

		return { overall, services, providers }
	}

	/**
	 * Reset factory (for testing)
	 */
	reset(): void {
		this.unifiedService = null
		this.providerFactory = null
		this.validationService = null
		this.notificationService = null
		this.initialized = false
	}

	// Private methods

	private createDefaultConfig(): PaymentServiceFactoryConfig {
		const paymentConfig = getPaymentConfig()

		return {
			unified: {
				providers: {
					stripe: { enabled: paymentConfig.providers.stripe.enabled, priority: 1 },
					paypal: { enabled: paymentConfig.providers.paypal.enabled, priority: 2 },
				},
				defaultProvider: paymentConfig.defaultProvider,
				fallbackEnabled: true,
				retryConfig: {
					maxRetries: 3,
					baseDelay: 1000,
					maxDelay: 30000,
					backoffMultiplier: 2,
				},
				monitoring: {
					enabled: true,
					slowTransactionThreshold: 5000,
					errorThreshold: 10,
				},
			},
			validation: {
				enabled: true,
				strictMode: false,
				currencyValidation: true,
				amountValidation: true,
			},
			notifications: {
				enabled: paymentConfig.features.notifications,
				email: true,
				webhook: true,
				slack: false,
			},
			monitoring: {
				enabled: true,
				metricsCollection: true,
				healthChecks: true,
				alerting: false,
			},
		}
	}

	private createEnvironmentConfig(environment: "development" | "production" | "test"): PaymentServiceFactoryConfig {
		const baseConfig = this.createDefaultConfig()

		switch (environment) {
			case "development":
				return {
					...baseConfig,
					unified: {
						...baseConfig.unified,
						monitoring: {
							...baseConfig.unified.monitoring,
							slowTransactionThreshold: 2000, // More sensitive in development
						},
					},
					validation: {
						...baseConfig.validation,
						strictMode: true, // Strict validation in development
					},
					notifications: {
						...baseConfig.notifications,
						enabled: false, // Disable notifications in development
					},
					monitoring: {
						...baseConfig.monitoring,
						alerting: false, // No alerts in development
					},
				}

			case "production":
				return {
					...baseConfig,
					unified: {
						...baseConfig.unified,
						retryConfig: {
							...baseConfig.unified.retryConfig,
							maxRetries: 5, // More retries in production
						},
						monitoring: {
							...baseConfig.unified.monitoring,
							errorThreshold: 5, // Lower error threshold in production
						},
					},
					validation: {
						...baseConfig.validation,
						strictMode: true, // Strict validation in production
					},
					notifications: {
						...baseConfig.notifications,
						enabled: true, // Enable all notifications in production
					},
					monitoring: {
						...baseConfig.monitoring,
						alerting: true, // Enable alerting in production
					},
				}

			case "test":
				return {
					...baseConfig,
					unified: {
						...baseConfig.unified,
						providers: {
							stripe: { enabled: false, priority: 1 },
							paypal: { enabled: false, priority: 2 },
						},
						retryConfig: {
							...baseConfig.unified.retryConfig,
							maxRetries: 1, // Minimal retries in tests
						},
						monitoring: {
							...baseConfig.unified.monitoring,
							enabled: false, // Disable monitoring in tests
						},
					},
					validation: {
						...baseConfig.validation,
						enabled: false, // Disable validation in tests
					},
					notifications: {
						...baseConfig.notifications,
						enabled: false, // Disable notifications in tests
					},
					monitoring: {
						...baseConfig.monitoring,
						enabled: false, // Disable monitoring in tests
					},
				}

			default:
				return baseConfig
		}
	}

	private async reinitialize(): Promise<void> {
		this.initialized = false
		await this.initialize()
	}
}
