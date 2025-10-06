import { Activity, AlertCircle, CreditCard, DollarSign, Users } from "lucide-react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

export default async function AdminPage() {
	const session = await auth()

	if (!session) {
		redirect("/auth/signin")
	}

	if (!["admin", "super_admin"].includes(session.user.role)) {
		redirect("/dashboard")
	}

	// Fetch system statistics
	const adminService = ServiceFactory.getService("admin", require("@/lib/db").db)
	const userService = ServiceFactory.getService("user", require("@/lib/db").db)
	const subscriptionService = ServiceFactory.getService("subscription", require("@/lib/db").db)
	const paymentService = ServiceFactory.getService("payment", require("@/lib/db").db)

	const [systemStats, userStats, subscriptionStats, paymentStats] = await Promise.all([
		adminService.getSystemStats(),
		userService.getUserStats(),
		subscriptionService.getSubscriptionStats(),
		paymentService.getPaymentStats(),
	])

	const stats = [
		{
			name: "Total Users",
			value: systemStats.totalUsers,
			change: `+${userStats.newUsersThisMonth} this month`,
			changeType: "positive",
			icon: Users,
		},
		{
			name: "Active Subscriptions",
			value: systemStats.activeSubscriptions,
			change: `${subscriptionStats.churnRate.toFixed(1)}% churn rate`,
			changeType: subscriptionStats.churnRate < 5 ? "positive" : "negative",
			icon: CreditCard,
		},
		{
			name: "Monthly Revenue",
			value: `$${systemStats.monthlyRevenue.toLocaleString()}`,
			change: "vs last month",
			changeType: "neutral",
			icon: DollarSign,
		},
		{
			name: "System Uptime",
			value: `${systemStats.systemUptime}%`,
			change: "Last 30 days",
			changeType: systemStats.systemUptime > 99 ? "positive" : "negative",
			icon: Activity,
		},
	]

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
				<p className="mt-2 text-gray-600 dark:text-gray-400">
					Welcome back, {session.user.name}. Here's what's happening with your platform.
				</p>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
				{stats.map((stat) => {
					const Icon = stat.icon
					return (
						<div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg" key={stat.name}>
							<div className="p-5">
								<div className="flex items-center">
									<div className="flex-shrink-0">
										<Icon className="h-6 w-6 text-gray-400" />
									</div>
									<div className="ml-5 w-0 flex-1">
										<dl>
											<dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
												{stat.name}
											</dt>
											<dd className="flex items-baseline">
												<div className="text-2xl font-semibold text-gray-900 dark:text-white">
													{stat.value}
												</div>
												<div
													className={`ml-2 flex items-baseline text-sm font-semibold ${
														stat.changeType === "positive"
															? "text-green-600"
															: stat.changeType === "negative"
																? "text-red-600"
																: "text-gray-500"
													}`}>
													{stat.change}
												</div>
											</dd>
										</dl>
									</div>
								</div>
							</div>
						</div>
					)
				})}
			</div>

			{/* Quick Actions */}
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
				<div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
					<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
					<div className="space-y-3">
						<div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
							<Activity className="h-4 w-4 mr-2" />
							{userStats.newUsersThisMonth} new users this month
						</div>
						<div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
							<CreditCard className="h-4 w-4 mr-2" />
							{subscriptionStats.activeSubscriptions} active subscriptions
						</div>
						<div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
							<DollarSign className="h-4 w-4 mr-2" />${paymentStats.monthlyRevenue.toLocaleString()} revenue this
							month
						</div>
					</div>
				</div>

				<div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
					<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Health</h3>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
							<span className="text-sm font-medium text-green-600">Healthy</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
							<span className="text-sm font-medium text-green-600">{systemStats.systemUptime}%</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-600 dark:text-gray-400">Error Rate</span>
							<span className="text-sm font-medium text-green-600">{systemStats.errorRate}%</span>
						</div>
					</div>
				</div>

				<div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
					<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
					<div className="space-y-2">
						<a
							className="block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
							href="/admin/users">
							Manage Users
						</a>
						<a
							className="block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
							href="/admin/subscriptions">
							View Subscriptions
						</a>
						<a
							className="block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
							href="/admin/settings">
							System Settings
						</a>
						<a
							className="block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
							href="/admin/audit-logs">
							Audit Logs
						</a>
					</div>
				</div>
			</div>

			{/* Alerts */}
			{subscriptionStats.churnRate > 5 && (
				<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-8">
					<div className="flex">
						<div className="flex-shrink-0">
							<AlertCircle className="h-5 w-5 text-yellow-400" />
						</div>
						<div className="ml-3">
							<h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">High Churn Rate</h3>
							<div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
								<p>
									Your churn rate is {subscriptionStats.churnRate.toFixed(1)}%, which is above the recommended
									5%. Consider reviewing your customer retention strategies.
								</p>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
