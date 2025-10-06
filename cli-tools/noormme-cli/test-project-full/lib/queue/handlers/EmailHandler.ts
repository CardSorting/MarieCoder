/**
 * Email Handler for Queue System
 * Handles sending transactional emails
 */

import { Job, JobHandler } from "../types"

export interface EmailPayload {
	to: string | string[]
	subject: string
	html?: string
	text?: string
	from?: string
	replyTo?: string
	cc?: string[]
	bcc?: string[]
	attachments?: Array<{
		filename: string
		content: Buffer | string
		contentType?: string
	}>
}

export interface EmailConfig {
	provider: "smtp" | "sendgrid" | "mailgun" | "ses"
	apiKey?: string
	from: string
	replyTo?: string
	baseUrl?: string
}

export class EmailHandler implements JobHandler<EmailPayload> {
	private config: EmailConfig

	constructor(config: EmailConfig) {
		this.config = config
	}

	/**
	 * Process email job
	 * @param job Email job
	 */
	async process(job: Job<EmailPayload>): Promise<void> {
		const { payload } = job

		// Validate email payload
		this.validateEmailPayload(payload)

		// Send email based on provider
		await this.sendEmail(payload)

		console.log(`📧 Email sent successfully to ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}`)
	}

	/**
	 * Handle email failure
	 * @param job Failed email job
	 * @param error Error that occurred
	 */
	async onFailure(job: Job<EmailPayload>, error: Error): Promise<void> {
		console.error(`📧 Email failed for job ${job.id}:`, error.message)

		// Log email failure for monitoring
		// In a real implementation, you might want to:
		// - Store failed emails for retry
		// - Send alerts to administrators
		// - Update user preferences if emails consistently fail
	}

	/**
	 * Handle email completion
	 * @param job Completed email job
	 */
	async onComplete(_job: Job<EmailPayload>): Promise<void> {
		// Log successful email delivery
		// In a real implementation, you might want to:
		// - Update email delivery statistics
		// - Track email engagement metrics
		// - Clean up temporary attachments
	}

	/**
	 * Send email using configured provider
	 * @param payload Email payload
	 */
	private async sendEmail(payload: EmailPayload): Promise<void> {
		switch (this.config.provider) {
			case "smtp":
				await this.sendViaSMTP(payload)
				break
			case "sendgrid":
				await this.sendViaSendGrid(payload)
				break
			case "mailgun":
				await this.sendViaMailgun(payload)
				break
			case "ses":
				await this.sendViaSES(payload)
				break
			default:
				throw new Error(`Unsupported email provider: ${this.config.provider}`)
		}
	}

	/**
	 * Send email via SMTP (using nodemailer)
	 * @param payload Email payload
	 */
	private async sendViaSMTP(payload: EmailPayload): Promise<void> {
		// This would use nodemailer in a real implementation
		// For now, we'll simulate the email sending
		console.log(`📧 [SMTP] Sending email to ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}`)
		console.log(`📧 [SMTP] Subject: ${payload.subject}`)

		// Simulate network delay
		await new Promise((resolve) => setTimeout(resolve, 100))
	}

	/**
	 * Send email via SendGrid
	 * @param payload Email payload
	 */
	private async sendViaSendGrid(payload: EmailPayload): Promise<void> {
		if (!this.config.apiKey) {
			throw new Error("SendGrid API key is required")
		}

		// This would use SendGrid SDK in a real implementation
		console.log(`📧 [SendGrid] Sending email to ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}`)
		console.log(`📧 [SendGrid] Subject: ${payload.subject}`)

		// Simulate API call delay
		await new Promise((resolve) => setTimeout(resolve, 200))
	}

	/**
	 * Send email via Mailgun
	 * @param payload Email payload
	 */
	private async sendViaMailgun(payload: EmailPayload): Promise<void> {
		if (!this.config.apiKey) {
			throw new Error("Mailgun API key is required")
		}

		// This would use Mailgun SDK in a real implementation
		console.log(`📧 [Mailgun] Sending email to ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}`)
		console.log(`📧 [Mailgun] Subject: ${payload.subject}`)

		// Simulate API call delay
		await new Promise((resolve) => setTimeout(resolve, 150))
	}

	/**
	 * Send email via AWS SES
	 * @param payload Email payload
	 */
	private async sendViaSES(payload: EmailPayload): Promise<void> {
		if (!this.config.apiKey) {
			throw new Error("AWS SES API key is required")
		}

		// This would use AWS SDK in a real implementation
		console.log(`📧 [SES] Sending email to ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}`)
		console.log(`📧 [SES] Subject: ${payload.subject}`)

		// Simulate API call delay
		await new Promise((resolve) => setTimeout(resolve, 180))
	}

	/**
	 * Validate email payload
	 * @param payload Email payload
	 */
	private validateEmailPayload(payload: EmailPayload): void {
		if (!payload.to) {
			throw new Error("Email recipient is required")
		}

		if (!payload.subject) {
			throw new Error("Email subject is required")
		}

		if (!payload.html && !payload.text) {
			throw new Error("Email content (html or text) is required")
		}

		// Validate email addresses
		const recipients = Array.isArray(payload.to) ? payload.to : [payload.to]
		for (const recipient of recipients) {
			if (!this.isValidEmail(recipient)) {
				throw new Error(`Invalid email address: ${recipient}`)
			}
		}
	}

	/**
	 * Simple email validation
	 * @param email Email address
	 * @returns True if valid email
	 */
	private isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		return emailRegex.test(email)
	}
}

/**
 * Newsletter Handler
 * Specialized handler for bulk email campaigns
 */
export class NewsletterHandler extends EmailHandler {
	private batchSize: number = 50
	private delayBetweenBatches: number = 1000

	constructor(config: EmailConfig, batchSize: number = 50, delayBetweenBatches: number = 1000) {
		super(config)
		this.batchSize = batchSize
		this.delayBetweenBatches = delayBetweenBatches
	}

	/**
	 * Process newsletter job with rate limiting
	 * @param job Newsletter job
	 */
	async process(job: Job<EmailPayload>): Promise<void> {
		const { payload } = job
		const recipients = Array.isArray(payload.to) ? payload.to : [payload.to]

		console.log(`📧 [Newsletter] Processing ${recipients.length} recipients in batches of ${this.batchSize}`)

		// Process recipients in batches
		for (let i = 0; i < recipients.length; i += this.batchSize) {
			const batch = recipients.slice(i, i + this.batchSize)

			// Send batch
			await this.sendEmailBatch({
				...payload,
				to: batch,
			})

			// Delay between batches to respect rate limits
			if (i + this.batchSize < recipients.length) {
				await new Promise((resolve) => setTimeout(resolve, this.delayBetweenBatches))
			}
		}

		console.log(`📧 [Newsletter] Completed sending to ${recipients.length} recipients`)
	}

	/**
	 * Send email batch
	 * @param payload Email payload for batch
	 */
	private async sendEmailBatch(payload: EmailPayload): Promise<void> {
		// Send all emails in the batch concurrently
		const promises = (Array.isArray(payload.to) ? payload.to : [payload.to]).map((recipient) =>
			this.sendEmail({ ...payload, to: recipient }),
		)

		await Promise.all(promises)
	}
}
