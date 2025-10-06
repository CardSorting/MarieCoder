import { NextRequest, NextResponse } from "next/server"
import { withRoleManagement } from "@/lib/middleware"
import { permissionService, roleService } from "@/lib/services/ServiceFactory"

// GET /api/admin/roles - List all roles
export async function GET(request: NextRequest) {
	return withRoleManagement(request, async (req: NextRequest, userId: string) => {
		try {
			const roles = await roleService().getAllRoles()
			const permissions = await permissionService().getAllPermissions()

			return NextResponse.json({
				roles,
				permissions,
			})
		} catch (error) {
			console.error("Error fetching roles:", error)
			return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch roles" }, { status: 500 })
		}
	})
}

// POST /api/admin/roles - Create new role
export async function POST(request: NextRequest) {
	return withRoleManagement(request, async (req: NextRequest, userId: string) => {
		try {
			const body = await req.json()
			const validatedData = roleService().validateCreateRole(body)

			const newRole = await roleService().createRole(validatedData, userId)

			return NextResponse.json(
				{
					role: newRole,
					message: "Role created successfully",
				},
				{ status: 201 },
			)
		} catch (error) {
			if (error instanceof Error && error.message.includes("Invalid input data")) {
				return NextResponse.json({ error: error.message }, { status: 400 })
			}

			console.error("Error creating role:", error)
			return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create role" }, { status: 500 })
		}
	})
}

// PUT /api/admin/roles - Update role
export async function PUT(request: NextRequest) {
	return withRoleManagement(request, async (req: NextRequest, userId: string) => {
		try {
			const { searchParams } = new URL(req.url)
			const roleId = searchParams.get("roleId")

			if (!roleId) {
				return NextResponse.json({ error: "Role ID is required" }, { status: 400 })
			}

			const body = await req.json()
			const validatedData = roleService().validateUpdateRole(body)

			const updatedRole = await roleService().updateRole(roleId, validatedData, userId)

			return NextResponse.json({
				role: updatedRole,
				message: "Role updated successfully",
			})
		} catch (error) {
			if (error instanceof Error && error.message.includes("Invalid input data")) {
				return NextResponse.json({ error: error.message }, { status: 400 })
			}

			console.error("Error updating role:", error)
			return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update role" }, { status: 500 })
		}
	})
}

// DELETE /api/admin/roles - Delete role
export async function DELETE(request: NextRequest) {
	return withRoleManagement(request, async (req: NextRequest, userId: string) => {
		try {
			const { searchParams } = new URL(req.url)
			const roleId = searchParams.get("roleId")

			if (!roleId) {
				return NextResponse.json({ error: "Role ID is required" }, { status: 400 })
			}

			await roleService().deleteRole(roleId, userId)

			return NextResponse.json({
				message: "Role deleted successfully",
			})
		} catch (error) {
			console.error("Error deleting role:", error)
			return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete role" }, { status: 500 })
		}
	})
}
