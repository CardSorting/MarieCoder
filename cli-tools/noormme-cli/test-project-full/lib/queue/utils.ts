/**
 * Queue Utility Functions
 * Convenience functions for common queue operations
 */

import { Kysely } from "kysely"
import { DatabaseSchema } from "../db"
import { EmailConfig, EmailHandler } from "./handlers/EmailHandler"
import { ImageConfig, ImageHandler } from "./handlers/ImageHandler"
import { WebhookConfig, WebhookHandler } from "./handlers/WebhookHandler"
import { NoormmeQueueConfig, NoormmeQueueManager } from "./QueueManager"

/**
 * Create and configure a queue manager with default handlers
 * @param db Database instance
 * @param config Queue configuration
 * @returns Configured queue manager
 */
export function createQueueManager(db: Kysely<DatabaseSchema>, config?: Partial<NoormmeQueueConfig>): NoormmeQueueManager {
	const queueManager = new NoormmeQueueManager(db, config)

	// Register default handlers
	registerDefaultHandlers(queueManager)

	return queueManager
}

/**
 * Register default handlers for common job types
 * @param queueManager Queue manager instance
 */
export function registerDefaultHandlers(queueManager: NoormmeQueueManager): void {
	// Email handler
	const emailConfig: EmailConfig = {
		provider: "smtp",
		from: process.env.EMAIL_FROM || "noreply@example.com",
		apiKey: process.env.EMAIL_API_KEY,
	}

	const emailHandler = new EmailHandler(emailConfig)
	queueManager.registerHandler("email", emailHandler)
	queueManager.registerHandler("newsletter", new EmailHandler(emailConfig))

	// Image handler
	const imageConfig: ImageConfig = {
		outputDir: process.env.IMAGE_OUTPUT_DIR || "./uploads/processed",
		tempDir: process.env.IMAGE_TEMP_DIR || "./temp",
		maxFileSize: 10 * 1024 * 1024, // 10MB
		supportedFormats: ["jpeg", "jpg", "png", "webp", "gif"],
		enableWebP: true,
		enableAvif: true,
	}

	const imageHandler = new ImageHandler(imageConfig)
	queueManager.registerHandler("image", imageHandler)
	queueManager.registerHandler("thumbnail", new ImageHandler(imageConfig))

	// Webhook handler
	const webhookConfig: WebhookConfig = {
		defaultTimeout: 30000,
		maxRetries: 3,
		baseDelay: 1000,
		maxDelay: 30000,
		backoffMultiplier: 2,
		userAgent: "NOORMME-Webhook/1.0",
		validateSSL: true,
	}

	const webhookHandler = new WebhookHandler(webhookConfig)
	queueManager.registerHandler("webhook", webhookHandler)

	console.log("📝 Registered default handlers: email, newsletter, image, thumbnail, webhook")
}

/**
 * Create common in-memory queues
 * @param queueManager Queue manager instance
 */
export function createCommonQueues(queueManager: NoormmeQueueManager): void {
	// API rate limiting queue
	queueManager.createRateLimitedQueue("api-calls", 100) // 100 requests per minute

	// Image processing queue
	queueManager.createInMemoryQueue("image-processing", { concurrency: 2 })

	// Email sending queue
	queueManager.createInMemoryQueue("email-sending", { concurrency: 3 })

	// Webhook delivery queue
	queueManager.createInMemoryQueue("webhook-delivery", { concurrency: 5 })

	// Batch processing queue
	queueManager.createBatchQueue("batch-processing", 10, 5000)

	console.log("📝 Created common in-memory queues")
}

/**
 * Setup queue processors for in-memory queues
 * @param queueManager Queue manager instance
 */
export function setupQueueProcessors(queueManager: NoormmeQueueManager): void {
	// API calls processor
	queueManager.setInMemoryProcessor("api-calls", async (payload: { url: string; options?: any }) => {
		// Simulate API call
		console.log(`🌐 Making API call to: ${payload.url}`)
		await new Promise((resolve) => setTimeout(resolve, 100))
	})

	// Image processing processor
	queueManager.setInMemoryProcessor("image-processing", async (payload: { imagePath: string; operations: any[] }) => {
		// Simulate image processing
		console.log(`🖼️ Processing image: ${payload.imagePath}`)
		await new Promise((resolve) => setTimeout(resolve, 500))
	})

	// Email sending processor
	queueManager.setInMemoryProcessor("email-sending", async (payload: { to: string; subject: string; body: string }) => {
		// Simulate email sending
		console.log(`📧 Sending email to: ${payload.to}`)
		await new Promise((resolve) => setTimeout(resolve, 200))
	})

	// Webhook delivery processor
	queueManager.setInMemoryProcessor("webhook-delivery", async (payload: { url: string; data: any }) => {
		// Simulate webhook delivery
		console.log(`🔗 Delivering webhook to: ${payload.url}`)
		await new Promise((resolve) => setTimeout(resolve, 150))
	})

	// Batch processing processor
	queueManager.setInMemoryProcessor("batch-processing", async (payload: any[]) => {
		// Simulate batch processing
		console.log(`📦 Processing batch of ${payload.length} items`)
		await new Promise((resolve) => setTimeout(resolve, 1000))
	})

	console.log("📝 Setup queue processors for in-memory queues")
}

/**
 * Initialize complete queue system
 * @param db Database instance
 * @param config Queue configuration
 * @returns Configured and started queue manager
 */
export async function initializeQueueSystem(
	db: Kysely<DatabaseSchema>,
	config?: Partial<NoormmeQueueConfig>,
): Promise<NoormmeQueueManager> {
	console.log("🚀 Initializing NOORMME Queue System")

	// Create queue manager
	const queueManager = createQueueManager(db, config)

	// Create common queues
	createCommonQueues(queueManager)

	// Setup processors
	setupQueueProcessors(queueManager)

	// Start the system
	await queueManager.start()

	console.log("✅ NOORMME Queue System initialized successfully")
	return queueManager
}
