import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

/**
 * PUT /api/notifications/[id] - Mark notification as read
 * DELETE /api/notifications/[id] - Delete notification
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const body = await request.json()
		const { action } = body

		const notificationService = ServiceFactory.getService("notification", require("@/lib/db").db)

		if (action === "mark_read") {
			const notification = await notificationService.markAsRead(params.id, session.user.id)
			return NextResponse.json(notification)
		}

		return NextResponse.json({ error: "Invalid action" }, { status: 400 })
	} catch (error) {
		console.error("Error updating notification:", error)
		if (error instanceof Error && error.message.includes("Unauthorized")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

		const notificationService = ServiceFactory.getService("notification", require("@/lib/db").db)
		await notificationService.deleteNotification(params.id, session.user.id)

		return NextResponse.json({ message: "Notification deleted successfully" })
	} catch (error) {
		console.error("Error deleting notification:", error)
		if (error instanceof Error && error.message.includes("Unauthorized")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
