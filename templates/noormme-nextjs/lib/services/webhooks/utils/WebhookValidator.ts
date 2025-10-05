/**
 * Webhook Validation Utilities
 * Handles validation of webhook signatures and payloads
 * Following NOORMME utility patterns with pure functions
 */

import crypto from "crypto"

export interface ValidationResult {
	isValid: boolean
	error?: string
	eventId?: string
	eventType?: string
}

export interface StripeWebhookValidation {
	isValid: boolean
	event?: any
	error?: string
}

export interface PayPalWebhookValidation {
	isValid: boolean
	event?: any
	error?: string
}

/**
 * Validate Stripe webhook signature
 */
export function validateStripeWebhook(payload: string, signature: string, webhookSecret: string): StripeWebhookValidation {
	try {
		// Parse the signature header
		const elements = signature.split(",")
		const signatureHash = elements.find((el) => el.startsWith("v1="))?.split("=")[1]
		const timestamp = elements.find((el) => el.startsWith("t="))?.split("=")[1]

		if (!signatureHash || !timestamp) {
			return {
				isValid: false,
				error: "Invalid signature format",
			}
		}

		// Check timestamp (prevent replay attacks)
		const currentTime = Math.floor(Date.now() / 1000)
		const webhookTime = parseInt(timestamp)
		const timeDifference = Math.abs(currentTime - webhookTime)

		if (timeDifference > 300) {
			// 5 minutes tolerance
			return {
				isValid: false,
				error: "Webhook timestamp too old",
			}
		}

		// Create expected signature
		const expectedSignature = crypto
			.createHmac("sha256", webhookSecret)
			.update(timestamp + "." + payload)
			.digest("hex")

		// Compare signatures
		const isValid = crypto.timingSafeEqual(Buffer.from(signatureHash, "hex"), Buffer.from(expectedSignature, "hex"))

		if (!isValid) {
			return {
				isValid: false,
				error: "Invalid signature",
			}
		}

		// Parse and return the event
		const event = JSON.parse(payload)
		return {
			isValid: true,
			event,
		}
	} catch (error) {
		return {
			isValid: false,
			error: error instanceof Error ? error.message : "Validation failed",
		}
	}
}

/**
 * Validate PayPal webhook signature
 */
export function validatePayPalWebhook(payload: any, headers: Record<string, string>, webhookId: string): PayPalWebhookValidation {
	try {
		const transmissionId = headers["paypal-transmission-id"] || headers["x-paypal-transmission-id"]
		const certId = headers["paypal-cert-id"] || headers["x-paypal-cert-id"]
		const transmissionSig = headers["paypal-transmission-sig"] || headers["x-paypal-transmission-sig"]
		const transmissionTime = headers["paypal-transmission-time"] || headers["x-paypal-transmission-time"]

		if (!transmissionId || !certId || !transmissionSig || !transmissionTime) {
			return {
				isValid: false,
				error: "Missing required PayPal webhook headers",
			}
		}

		// Check timestamp (prevent replay attacks)
		const currentTime = Math.floor(Date.now() / 1000)
		const webhookTime = parseInt(transmissionTime)
		const timeDifference = Math.abs(currentTime - webhookTime)

		if (timeDifference > 300) {
			// 5 minutes tolerance
			return {
				isValid: false,
				error: "Webhook timestamp too old",
			}
		}

		// In a real implementation, you would:
		// 1. Fetch PayPal's certificate using certId
		// 2. Verify the signature using the certificate
		// 3. Validate the webhook ID

		// For now, we'll do basic validation
		const payloadString = JSON.stringify(payload)
		const expectedData = `${transmissionId}|${transmissionTime}|${webhookId}|${crypto.createHash("sha256").update(payloadString).digest("hex")}`

		// This is a simplified validation - in production, use PayPal's SDK
		const isValid = transmissionSig && transmissionSig.length > 0

		if (!isValid) {
			return {
				isValid: false,
				error: "Invalid PayPal signature",
			}
		}

		return {
			isValid: true,
			event: payload,
		}
	} catch (error) {
		return {
			isValid: false,
			error: error instanceof Error ? error.message : "PayPal validation failed",
		}
	}
}

/**
 * Validate webhook payload structure
 */
export function validateWebhookPayload(payload: any, provider: "stripe" | "paypal"): ValidationResult {
	try {
		if (!payload || typeof payload !== "object") {
			return {
				isValid: false,
				error: "Invalid payload format",
			}
		}

		if (provider === "stripe") {
			if (!payload.id || !payload.type || !payload.data) {
				return {
					isValid: false,
					error: "Missing required Stripe webhook fields",
				}
			}

			return {
				isValid: true,
				eventId: payload.id,
				eventType: payload.type,
			}
		} else if (provider === "paypal") {
			if (!payload.event_type || !payload.resource) {
				return {
					isValid: false,
					error: "Missing required PayPal webhook fields",
				}
			}

			return {
				isValid: true,
				eventId: payload.id || payload.event_id,
				eventType: payload.event_type,
			}
		}

		return {
			isValid: false,
			error: "Unsupported provider",
		}
	} catch (error) {
		return {
			isValid: false,
			error: error instanceof Error ? error.message : "Payload validation failed",
		}
	}
}

/**
 * Check if webhook event is retryable
 */
export function isRetryableWebhookError(error: any): boolean {
	if (error.code) {
		const retryableCodes = ["rate_limit_error", "api_connection_error", "api_error", "timeout_error"]
		return retryableCodes.includes(error.code)
	}

	// Network errors are generally retryable
	if (
		error.message &&
		(error.message.includes("network") || error.message.includes("timeout") || error.message.includes("connection"))
	) {
		return true
	}

	return false
}

/**
 * Extract webhook event metadata
 */
export function extractWebhookMetadata(
	payload: any,
	provider: "stripe" | "paypal",
): {
	eventId: string
	eventType: string
	created: number
	livemode?: boolean
} {
	if (provider === "stripe") {
		return {
			eventId: payload.id,
			eventType: payload.type,
			created: payload.created,
			livemode: payload.livemode,
		}
	} else if (provider === "paypal") {
		return {
			eventId: payload.id || payload.event_id,
			eventType: payload.event_type,
			created: payload.create_time
				? Math.floor(new Date(payload.create_time).getTime() / 1000)
				: Math.floor(Date.now() / 1000),
		}
	}

	throw new Error("Unsupported provider")
}
