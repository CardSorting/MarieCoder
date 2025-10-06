import { Job, JobHandler } from "./index"

/**
 * Job handlers following NORMIE DEV methodology
 * Simple, focused handlers for common tasks
 */

export class EmailHandler implements JobHandler {
	async handle(job: Job): Promise<void> {
		const { to, subject } = job.data

		// Simulate email sending
		console.log(`📧 Sending email to ${to}: ${subject}`)

		// In a real implementation, this would integrate with an email service
		// like SendGrid, AWS SES, or similar
		await new Promise((resolve) => setTimeout(resolve, 1000))

		console.log(`✅ Email sent successfully to ${to}`)
	}
}

export class ImageHandler implements JobHandler {
	async handle(job: Job): Promise<void> {
		const { imageUrl, operations } = job.data

		console.log(`🖼️  Processing image: ${imageUrl}`)
		console.log(`📝 Operations: ${JSON.stringify(operations)}`)

		// Simulate image processing
		await new Promise((resolve) => setTimeout(resolve, 2000))

		console.log(`✅ Image processed successfully`)
	}
}

export class WebhookHandler implements JobHandler {
	async handle(job: Job): Promise<void> {
		const { url, payload, headers } = job.data

		console.log(`🔗 Sending webhook to: ${url}`)

		try {
			// Simulate webhook delivery
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...headers,
				},
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				throw new Error(`Webhook failed with status: ${response.status}`)
			}

			console.log(`✅ Webhook delivered successfully to ${url}`)
		} catch (error) {
			console.error(`❌ Webhook failed: ${error}`)
			throw error
		}
	}
}
