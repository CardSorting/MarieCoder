/**
 * Database Health Monitoring API
 * Following NORMIE DEV methodology - clean, efficient, informative endpoints
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDatabaseStats, getEnhancedHealthStatus, getPerformanceReport } from "@/lib/db"

export async function GET(request: Request) {
	try {
		// Check authentication and admin role
		const session = await auth()
		if (!session || !["admin", "super_admin"].includes(session.user?.role || "")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const url = new URL(request.url)
		const includePerformance = url.searchParams.get("performance") === "true"
		const includeStats = url.searchParams.get("stats") === "true"

		// Get health status
		const healthStatus = await getEnhancedHealthStatus()

		const response: any = {
			status: healthStatus.status,
			metrics: healthStatus.metrics,
			alerts: healthStatus.alerts,
			recommendations: healthStatus.recommendations,
			timestamp: new Date().toISOString(),
		}

		// Include performance report if requested
		if (includePerformance) {
			response.performance = await getPerformanceReport()
		}

		// Include detailed stats if requested
		if (includeStats) {
			response.stats = await getDatabaseStats()
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error("Database health check failed:", error)
		return NextResponse.json({ error: "Failed to retrieve database health status" }, { status: 500 })
	}
}
