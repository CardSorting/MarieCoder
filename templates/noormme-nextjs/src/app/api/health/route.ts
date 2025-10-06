import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
	try {
		// Check database connection
		await db.execute("SELECT 1")

		return NextResponse.json({
			status: "healthy",
			timestamp: new Date().toISOString(),
			database: "connected",
		})
	} catch (error) {
		return NextResponse.json(
			{
				status: "unhealthy",
				timestamp: new Date().toISOString(),
				database: "disconnected",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		)
	}
}
