import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { PaymentService } from "@/lib/services/PaymentService"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2023-10-16",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
	try {
		const body = await request.text()
		const signature = request.headers.get("stripe-signature")!

		let event: Stripe.Event

		try {
			event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
		} catch (err) {
			console.error("Webhook signature verification failed:", err)
			return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
		}

		const paymentService = await PaymentService.getInstance()

		switch (event.type) {
			case "payment_intent.succeeded":
				const paymentIntent = event.data.object as Stripe.PaymentIntent
				await paymentService.handleStripeWebhook("payment_intent.succeeded", paymentIntent)
				break

			case "payment_intent.payment_failed":
				const failedPayment = event.data.object as Stripe.PaymentIntent
				await paymentService.handleStripeWebhook("payment_intent.payment_failed", failedPayment)
				break

			case "customer.subscription.created":
				const subscription = event.data.object as Stripe.Subscription
				await paymentService.handleStripeWebhook("customer.subscription.created", subscription)
				break

			case "customer.subscription.updated":
				const updatedSubscription = event.data.object as Stripe.Subscription
				await paymentService.handleStripeWebhook("customer.subscription.updated", updatedSubscription)
				break

			case "customer.subscription.deleted":
				const deletedSubscription = event.data.object as Stripe.Subscription
				await paymentService.handleStripeWebhook("customer.subscription.deleted", deletedSubscription)
				break

			default:
				console.log(`Unhandled event type: ${event.type}`)
		}

		return NextResponse.json({ received: true })
	} catch (error) {
		console.error("Webhook error:", error)
		return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
	}
}
