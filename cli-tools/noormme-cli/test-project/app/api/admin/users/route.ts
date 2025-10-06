import { NextRequest, NextResponse } from "next/server"
import { withUserManagement } from "@/lib/middleware"
import { userService } from "@/lib/services/ServiceFactory"

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
	return withUserManagement(request, async (req: NextRequest, userId: string) => {
		try {
			// Get query parameters
			const { searchParams } = new URL(req.url)
			const searchData = {
				page: parseInt(searchParams.get("page") || "1"),
				limit: parseInt(searchParams.get("limit") || "10"),
				search: searchParams.get("search") || undefined,
				status: (searchParams.get("status") as "active" | "inactive" | "suspended") || undefined,
			}

			const result = await userService().getUsers(searchData)

			return NextResponse.json(result)
		} catch (error) {
			console.error("Error fetching users:", error)
			return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch users" }, { status: 500 })
		}
	})
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
	return withUserManagement(request, async (req: NextRequest, userId: string) => {
		try {
			const body = await req.json()
			const validatedData = userService().validateCreateUser(body)

			const newUser = await userService().createUser(validatedData, userId)

			return NextResponse.json(
				{
					user: newUser,
					message: "User created successfully",
				},
				{ status: 201 },
			)
		} catch (error) {
			if (error instanceof Error && error.message.includes("Invalid input data")) {
				return NextResponse.json({ error: error.message }, { status: 400 })
			}

			console.error("Error creating user:", error)
			return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create user" }, { status: 500 })
		}
	})
}

// PUT /api/admin/users - Update user
export async function PUT(request: NextRequest) {
	return withUserManagement(request, async (req: NextRequest, userId: string) => {
		try {
			const { searchParams } = new URL(req.url)
			const targetUserId = searchParams.get("userId")

			if (!targetUserId) {
				return NextResponse.json({ error: "User ID is required" }, { status: 400 })
			}

			const body = await req.json()
			const validatedData = userService().validateUpdateUser(body)

			const updatedUser = await userService().updateUser(targetUserId, validatedData, userId)

			return NextResponse.json({
				user: updatedUser,
				message: "User updated successfully",
			})
		} catch (error) {
			if (error instanceof Error && error.message.includes("Invalid input data")) {
				return NextResponse.json({ error: error.message }, { status: 400 })
			}

			console.error("Error updating user:", error)
			return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update user" }, { status: 500 })
		}
	})
}

// DELETE /api/admin/users - Delete user
export async function DELETE(request: NextRequest) {
	return withUserManagement(request, async (req: NextRequest, userId: string) => {
		try {
			const { searchParams } = new URL(req.url)
			const targetUserId = searchParams.get("userId")

			if (!targetUserId) {
				return NextResponse.json({ error: "User ID is required" }, { status: 400 })
			}

			await userService().deleteUser(targetUserId, userId)

			return NextResponse.json({
				message: "User deleted successfully",
			})
		} catch (error) {
			console.error("Error deleting user:", error)
			return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete user" }, { status: 500 })
		}
	})
}
