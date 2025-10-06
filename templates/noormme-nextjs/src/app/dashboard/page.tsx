import { AlertCircle, Bell, Calendar, CheckCircle, CreditCard, Settings, User } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { ServiceFactory } from "@/lib/services"

export default async function DashboardPage() {
	const session = await auth()

	if (!session) {
		redirect("/auth/signin")
	}

	// Redirect admins to admin panel
	if (["admin", "super_admin"].includes(session.user.role)) {
		redirect("/admin")
	}

	// Fetch user data
	const subscriptionService = ServiceFactory.getService("subscription", require("@/lib/db").db)
	const paymentService = ServiceFactory.getService("payment", require("@/lib/db").db)
	const notificationService = ServiceFactory.getService("notification", require("@/lib/db").db)

	const [currentSubscription, recentPayments, notifications] = await Promise.all([
		subscriptionService.getCurrentSubscription(session.user.id),
		paymentService.getUserPayments(session.user.id, 1, 5),
		notificationService.getUserNotifications(session.user.id, 1, 5, true),
	])

	const stats = [
		{
			name: "Current Plan",
			value: currentSubscription?.plan.name || "Free",
			icon: CreditCard,
			color: "text-blue-600",
		},
		{
			name: "Next Billing",
			value: currentSubscription ? new Date(currentSubscription.currentPeriodEnd).toLocaleDateString() : "N/A",
			icon: Calendar,
			color: "text-green-600",
		},
		{
			name: "Unread Notifications",
			value: notifications.total.toString(),
			icon: Bell,
			color: "text-purple-600",
		},
		{
			name: "Account Status",
			value: session.user.status === "active" ? "Active" : "Inactive",
			icon: session.user.status === "active" ? CheckCircle : AlertCircle,
			color: session.user.status === "active" ? "text-green-600" : "text-red-600",
		},
	]

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			{/* Header */}
			<div className="bg-white dark:bg-gray-800 shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div>
							<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
							<p className="text-gray-600 dark:text-gray-400">Welcome back, {session.user.name}!</p>
						</div>
						<div className="flex items-center space-x-4">
							<Link
								className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
								href="/admin">
								Admin Panel
							</Link>
							<form action="/api/auth/signout" method="post">
								<button
									className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
									type="submit">
									Sign Out
								</button>
							</form>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Stats Grid */}
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
					{stats.map((stat) => {
						const Icon = stat.icon
						return (
							<div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg" key={stat.name}>
								<div className="p-5">
									<div className="flex items-center">
										<div className="flex-shrink-0">
											<Icon className={`h-6 w-6 ${stat.color}`} />
										</div>
										<div className="ml-5 w-0 flex-1">
											<dl>
												<dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
													{stat.name}
												</dt>
												<dd className="text-lg font-medium text-gray-900 dark:text-white">
													{stat.value}
												</dd>
											</dl>
										</div>
									</div>
								</div>
							</div>
						)
					})}
				</div>

				{/* Main Content Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Left Column - Account Management */}
					<div className="lg:col-span-2 space-y-6">
						{/* Subscription Status */}
						<div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-medium text-gray-900 dark:text-white">Subscription Status</h3>
								<Link
									className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
									href="/billing">
									Manage Billing
								</Link>
							</div>

							{currentSubscription ? (
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<span className="text-sm text-gray-600 dark:text-gray-400">Current Plan</span>
										<span className="text-sm font-medium text-gray-900 dark:text-white">
											{currentSubscription.plan.name}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
										<span
											className={`text-sm font-medium ${
												currentSubscription.status === "active" ? "text-green-600" : "text-red-600"
											}`}>
											{currentSubscription.status.charAt(0).toUpperCase() +
												currentSubscription.status.slice(1)}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm text-gray-600 dark:text-gray-400">Next Billing</span>
										<span className="text-sm font-medium text-gray-900 dark:text-white">
											{new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
										</span>
									</div>
									{currentSubscription.cancelAtPeriodEnd && (
										<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
											<p className="text-sm text-yellow-800 dark:text-yellow-200">
												Your subscription will be canceled at the end of the current billing period.
											</p>
										</div>
									)}
								</div>
							) : (
								<div className="text-center py-4">
									<p className="text-gray-600 dark:text-gray-400 mb-4">You're currently on the free plan.</p>
									<Link
										className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
										href="/pricing">
										Upgrade Plan
									</Link>
								</div>
							)}
						</div>

						{/* Recent Payments */}
						<div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Payments</h3>
								<Link
									className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
									href="/billing">
									View All
								</Link>
							</div>

							{recentPayments.payments.length > 0 ? (
								<div className="space-y-3">
									{recentPayments.payments.map((payment) => (
										<div
											className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
											key={payment.id}>
											<div>
												<p className="text-sm font-medium text-gray-900 dark:text-white">
													{payment.description || "Payment"}
												</p>
												<p className="text-xs text-gray-500 dark:text-gray-400">
													{new Date(payment.createdAt).toLocaleDateString()}
												</p>
											</div>
											<div className="text-right">
												<p className="text-sm font-medium text-gray-900 dark:text-white">
													${payment.amount.toFixed(2)}
												</p>
												<span
													className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
														payment.status === "succeeded"
															? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
															: payment.status === "failed"
																? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
																: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
													}`}>
													{payment.status}
												</span>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-600 dark:text-gray-400 text-center py-4">No payments found.</p>
							)}
						</div>
					</div>

					{/* Right Column - Quick Actions & Notifications */}
					<div className="space-y-6">
						{/* Quick Actions */}
						<div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
							<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
							<div className="space-y-3">
								<Link
									className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
									href="/profile">
									<User className="h-5 w-5 text-gray-400 mr-3" />
									<span className="text-sm font-medium text-gray-900 dark:text-white">Edit Profile</span>
								</Link>
								<Link
									className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
									href="/billing">
									<CreditCard className="h-5 w-5 text-gray-400 mr-3" />
									<span className="text-sm font-medium text-gray-900 dark:text-white">Manage Billing</span>
								</Link>
								<Link
									className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
									href="/settings">
									<Settings className="h-5 w-5 text-gray-400 mr-3" />
									<span className="text-sm font-medium text-gray-900 dark:text-white">Settings</span>
								</Link>
							</div>
						</div>

						{/* Recent Notifications */}
						<div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Notifications</h3>
								<Link
									className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
									href="/notifications">
									View All
								</Link>
							</div>

							{notifications.notifications.length > 0 ? (
								<div className="space-y-3">
									{notifications.notifications.map((notification) => (
										<div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700" key={notification.id}>
											<p className="text-sm font-medium text-gray-900 dark:text-white">
												{notification.title}
											</p>
											<p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
												{notification.message}
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
												{new Date(notification.createdAt).toLocaleDateString()}
											</p>
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-600 dark:text-gray-400 text-center py-4">No notifications.</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
