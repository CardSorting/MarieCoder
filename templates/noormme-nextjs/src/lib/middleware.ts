import { NextResponse } from "next/server"
import { auth } from "./auth"

/**
 * Unified middleware following NORMIE DEV methodology
 * Handles authentication and authorization
 */

export default auth((req) => {
	const { pathname } = req.nextUrl
	const isAuthenticated = !!req.auth

	// Public routes that don't require authentication
	const publicRoutes = ["/auth/signin", "/auth/signup", "/api/health"]
	const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

	// Admin routes that require admin role
	const isAdminRoute = pathname.startsWith("/admin")
	const isApiAdminRoute = pathname.startsWith("/api/admin")

	// Redirect unauthenticated users to sign in
	if (!isAuthenticated && !isPublicRoute) {
		return NextResponse.redirect(new URL("/auth/signin", req.url))
	}

	// Check admin access
	if (isAuthenticated && (isAdminRoute || isApiAdminRoute)) {
		const userRole = req.auth?.user?.role || "user"

		if (userRole !== "admin") {
			return NextResponse.redirect(new URL("/dashboard", req.url))
		}
	}

	return NextResponse.next()
})

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
}
