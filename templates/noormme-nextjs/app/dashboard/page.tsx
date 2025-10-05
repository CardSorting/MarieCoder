import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function DashboardPage() {
	const session = await auth()

	if (!session?.user?.id) {
		redirect("/auth/signin")
	}

	// Get user data
	const userRepo = db.getRepository("users")
	const user = await userRepo.findById(session.user.id)

	// Get user's payments
	const paymentRepo = db.getRepository("payments")
	const payments = await paymentRepo.findAll()

	const userPayments = payments.filter((payment) => payment.user_id === session.user.id)

	return (
		<div className="px-4 py-6 sm:px-0">
			<div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
					<div className="bg-white p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold mb-2">Total Payments</h3>
						<p className="text-3xl font-bold text-blue-600">{userPayments.length}</p>
					</div>

					<div className="bg-white p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold mb-2">Total Amount</h3>
						<p className="text-3xl font-bold text-green-600">
							${userPayments.reduce((sum, payment) => sum + payment.amount / 100, 0).toFixed(2)}
						</p>
					</div>

					<div className="bg-white p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold mb-2">Completed Payments</h3>
						<p className="text-3xl font-bold text-green-600">
							{userPayments.filter((p) => p.status === "completed").length}
						</p>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow">
					<div className="px-6 py-4 border-b border-gray-200">
						<h3 className="text-lg font-semibold">Recent Payments</h3>
					</div>
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
								{userPayments.slice(0, 10).map((payment) => (
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
				</div>
			</div>
		</div>
	)
}
