/**
 * Database Service Factory
 * Centralized factory for creating and managing database services
 * Following NOORMME Marie Kondo methodology - keeping only what sparks joy
 */

import type { PaymentDatabaseConfig } from "./providers/PaymentDatabaseService"
import { PaymentDatabaseService } from "./providers/PaymentDatabaseService"
import type { UserDatabaseConfig } from "./providers/UserDatabaseService"
import { UserDatabaseService } from "./providers/UserDatabaseService"
import type { UnifiedDatabaseConfig } from "./UnifiedDatabaseService"
import { UnifiedDatabaseService } from "./UnifiedDatabaseService"

export interface ServiceFactoryConfig {
	unified: UnifiedDatabaseConfig
	user: UserDatabaseConfig
	payment: PaymentDatabaseConfig
}

export interface ServiceInstances {
	unified: UnifiedDatabaseService
	user: UserDatabaseService
	payment: PaymentDatabaseService
}

export class DatabaseServiceFactory {
	private static instance: DatabaseServiceFactory
	private services: ServiceInstances | null = null
	private config: ServiceFactoryConfig | null = null

	private constructor() {}

	static getInstance(): DatabaseServiceFactory {
		if (!DatabaseServiceFactory.instance) {
			DatabaseServiceFactory.instance = new DatabaseServiceFactory()
		}
		return DatabaseServiceFactory.instance
	}

	/**
	 * Initialize the service factory with configuration
	 */
	async initialize(config: ServiceFactoryConfig): Promise<ServiceInstances> {
		if (this.services) {
			console.log("⚠️ Service factory already initialized")
			return this.services
		}

		this.config = config

		try {
			// Initialize unified database service
			const unified = UnifiedDatabaseService.getInstance(config.unified)
			await unified.healthCheck()

			// Initialize specialized services
			const user = new UserDatabaseService(unified.getConnection(), config.user)

			const payment = new PaymentDatabaseService(unified.getConnection(), config.payment)

			this.services = {
				unified,
				user,
				payment,
			}

			console.log("✅ Database Service Factory initialized successfully")
			return this.services
		} catch (error) {
			console.error("❌ Failed to initialize Database Service Factory:", error)
			throw error
		}
	}

	/**
	 * Get service instances
	 */
	getServices(): ServiceInstances {
		if (!this.services) {
			throw new Error("Service factory not initialized. Call initialize() first.")
		}
		return this.services
	}

	/**
	 * Get unified database service
	 */
	getUnifiedService(): UnifiedDatabaseService {
		return this.getServices().unified
	}

	/**
	 * Get user database service
	 */
	getUserService(): UserDatabaseService {
		return this.getServices().user
	}

	/**
	 * Get payment database service
	 */
	getPaymentService(): PaymentDatabaseService {
		return this.getServices().payment
	}

	/**
	 * Health check all services
	 */
	async healthCheck(): Promise<{
		healthy: boolean
		services: {
			unified: boolean
			user: boolean
			payment: boolean
		}
		issues: string[]
		recommendations: string[]
	}> {
		if (!this.services) {
			return {
				healthy: false,
				services: { unified: false, user: false, payment: false },
				issues: ["Service factory not initialized"],
				recommendations: ["Initialize the service factory"],
			}
		}

		const issues: string[] = []
		const recommendations: string[] = []
		const services = {
			unified: false,
			user: false,
			payment: false,
		}

		try {
			// Check unified service
			const unifiedHealth = await this.services.unified.healthCheck()
			services.unified = unifiedHealth.healthy
			if (!unifiedHealth.healthy) {
				issues.push(...unifiedHealth.issues)
				recommendations.push(...unifiedHealth.recommendations)
			}

			// Check user service
			try {
				await this.services.user.getUserStats()
				services.user = true
			} catch (error) {
				issues.push(`User service check failed: ${error instanceof Error ? error.message : "Unknown error"}`)
			}

			// Check payment service
			try {
				await this.services.payment.getActiveSubscriptionPlans()
				services.payment = true
			} catch (error) {
				issues.push(`Payment service check failed: ${error instanceof Error ? error.message : "Unknown error"}`)
			}

			const healthy = Object.values(services).every((status) => status === true)

			return {
				healthy,
				services,
				issues,
				recommendations,
			}
		} catch (error) {
			issues.push(`Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`)
			return {
				healthy: false,
				services,
				issues,
				recommendations,
			}
		}
	}

	/**
	 * Get comprehensive statistics
	 */
	getStats(): {
		unified: any
		config: ServiceFactoryConfig | null
		uptime: number
	} {
		if (!this.services) {
			return {
				unified: null,
				config: null,
				uptime: 0,
			}
		}

		return {
			unified: this.services.unified.getStats(),
			config: this.config,
			uptime: process.uptime(),
		}
	}

