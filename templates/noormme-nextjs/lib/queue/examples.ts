/**
 * Queue System Examples
 * Demonstrates how to use the NOORMME queue system
 */

import { getQueueManagerInstance } from "./init"

/**
 * Example: Send a single email
 */
export async function sendEmailExample() {
	try {
		const queueManager = getQueueManagerInstance()

		// Add email job to persistent queue
		const jobId = await queueManager.addJob("email", {
			to: "user@example.com",
			subject: "Welcome to NOORMME!",
			html: "<h1>Welcome!</h1><p>Thank you for joining us.</p>",
		})

		console.log(`📧 Email job queued with ID: ${jobId}`)
		return jobId
	} catch (error) {
		console.error("Error sending email:", error)
		throw error
	}
}

/**
 * Example: Send newsletter to multiple users
 */
export async function sendNewsletterExample() {
	try {
		const queueManager = getQueueManagerInstance()

		// Newsletter payload
		const newsletterPayload = {
			to: ["user1@example.com", "user2@example.com", "user3@example.com"],
			subject: "Weekly Newsletter",
			html: "<h1>Weekly Update</h1><p>Here's what's new this week...</p>",
		}

		// Add newsletter job with high priority
		const jobId = await queueManager.addJob("newsletter", newsletterPayload, {
			priority: 10,
			maxAttempts: 5,
		})

		console.log(`📧 Newsletter job queued with ID: ${jobId}`)
		return jobId
	} catch (error) {
		console.error("Error sending newsletter:", error)
		throw error
	}
}

/**
 * Example: Process images with in-memory queue
 */
export async function processImagesExample() {
	try {
		const queueManager = getQueueManagerInstance()

		// Get the image processing queue
		const imageQueue = queueManager.getInMemoryQueue("image-processing")

		if (!imageQueue) {
			throw new Error("Image processing queue not found")
		}

		// Process multiple images
		const images = [
			{ imagePath: "/uploads/image1.jpg", operations: [{ type: "resize", params: { width: 300, height: 300 } }] },
			{ imagePath: "/uploads/image2.jpg", operations: [{ type: "resize", params: { width: 600, height: 600 } }] },
			{ imagePath: "/uploads/image3.jpg", operations: [{ type: "crop", params: { width: 400, height: 400 } }] },
		]

		// Add all images to queue
		for (const image of images) {
			await imageQueue.add(image)
		}

		console.log(`🖼️ Queued ${images.length} images for processing`)
	} catch (error) {
		console.error("Error processing images:", error)
		throw error
	}
}

/**
 * Example: Send webhooks with retry logic
 */
export async function sendWebhookExample() {
	try {
		const queueManager = getQueueManagerInstance()

		// Webhook payload
		const webhookPayload = {
			url: "https://api.example.com/webhook",
			method: "POST" as const,
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": "your-api-key",
			},
			body: {
				event: "user.created",
				data: {
					userId: "123",
					email: "user@example.com",
					timestamp: new Date().toISOString(),
				},
			},
			retryPolicy: {
				maxRetries: 5,
				baseDelay: 2000,
				maxDelay: 30000,
				backoffMultiplier: 2,
			},
		}

		// Add webhook job
		const jobId = await queueManager.addJob("webhook", webhookPayload, {
			priority: 5,
			maxAttempts: 5,
		})

		console.log(`🔗 Webhook job queued with ID: ${jobId}`)
		return jobId
	} catch (error) {
		console.error("Error sending webhook:", error)
		throw error
	}
}

/**
 * Example: Batch process items
 */
export async function batchProcessExample() {
	try {
		const queueManager = getQueueManagerInstance()

		// Get the batch processing queue
		const batchQueue = queueManager.getInMemoryQueue("batch-processing")

		if (!batchQueue) {
			throw new Error("Batch processing queue not found")
		}

		// Create a batch of items
		const batch = Array.from({ length: 25 }, (_, i) => ({
			id: `item-${i}`,
			data: `Processing item ${i}`,
		}))

		// Add batch to queue
		await batchQueue.add(batch)

		console.log(`📦 Batch of ${batch.length} items queued for processing`)
	} catch (error) {
		console.error("Error batch processing:", error)
		throw error
	}
}

/**
 * Example: Rate-limited API calls
 */
