import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

/**
 * GET /api/notifications - Get user notifications
 * POST /api/notifications - Create notification (admin only)
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { searchParams } = new URL(request.url)
		const page = parseInt(searchParams.get("page") || "1")
		const limit = parseInt(searchParams.get("limit") || "20")
		const unreadOnly = searchParams.get("unread") === "true"

		const notificationService = ServiceFactory.getService("notification", require("@/lib/db").db)
		const result = await notificationService.getUserNotifications(session.user.id, page, limit, unreadOnly)

		return NextResponse.json(result)
	} catch (error) {
		console.error("Error fetching notifications:", error)
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
		const { userId, type, title, message, data } = body

		if (!userId || !type || !title || !message) {
			return NextResponse.json({ error: "User ID, type, title, and message are required" }, { status: 400 })
		}

		const notificationService = ServiceFactory.getService("notification", require("@/lib/db").db)
		const notification = await notificationService.createNotification({
			userId,
			type,
			title,
			message,
			data,
		})

		return NextResponse.json(notification, { status: 201 })
	} catch (error) {
		console.error("Error creating notification:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
