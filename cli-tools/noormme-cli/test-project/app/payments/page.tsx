"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

interface Payment {
	id: string
	amount: number
	currency: string
	status: string
	provider: string
	created_at: string
}

export default function PaymentsPage() {
	const { data: session, status } = useSession()
	const router = useRouter()
	const [payments, setPayments] = useState<Payment[]>([])
	const [loading, setLoading] = useState(true)
	const [creating, setCreating] = useState(false)

	useEffect(() => {
		if (status === "unauthenticated") {
			router.push("/auth/signin")
			return
		}

		if (session) {
			fetchPayments()
		}
	}, [session, status, router])

	const fetchPayments = async () => {
		try {
			const response = await fetch("/api/payments")
			if (response.ok) {
				const data = await response.json()
				setPayments(data)
			}
		} catch (error) {
			console.error("Failed to fetch payments:", error)
		} finally {
			setLoading(false)
		}
	}

	const createPayment = async () => {
		setCreating(true)
		try {
			const response = await fetch("/api/payments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					amount: 1000, // $10.00
					currency: "usd",
					description: "Test payment",
					provider: "stripe",
				}),
			})

			if (response.ok) {
				const newPayment = await response.json()
				setPayments((prev) => [newPayment, ...prev])
			} else {
				console.error("Failed to create payment")
			}
		} catch (error) {
			console.error("Failed to create payment:", error)
		} finally {
			setCreating(false)
		}
	}

	if (loading) {
		return (
			<div className="px-4 py-6 sm:px-0">
				<div className="text-center">
					<div className="text-lg">Loading payments...</div>
				</div>
			</div>
		)
	}

	return (
		<div className="px-4 py-6 sm:px-0">
			<div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
					<button
						className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
						disabled={creating}
						onClick={createPayment}>
						{creating ? "Creating..." : "Create Test Payment"}
					</button>
				</div>

				<div className="bg-white rounded-lg shadow overflow-hidden">
					<div className="px-6 py-4 border-b border-gray-200">
						<h3 className="text-lg font-semibold">Payment History</h3>
					</div>

					{payments.length === 0 ? (
						<div className="px-6 py-8 text-center text-gray-500">
							No payments found. Create a test payment to get started.
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											ID
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Amount
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Status
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Provider
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Date
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{payments.map((payment) => (
										<tr key={payment.id}>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{payment.id.slice(0, 8)}...
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span
													className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
														payment.status === "completed"
															? "bg-green-100 text-green-800"
															: payment.status === "pending"
																? "bg-yellow-100 text-yellow-800"
																: payment.status === "failed"
																	? "bg-red-100 text-red-800"
																	: "bg-gray-100 text-gray-800"
													}`}>
													{payment.status}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
												{payment.provider}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{new Date(payment.created_at).toLocaleDateString()}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>

				<div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="bg-white p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold mb-4">Payment Providers</h3>
						<div className="space-y-3">
							<div className="flex items-center">
								<div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
								<span className="text-sm">Stripe - Credit cards, digital wallets</span>
							</div>
							<div className="flex items-center">
								<div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
								<span className="text-sm">PayPal - PayPal accounts, credit cards</span>
							</div>
						</div>
					</div>

					<div className="bg-white p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold mb-4">Features</h3>
						<ul className="text-sm space-y-2">
							<li className="flex items-center">
								<span className="text-green-500 mr-2">✓</span>
								Payment intents and confirmations
							</li>
							<li className="flex items-center">
								<span className="text-green-500 mr-2">✓</span>
								Subscription management
							</li>
							<li className="flex items-center">
								<span className="text-green-500 mr-2">✓</span>
								Webhook handling
							</li>
							<li className="flex items-center">
								<span className="text-green-500 mr-2">✓</span>
								Refund processing
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	)
}
