/**
 * Queue Cleanup API
 * POST /api/queue/cleanup - Clean up old completed jobs
 */

import { NextRequest, NextResponse } from "next/server"
import { getQueueManagerInstance } from "@/lib/queue/init"

export async function POST(_request: NextRequest) {
	try {
		const queueManager = getQueueManagerInstance()
		const cleanedUp = await queueManager.cleanup()

		return NextResponse.json({
			success: true,
			data: {
				cleanedUp,
				message: `Cleaned up ${cleanedUp} old jobs`,
			},
		})
	} catch (error) {
		console.error("Error cleaning up queue:", error)
		return NextResponse.json(
			{
				success: false,
				error: "Failed to cleanup queue",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		)
	}
}
