import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

/**
 * GET /api/plans - Get plans
 * POST /api/plans - Create plan (admin only)
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { searchParams } = new URL(request.url)
		const activeOnly = searchParams.get("active") === "true"

		const subscriptionService = ServiceFactory.getService("subscription", require("@/lib/db").db)

		let plans: any
		if (activeOnly) {
			plans = await subscriptionService.getActivePlans()
		} else {
			// Only admins can see inactive plans
			if (!["admin", "super_admin"].includes(session.user.role)) {
				plans = await subscriptionService.getActivePlans()
			} else {
				plans = await subscriptionService.getPlans()
			}
		}

		return NextResponse.json(plans)
	} catch (error) {
		console.error("Error fetching plans:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session || !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const body = await request.json()
		const { name, description, price, currency, interval, features, limits, isActive, sortOrder } = body

		if (!name || price === undefined || !interval) {
			return NextResponse.json({ error: "Name, price, and interval are required" }, { status: 400 })
		}

		const subscriptionService = ServiceFactory.getService("subscription", require("@/lib/db").db)
		const plan = await subscriptionService.createPlan({
			name,
			description,
			price,
			currency: currency || "USD",
			interval,
			features: features || [],
			limits: limits || {},
			isActive: isActive !== undefined ? isActive : true,
			sortOrder: sortOrder || 0,
		})

		return NextResponse.json(plan, { status: 201 })
	} catch (error) {
		console.error("Error creating plan:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
