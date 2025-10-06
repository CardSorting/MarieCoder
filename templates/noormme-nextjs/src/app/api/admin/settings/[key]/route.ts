import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

/**
 * GET /api/admin/settings/[key] - Get system setting by key
 * PUT /api/admin/settings/[key] - Update system setting (admin only)
 * DELETE /api/admin/settings/[key] - Delete system setting (admin only)
 */
export async function GET(_request: NextRequest, { params }: { params: { key: string } }) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const adminService = ServiceFactory.getService("admin", require("@/lib/db").db)
		const setting = await adminService.getSetting(params.key)

		if (!setting) {
			return NextResponse.json({ error: "Setting not found" }, { status: 404 })
		}

		// Only admins can see private settings
		if (!setting.isPublic && !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		return NextResponse.json(setting)
	} catch (error) {
		console.error("Error fetching setting:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function PUT(request: NextRequest, { params }: { params: { key: string } }) {
	try {
		const session = await auth()
		if (!session || !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const body = await request.json()
		const { value } = body

		if (value === undefined) {
			return NextResponse.json({ error: "Value is required" }, { status: 400 })
		}

		const adminService = ServiceFactory.getService("admin", require("@/lib/db").db)
		const setting = await adminService.updateSetting(params.key, value, session.user.id)

		return NextResponse.json(setting)
	} catch (error) {
		console.error("Error updating setting:", error)
		if (error instanceof Error && error.message.includes("not found")) {
			return NextResponse.json({ error: "Setting not found" }, { status: 404 })
		}
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function DELETE(_request: NextRequest, { params }: { params: { key: string } }) {
	try {
		const session = await auth()
		if (!session || !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const adminService = ServiceFactory.getService("admin", require("@/lib/db").db)
		await adminService.deleteSetting(params.key, session.user.id)

		return NextResponse.json({ message: "Setting deleted successfully" })
	} catch (error) {
		console.error("Error deleting setting:", error)
		if (error instanceof Error && error.message.includes("not found")) {
			return NextResponse.json({ error: "Setting not found" }, { status: 404 })
		}
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
