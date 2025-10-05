import { NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/services/PaymentService"

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()

		// Verify PayPal webhook signature
		const signature = request.headers.get("paypal-transmission-id")
		const certId = request.headers.get("paypal-cert-id")
		const authAlgo = request.headers.get("paypal-auth-algo")
		const transmissionSig = request.headers.get("paypal-transmission-sig")
		const transmissionTime = request.headers.get("paypal-transmission-time")

		if (!signature || !certId || !authAlgo || !transmissionSig || !transmissionTime) {
			return NextResponse.json({ error: "Missing PayPal webhook headers" }, { status: 400 })
		}

		const paymentService = await PaymentService.getInstance()

		// Handle different PayPal webhook events
		switch (body.event_type) {
			case "PAYMENT.SALE.COMPLETED":
				await paymentService.handlePayPalWebhook("PAYMENT.SALE.COMPLETED", body)
				break

			case "PAYMENT.SALE.DENIED":
				await paymentService.handlePayPalWebhook("PAYMENT.SALE.DENIED", body)
				break

			case "PAYMENT.SALE.PENDING":
				await paymentService.handlePayPalWebhook("PAYMENT.SALE.PENDING", body)
				break

			case "PAYMENT.SALE.REFUNDED":
				await paymentService.handlePayPalWebhook("PAYMENT.SALE.REFUNDED", body)
				break

			case "BILLING.SUBSCRIPTION.CREATED":
				await paymentService.handlePayPalWebhook("BILLING.SUBSCRIPTION.CREATED", body)
				break

			case "BILLING.SUBSCRIPTION.ACTIVATED":
				await paymentService.handlePayPalWebhook("BILLING.SUBSCRIPTION.ACTIVATED", body)
				break

			case "BILLING.SUBSCRIPTION.CANCELLED":
				await paymentService.handlePayPalWebhook("BILLING.SUBSCRIPTION.CANCELLED", body)
				break

			default:
				console.log(`Unhandled PayPal event type: ${body.event_type}`)
		}

		return NextResponse.json({ received: true })
	} catch (error) {
		console.error("PayPal webhook error:", error)
		return NextResponse.json({ error: "PayPal webhook processing failed" }, { status: 500 })
	}
}
