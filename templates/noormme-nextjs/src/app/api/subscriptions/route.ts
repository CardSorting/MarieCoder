import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

/**
 * GET /api/subscriptions - Get subscriptions
 * POST /api/subscriptions - Create subscription
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { searchParams } = new URL(request.url)
		const userId = searchParams.get("userId")
		const status = searchParams.get("status")

		const subscriptionService = ServiceFactory.getService("subscription", require("@/lib/db").db)

		// If userId is provided, get subscriptions for that user
		if (userId) {
			// Users can only view their own subscriptions unless they're admin
			if (session.user.id !== userId && !["admin", "super_admin"].includes(session.user.role)) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 })
			}

			const filters: any = { userId }
			if (status) {
				filters.status = status
			}

			const subscriptions = await subscriptionService.findBy(filters)
			return NextResponse.json(subscriptions)
		}

		// Admin can view all subscriptions
		if (!["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		const filters: any = {}
		if (status) {
			filters.status = status
		}

		const subscriptions = await subscriptionService.findBy(filters)
		return NextResponse.json(subscriptions)
	} catch (error) {
		console.error("Error fetching subscriptions:", error)
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
		const { userId, planId, trialStart, trialEnd } = body

		if (!userId || !planId) {
			return NextResponse.json({ error: "User ID and Plan ID are required" }, { status: 400 })
		}

		// Users can only create subscriptions for themselves unless they're admin
		if (session.user.id !== userId && !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		const subscriptionService = ServiceFactory.getService("subscription", require("@/lib/db").db)
		const subscription = await subscriptionService.createSubscription({
			userId,
			planId,
			trialStart: trialStart ? new Date(trialStart) : undefined,
			trialEnd: trialEnd ? new Date(trialEnd) : undefined,
		})

		return NextResponse.json(subscription, { status: 201 })
	} catch (error) {
		console.error("Error creating subscription:", error)
		if (error instanceof Error) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
