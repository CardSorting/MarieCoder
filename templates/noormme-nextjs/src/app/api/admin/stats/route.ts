import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

/**
 * GET /api/admin/stats - Get system statistics (admin only)
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session || !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { searchParams } = new URL(request.url)
		const type = searchParams.get("type") || "all"

		const adminService = ServiceFactory.getService("admin", require("@/lib/db").db)
		const userService = ServiceFactory.getService("user", require("@/lib/db").db)
		const subscriptionService = ServiceFactory.getService("subscription", require("@/lib/db").db)
		const paymentService = ServiceFactory.getService("payment", require("@/lib/db").db)
		const notificationService = ServiceFactory.getService("notification", require("@/lib/db").db)

		let stats: any = {}

		switch (type) {
			case "system":
				stats = await adminService.getSystemStats()
				break
			case "users":
				stats = await userService.getUserStats()
				break
			case "subscriptions":
				stats = await subscriptionService.getSubscriptionStats()
				break
			case "payments":
				stats = await paymentService.getPaymentStats()
				break
			case "notifications":
				stats = await notificationService.getNotificationStats()
				break
			case "all":
			default:
				stats = {
					system: await adminService.getSystemStats(),
					users: await userService.getUserStats(),
					subscriptions: await subscriptionService.getSubscriptionStats(),
					payments: await paymentService.getPaymentStats(),
					notifications: await notificationService.getNotificationStats(),
				}
				break
		}

		return NextResponse.json(stats)
	} catch (error) {
		console.error("Error fetching admin stats:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
