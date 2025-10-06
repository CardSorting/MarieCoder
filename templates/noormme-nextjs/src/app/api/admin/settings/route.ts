import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

/**
 * GET /api/admin/settings - Get system settings
 * POST /api/admin/settings - Create system setting (admin only)
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { searchParams } = new URL(request.url)
		const publicOnly = searchParams.get("public") === "true"

		const adminService = ServiceFactory.getService("admin", require("@/lib/db").db)

		let settings: any
		if (publicOnly) {
			settings = await adminService.getPublicSettings()
		} else {
			// Only admins can see private settings
			if (!["admin", "super_admin"].includes(session.user.role)) {
				settings = await adminService.getPublicSettings()
			} else {
				settings = await adminService.getSystemSettings()
			}
		}

		return NextResponse.json(settings)
	} catch (error) {
		console.error("Error fetching settings:", error)
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
		const { key, value, type, description, isPublic } = body

		if (!key || value === undefined) {
			return NextResponse.json({ error: "Key and value are required" }, { status: 400 })
		}

		const adminService = ServiceFactory.getService("admin", require("@/lib/db").db)
		const setting = await adminService.createSetting(
			{
				key,
				value,
				type: type || "string",
				description,
				isPublic: isPublic !== undefined ? isPublic : false,
			},
			session.user.id,
		)

		return NextResponse.json(setting, { status: 201 })
	} catch (error) {
		console.error("Error creating setting:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
