/**
 * Database Optimization API
 * Following NORMIE DEV methodology - clean, efficient, safe optimization
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getHealthMonitor, getPerformanceAnalyzer } from "@/lib/db"

export async function POST(request: Request) {
	try {
		// Check authentication and admin role
		const session = await auth()
		if (!session || !["admin", "super_admin"].includes(session.user?.role || "")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const body = await request.json()
		const { type = "full" } = body

		const healthMonitor = getHealthMonitor()
		const performanceAnalyzer = getPerformanceAnalyzer()

		const result: any = {
			success: true,
			timestamp: new Date().toISOString(),
			optimizations: [],
		}

		switch (type) {
			case "full":
				// Run full database optimization
				await healthMonitor.optimize()
				result.optimizations.push("Database optimization completed")
				break

			case "analyze":
				// Generate performance analysis
				const analysis = await performanceAnalyzer.generatePerformanceReport()
				result.analysis = analysis
				result.optimizations.push("Performance analysis completed")
				break

			case "recommendations":
				// Get optimization recommendations
				const recommendations = await healthMonitor.getOptimizationRecommendations()
				result.recommendations = recommendations
				result.optimizations.push("Optimization recommendations generated")
				break

			default:
				return NextResponse.json({ error: "Invalid optimization type" }, { status: 400 })
		}

		// Get updated health status
		const healthStatus = await healthMonitor.getHealthStatus()
		result.healthStatus = healthStatus

		return NextResponse.json(result)
	} catch (error) {
		console.error("Database optimization failed:", error)
		return NextResponse.json({ error: "Database optimization failed" }, { status: 500 })
	}
}