export async function rateLimitedApiCallsExample() {
	try {
		const queueManager = getQueueManagerInstance()

		// Get the API calls queue (rate-limited to 100 requests per minute)
		const apiQueue = queueManager.getInMemoryQueue("api-calls")

		if (!apiQueue) {
			throw new Error("API calls queue not found")
		}

		// Make multiple API calls
		const apiCalls = [
			{ url: "https://api.example.com/users", options: { method: "GET" } },
			{ url: "https://api.example.com/posts", options: { method: "GET" } },
			{ url: "https://api.example.com/comments", options: { method: "GET" } },
			{ url: "https://api.example.com/likes", options: { method: "GET" } },
		]

		// Add all API calls to queue
		for (const apiCall of apiCalls) {
			await apiQueue.add(apiCall)
		}

		console.log(`🌐 Queued ${apiCalls.length} API calls with rate limiting`)
	} catch (error) {
		console.error("Error making API calls:", error)
		throw error
	}
}

/**
 * Example: Get queue statistics
 */
export async function getQueueStatsExample() {
	try {
		const queueManager = getQueueManagerInstance()

		// Get persistent queue stats
		const persistentStats = await queueManager.getStats()
		console.log("📊 Persistent Queue Stats:", persistentStats)

		// Get in-memory queue stats
		const inMemoryStats = queueManager.getAllInMemoryStats()
		console.log("📊 In-Memory Queue Stats:", Object.fromEntries(inMemoryStats))

		return { persistent: persistentStats, inMemory: Object.fromEntries(inMemoryStats) }
	} catch (error) {
		console.error("Error getting queue stats:", error)
		throw error
	}
}

/**
 * Example: Monitor job progress
 */
export async function monitorJobProgressExample(jobId: string) {
	try {
		const queueManager = getQueueManagerInstance()

		// Get job details
		const job = await queueManager.getJob(jobId)

		if (!job) {
			console.log(`❌ Job ${jobId} not found`)
			return
		}

		console.log(`📋 Job ${jobId} Status:`, {
			status: job.status,
			attempts: job.attempts,
			maxAttempts: job.maxAttempts,
			createdAt: job.createdAt,
			updatedAt: job.updatedAt,
			errorMessage: job.errorMessage,
		})

		// If job failed, retry it
		if (job.status === "failed") {
			const retried = await queueManager.retryJob(jobId)
			console.log(`🔄 Job retry ${retried ? "scheduled" : "failed"}`)
		}

		return job
	} catch (error) {
		console.error("Error monitoring job:", error)
		throw error
	}
}

/**
 * Example: Clean up old jobs
 */
export async function cleanupOldJobsExample() {
	try {
		const queueManager = getQueueManagerInstance()

		// Clean up completed and cancelled jobs older than configured days
		const cleanedUp = await queueManager.cleanup()

		console.log(`🧹 Cleaned up ${cleanedUp} old jobs`)
		return cleanedUp
	} catch (error) {
		console.error("Error cleaning up jobs:", error)
		throw error
	}
}

/**
 * Example: Custom job handler
 */
export async function customJobHandlerExample() {
	try {
		const queueManager = getQueueManagerInstance()

		// Define custom handler
		const customHandler = {
			async process(job: any) {
				console.log(`🔧 Processing custom job: ${job.id}`)
				console.log(`📦 Payload:`, job.payload)

				// Simulate processing
				await new Promise((resolve) => setTimeout(resolve, 1000))

				console.log(`✅ Custom job ${job.id} completed`)
			},

			async onFailure(job: any, error: Error) {
				console.error(`❌ Custom job ${job.id} failed:`, error.message)
			},

			async onComplete(job: any) {
				console.log(`🎉 Custom job ${job.id} completed successfully`)
			},
		}

		// Register custom handler
		queueManager.registerHandler("custom", customHandler)

		// Add custom job
		const jobId = await queueManager.addJob("custom", {
			message: "Hello from custom handler!",
			data: { timestamp: new Date().toISOString() },
		})

		console.log(`🔧 Custom job queued with ID: ${jobId}`)
		return jobId
	} catch (error) {
		console.error("Error with custom job handler:", error)
		throw error
	}
}

/**
 * Example: Server Actions integration
 */
export async function serverActionExample(formData: FormData) {
	try {
		const queueManager = getQueueManagerInstance()

		// Extract form data
		const email = formData.get("email") as string
		const name = formData.get("name") as string

		// Add welcome email job
		const jobId = await queueManager.addJob("email", {
			to: email,
			subject: `Welcome, ${name}!`,
			html: `<h1>Welcome, ${name}!</h1><p>Thank you for signing up.</p>`,
		})

		console.log(`📧 Welcome email queued for ${email}: ${jobId}`)

		return { success: true, jobId }
	} catch (error) {
		console.error("Error in server action:", error)
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
	}
}
