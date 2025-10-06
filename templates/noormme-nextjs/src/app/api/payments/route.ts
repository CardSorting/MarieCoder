import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

/**
 * GET /api/payments - Get payments
 * POST /api/payments - Create payment
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { searchParams } = new URL(request.url)
		const userId = searchParams.get("userId")
		const subscriptionId = searchParams.get("subscriptionId")
		const status = searchParams.get("status")
		const page = parseInt(searchParams.get("page") || "1")
		const limit = parseInt(searchParams.get("limit") || "20")

		const paymentService = ServiceFactory.getService("payment", require("@/lib/db").db)

		// If userId is provided, get payments for that user
		if (userId) {
			// Users can only view their own payments unless they're admin
			if (session.user.id !== userId && !["admin", "super_admin"].includes(session.user.role)) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 })
			}

			const result = await paymentService.getUserPayments(userId, page, limit)
			return NextResponse.json(result)
		}

		// If subscriptionId is provided, get payments for that subscription
		if (subscriptionId) {
			const payments = await paymentService.getSubscriptionPayments(subscriptionId)
			return NextResponse.json(payments)
		}

		// Admin can view all payments with filters
		if (!["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		const filters: any = {}
		if (status) {
			filters.status = status
		}

		const payments = await paymentService.findBy(filters)
		return NextResponse.json(payments)
	} catch (error) {
		console.error("Error fetching payments:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const body = await request.json()
		const { userId, subscriptionId, amount, currency, provider, providerId, description, metadata } = body

		if (!userId || !amount || !provider) {
			return NextResponse.json({ error: "User ID, amount, and provider are required" }, { status: 400 })
		}

		// Users can only create payments for themselves unless they're admin
		if (session.user.id !== userId && !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		const paymentService = ServiceFactory.getService("payment", require("@/lib/db").db)
		const payment = await paymentService.createPayment({
			userId,
			subscriptionId,
			amount,
			currency,
			provider,
			providerId,
			description,
			metadata,
		})

		return NextResponse.json(payment, { status: 201 })
	} catch (error) {
		console.error("Error creating payment:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
