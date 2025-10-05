/**
 * Queue System Initialization
 * Handles queue system startup and shutdown
 */

import { db } from "@/lib/db"
import { initializeQueueSystem, NoormmeQueueConfig } from "./utils"

let queueManager: any = null
let isInitialized = false

/**
 * Initialize the queue system
 */
export async function initializeQueue(): Promise<void> {
	if (isInitialized) {
		console.log("Queue system already initialized")
		return
	}

	try {
		console.log("🚀 Initializing NOORMME Queue System...")

		// Wait for database to be ready
		if (!db) {
			throw new Error("Database not initialized")
		}

		// Get Kysely instance from database
		const kysely = db.getKysely()

		// Queue configuration
		const queueConfig: Partial<NoormmeQueueConfig> = {
			persistent: {
				concurrency: parseInt(process.env.QUEUE_CONCURRENCY || "5"),
				interval: parseInt(process.env.QUEUE_INTERVAL || "1000"),
				batchSize: parseInt(process.env.QUEUE_BATCH_SIZE || "10"),
				cleanupAfterDays: parseInt(process.env.QUEUE_CLEANUP_DAYS || "7"),
			},
			inMemory: {
				concurrency: parseInt(process.env.QUEUE_IN_MEMORY_CONCURRENCY || "3"),
				interval: parseInt(process.env.QUEUE_IN_MEMORY_INTERVAL || "100"),
				timeout: parseInt(process.env.QUEUE_IN_MEMORY_TIMEOUT || "30000"),
			},
			autoStart: true,
			cleanupInterval: parseInt(process.env.QUEUE_CLEANUP_INTERVAL || "3600000"), // 1 hour
		}

		// Initialize the queue system
		queueManager = await initializeQueueSystem(kysely, queueConfig)

		isInitialized = true
		console.log("✅ NOORMME Queue System initialized successfully")
	} catch (error) {
		console.error("❌ Failed to initialize queue system:", error)
		throw error
	}
}

/**
 * Shutdown the queue system
 */
export async function shutdownQueue(): Promise<void> {
	if (!isInitialized || !queueManager) {
		console.log("Queue system not initialized")
		return
	}

	try {
		console.log("🛑 Shutting down NOORMME Queue System...")
		await queueManager.stop()
		queueManager = null
		isInitialized = false
		console.log("✅ NOORMME Queue System shut down successfully")
	} catch (error) {
		console.error("❌ Error shutting down queue system:", error)
		throw error
	}
}

/**
 * Get the queue manager instance
 */
export function getQueueManagerInstance() {
	if (!isInitialized || !queueManager) {
		throw new Error("Queue system not initialized. Call initializeQueue() first.")
	}
	return queueManager
}

/**
 * Check if queue system is initialized
 */
export function isQueueInitialized(): boolean {
	return isInitialized
}

// Handle graceful shutdown
if (typeof process !== "undefined") {
	process.on("SIGINT", async () => {
		console.log("Received SIGINT, shutting down queue system...")
		await shutdownQueue()
		process.exit(0)
	})

	process.on("SIGTERM", async () => {
		console.log("Received SIGTERM, shutting down queue system...")
		await shutdownQueue()
		process.exit(0)
	})
}
