/**
 * Next.js Middleware for RBAC and authentication
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "./auth"
import { Permissions, rbac } from "./rbac"

/**
 * Middleware to check if user has required permission
 */
export async function withPermission(
	request: NextRequest,
	permission: { resource: string; action: string },
	handler: (request: NextRequest, userId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
	try {
		const session = await auth()

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const hasPermission = await rbac.hasPermission(session.user.id, permission.resource, permission.action)

		if (!hasPermission) {
			return NextResponse.json({ error: "Forbidden - Insufficient permissions" }, { status: 403 })
		}

		return handler(request, session.user.id)
	} catch (error) {
		console.error("Permission check error:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

/**
 * Middleware to check if user has any of the required permissions
 */
export async function withAnyPermission(
	request: NextRequest,
	permissions: Array<{ resource: string; action: string }>,
	handler: (request: NextRequest, userId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
	try {
		const session = await auth()

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const hasPermission = await rbac.hasAnyPermission(session.user.id, permissions)

		if (!hasPermission) {
			return NextResponse.json({ error: "Forbidden - Insufficient permissions" }, { status: 403 })
		}

		return handler(request, session.user.id)
	} catch (error) {
		console.error("Permission check error:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

/**
 * Middleware to check if user is admin
 */
export async function withAdminAccess(
	request: NextRequest,
	handler: (request: NextRequest, userId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
	return withPermission(request, Permissions.ADMIN_ACCESS, handler)
}

/**
 * Middleware to check if user can manage users
 */
export async function withUserManagement(
	request: NextRequest,
	handler: (request: NextRequest, userId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
	return withAnyPermission(
		request,
		[Permissions.USERS_CREATE, Permissions.USERS_READ, Permissions.USERS_UPDATE, Permissions.USERS_DELETE],
		handler,
	)
}

/**
 * Middleware to check if user can manage roles
 */
export async function withRoleManagement(
	request: NextRequest,
	handler: (request: NextRequest, userId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
	return withAnyPermission(
		request,
		[Permissions.ROLES_CREATE, Permissions.ROLES_READ, Permissions.ROLES_UPDATE, Permissions.ROLES_DELETE],
		handler,
	)
}

/**
 * Middleware to check if user can manage payments
 */
export async function withPaymentManagement(
	request: NextRequest,
	handler: (request: NextRequest, userId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
	return withAnyPermission(
		request,
		[Permissions.PAYMENTS_CREATE, Permissions.PAYMENTS_READ, Permissions.PAYMENTS_UPDATE, Permissions.PAYMENTS_DELETE],
		handler,
	)
}

/**
 * Helper function to get user session
 */
export async function getSessionUser(request: NextRequest) {
	try {
		const session = await auth()
		return session?.user || null
	} catch (error) {
		console.error("Session error:", error)
		return null
	}
}

/**
 * Helper function to check if user is authenticated
 */
export async function requireAuth(request: NextRequest): Promise<string> {
	const session = await auth()

	if (!session?.user?.id) {
		throw new Error("Unauthorized")
	}

	return session.user.id
}
