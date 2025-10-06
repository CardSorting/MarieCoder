import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

/**
 * GET /api/admin/audit-logs - Get audit logs (admin only)
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session || !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { searchParams } = new URL(request.url)
		const page = parseInt(searchParams.get("page") || "1")
		const limit = parseInt(searchParams.get("limit") || "50")
		const userId = searchParams.get("userId")
		const adminId = searchParams.get("adminId")
		const action = searchParams.get("action")
		const resourceType = searchParams.get("resourceType")
		const startDate = searchParams.get("startDate")
		const endDate = searchParams.get("endDate")

		const adminService = ServiceFactory.getService("admin", require("@/lib/db").db)

		const filters: any = {}
		if (userId) {
			filters.userId = userId
		}
		if (adminId) {
			filters.adminId = adminId
		}
		if (action) {
			filters.action = action
		}
		if (resourceType) {
			filters.resourceType = resourceType
		}
		if (startDate) {
			filters.startDate = new Date(startDate)
		}
		if (endDate) {
			filters.endDate = new Date(endDate)
		}
		filters.page = page
		filters.limit = limit

		const result = await adminService.getAuditLogs(filters)

		return NextResponse.json(result)
	} catch (error) {
		console.error("Error fetching audit logs:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
