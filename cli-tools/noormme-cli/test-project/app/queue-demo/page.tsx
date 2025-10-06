/**
 * Queue System Demo Page
 * Demonstrates the NOORMME queue system capabilities
 */

"use client"

import { useState } from "react"
import { getQueueStatsExample, processImagesExample, sendEmailExample, sendWebhookExample } from "@/lib/queue/examples"

export default function QueueDemoPage() {
	const [loading, setLoading] = useState(false)
	const [results, setResults] = useState<any[]>([])

	const addResult = (result: any) => {
		setResults((prev) => [...prev, { ...result, timestamp: new Date().toISOString() }])
	}

	const handleEmailDemo = async () => {
		setLoading(true)
		try {
			const jobId = await sendEmailExample()
			addResult({ type: "email", success: true, jobId, message: "Email job queued successfully" })
		} catch (error) {
			addResult({ type: "email", success: false, error: error instanceof Error ? error.message : "Unknown error" })
		} finally {
			setLoading(false)
		}
	}

	const handleWebhookDemo = async () => {
		setLoading(true)
		try {
			const jobId = await sendWebhookExample()
			addResult({ type: "webhook", success: true, jobId, message: "Webhook job queued successfully" })
		} catch (error) {
			addResult({ type: "webhook", success: false, error: error instanceof Error ? error.message : "Unknown error" })
		} finally {
			setLoading(false)
		}
	}

	const handleImageDemo = async () => {
		setLoading(true)
		try {
			await processImagesExample()
			addResult({ type: "image", success: true, message: "Image processing jobs queued successfully" })
		} catch (error) {
			addResult({ type: "image", success: false, error: error instanceof Error ? error.message : "Unknown error" })
		} finally {
			setLoading(false)
		}
	}

	const handleStatsDemo = async () => {
		setLoading(true)
		try {
			const stats = await getQueueStatsExample()
			addResult({ type: "stats", success: true, data: stats, message: "Queue statistics retrieved" })
		} catch (error) {
			addResult({ type: "stats", success: false, error: error instanceof Error ? error.message : "Unknown error" })
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-3xl font-bold mb-8">NOORMME Queue System Demo</h1>

				<div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
					<h2 className="text-xl font-semibold mb-4">🚀 Two-Tier Queue Architecture</h2>
					<div className="grid md:grid-cols-2 gap-6">
						<div>
							<h3 className="font-semibold text-green-600 mb-2">Tier 1: In-Memory Queue (Fast Lane)</h3>
							<ul className="text-sm space-y-1">
								<li>• Rate-limiting API calls</li>
								<li>• Processing multiple images</li>
								<li>• Batch database operations</li>
								<li>• Very fast, no database overhead</li>
							</ul>
						</div>
						<div>
							<h3 className="font-semibold text-blue-600 mb-2">Tier 2: Persistent Queue (Background Worker)</h3>
							<ul className="text-sm space-y-1">
								<li>• Sending bulk emails</li>
								<li>• Generating reports</li>
								<li>• Processing webhooks</li>
								<li>• Survives server restarts</li>
							</ul>
						</div>
					</div>
				</div>

				<div className="grid md:grid-cols-2 gap-6 mb-8">
					<div className="bg-white border border-gray-200 rounded-lg p-6">
						<h2 className="text-xl font-semibold mb-4">📧 Email Demo</h2>
						<p className="text-gray-600 mb-4">Send a welcome email using the persistent queue system.</p>
						<button
							className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
							disabled={loading}
							onClick={handleEmailDemo}>
							{loading ? "Sending..." : "Send Welcome Email"}
						</button>
					</div>

					<div className="bg-white border border-gray-200 rounded-lg p-6">
						<h2 className="text-xl font-semibold mb-4">🔗 Webhook Demo</h2>
						<p className="text-gray-600 mb-4">Send a webhook with retry logic and exponential backoff.</p>
						<button
							className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
							disabled={loading}
							onClick={handleWebhookDemo}>
							{loading ? "Sending..." : "Send Webhook"}
						</button>
					</div>

					<div className="bg-white border border-gray-200 rounded-lg p-6">
						<h2 className="text-xl font-semibold mb-4">🖼️ Image Processing Demo</h2>
						<p className="text-gray-600 mb-4">
							Process multiple images using the in-memory queue with concurrency control.
						</p>
						<button
							className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
							disabled={loading}
							onClick={handleImageDemo}>
							{loading ? "Processing..." : "Process Images"}
						</button>
					</div>

					<div className="bg-white border border-gray-200 rounded-lg p-6">
						<h2 className="text-xl font-semibold mb-4">📊 Queue Statistics</h2>
						<p className="text-gray-600 mb-4">Get real-time statistics about queue performance and job status.</p>
						<button
							className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
							disabled={loading}
							onClick={handleStatsDemo}>
							{loading ? "Loading..." : "Get Statistics"}
						</button>
					</div>
				</div>

				{results.length > 0 && (
					<div className="bg-white border border-gray-200 rounded-lg p-6">
						<h2 className="text-xl font-semibold mb-4">📋 Demo Results</h2>
						<div className="space-y-4">
							{results.map((result, index) => (
								<div
									className={`border rounded-lg p-4 ${
										result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
									}`}
									key={`${result.type}-${result.timestamp}-${index}`}>
									<div className="flex items-center justify-between mb-2">
										<span className="font-semibold capitalize">{result.type} Demo</span>
										<span className="text-sm text-gray-500">{result.timestamp}</span>
									</div>
									{result.success ? (
										<div>
											<p className="text-green-700">{result.message}</p>
											{result.jobId && <p className="text-sm text-gray-600 mt-1">Job ID: {result.jobId}</p>}
											{result.data && (
												<pre className="text-xs bg-white p-2 rounded mt-2 overflow-auto">
													{JSON.stringify(result.data, null, 2)}
												</pre>
											)}
										</div>
									) : (
										<p className="text-red-700">Error: {result.error}</p>
									)}
								</div>
							))}
						</div>
					</div>
				)}

				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
					<h2 className="text-xl font-semibold mb-4">🔧 API Endpoints</h2>
					<p className="text-gray-700 mb-4">Monitor and control your queues using these API endpoints:</p>
					<div className="grid md:grid-cols-2 gap-4 text-sm">
						<div>
							<h3 className="font-semibold mb-2">Monitoring</h3>
							<ul className="space-y-1">
								<li>
									<code className="bg-gray-100 px-2 py-1 rounded">GET /api/queue/stats</code> - Queue statistics
								</li>
								<li>
									<code className="bg-gray-100 px-2 py-1 rounded">GET /api/queue/jobs?status=pending</code> -
									Get jobs by status
								</li>
								<li>
									<code className="bg-gray-100 px-2 py-1 rounded">GET /api/queue/jobs/[id]</code> - Get specific
									job
								</li>
							</ul>
						</div>
						<div>
							<h3 className="font-semibold mb-2">Control</h3>
							<ul className="space-y-1">
								<li>
									<code className="bg-gray-100 px-2 py-1 rounded">POST /api/queue/jobs</code> - Add new job
								</li>
								<li>
									<code className="bg-gray-100 px-2 py-1 rounded">DELETE /api/queue/jobs/[id]</code> - Cancel
									job
								</li>
								<li>
									<code className="bg-gray-100 px-2 py-1 rounded">POST /api/queue/jobs/[id]/retry</code> - Retry
									job
								</li>
								<li>
									<code className="bg-gray-100 px-2 py-1 rounded">POST /api/queue/cleanup</code> - Clean up old
									jobs
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
