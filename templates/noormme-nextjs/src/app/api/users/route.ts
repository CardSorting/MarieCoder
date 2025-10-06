import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

/**
 * GET /api/users - Get users (admin only)
 * POST /api/users - Create user (admin only)
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session || !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { searchParams } = new URL(request.url)
		const page = parseInt(searchParams.get("page") || "1")
		const limit = parseInt(searchParams.get("limit") || "20")
		const search = searchParams.get("search") || ""
		const role = searchParams.get("role") || ""
		const status = searchParams.get("status") || ""

		const userService = ServiceFactory.getService("user", require("@/lib/db").db)

		let result: any
		if (search) {
			result = await userService.searchUsers(search, page, limit)
		} else {
			const filters: any = {}
			if (role) {
				filters.role = role
			}
			if (status) {
				filters.status = status
			}

			const users = await userService.findBy(filters)
			result = { users, total: users.length, pages: 1 }
		}

		return NextResponse.json(result)
	} catch (error) {
		console.error("Error fetching users:", error)
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
		const { email, name, role = "customer", status = "active" } = body

		if (!email || !name) {
			return NextResponse.json({ error: "Email and name are required" }, { status: 400 })
		}

		const userService = ServiceFactory.getService("user", require("@/lib/db").db)
		const user = await userService.createUser({ email, name, role, status })

		return NextResponse.json(user, { status: 201 })
	} catch (error) {
		console.error("Error creating user:", error)
		if (error instanceof Error && error.message.includes("already exists")) {
			return NextResponse.json({ error: error.message }, { status: 409 })
		}
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
