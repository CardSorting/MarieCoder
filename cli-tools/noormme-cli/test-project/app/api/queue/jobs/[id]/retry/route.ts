/**
 * Queue Job Retry API
 * POST /api/queue/jobs/[id]/retry - Retry failed job
 */

import { NextRequest, NextResponse } from "next/server"
import { getQueueManagerInstance } from "@/lib/queue/init"

interface RouteParams {
	params: {
		id: string
	}
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = params

		if (!id) {
			return NextResponse.json(
				{
					success: false,
					error: "Job ID is required",
				},
				{ status: 400 },
			)
		}

		const queueManager = getQueueManagerInstance()
		const retried = await queueManager.retryJob(id)

		if (!retried) {
			return NextResponse.json(
				{
					success: false,
					error: "Job not found or cannot be retried",
				},
				{ status: 404 },
			)
		}

		return NextResponse.json({
			success: true,
			data: {
				jobId: id,
				status: "pending",
				message: "Job scheduled for retry",
			},
		})
	} catch (error) {
		console.error("Error retrying job:", error)
		return NextResponse.json(
			{
				success: false,
				error: "Failed to retry job",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		)
	}
}
