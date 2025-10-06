import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function AdminDashboard() {
	const session = await auth()

	if (!session?.user?.id) {
		return <div>Unauthorized</div>
	}

	// Get statistics
	const kysely = db.getKysely()

	const [totalUsers, activeUsers, totalRoles, totalPayments, recentUsers, recentPayments] = await Promise.all([
		// Total users
		kysely
			.selectFrom("users")
			.select(kysely.fn.count("id").as("count"))
			.executeTakeFirst(),

		// Active users
		kysely
			.selectFrom("users")
			.where("status", "=", "active")
			.select(kysely.fn.count("id").as("count"))
			.executeTakeFirst(),

		// Total roles
		kysely
			.selectFrom("roles")
			.select(kysely.fn.count("id").as("count"))
			.executeTakeFirst(),

		// Total payments
		kysely
			.selectFrom("payments")
			.select(kysely.fn.count("id").as("count"))
			.executeTakeFirst(),

		// Recent users
		kysely
			.selectFrom("users")
			.select(["id", "name", "email", "status", "created_at"])
			.orderBy("created_at", "desc")
			.limit(5)
			.execute(),

		// Recent payments
		kysely
			.selectFrom("payments")
			.innerJoin("users", "payments.user_id", "users.id")
			.select(["payments.id", "payments.amount", "payments.status", "payments.created_at", "users.name as user_name"])
			.orderBy("payments.created_at", "desc")
			.limit(5)
			.execute(),
	])

	const stats = [
		{
			name: "Total Users",
			value: totalUsers?.count || 0,
			icon: "👥",
			change: "+12%",
			changeType: "positive",
		},
		{
			name: "Active Users",
			value: activeUsers?.count || 0,
			icon: "✅",
			change: "+8%",
			changeType: "positive",
		},
		{
			name: "Total Roles",
			value: totalRoles?.count || 0,
			icon: "🔐",
			change: "0%",
			changeType: "neutral",
		},
		{
			name: "Total Payments",
			value: totalPayments?.count || 0,
			icon: "💳",
			change: "+24%",
			changeType: "positive",
		},
	]

	return (
		<div className="px-4 py-6 sm:px-0">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
				<p className="mt-2 text-gray-600">Welcome back, {session.user.name}. Here's an overview of your system.</p>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				{stats.map((stat) => (
					<div className="bg-white p-6 rounded-lg shadow" key={stat.name}>
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<span className="text-2xl">{stat.icon}</span>
							</div>
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-500">{stat.name}</p>
								<p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
								<p
									className={`text-sm ${
										stat.changeType === "positive"
											? "text-green-600"
											: stat.changeType === "negative"
												? "text-red-600"
												: "text-gray-600"
									}`}>
									{stat.change}
								</p>
							</div>
						</div>
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Recent Users */}
				<div className="bg-white rounded-lg shadow">
					<div className="px-6 py-4 border-b border-gray-200">
						<h3 className="text-lg font-semibold">Recent Users</h3>
					</div>
					<div className="p-6">
						<div className="space-y-4">
							{recentUsers.map((user: any) => (
								<div className="flex items-center justify-between" key={user.id}>
									<div className="flex items-center">
										<div className="flex-shrink-0">
											<div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
												<span className="text-sm font-medium text-gray-700">
													{user.name.charAt(0).toUpperCase()}
												</span>
											</div>
										</div>
										<div className="ml-3">
											<p className="text-sm font-medium text-gray-900">{user.name}</p>
											<p className="text-sm text-gray-500">{user.email}</p>
										</div>
									</div>
									<div className="flex items-center space-x-2">
										<span
											className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
												user.status === "active"
													? "bg-green-100 text-green-800"
													: user.status === "inactive"
														? "bg-yellow-100 text-yellow-800"
														: "bg-red-100 text-red-800"
											}`}>
											{user.status}
										</span>
										<span className="text-xs text-gray-500">
											{new Date(user.created_at).toLocaleDateString()}
										</span>
									</div>
								</div>
							))}
						</div>
						<div className="mt-4">
							<a className="text-blue-600 hover:text-blue-800 text-sm font-medium" href="/admin/users">
								View all users →
							</a>
						</div>
					</div>
				</div>

				{/* Recent Payments */}
				<div className="bg-white rounded-lg shadow">
					<div className="px-6 py-4 border-b border-gray-200">
						<h3 className="text-lg font-semibold">Recent Payments</h3>
					</div>
					<div className="p-6">
						<div className="space-y-4">
							{recentPayments.map((payment: any) => (
								<div className="flex items-center justify-between" key={payment.id}>
									<div>
										<p className="text-sm font-medium text-gray-900">${(payment.amount / 100).toFixed(2)}</p>
										<p className="text-sm text-gray-500">{payment.user_name}</p>
									</div>
									<div className="flex items-center space-x-2">
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
										<span className="text-xs text-gray-500">
											{new Date(payment.created_at).toLocaleDateString()}
										</span>
									</div>
								</div>
							))}
						</div>
						<div className="mt-4">
							<a className="text-blue-600 hover:text-blue-800 text-sm font-medium" href="/payments">
								View all payments →
							</a>
						</div>
					</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div className="mt-8 bg-white rounded-lg shadow">
				<div className="px-6 py-4 border-b border-gray-200">
					<h3 className="text-lg font-semibold">Quick Actions</h3>
				</div>
				<div className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<a
							className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
							href="/admin/users">
							<div className="flex-shrink-0">
								<span className="text-2xl">👥</span>
							</div>
							<div className="ml-3">
								<p className="text-sm font-medium text-gray-900">Manage Users</p>
								<p className="text-xs text-gray-500">View and edit user accounts</p>
							</div>
						</a>

						<a
							className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
							href="/admin/roles">
							<div className="flex-shrink-0">
								<span className="text-2xl">🔐</span>
							</div>
							<div className="ml-3">
								<p className="text-sm font-medium text-gray-900">Manage Roles</p>
								<p className="text-xs text-gray-500">Configure roles and permissions</p>
							</div>
						</a>

						<a
							className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
							href="/admin/audit">
							<div className="flex-shrink-0">
								<span className="text-2xl">📋</span>
							</div>
							<div className="ml-3">
								<p className="text-sm font-medium text-gray-900">Audit Logs</p>
								<p className="text-xs text-gray-500">View system activity logs</p>
							</div>
						</a>
					</div>
				</div>
			</div>
		</div>
	)
}
