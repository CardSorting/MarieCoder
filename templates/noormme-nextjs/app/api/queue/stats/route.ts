/**
 * Queue Statistics API
 * GET /api/queue/stats - Get queue statistics
 */

import { NextRequest, NextResponse } from "next/server"
import { getQueueManagerInstance } from "@/lib/queue/init"

export async function GET(_request: NextRequest) {
	try {
		const queueManager = getQueueManagerInstance()

		// Get persistent queue stats
		const persistentStats = await queueManager.getStats()

		// Get in-memory queue stats
		const inMemoryStats = queueManager.getAllInMemoryStats()

		// Get manager status
		const managerStatus = queueManager.getStatus()

		return NextResponse.json({
			success: true,
			data: {
				persistent: persistentStats,
				inMemory: Object.fromEntries(inMemoryStats),
				manager: managerStatus,
				timestamp: new Date().toISOString(),
			},
		})
	} catch (error) {
		console.error("Error getting queue stats:", error)
		return NextResponse.json(
			{
				success: false,
				error: "Failed to get queue statistics",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		)
	}
}
