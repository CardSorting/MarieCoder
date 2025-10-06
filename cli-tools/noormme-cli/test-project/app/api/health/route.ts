import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
	try {
		// Test database connection
		await db.connect()

		return NextResponse.json({
			status: "healthy",
			timestamp: new Date().toISOString(),
			services: {
				database: "connected",
				api: "running",
			},
		})
	} catch (error) {
		return NextResponse.json(
			{
				status: "unhealthy",
				timestamp: new Date().toISOString(),
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		)
	}
}
