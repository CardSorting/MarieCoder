/**
 * Queue Jobs API
 * GET /api/queue/jobs - Get jobs by status
 * POST /api/queue/jobs - Add new job
 */

import { NextRequest, NextResponse } from "next/server"
import { getQueueManagerInstance } from "@/lib/queue/init"
import { JobStatus } from "@/lib/queue/types"

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const status = searchParams.get("status") as JobStatus
		const limit = searchParams.get("limit")

		if (!status) {
			return NextResponse.json(
				{
					success: false,
					error: "Status parameter is required",
				},
				{ status: 400 },
			)
		}

		const validStatuses: JobStatus[] = ["pending", "processing", "completed", "failed", "cancelled"]
		if (!validStatuses.includes(status)) {
			return NextResponse.json(
				{
					success: false,
					error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
				},
				{ status: 400 },
			)
		}

		const queueManager = getQueueManagerInstance()
		const jobs = await queueManager.getJobsByStatus(status, limit ? parseInt(limit) : undefined)

		return NextResponse.json({
			success: true,
			data: {
				jobs,
				count: jobs.length,
				status,
				limit: limit ? parseInt(limit) : undefined,
			},
		})
	} catch (error) {
		console.error("Error getting jobs:", error)
		return NextResponse.json(
			{
				success: false,
				error: "Failed to get jobs",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		)
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const { type, payload, options = {} } = body

		if (!type) {
			return NextResponse.json(
				{
					success: false,
					error: "Job type is required",
				},
				{ status: 400 },
			)
		}

		if (!payload) {
			return NextResponse.json(
				{
					success: false,
					error: "Job payload is required",
				},
				{ status: 400 },
			)
		}

		const queueManager = getQueueManagerInstance()
		const jobId = await queueManager.addJob(type, payload, options)

		return NextResponse.json({
			success: true,
			data: {
				jobId,
				type,
				status: "pending",
			},
		})
	} catch (error) {
		console.error("Error adding job:", error)
		return NextResponse.json(
			{
				success: false,
				error: "Failed to add job",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		)
	}
}
