/**
 * Enhanced Database Configuration for NOORMME SAAS
 * Following NORMIE DEV methodology - optimized, reliable, performant
 * Compatible with MCP server and production deployment
 */

import { cacheManager, globalCache } from "./database/cache"
import { DatabaseFactory, DatabaseManager } from "./database/connection"
import { DatabaseHealthMonitor, DatabasePerformanceAnalyzer } from "./database/health"
import { MigrationManager } from "./database/migration"
import { QueryBuilderFactory, SAASQueryPatterns } from "./database/query-builder"
import { PaymentRepository, SubscriptionRepository, UserRepository } from "./database/repository"

// Database configuration - Production-ready with MCP compatibility
const databaseConfig = {
	database: process.env.DATABASE_URL || "./database.sqlite",
	wal: process.env.NODE_ENV !== 'test', // Disable WAL in test environment
	cacheSize: process.env.NODE_ENV === 'production' ? -128000 : -64000, // 128MB in production, 64MB in dev
	synchronous: (process.env.NODE_ENV === 'production' ? "FULL" : "NORMAL") as "FULL" | "NORMAL" | "OFF",
	tempStore: "MEMORY" as const,
	foreignKeys: true,
	optimize: true,
	timeout: process.env.NODE_ENV === 'production' ? 60000 : 30000,
	busyTimeout: process.env.NODE_ENV === 'production' ? 10000 : 5000,
}

// Initialize database manager and related services
let dbManager: DatabaseManager | null = null
let healthMonitor: DatabaseHealthMonitor | null = null
let performanceAnalyzer: DatabasePerformanceAnalyzer | null = null

async function initializeDatabase() {
	try {
		console.log("🔄 Initializing enhanced database connection...")

		dbManager = await DatabaseFactory.create(databaseConfig)

		// Initialize health monitoring
		healthMonitor = new DatabaseHealthMonitor(dbManager)
		performanceAnalyzer = new DatabasePerformanceAnalyzer(dbManager)

		// Warm up caches with common queries
		await warmupCaches()

		console.log("✅ Enhanced database initialized successfully")
	} catch (error) {
		console.error("❌ Database initialization failed:", error)
		throw error
	}
}

// Warm up caches with common queries
async function warmupCaches() {
	try {
		console.log("🔥 Warming up database caches...")

		const warmupQueries = {
			users: [
				{
					key: "active-users",
					queryFn: async () => {
						const userRepo = new UserRepository(dbManager!.getDatabase().getKysely() as any)
						return await userRepo.findActiveUsers()
					},
				},
			],
			plans: [
				{
					key: "active-plans",
					queryFn: async () => {
						const kysely = dbManager!.getDatabase().getKysely()
						return await kysely.selectFrom("plans").where("status", "=", "active").execute()
					},
				},
			],
			settings: [
				{
					key: "public-settings",
					queryFn: async () => {
						const kysely = dbManager!.getDatabase().getKysely()
						return await kysely.selectFrom("system_settings").where("isPublic", "=", true).execute()
					},
				},
			],
		}

		await cacheManager.warmupAll(warmupQueries)
	} catch (error) {
		console.error("❌ Cache warmup failed:", error)
	}
}

// Initialize on import
initializeDatabase()

// Export database instance and utilities
export { dbManager }

// Legacy export for backward compatibility
export const db = {
	getRepository: (tableName: string) => {
		if (!dbManager) {
			throw new Error("Database not initialized")
		}
		return dbManager.getDatabase().getRepository(tableName)
	},
	getKysely: () => {
		if (!dbManager) {
			throw new Error("Database not initialized")
		}
		return dbManager.getDatabase().getKysely()
	},
	execute: (query: string, params?: any[]) => {
		if (!dbManager) {
			throw new Error("Database not initialized")
		}
		return dbManager.executeQuery(() => dbManager!.getDatabase().execute(query, params))
	},
}

// Export enhanced utilities
export const getQueryBuilder = (): QueryBuilderFactory => {
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return dbManager.getQueryBuilder()
}

export const getSAASPatterns = (): SAASQueryPatterns => {
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return dbManager.getSAASPatterns()
}

export const getMigrationManager = (): MigrationManager => {
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return dbManager.getMigrationManager()
}

export const getDatabaseStats = async () => {
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return await dbManager.getStats()
}

export const getDatabaseHealth = async () => {
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return await dbManager.healthCheck()
}

// Enhanced repository exports
export const getUserRepository = (): UserRepository => {
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return new UserRepository(dbManager.getDatabase().getKysely() as any)
}

export const getSubscriptionRepository = (): SubscriptionRepository => {
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return new SubscriptionRepository(dbManager.getDatabase().getKysely() as any)
}

export const getPaymentRepository = (): PaymentRepository => {
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return new PaymentRepository(dbManager.getDatabase().getKysely() as any)
}

// Cache exports
export const getCacheManager = () => cacheManager
export const getGlobalCache = () => globalCache

// Health monitoring exports
export const getHealthMonitor = (): DatabaseHealthMonitor => {
	if (!healthMonitor) {
		throw new Error("Health monitor not initialized")
	}
	return healthMonitor
}

export const getPerformanceAnalyzer = (): DatabasePerformanceAnalyzer => {
	if (!performanceAnalyzer) {
		throw new Error("Performance analyzer not initialized")
	}
	return performanceAnalyzer
}

// Enhanced health status with all metrics
export const getEnhancedHealthStatus = async () => {
	if (!healthMonitor) {
		throw new Error("Health monitor not initialized")
	}
	return await healthMonitor.getHealthStatus()
}

// Performance report
export const getPerformanceReport = async () => {
	if (!performanceAnalyzer) {
		throw new Error("Performance analyzer not initialized")
	}
	return await performanceAnalyzer.generatePerformanceReport()
}

export default db
