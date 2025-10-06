import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

/**
 * GET /api/users/[id] - Get user by ID
 * PUT /api/users/[id] - Update user
 * DELETE /api/users/[id] - Delete user (admin only)
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const userService = ServiceFactory.getService("user", require("@/lib/db").db)
		const user = await userService.findById(params.id)

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 })
		}

		// Users can only view their own profile unless they're admin
		if (session.user.id !== params.id && !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		return NextResponse.json(user)
	} catch (error) {
		console.error("Error fetching user:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const session = await auth()
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const body = await request.json()
		const userService = ServiceFactory.getService("user", require("@/lib/db").db)

		// Users can only update their own profile unless they're admin
		if (session.user.id !== params.id && !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		// Admins can update any field, users can only update profile fields
		if (["admin", "super_admin"].includes(session.user.role)) {
			const { name, avatar, timezone, preferences, status, role } = body

			if (status !== undefined) {
				await userService.updateStatus(params.id, status, session.user.id)
			}
			if (role !== undefined) {
				await userService.updateRole(params.id, role, session.user.id)
			}
			if (name || avatar || timezone || preferences) {
				await userService.updateProfile(params.id, { name, avatar, timezone, preferences })
			}
		} else {
			// Regular users can only update profile fields
			const { name, avatar, timezone, preferences } = body
			await userService.updateProfile(params.id, { name, avatar, timezone, preferences })
		}

		const updatedUser = await userService.findById(params.id)
		return NextResponse.json(updatedUser)
	} catch (error) {
		console.error("Error updating user:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const session = await auth()
		if (!session || !["admin", "super_admin"].includes(session.user.role)) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const userService = ServiceFactory.getService("user", require("@/lib/db").db)
		await userService.deleteUser(params.id, session.user.id)

		return NextResponse.json({ message: "User deleted successfully" })
	} catch (error) {
		console.error("Error deleting user:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
