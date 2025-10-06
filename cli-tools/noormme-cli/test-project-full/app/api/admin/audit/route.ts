import { NextRequest, NextResponse } from "next/server"
import { withAdminAccess } from "@/lib/middleware"
import { auditService } from "@/lib/services/ServiceFactory"

// GET /api/admin/audit - Search audit logs
export async function GET(request: NextRequest) {
	return withAdminAccess(request, async (req, userId) => {
		try {
			const { searchParams } = new URL(req.url)
			const searchData = {
				userId: searchParams.get("userId") || undefined,
				action: searchParams.get("action") || undefined,
				resourceType: searchParams.get("resourceType") || undefined,
				resourceId: searchParams.get("resourceId") || undefined,
				startDate: searchParams.get("startDate") || undefined,
				endDate: searchParams.get("endDate") || undefined,
				page: parseInt(searchParams.get("page") || "1"),
				limit: parseInt(searchParams.get("limit") || "20"),
			}

			const result = await auditService().searchLogs(searchData)

			return NextResponse.json(result)
		} catch (error) {
			console.error("Error searching audit logs:", error)
			return NextResponse.json(
				{ error: error instanceof Error ? error.message : "Failed to search audit logs" },
				{ status: 500 },
			)
		}
	})
}

// GET /api/admin/audit/stats - Get audit statistics
export async function GET_STATS(request: NextRequest) {
	return withAdminAccess(request, async (req, userId) => {
		try {
			const stats = await auditService().getAuditStats()

			return NextResponse.json(stats)
		} catch (error) {
			console.error("Error fetching audit stats:", error)
			return NextResponse.json(
				{ error: error instanceof Error ? error.message : "Failed to fetch audit statistics" },
				{ status: 500 },
			)
		}
	})
}
