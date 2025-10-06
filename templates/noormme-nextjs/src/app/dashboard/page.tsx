import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function DashboardPage() {
	const session = await auth()

	if (!session) {
		redirect("/auth/signin")
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="bg-white dark:bg-gray-800 shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div>
							<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
							<p className="text-gray-600 dark:text-gray-400">
								Welcome back, {session.user?.name || session.user?.email}!
							</p>
						</div>
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

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Profile</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-4">Manage your account settings and preferences.</p>
						<button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
							View Profile
						</button>
					</div>

					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Settings</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-4">Configure your application settings.</p>
						<button className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
							Open Settings
						</button>
					</div>

					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Analytics</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-4">View your usage statistics and insights.</p>
						<button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
							View Analytics
						</button>
					</div>
				</div>

				{session.user?.role === "admin" && (
					<div className="mt-8">
						<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Admin Panel</h3>
							<p className="text-gray-600 dark:text-gray-400 mb-4">
								You have admin access. Manage users, settings, and system configuration.
							</p>
							<a
								className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
								href="/admin">
								Go to Admin Panel
							</a>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
