import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

/**
 * GET /api/subscriptions/[id] - Get subscription by ID
 * PUT /api/subscriptions/[id] - Update subscription
 * DELETE /api/subscriptions/[id] - Cancel subscription
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const subscriptionService = ServiceFactory.getService("subscription", require("@/lib/db").db)
		const subscription = await subscriptionService.findById(params.id)

		if (!subscription) {
			return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
		}

		// Users can only view their own subscriptions unless they're admin
		if (session.user.id !== subscription.userId && !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		// Get subscription with plan details
		const subscriptionWithPlan = await subscriptionService.getCurrentSubscription(subscription.userId)
		return NextResponse.json(subscriptionWithPlan)
	} catch (error) {
		console.error("Error fetching subscription:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const body = await request.json()
		const { action, planId, cancelAtPeriodEnd } = body

		const subscriptionService = ServiceFactory.getService("subscription", require("@/lib/db").db)
		const subscription = await subscriptionService.findById(params.id)

		if (!subscription) {
			return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
		}

		// Users can only modify their own subscriptions unless they're admin
		if (session.user.id !== subscription.userId && !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		let updatedSubscription: any

		switch (action) {
			case "cancel":
				updatedSubscription = await subscriptionService.cancelSubscription(params.id, cancelAtPeriodEnd)
				break
			case "reactivate":
				updatedSubscription = await subscriptionService.reactivateSubscription(params.id)
				break
			case "change_plan":
				if (!planId) {
					return NextResponse.json({ error: "Plan ID is required for plan change" }, { status: 400 })
				}
				updatedSubscription = await subscriptionService.changePlan(params.id, planId)
				break
			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 })
		}

		return NextResponse.json(updatedSubscription)
	} catch (error) {
		console.error("Error updating subscription:", error)
		if (error instanceof Error) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const subscriptionService = ServiceFactory.getService("subscription", require("@/lib/db").db)
		const subscription = await subscriptionService.findById(params.id)

		if (!subscription) {
			return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
		}

		// Users can only cancel their own subscriptions unless they're admin
		if (session.user.id !== subscription.userId && !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		// Cancel subscription immediately
		const canceledSubscription = await subscriptionService.cancelSubscription(params.id, false)

		return NextResponse.json(canceledSubscription)
	} catch (error) {
		console.error("Error canceling subscription:", error)
		if (error instanceof Error) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
