/**
 * Queue Job API
 * GET /api/queue/jobs/[id] - Get specific job
 * DELETE /api/queue/jobs/[id] - Cancel job
 * POST /api/queue/jobs/[id]/retry - Retry failed job
 */

import { NextRequest, NextResponse } from "next/server"
import { getQueueManagerInstance } from "@/lib/queue/init"

interface RouteParams {
	params: {
		id: string
	}
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
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
		const job = await queueManager.getJob(id)

		if (!job) {
			return NextResponse.json(
				{
					success: false,
					error: "Job not found",
				},
				{ status: 404 },
			)
		}

		return NextResponse.json({
			success: true,
			data: job,
		})
	} catch (error) {
		console.error("Error getting job:", error)
		return NextResponse.json(
			{
				success: false,
				error: "Failed to get job",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		)
	}
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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
		const cancelled = await queueManager.cancelJob(id)

		if (!cancelled) {
			return NextResponse.json(
				{
					success: false,
					error: "Job not found or cannot be cancelled",
				},
				{ status: 404 },
			)
		}

		return NextResponse.json({
			success: true,
			data: {
				jobId: id,
				status: "cancelled",
			},
		})
	} catch (error) {
		console.error("Error cancelling job:", error)
		return NextResponse.json(
			{
				success: false,
				error: "Failed to cancel job",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		)
	}
}
