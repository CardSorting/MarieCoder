import { NextRequest, NextResponse } from "next/server"
import { withAdminAccess } from "@/lib/middleware"
import { auditService, permissionService, roleService, userService } from "@/lib/services/ServiceFactory"

// GET /api/admin/stats - Get comprehensive admin statistics
export async function GET(request: NextRequest) {
	return withAdminAccess(request, async (req, userId) => {
		try {
			const [userStats, roleStats, permissionStats, auditStats] = await Promise.all([
				userService().getUserStats(),
				roleService().getRoleStats(),
				permissionService().getPermissionStats(),
				auditService().getAuditStats(),
			])

			return NextResponse.json({
				users: userStats,
				roles: roleStats,
				permissions: permissionStats,
				audit: auditStats,
			})
		} catch (error) {
			console.error("Error fetching admin stats:", error)
			return NextResponse.json(
				{ error: error instanceof Error ? error.message : "Failed to fetch admin statistics" },
				{ status: 500 },
			)
		}
	})
}