	/**
	 * Optimize all services
	 */
	async optimize(): Promise<void> {
		if (!this.services) {
			throw new Error("Service factory not initialized")
		}

		try {
			await this.services.unified.optimize()
			console.log("✅ All services optimized successfully")
		} catch (error) {
			console.error("❌ Service optimization failed:", error)
			throw error
		}
	}

	/**
	 * Create backup of all data
	 */
	async createBackup(backupPath?: string): Promise<string> {
		if (!this.services) {
			throw new Error("Service factory not initialized")
		}

		try {
			return await this.services.unified.createBackup(backupPath)
		} catch (error) {
			console.error("❌ Backup creation failed:", error)
			throw error
		}
	}

	/**
	 * Close all services
	 */
	async close(): Promise<void> {
		if (!this.services) {
			return
		}

		try {
			await this.services.unified.close()
			this.services = null
			this.config = null
			console.log("✅ All services closed successfully")
		} catch (error) {
			console.error("❌ Error closing services:", error)
			throw error
		}
	}

	/**
	 * Reset factory (for testing)
	 */
	async reset(): Promise<void> {
		if (this.services) {
			await this.close()
		}
		this.services = null
		this.config = null
	}
}

/**
 * Default configuration factory
 */
export function createDefaultConfig(): ServiceFactoryConfig {
	return {
		unified: {
			connection: {
				databasePath: process.env.DATABASE_URL || "./data/app.db",
				enableWAL: true,
				enableForeignKeys: true,
				cacheSize: -64000, // 64MB
				journalMode: "WAL",
				synchronous: "NORMAL",
				tempStore: "MEMORY",
				timeout: 5000,
				maxRetries: 3,
			},
			migration: {
				migrationsPath: "./migrations",
				connectionName: "default",
				enableBackup: true,
				backupPath: "./data/backups",
			},
			cache: {
				enabled: true,
				ttl: 300000, // 5 minutes
				maxSize: 1000,
			},
			monitoring: {
				enabled: true,
				slowQueryThreshold: 1000,
				healthCheckInterval: 60000, // 1 minute
			},
			optimization: {
				autoVacuum: true,
				autoAnalyze: true,
				walCheckpointInterval: 300000, // 5 minutes
				optimizationSchedule: {
					enabled: true,
					interval: 24 * 60 * 60 * 1000, // 24 hours
					timeOfDay: "02:00", // 2 AM
				},
			},
		},
		user: {
			connectionName: "default",
			enableCaching: true,
			cacheTTL: 300000, // 5 minutes
			enableMonitoring: true,
		},
		payment: {
			connectionName: "default",
			enableCaching: true,
			cacheTTL: 300000, // 5 minutes
			enableMonitoring: true,
		},
	}
}

/**
 * Environment-specific configuration factory
 */
export function createEnvironmentConfig(environment: "development" | "production" | "test"): ServiceFactoryConfig {
	const baseConfig = createDefaultConfig()

	switch (environment) {
		case "development":
			return {
				...baseConfig,
				unified: {
					...baseConfig.unified,
					monitoring: {
						...baseConfig.unified.monitoring,
						slowQueryThreshold: 500, // More sensitive in development
					},
					optimization: {
						...baseConfig.unified.optimization,
						optimizationSchedule: {
							...baseConfig.unified.optimization.optimizationSchedule,
							enabled: false, // Disable in development
						},
					},
				},
			}

		case "production":
			return {
				...baseConfig,
				unified: {
					...baseConfig.unified,
					cache: {
						...baseConfig.unified.cache,
						maxSize: 10000, // Larger cache in production
					},
					monitoring: {
						...baseConfig.unified.monitoring,
						healthCheckInterval: 30000, // More frequent checks
					},
					optimization: {
						...baseConfig.unified.optimization,
					},
				},
			}

		case "test":
			return {
				...baseConfig,
				unified: {
					...baseConfig.unified,
					connection: {
						...baseConfig.unified.connection,
						databasePath: ":memory:", // In-memory database for tests
					},
					cache: {
						...baseConfig.unified.cache,
						enabled: false, // Disable cache in tests
					},
					monitoring: {
						...baseConfig.unified.monitoring,
						enabled: false, // Disable monitoring in tests
					},
					optimization: {
						...baseConfig.unified.optimization,
						optimizationSchedule: {
							...baseConfig.unified.optimization.optimizationSchedule,
							enabled: false, // Disable optimization in tests
						},
					},
				},
			}

		default:
			return baseConfig
	}
}
