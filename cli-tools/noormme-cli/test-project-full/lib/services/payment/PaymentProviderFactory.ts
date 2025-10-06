/**
 * Payment Provider Factory
 * Centralized provider instantiation and management
 * Following NOORMME factory pattern with provider abstraction
 */

import { getPaymentConfig } from "../../config/payment.config"
import type { IPaymentProvider } from "../../providers/interfaces/IPaymentProvider"
import type { PaymentProviderConfig } from "../../types/payment"
import { PayPalProvider } from "./providers/PayPalProvider"
import { StripeProvider } from "./providers/StripeProvider"

export interface ProviderFactoryConfig {
	stripe: {
		enabled: boolean
		config: PaymentProviderConfig
	}
	paypal: {
		enabled: boolean
		config: PaymentProviderConfig
	}
}

export class PaymentProviderFactory {
	private static instance: PaymentProviderFactory
	private providers: Map<string, IPaymentProvider> = new Map()
	private config: ProviderFactoryConfig
	private initialized: boolean = false

	private constructor() {
		const paymentConfig = getPaymentConfig()
		this.config = {
			stripe: {
				enabled: paymentConfig.providers.stripe.enabled,
				config: {
					apiKey: paymentConfig.providers.stripe.secretKey,
					environment: paymentConfig.providers.stripe.environment,
					webhookSecret: paymentConfig.providers.stripe.webhookSecret,
					apiVersion: paymentConfig.providers.stripe.apiVersion,
					maxRetries: paymentConfig.providers.stripe.maxRetries,
					timeout: paymentConfig.providers.stripe.timeout,
				},
			},
			paypal: {
				enabled: paymentConfig.providers.paypal.enabled,
				config: {
					apiKey: paymentConfig.providers.paypal.clientSecret,
					environment: paymentConfig.providers.paypal.environment,
					webhookSecret: paymentConfig.providers.paypal.webhookId,
					apiVersion: paymentConfig.providers.paypal.apiVersion,
					maxRetries: paymentConfig.providers.paypal.maxRetries,
					timeout: paymentConfig.providers.paypal.timeout,
				},
			},
		}
	}

	static getInstance(): PaymentProviderFactory {
		if (!PaymentProviderFactory.instance) {
			PaymentProviderFactory.instance = new PaymentProviderFactory()
		}
		return PaymentProviderFactory.instance
	}

	/**
	 * Initialize all enabled providers
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return
		}

		const initPromises: Promise<void>[] = []

		// Initialize Stripe
		if (this.config.stripe.enabled) {
			const stripeProvider = new StripeProvider()
			initPromises.push(
				stripeProvider.initialize(this.config.stripe.config).then(() => {
					this.providers.set("stripe", stripeProvider)
					console.log("Stripe provider initialized successfully")
				}),
			)
		}

		// Initialize PayPal
		if (this.config.paypal.enabled) {
			const paypalProvider = new PayPalProvider()
			initPromises.push(
				paypalProvider.initialize(this.config.paypal.config).then(() => {
					this.providers.set("paypal", paypalProvider)
					console.log("PayPal provider initialized successfully")
				}),
			)
		}

		// Wait for all providers to initialize
		await Promise.all(initPromises)

		if (this.providers.size === 0) {
			throw new Error("No payment providers were successfully initialized")
		}

		this.initialized = true
		console.log(`Payment Provider Factory initialized with ${this.providers.size} providers`)
	}

	/**
	 * Get a specific provider
	 */
	getProvider(name: "stripe" | "paypal"): IPaymentProvider {
		if (!this.initialized) {
			throw new Error("PaymentProviderFactory not initialized. Call initialize() first.")
		}

		const provider = this.providers.get(name)
		if (!provider) {
			throw new Error(`Provider '${name}' is not available or not initialized`)
		}

		return provider
	}

	/**
	 * Get all available providers
	 */
	getAllProviders(): IPaymentProvider[] {
		if (!this.initialized) {
			throw new Error("PaymentProviderFactory not initialized. Call initialize() first.")
		}

		return Array.from(this.providers.values())
	}

	/**
	 * Get provider names
	 */
	getProviderNames(): string[] {
		return Array.from(this.providers.keys())
	}

	/**
	 * Check if provider is available
	 */
	isProviderAvailable(name: string): boolean {
		return this.providers.has(name)
	}

	/**
	 * Get provider health status
	 */
	async getProviderHealth(name: "stripe" | "paypal"): Promise<{
		status: "healthy" | "degraded" | "down"
		responseTime: number
		lastChecked: Date
	}> {
		const provider = this.getProvider(name)
		const startTime = Date.now()

		try {
			// Simple health check - try to get a customer (this will fail but not throw)
			await provider.getCustomer("health_check")
			const responseTime = Date.now() - startTime

			return {
				status: responseTime > 2000 ? "degraded" : "healthy",
				responseTime,
				lastChecked: new Date(),
			}
		} catch (error) {
			return {
				status: "down",
				responseTime: Date.now() - startTime,
				lastChecked: new Date(),
			}
		}
	}

	/**
	 * Get all providers health status
	 */
	async getAllProvidersHealth(): Promise<
		Record<
			string,
			{
				status: "healthy" | "degraded" | "down"
				responseTime: number
				lastChecked: Date
			}
		>
	> {
		const healthChecks: Record<string, any> = {}

		for (const providerName of this.getProviderNames()) {
			healthChecks[providerName] = await this.getProviderHealth(providerName as "stripe" | "paypal")
		}

		return healthChecks
	}

	/**
	 * Get provider configuration
	 */
	getProviderConfig(name: "stripe" | "paypal"): PaymentProviderConfig | null {
		if (name === "stripe" && this.config.stripe.enabled) {
			return this.config.stripe.config
		}
		if (name === "paypal" && this.config.paypal.enabled) {
			return this.config.paypal.config
		}
		return null
	}

	/**
	 * Update provider configuration
	 */
	async updateProviderConfig(name: "stripe" | "paypal", config: Partial<PaymentProviderConfig>): Promise<void> {
		const provider = this.getProvider(name)

		// Update configuration
		if (name === "stripe") {
			this.config.stripe.config = { ...this.config.stripe.config, ...config }
		} else if (name === "paypal") {
			this.config.paypal.config = { ...this.config.paypal.config, ...config }
		}

		// Reinitialize provider with new config
		await provider.initialize(this.config[name].config)
		console.log(`Provider '${name}' configuration updated and reinitialized`)
	}

	/**
	 * Get factory status
	 */
	getStatus(): {
		initialized: boolean
		providers: string[]
		enabledProviders: string[]
	} {
		return {
			initialized: this.initialized,
			providers: this.getProviderNames(),
			enabledProviders: Object.entries(this.config)
				.filter(([_, config]) => config.enabled)
				.map(([name, _]) => name),
		}
	}

	/**
	 * Reset factory (for testing)
	 */
	reset(): void {
		this.providers.clear()
		this.initialized = false
	}
}
