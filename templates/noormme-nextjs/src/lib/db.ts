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
	wal: process.env.NODE_ENV !== "test", // Disable WAL in test environment
	cacheSize: process.env.NODE_ENV === "production" ? -128000 : -64000, // 128MB in production, 64MB in dev
	synchronous: (process.env.NODE_ENV === "production" ? "FULL" : "NORMAL") as "FULL" | "NORMAL" | "OFF",
	tempStore: "MEMORY" as const,
	foreignKeys: true,
	optimize: true,
	timeout: process.env.NODE_ENV === "production" ? 60000 : 30000,
	busyTimeout: process.env.NODE_ENV === "production" ? 10000 : 5000,
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

// Initialize database asynchronously
let initializationPromise: Promise<void> | null = null

async function ensureInitialized() {
	if (!initializationPromise) {
		initializationPromise = initializeDatabase()
	}
	await initializationPromise
}

// Export database instance and utilities
export { dbManager }

// Main database export with proper initialization
export const db = {
	getRepository: async (tableName: string) => {
		await ensureInitialized()
		if (!dbManager) {
			throw new Error("Database not initialized")
		}
		return dbManager.getDatabase().getRepository(tableName)
	},
	getKysely: async () => {
		await ensureInitialized()
		if (!dbManager) {
			throw new Error("Database not initialized")
		}
		return dbManager.getDatabase().getKysely()
	},
	execute: async (query: string, params?: any[]) => {
		await ensureInitialized()
		if (!dbManager) {
			throw new Error("Database not initialized")
		}
		return dbManager.executeQuery(() => dbManager!.getDatabase().execute(query, params))
	},
}

// Export enhanced utilities
export const getQueryBuilder = async (): Promise<QueryBuilderFactory> => {
	await ensureInitialized()
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return dbManager.getQueryBuilder()
}

export const getSAASPatterns = async (): Promise<SAASQueryPatterns> => {
	await ensureInitialized()
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return dbManager.getSAASPatterns()
}

export const getMigrationManager = async (): Promise<MigrationManager> => {
	await ensureInitialized()
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return dbManager.getMigrationManager()
}

export const getDatabaseStats = async () => {
	await ensureInitialized()
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return await dbManager.getStats()
}

export const getDatabaseHealth = async () => {
	await ensureInitialized()
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return await dbManager.healthCheck()
}

// Enhanced repository exports
export const getUserRepository = async (): Promise<UserRepository> => {
	await ensureInitialized()
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return new UserRepository(dbManager.getDatabase().getKysely() as any)
}

export const getSubscriptionRepository = async (): Promise<SubscriptionRepository> => {
	await ensureInitialized()
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return new SubscriptionRepository(dbManager.getDatabase().getKysely() as any)
}

export const getPaymentRepository = async (): Promise<PaymentRepository> => {
	await ensureInitialized()
	if (!dbManager) {
		throw new Error("Database not initialized")
	}
	return new PaymentRepository(dbManager.getDatabase().getKysely() as any)
}

// Cache exports
export const getCacheManager = () => cacheManager
export const getGlobalCache = () => globalCache

// Health monitoring exports
export const getHealthMonitor = async (): Promise<DatabaseHealthMonitor> => {
	await ensureInitialized()
	if (!healthMonitor) {
		throw new Error("Health monitor not initialized")
	}
	return healthMonitor
}

export const getPerformanceAnalyzer = async (): Promise<DatabasePerformanceAnalyzer> => {
	await ensureInitialized()
	if (!performanceAnalyzer) {
		throw new Error("Performance analyzer not initialized")
	}
	return performanceAnalyzer
}

// Enhanced health status with all metrics
export const getEnhancedHealthStatus = async () => {
	await ensureInitialized()
	if (!healthMonitor) {
		throw new Error("Health monitor not initialized")
	}
	return await healthMonitor.getHealthStatus()
}

// Performance report
export const getPerformanceReport = async () => {
	await ensureInitialized()
	if (!performanceAnalyzer) {
		throw new Error("Performance analyzer not initialized")
	}
	return await performanceAnalyzer.generatePerformanceReport()
}

export default db
