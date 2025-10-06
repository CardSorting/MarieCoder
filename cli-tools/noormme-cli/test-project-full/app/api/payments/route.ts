import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { PaymentService } from "@/lib/services/PaymentService"

export async function POST(request: NextRequest) {
	try {
		const session = await auth()

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const body = await request.json()
		const paymentService = await PaymentService.getInstance()

		const paymentIntent = await paymentService.createPaymentIntent({
			amount: body.amount,
			currency: body.currency || "usd",
			customerId: session.user.id,
			description: body.description,
			metadata: {
				userId: session.user.id,
				provider: body.provider || "stripe",
			},
		})

		return NextResponse.json(paymentIntent)
	} catch (error) {
		console.error("Payment creation error:", error)
		return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 })
	}
}

export async function GET(request: NextRequest) {
	try {
		const session = await auth()

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const paymentService = await PaymentService.getInstance()
		const payments = await paymentService.getUserPayments(session.user.id)

		return NextResponse.json(payments)
	} catch (error) {
		console.error("Payment retrieval error:", error)
		return NextResponse.json({ error: "Failed to retrieve payments" }, { status: 500 })
	}
}
